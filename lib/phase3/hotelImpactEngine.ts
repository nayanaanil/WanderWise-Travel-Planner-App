/**
 * Phase 3: Hotel Impact Engine (Core Logic)
 * 
 * This is a pure function that evaluates hotel impact on routes.
 * 
 * Responsibilities:
 * - Validate hotel vs baseline route
 * - Generate candidate adjusted routes (visit-scoped, not city-scoped)
 * - Diff vs baseline
 * - Emit impact cards
 * 
 * Hard Invariants (enforced):
 * - Hotel city must exist in route visits (path-scoped)
 * - checkIn >= outboundFlight.date
 * - checkOut <= inboundFlight.date
 * - Flights & gateways immutable
 * - No city additions/removals
 * - Hotel may only modify the visit segment of its own city
 * - All other visits preserve arrival order and non-negative duration
 */

import { StructuralRoute, GroundLeg } from '@/lib/route-optimizer/types';
import { Phase2StructuralRoute } from '@/lib/phase2/types';
import { HotelConstraint, HotelImpactResponse } from './types';
import { ImpactCard, diffRouteToImpactCards } from '@/lib/route-optimizer/routeDiff';

/**
 * Helper to normalize city names for comparison
 */
function normalizeCity(city: string): string {
  return city.toLowerCase().trim();
}

/**
 * Visit type for path-scoped hotel adjustments
 */
type Visit = {
  city: string;
  arrival: string;
  departure: string;
};

/**
 * Helper to add days to a date string
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Build visits from route (following RouteReader logic exactly)
 * Path-scoped: one visit per movement segment
 */
function buildVisitsFromRoute(route: StructuralRoute): Visit[] {
  const visits: Visit[] = [];
  const startDate = route.outboundFlight.date;
  let currentCity = route.outboundFlight.toCity;
  let currentDate = startDate;

  // Walk through ground route legs to build visits
  for (const leg of route.groundRoute) {
    const nextCity = leg.toCity;
    // Arrival at nextCity is when the leg departs (departureDayOffset from trip start)
    const nextDate = addDays(startDate, leg.departureDayOffset);

    // Record visit at currentCity (arrived at currentDate, departing at nextDate)
    visits.push({
      city: currentCity,
      arrival: currentDate,
      departure: nextDate,
    });

    currentCity = nextCity;
    currentDate = nextDate;
  }

  // Add final visit before inbound flight (at inbound gateway)
  visits.push({
    city: currentCity,
    arrival: currentDate,
    departure: route.inboundFlight.date,
  });

  return visits;
}

/**
 * Helper to calculate days between two ISO date strings (UTC-safe)
 */
function daysBetween(date1Str: string, date2Str: string): number {
  const date1 = new Date(date1Str + 'T00:00:00Z');
  const date2 = new Date(date2Str + 'T00:00:00Z');
  const diffMs = date2.getTime() - date1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Regenerate derived fields (arrivalDates, departureDates, etc.) from route structure.
 * This follows the same logic as Phase 2's deriveDates but works from visits directly.
 * 
 * @param baseline - Baseline route (for gateway info and draftStayCities)
 * @param visits - Path-scoped visits (may have been modified for hotel)
 * @param updatedGroundRoute - Updated ground route with modified offsets
 */
function regenerateDerivedFields(
  baseline: Phase2StructuralRoute,
  visits: Visit[],
  updatedGroundRoute: GroundLeg[]
): Phase2StructuralRoute['derived'] {
  const startDate = baseline.outboundFlight.date;
  const inboundFlightDate = baseline.inboundFlight.date;
  const outboundGateway = baseline.outboundFlight.toCity;
  const inboundGateway = baseline.inboundFlight.fromCity;

  const arrivalDates: Record<string, string> = {};
  const departureDates: Record<string, string> = {};

  // Step 1: Populate arrivalDates and departureDates EXCLUSIVELY from visits first
  // Visits are the single source of truth for stay timing
  // Visits are path-scoped, so each visit represents a city's stay segment
  for (const visit of visits) {
    const cityName = visit.city;

    // Set arrival date (if not already set for this city)
    // For cities visited multiple times, use first arrival
    if (!arrivalDates[cityName]) {
      arrivalDates[cityName] = visit.arrival;
    } else {
      // If already set, keep the earlier arrival (first visit takes precedence)
      const existing = new Date(arrivalDates[cityName] + 'T00:00:00Z');
      const current = new Date(visit.arrival + 'T00:00:00Z');
      if (current < existing) {
        arrivalDates[cityName] = visit.arrival;
      }
    }

    // Set departure date (use latest departure if multiple visits to same city)
    if (!departureDates[cityName]) {
      departureDates[cityName] = visit.departure;
    } else {
      const existing = new Date(departureDates[cityName] + 'T00:00:00Z');
      const current = new Date(visit.departure + 'T00:00:00Z');
      if (current > existing) {
        departureDates[cityName] = visit.departure;
      }
    }
  }

  // Step 2: Set gateway defaults ONLY if not already set by visits
  // Do NOT overwrite any city already set by visits (including gateways)
  if (!arrivalDates[outboundGateway]) {
    arrivalDates[outboundGateway] = startDate;
  }

  if (!departureDates[inboundGateway]) {
    departureDates[inboundGateway] = inboundFlightDate;
  }

  // Calculate total trip days from updated ground route
  // Find the maximum day offset from the updated ground route legs
  let maxDayOffset = 0;
  for (const leg of updatedGroundRoute) {
    maxDayOffset = Math.max(maxDayOffset, leg.departureDayOffset);
  }
  const totalTripDays = maxDayOffset + 1;

  // Calculate inbound slack days
  // Find the arrival date at inbound gateway from visits (final visit)
  const finalVisit = visits[visits.length - 1];
  const inboundArrivalDate = normalizeCity(finalVisit.city) === normalizeCity(inboundGateway)
    ? finalVisit.arrival
    : inboundFlightDate; // Fallback
  const inboundSlackDays = daysBetween(inboundArrivalDate, inboundFlightDate);

  // Preserve draftStayCities from baseline (source of truth for stay eligibility)
  const draftStayCities = baseline.derived?.draftStayCities || [];

  return {
    arrivalDates,
    departureDates,
    totalTripDays,
    inboundSlackDays,
    draftStayCities,
  };
}

/**
 * Rebuild route from visits (re-deriving offsets without propagation)
 * 
 * This function:
 * 1. Updates groundRoute leg offsets for legs connecting to/from the modified visit
 * 2. Regenerates derived fields (arrivalDates, departureDates, etc.) from the visit structure
 * 
 * Key principle: Only rebuild offsets for legs that connect to/from the modified visit.
 * All other legs keep their original offsets (preserving non-target visits).
 * 
 * Key: departureDayOffset of a leg = when we leave fromCity = when we arrive at toCity
 */
function rebuildRouteFromVisits(
  baseline: Phase2StructuralRoute,
  visits: Visit[],
  modifiedVisitIndex: number
): Phase2StructuralRoute {
  const startDate = baseline.outboundFlight.date;
  const startDateObj = new Date(startDate + 'T00:00:00Z');

  // Clone baseline route
  const newGroundRoute: GroundLeg[] = baseline.groundRoute.map(leg => ({ ...leg }));

  // Only update offsets for legs that connect to/from the modified visit
  // Leg that arrives at hotel city (if not first visit)
  if (modifiedVisitIndex > 0) {
    const legIndex = modifiedVisitIndex - 1;
    if (legIndex < newGroundRoute.length) {
      const leg = newGroundRoute[legIndex];
      const targetArrivalDate = new Date(visits[modifiedVisitIndex].arrival + 'T00:00:00Z');
      const daysFromStart = Math.round(
        (targetArrivalDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      leg.departureDayOffset = Math.max(0, daysFromStart);
    }
  }

  // Leg that departs from hotel city (if not last visit)
  if (modifiedVisitIndex < visits.length - 1) {
    const legIndex = modifiedVisitIndex;
    if (legIndex < newGroundRoute.length) {
      const leg = newGroundRoute[legIndex];
      const targetArrivalDate = new Date(visits[modifiedVisitIndex + 1].arrival + 'T00:00:00Z');
      const daysFromStart = Math.round(
        (targetArrivalDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      leg.departureDayOffset = Math.max(0, daysFromStart);
    }
  }

  // Create candidate route with updated ground route
  const candidateRouteBase: StructuralRoute = {
    ...baseline,
    id: `${baseline.id}-hotel-adjusted`,
    groundRoute: newGroundRoute,
  };

  // Regenerate derived fields from the visit structure and updated ground route
  // This ensures arrivalDates and departureDates reflect the modified visits
  const derived = regenerateDerivedFields(
    baseline,
    visits,
    newGroundRoute
  );

  // Return Phase2StructuralRoute with regenerated derived fields
  const candidateRoute: Phase2StructuralRoute = {
    ...candidateRouteBase,
    derived,
  };

  return candidateRoute;
}


/**
 * Apply multiple hotel constraints to visits (visit-scoped, no propagation)
 * 
 * Each hotel constraint modifies only the visit segment of its city.
 * All other visits preserve original arrival/departure.
 */
function applyAllHotelConstraints(
  baseline: Phase2StructuralRoute,
  hotelConstraints: HotelConstraint[]
): Phase2StructuralRoute | null {
  // Step 1: Build visits from route (path-scoped)
  const visits = buildVisitsFromRoute(baseline);
  const candidateVisits = structuredClone(visits);

  // Track which visit indices have been modified
  const modifiedVisitIndices = new Set<number>();

  // Step 2: Apply each hotel constraint to its corresponding visit
  for (const hotel of hotelConstraints) {
    const visitIndex = candidateVisits.findIndex(
      v => normalizeCity(v.city) === normalizeCity(hotel.city)
    );

    if (visitIndex === -1) {
      // Hotel city not found - skip this constraint (should be caught by validation)
      continue;
    }

    const targetVisit = candidateVisits[visitIndex];

    // Apply hotel constraint ONLY to target visit
    targetVisit.arrival = hotel.checkIn;
    targetVisit.departure = hotel.checkOut;

    // Enforce local validity (hard stop)
    if (targetVisit.departure < targetVisit.arrival) {
      return null; // Invalid - will be caught by validation
    }

    modifiedVisitIndices.add(visitIndex);
  }

  // Step 3: Validate route coherence
  // Check that visits remain in order and valid
  for (let i = 0; i < candidateVisits.length - 1; i++) {
    const current = candidateVisits[i];
    const next = candidateVisits[i + 1];
    
    // Next visit's arrival should be >= current visit's departure
    if (next.arrival < current.departure) {
      return null; // Route coherence violation
    }
  }

  // Step 4: Re-stitch route from visits
  // We need to rebuild offsets for all modified visits
  // For simplicity, rebuild all offsets from the updated visits
  const candidateRoute = rebuildRouteFromAllVisits(baseline, candidateVisits);

  // Step 5: Reject any invalid downstream state (safety net)
  const rebuiltVisits = buildVisitsFromRoute(candidateRoute);
  for (const v of rebuiltVisits) {
    if (v.departure < v.arrival) {
      return null; // Invalid route - will be caught by validation
    }
  }

  // Additional validation: ensure visit order is preserved
  for (let i = 0; i < rebuiltVisits.length - 1; i++) {
    const current = rebuiltVisits[i];
    const next = rebuiltVisits[i + 1];
    if (next.arrival < current.departure) {
      return null; // Route coherence violation
    }
  }

  return candidateRoute;
}

/**
 * Rebuild route from all visits (updates all leg offsets)
 * Used when multiple visits have been modified
 */
function rebuildRouteFromAllVisits(
  baseline: Phase2StructuralRoute,
  visits: Visit[]
): Phase2StructuralRoute {
  const startDate = baseline.outboundFlight.date;
  const startDateObj = new Date(startDate + 'T00:00:00Z');

  // Build new ground route with re-derived offsets from all visits
  const newGroundRoute: GroundLeg[] = [];

  // Process each visit to build legs
  for (let i = 0; i < visits.length - 1; i++) {
    const currentVisit = visits[i];
    const nextVisit = visits[i + 1];

    // Find corresponding leg in baseline by matching fromCity and toCity
    let baselineLeg = baseline.groundRoute.find(
      leg =>
        normalizeCity(leg.fromCity) === normalizeCity(currentVisit.city) &&
        normalizeCity(leg.toCity) === normalizeCity(nextVisit.city)
    );

    // Fallback: if exact match not found, use leg at position i
    if (!baselineLeg && i < baseline.groundRoute.length) {
      baselineLeg = baseline.groundRoute[i];
    }

    if (!baselineLeg) {
      continue;
    }

    // Calculate new offset: arrival at nextVisit.city = nextVisit.arrival
    const nextArrivalDate = new Date(nextVisit.arrival + 'T00:00:00Z');
    const daysFromStart = Math.round(
      (nextArrivalDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create new leg with updated offset
    newGroundRoute.push({
      ...baselineLeg,
      departureDayOffset: Math.max(0, daysFromStart),
    });
  }

  // Create candidate route with updated ground route
  const candidateRouteBase: StructuralRoute = {
    ...baseline,
    id: `${baseline.id}-hotels-adjusted`,
    groundRoute: newGroundRoute,
  };

  // Regenerate derived fields from the visit structure and updated ground route
  const derived = regenerateDerivedFields(
    baseline,
    visits,
    newGroundRoute
  );

  // Return Phase2StructuralRoute with regenerated derived fields
  const candidateRoute: Phase2StructuralRoute = {
    ...candidateRouteBase,
    derived,
  };

  return candidateRoute;
}

/**
 * Adjust stay dates using visit-scoped approach (single hotel, for backward compatibility)
 * 
 * Only modifies the visit segment of the hotel city.
 * All other visits preserve original arrival/departure.
 */
function adjustStayDates(
  baseline: Phase2StructuralRoute,
  hotel: HotelConstraint
): Phase2StructuralRoute | null {
  return applyAllHotelConstraints(baseline, [hotel]);
}

/**
 * Evaluate hotel impact on baseline route
 * 
 * Hotels are CONSTRAINTS, not route modifiers.
 * This function validates hotel dates against the baseline route only.
 * It does NOT modify routes, dates, or visits.
 * 
 * @param baseline - Baseline Phase 2 structural route
 * @param newHotelConstraint - New hotel constraint to evaluate
 * @param lockedHotelStays - Previously locked hotel stays (ignored for validation, used only for multi-hotel compatibility)
 * @returns Impact response with candidates and impact cards
 */
export function evaluateHotelImpact(
  baseline: Phase2StructuralRoute,
  newHotelConstraint: HotelConstraint,
  lockedHotelStays?: Array<{
    city: string;
    hotelId: string;
    checkIn: string;
    checkOut: string;
  }>
): HotelImpactResponse {
  const hotel = newHotelConstraint;

  // Step 1: Validate hotel city exists in baseline route
  const normalizedHotelCity = normalizeCity(hotel.city);
  
  // Find baseline arrival and departure dates for this city (case-insensitive lookup)
  let baselineArrival: string | undefined;
  let baselineDeparture: string | undefined;
  
  // Try direct lookup first
  baselineArrival = baseline.derived?.arrivalDates?.[hotel.city];
  baselineDeparture = baseline.derived?.departureDates?.[hotel.city];
  
  // If not found, try case-insensitive lookup
  if (!baselineArrival || !baselineDeparture) {
    for (const [cityName, arrivalDate] of Object.entries(baseline.derived?.arrivalDates || {})) {
      if (normalizeCity(cityName) === normalizedHotelCity) {
        baselineArrival = arrivalDate;
        break;
      }
    }
    
    for (const [cityName, departureDate] of Object.entries(baseline.derived?.departureDates || {})) {
      if (normalizeCity(cityName) === normalizedHotelCity) {
        baselineDeparture = departureDate;
        break;
      }
    }
  }
  
  // If still not found, city doesn't have a stay window in baseline
  if (!baselineArrival || !baselineDeparture) {
    return {
      hotel,
      baselineRouteId: baseline.id,
      candidates: [
        {
          route: baseline,
          impactCards: [
            {
              type: 'INCOMPATIBLE_BOOKING',
              severity: 'BLOCKING',
              summary: `Hotel city ${hotel.city} not found in baseline route`,
            },
          ],
        },
      ],
    };
  }

  // Step 2: Validate hotel dates against baseline stay window
  // Validation Rule:
  // - hotel.checkIn >= baselineArrival
  // - hotel.checkOut <= baselineDeparture
  // - hotel.checkIn < hotel.checkOut
  
  if (hotel.checkIn < baselineArrival) {
    return {
      hotel,
      baselineRouteId: baseline.id,
      candidates: [
        {
          route: baseline,
          impactCards: [
            {
              type: 'INCOMPATIBLE_BOOKING',
              severity: 'BLOCKING',
              summary: `Hotel check-in ${hotel.checkIn} is before baseline arrival ${baselineArrival} in ${hotel.city}`,
            },
          ],
        },
      ],
    };
  }

  if (hotel.checkOut > baselineDeparture) {
    return {
      hotel,
      baselineRouteId: baseline.id,
      candidates: [
        {
          route: baseline,
          impactCards: [
            {
              type: 'INCOMPATIBLE_BOOKING',
              severity: 'BLOCKING',
              summary: `Hotel check-out ${hotel.checkOut} is after baseline departure ${baselineDeparture} in ${hotel.city}`,
            },
          ],
        },
      ],
    };
  }

  if (hotel.checkIn >= hotel.checkOut) {
    return {
      hotel,
      baselineRouteId: baseline.id,
      candidates: [
        {
          route: baseline,
          impactCards: [
            {
              type: 'INCOMPATIBLE_BOOKING',
              severity: 'BLOCKING',
              summary: `Hotel check-in ${hotel.checkIn} must be before check-out ${hotel.checkOut}`,
            },
          ],
        },
      ],
    };
  }

  // Step 3: Hotel is compatible - return baseline route with zero impact cards
  // Hotels are constraints only, they do NOT modify routes
  // Candidate route is a shallow clone of baseline (route contents identical)
  const candidateRoute: Phase2StructuralRoute = {
    ...baseline,
    id: `${baseline.id}-hotel-selected`,
  };

  // If hotel fits fully inside baseline stay window, return zero impact cards
  return {
    hotel,
    baselineRouteId: baseline.id,
    candidates: [
      {
        route: candidateRoute,
        impactCards: [], // No impact - hotel fits within baseline stay window
      },
    ],
  };
}

