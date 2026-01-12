/**
 * Phase 2 Ground Route Builder
 * 
 * Deterministic algorithm to build linear, acyclic ground routes
 * from locked flight anchors and draft stops.
 */

import { Phase2StructuralRoute, Phase2GroundLeg, GroundRouteRequest } from './types';
import cityCoordinates from '@/lib/data/cityCoordinates.json';

/**
 * Calculate distance between two cities using Haversine formula.
 * Returns distance in kilometers, or Infinity if either city not found.
 */
function calculateDistanceKm(city1: string, city2: string): number {
  const coords1 = getCityCoordinates(city1);
  const coords2 = getCityCoordinates(city2);
  
  if (!coords1 || !coords2) {
    return Infinity;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLon = (coords2.lng - coords1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * Math.PI / 180) *
    Math.cos(coords2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get coordinates for a city from the dataset.
 * Normalizes city name (lowercase, trimmed) for lookup.
 */
function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  const normalized = city.toLowerCase().trim();
  const coords = (cityCoordinates as Record<string, { country: string; lat: number; lng: number }>)[normalized];
  
  if (coords) {
    return { lat: coords.lat, lng: coords.lng };
  }
  
  // Try partial matching (e.g., "New York" might be stored as "new york")
  for (const [key, value] of Object.entries(cityCoordinates as Record<string, { country: string; lat: number; lng: number }>)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return { lat: value.lat, lng: value.lng };
    }
  }
  
  return null;
}

/**
 * Order cities using nearest-neighbor heuristic.
 * Starts from startCity and builds a path visiting all cities.
 * Respects avoidBacktracking if enabled.
 */
function orderCitiesGeographically(
  startCity: string,
  endCity: string,
  baseCities: string[],
  avoidBacktracking: boolean
): string[] {
  if (baseCities.length === 0) {
    return [];
  }
  
  // Remove any base cities that match gateways (they shouldn't be in draftStops, but defensive check)
  const filtered = baseCities.filter(city => 
    city.toLowerCase().trim() !== startCity.toLowerCase().trim() &&
    city.toLowerCase().trim() !== endCity.toLowerCase().trim()
  );
  
  if (filtered.length === 0) {
    return [];
  }
  
  // Nearest-neighbor greedy algorithm
  const ordered: string[] = [];
  const remaining = new Set(filtered);
  let currentCity = startCity;
  
  while (remaining.size > 0) {
    let nearestCity: string | null = null;
    let nearestDistance = Infinity;
    
    for (const candidate of remaining) {
      const distance = calculateDistanceKm(currentCity, candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCity = candidate;
      }
    }
    
    if (nearestCity) {
      ordered.push(nearestCity);
      remaining.delete(nearestCity);
      currentCity = nearestCity;
    } else {
      // Fallback: add remaining cities in original order if distance calculation fails
      ordered.push(...Array.from(remaining));
      break;
    }
  }
  
  // If avoidBacktracking is enabled and endCity is far from last city, try to optimize
  if (avoidBacktracking && ordered.length > 1) {
    const lastCity = ordered[ordered.length - 1];
    const distanceToEnd = calculateDistanceKm(lastCity, endCity);
    const firstToEnd = calculateDistanceKm(ordered[0], endCity);
    
    // If reversing would bring us closer to end, consider it (but only if it doesn't create a loop)
    if (distanceToEnd > firstToEnd * 1.5) {
      // Check if reversed order would be better
      const reversed = [...ordered].reverse();
      // Only reverse if it significantly reduces backtracking
      if (calculateDistanceKm(reversed[reversed.length - 1], endCity) < distanceToEnd * 0.7) {
        return reversed;
      }
    }
  }
  
  return ordered;
}

/**
 * Build ground legs connecting cities in order.
 * Computes day offsets based on desiredNights.
 */
function buildGroundLegs(
  orderedCities: string[],
  startCity: string,
  endCity: string,
  draftStops: Array<{ city: string; desiredNights?: number }>,
  preferredModes?: ('train' | 'car' | 'bus')[]
): Phase2GroundLeg[] {
  const legs: Phase2GroundLeg[] = [];
  
  // Create a map of city -> desiredNights
  const nightsMap = new Map<string, number>();
  for (const stop of draftStops) {
    nightsMap.set(stop.city.toLowerCase().trim(), stop.desiredNights ?? 2);
  }
  
  // Default mode preference: train first, then car, then bus
  const defaultMode = preferredModes?.[0] ?? 'train';
  
  let currentDayOffset = 0;
  let currentCity = startCity;
  
  // Leg from gateway to first base city
  if (orderedCities.length > 0) {
    const nextCity = orderedCities[0];
    const nights = nightsMap.get(nextCity.toLowerCase().trim()) ?? 2;
    
    // Depart from gateway on day 0
    legs.push({
      fromCity: currentCity,
      toCity: nextCity,
      departureDayOffset: currentDayOffset, // day 0
      role: 'TRANSFER',
      mode: defaultMode,
    });
    
    // After arrival, stay for desired nights (min 1 day)
    // If we stay N nights, we depart on day N
    currentDayOffset += Math.max(1, nights);
    currentCity = nextCity;
  }
  
  // Legs between base cities
  for (let i = 1; i < orderedCities.length; i++) {
    const nextCity = orderedCities[i];
    const nights = nightsMap.get(nextCity.toLowerCase().trim()) ?? 2;
    
    // Depart from current city (already stayed here)
    legs.push({
      fromCity: currentCity,
      toCity: nextCity,
      departureDayOffset: currentDayOffset,
      role: 'BASE',
      mode: defaultMode,
    });
    
    // After arrival at next city, stay for desired nights (min 1 day)
    currentDayOffset += Math.max(1, nights);
    currentCity = nextCity;
  }
  
  // Leg from last base city to inbound gateway
  if (orderedCities.length > 0) {
    // Depart from last base city (after staying there)
    legs.push({
      fromCity: currentCity,
      toCity: endCity,
      departureDayOffset: currentDayOffset,
      role: 'TRANSFER',
      mode: defaultMode,
    });
  }
  
  return legs;
}

/**
 * Calculate days between two ISO date strings (YYYY-MM-DD).
 * Uses UTC dates to avoid timezone issues.
 * Returns: date2 - date1 (positive if date2 is later)
 */
function daysBetween(date1Str: string, date2Str: string): number {
  const date1 = new Date(date1Str + 'T00:00:00Z');
  const date2 = new Date(date2Str + 'T00:00:00Z');
  const diffMs = date2.getTime() - date1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Derive arrival and departure dates from day offsets.
 * Returns maps of city name -> ISO date string.
 * 
 * RULES ENFORCED:
 * 1. BASE cities come ONLY from draftStops (not from leg roles)
 * 2. Trip start date = outboundFlight.date (Day 0), never overwritten
 * 3. Gateway arrivals: handle same-city gateways correctly
 * 4. TRANSFER-only cities never get dates
 */
function deriveDates(
  tripStartDate: string,
  groundLegs: Phase2GroundLeg[],
  outboundGateway: string,
  inboundGateway: string,
  inboundFlightDate: string,
  draftStops: Array<{ city: string; desiredNights?: number }>,
  draftStayCities: Array<{ city: string; desiredNights?: number }>
): {
  arrivalDates: Record<string, string>;
  departureDates: Record<string, string>;
  totalTripDays: number;
  inboundSlackDays: number;
  draftStayCities: string[];
} {
  const arrivalDates: Record<string, string> = {};
  const departureDates: Record<string, string> = {};
  
  // Parse start date (Day 0 = outboundFlight.date)
  const startDate = new Date(tripStartDate);
  startDate.setUTCHours(0, 0, 0, 0);
  
  // Helper to format date as ISO string (YYYY-MM-DD)
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Helper to add days to a date
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  };
  
  // Rule 1: Build BASE city map from draftStayCities (source of truth for stays)
  // draftStayCities includes all original draft itinerary cities, including gateways
  // This preserves user intent: gateway cities should show as stays if they were in the original draft
  // Normalize city names for comparison (case-insensitive, trimmed)
  const normalizeCity = (city: string): string => city.toLowerCase().trim();
  const baseCityNights = new Map<string, number>();
  for (const stayCity of draftStayCities) {
    const normalized = normalizeCity(stayCity.city);
    baseCityNights.set(normalized, stayCity.desiredNights ?? 1);
  }
  
  // Rule 2: Trip start date = outboundFlight.date (Day 0)
  // Outbound gateway arrival is day 0 - NEVER overwrite this
  arrivalDates[outboundGateway] = tripStartDate;
  
  // Build map: city -> arrival offset (first time we reach that city)
  const cityArrivalOffsets = new Map<string, number>();
  for (const leg of groundLegs) {
    const normalizedTo = normalizeCity(leg.toCity);
    // Record arrival offset only if not already recorded (first arrival)
    if (!cityArrivalOffsets.has(normalizedTo)) {
      cityArrivalOffsets.set(normalizedTo, leg.departureDayOffset);
    }
  }
  
  // Rule 3: Assign arrival and departure dates for cities in draftStayCities
  // This includes both gateway cities and base cities, preserving original user intent
  const normalizedOutbound = normalizeCity(outboundGateway);
  const normalizedInbound = normalizeCity(inboundGateway);
  
  for (const [normalizedStayCity, desiredNights] of baseCityNights.entries()) {
    // Handle outbound gateway if it's in draftStayCities
    if (normalizedStayCity === normalizedOutbound) {
      const cityName = outboundGateway;
      // Arrival already set to tripStartDate (Day 0) - ensure it's set
      if (!arrivalDates[cityName]) {
        arrivalDates[cityName] = tripStartDate;
      }
      
      // If same gateway for both inbound/outbound, departure is inbound flight date
      // Otherwise, calculate from desiredNights (but this shouldn't happen in practice)
      if (normalizedStayCity === normalizedInbound) {
        // Same gateway: departure will be set to inboundFlightDate later (Rule 4)
        // But ensure it's set here if not already
        if (!departureDates[cityName]) {
          departureDates[cityName] = inboundFlightDate;
        }
      } else {
        // Different gateways: calculate departure from nights
        const arrivalOffset = cityArrivalOffsets.get(normalizedStayCity) ?? 0;
        const nights = Math.max(1, desiredNights);
        const arrivalDate = addDays(startDate, arrivalOffset);
        const departureDate = addDays(arrivalDate, nights);
        departureDates[cityName] = formatDate(departureDate);
      }
    } else if (normalizedStayCity === normalizedInbound && normalizedInbound !== normalizedOutbound) {
      // Inbound gateway (different from outbound): arrival and departure will be set in Rule 4
      // No action needed here
    } else {
      // Regular base city (not a gateway): assign dates from arrival offset
      const arrivalOffset = cityArrivalOffsets.get(normalizedStayCity);
      if (arrivalOffset !== undefined) {
        // Find the city name as it appears in the route (preserve exact casing/spacing)
        let routeCityName: string | undefined;
        for (const leg of groundLegs) {
          if (normalizeCity(leg.toCity) === normalizedStayCity) {
            routeCityName = leg.toCity;
            break;
          }
        }
        
        // Fallback to draftStayCities name if not found in route
        const cityName = routeCityName || draftStayCities.find(
          stayCity => normalizeCity(stayCity.city) === normalizedStayCity
        )?.city || normalizedStayCity;
        
        // Arrival date = tripStartDate + arrival offset
        const arrivalDate = addDays(startDate, arrivalOffset);
        arrivalDates[cityName] = formatDate(arrivalDate);
        
        // Nights from draftStayCities (minimum 1)
        const nights = Math.max(1, desiredNights);
        
        // Departure date = arrival + nights
        const departureDate = addDays(arrivalDate, nights);
        departureDates[cityName] = formatDate(departureDate);
      }
    }
  }
  
  // Rule 4: Handle inbound gateway arrival (prevent overwrite if same as outbound)
  let inboundArrivalDate: string;
  
  if (groundLegs.length > 0) {
    const lastLeg = groundLegs[groundLegs.length - 1];
    const inboundArrival = addDays(startDate, lastLeg.departureDayOffset);
    inboundArrivalDate = formatDate(inboundArrival);
    
    // Only set arrivalDates[inboundGateway] if it's different from outbound gateway
    // This prevents overwriting the outbound gateway arrival date
    if (normalizeCity(outboundGateway) !== normalizeCity(inboundGateway)) {
      arrivalDates[inboundGateway] = inboundArrivalDate;
      
      // If inbound gateway is in draftStayCities, ensure departure is set
      if (baseCityNights.has(normalizeCity(inboundGateway))) {
        // Departure is inbound flight date
        departureDates[inboundGateway] = inboundFlightDate;
      }
    } else {
      // Same gateway: if it's in draftStayCities, ensure both arrival and departure are set
      if (baseCityNights.has(normalizeCity(inboundGateway))) {
        // Arrival already set to tripStartDate (Day 0)
        // Departure is inbound flight date
        departureDates[inboundGateway] = inboundFlightDate;
      }
    }
    // If same gateway, inboundArrivalDate is tracked separately for slack calculation
  } else {
    // No ground legs: same gateway, same arrival date
    inboundArrivalDate = tripStartDate;
    
    // If gateway is in draftStayCities, ensure departure is set
    if (baseCityNights.has(normalizeCity(inboundGateway))) {
      departureDates[inboundGateway] = inboundFlightDate;
    }
  }
  
  // Departure from inbound gateway = inboundFlight.date (always set, even if not in draftStayCities)
  // This ensures the gateway has a departure date for flight display
  if (!departureDates[inboundGateway]) {
    departureDates[inboundGateway] = inboundFlightDate;
  }
  
  // Total trip days = days from outbound arrival (day 0) to inbound arrival
  let maxDayOffset = 0;
  for (const leg of groundLegs) {
    maxDayOffset = Math.max(maxDayOffset, leg.departureDayOffset);
  }
  // Total days = max offset + 1 (because day 0 counts as day 1)
  const totalTripDays = maxDayOffset + 1;
  
  // Rule 5: Compute inbound slack days using tracked inboundArrivalDate
  // inboundSlackDays = inboundFlight.date - inboundArrivalDate
  const inboundSlackDays = daysBetween(inboundArrivalDate, inboundFlightDate);
  
  // Extract draftStayCities city names for UI (preserve original intent)
  const draftStayCityNames = draftStayCities.map(sc => sc.city);
  
  return {
    arrivalDates,
    departureDates,
    totalTripDays,
    inboundSlackDays,
    draftStayCities: draftStayCityNames,
  };
}

/**
 * Build a deterministic ground route from locked flight anchors and draft stops.
 * 
 * HARD RULES ENFORCED:
 * - Gateways are immutable (outboundFlight.toCity, inboundFlight.fromCity)
 * - Linear, acyclic route (outbound gateway → base cities → inbound gateway)
 * - No loops, revisits, or gateways in middle
 * - Each base city appears at most once
 * - Deterministic output (same input → same output)
 */
export function buildGroundRoute(request: GroundRouteRequest): Phase2StructuralRoute {
  const { lockedFlightAnchors, draftStops, preferences } = request;
  
  // Extract gateways (IMMUTABLE - Phase 2 never changes these)
  const outboundGateway = lockedFlightAnchors.outboundFlight.toCity;
  const inboundGateway = lockedFlightAnchors.inboundFlight.fromCity;
  const tripStartDate = lockedFlightAnchors.outboundFlight.date;
  
  // Extract base cities from draft stops (excluding gateways)
  const baseCities = draftStops
    .map(stop => stop.city)
    .filter(city => {
      const normalized = city.toLowerCase().trim();
      return (
        normalized !== outboundGateway.toLowerCase().trim() &&
        normalized !== inboundGateway.toLowerCase().trim()
      );
    });
  
  // Order base cities geographically (deterministic algorithm)
  const orderedBaseCities = orderCitiesGeographically(
    outboundGateway,
    inboundGateway,
    baseCities,
    preferences?.avoidBacktracking ?? false
  );
  
  // Build ground legs
  const groundLegs = buildGroundLegs(
    orderedBaseCities,
    outboundGateway,
    inboundGateway,
    draftStops,
    preferences?.preferredModes
  );
  
  // Derive dates
  const inboundFlightDate = lockedFlightAnchors.inboundFlight.date;
  const derived = deriveDates(
    tripStartDate,
    groundLegs,
    outboundGateway,
    inboundGateway,
    inboundFlightDate,
    draftStops,
    request.draftStayCities
  );
  
  // Build structural route
  const structuralRoute: Phase2StructuralRoute = {
    id: `phase2-${request.tripId}`,
    outboundFlight: {
      fromCity: lockedFlightAnchors.outboundFlight.fromCity,
      toCity: lockedFlightAnchors.outboundFlight.toCity,
      date: lockedFlightAnchors.outboundFlight.date,
    },
    inboundFlight: {
      fromCity: lockedFlightAnchors.inboundFlight.fromCity,
      toCity: lockedFlightAnchors.inboundFlight.toCity,
      date: lockedFlightAnchors.inboundFlight.date,
    },
    groundRoute: groundLegs,
    derived,
  };
  
  return structuralRoute;
}

