import { StructuralRoute, GroundLeg, FlightAnchor, RouteOptimizerInput } from './types';
import { TripScope } from './types';
import { isPrimaryOrigin } from './flightAnchorEligibility';

/**
 * Represents the original user itinerary intent before structural corrections.
 * This is derived from RouteOptimizerInput to capture what the user originally intended.
 */
export interface UserItineraryIntent {
  /** Original outbound flight anchor (as provided or inferred from input) */
  originalOutboundAnchor: FlightAnchor;
  /** Original inbound flight anchor (as provided or inferred from input) */
  originalInboundAnchor: FlightAnchor;
  /** Original ordered stops from user input */
  originalStops: { city: string }[];
  /** Original ground route (if any) - typically empty or just connecting stops in order */
  originalGroundRoute: GroundLeg[];
  /** Trip scope that was determined during route generation */
  tripScope: TripScope;
}

/**
 * Observability data tracking how structural corrections impacted the original user intent.
 * This is a pure observability layer - it does not change route behavior or ranking.
 */
export type ItineraryImpact = {
  /** Flight anchor cities that were replaced due to eligibility rules */
  flightAnchorReplacements: {
    originalCityId: string;
    replacedWithCityId: string;
    scope: 'long-haul' | 'short-haul';
    reason: 'ineligible-flight-anchor' | 'secondary-origin-normalization';
  }[];
  /** Ground legs that were added to preserve user intent after anchor replacements */
  addedGroundLegs: {
    fromCityId: string;
    toCityId: string;
    reason: 'preserve-user-intent';
  }[];
  /** Hard invalidations (if any) - only populated if route marks itself invalid */
  hardInvalidations: {
    reason: string;
  }[];
};

/**
 * Pure computation function that analyzes the difference between original user intent
 * and the final StructuralRoute output.
 * 
 * This is observability only - no side effects, no network calls, no ranking logic.
 * 
 * @param originalIntent - The original user itinerary intent (derived from RouteOptimizerInput)
 * @param structuralRoute - The final StructuralRoute after all corrections
 * @returns ItineraryImpact tracking all structural changes
 */
export function computeItineraryImpact(
  originalIntent: UserItineraryIntent,
  structuralRoute: StructuralRoute
): ItineraryImpact {
  const impact: ItineraryImpact = {
    flightAnchorReplacements: [],
    addedGroundLegs: [],
    hardInvalidations: [],
  };

  // A. Flight anchor replacement detection
  // Check ALL four anchor cities: outbound from/to, inbound from/to
  
  // Check if outbound anchor origin was replaced
  // IMPORTANT: Distinguish between origin normalization and destination anchor replacement
  const originalOutboundOrigin = originalIntent.originalOutboundAnchor.fromCity.trim();
  const finalOutboundOrigin = structuralRoute.outboundFlight.fromCity.trim();
  if (originalOutboundOrigin !== finalOutboundOrigin) {
    // Determine reason: origin normalization (secondary origin) vs anchor replacement
    const isOriginNormalization = !isPrimaryOrigin(originalOutboundOrigin);
    impact.flightAnchorReplacements.push({
      originalCityId: originalOutboundOrigin,
      replacedWithCityId: finalOutboundOrigin,
      scope: originalIntent.tripScope,
      reason: isOriginNormalization ? 'secondary-origin-normalization' : 'ineligible-flight-anchor',
    });
  }

  // Check if outbound anchor destination was replaced
  const originalOutboundDest = originalIntent.originalOutboundAnchor.toCity.trim();
  const finalOutboundDest = structuralRoute.outboundFlight.toCity.trim();
  if (originalOutboundDest !== finalOutboundDest) {
    impact.flightAnchorReplacements.push({
      originalCityId: originalOutboundDest,
      replacedWithCityId: finalOutboundDest,
      scope: originalIntent.tripScope,
      reason: 'ineligible-flight-anchor',
    });
  }

  // Check if inbound anchor origin was replaced
  const originalInboundOrigin = originalIntent.originalInboundAnchor.fromCity.trim();
  const finalInboundOrigin = structuralRoute.inboundFlight.fromCity.trim();
  if (originalInboundOrigin !== finalInboundOrigin) {
    impact.flightAnchorReplacements.push({
      originalCityId: originalInboundOrigin,
      replacedWithCityId: finalInboundOrigin,
      scope: originalIntent.tripScope,
      reason: 'ineligible-flight-anchor',
    });
  }

  // Check if inbound anchor destination was replaced
  const originalInboundDest = originalIntent.originalInboundAnchor.toCity.trim();
  const finalInboundDest = structuralRoute.inboundFlight.toCity.trim();
  if (originalInboundDest !== finalInboundDest) {
    impact.flightAnchorReplacements.push({
      originalCityId: originalInboundDest,
      replacedWithCityId: finalInboundDest,
      scope: originalIntent.tripScope,
      reason: 'ineligible-flight-anchor',
    });
  }

  // B. Ground leg injection detection
  // Build a set of original ground legs for quick lookup
  const originalGroundLegSet = new Set<string>();
  for (const leg of originalIntent.originalGroundRoute) {
    const key = `${leg.fromCity.trim()}|${leg.toCity.trim()}`;
    originalGroundLegSet.add(key);
  }

  // Also include legs that would naturally exist from connecting stops in order
  // (these are implicit in the original intent)
  for (let i = 0; i < originalIntent.originalStops.length - 1; i++) {
    const fromCity = originalIntent.originalStops[i].city.trim();
    const toCity = originalIntent.originalStops[i + 1].city.trim();
    const key = `${fromCity}|${toCity}`;
    originalGroundLegSet.add(key);
  }

  // Check each ground leg in the final route
  for (const leg of structuralRoute.groundRoute) {
    const key = `${leg.fromCity.trim()}|${leg.toCity.trim()}`;
    
    // If this leg doesn't exist in original intent, it was added
    if (!originalGroundLegSet.has(key)) {
      impact.addedGroundLegs.push({
        fromCityId: leg.fromCity.trim(),
        toCityId: leg.toCity.trim(),
        reason: 'preserve-user-intent',
      });
    }
  }

  // C. Hard invalidations
  // These are populated during route generation when no eligible hub is found

  // D. Deduplicate impact entries to ensure uniqueness
  // flightAnchorReplacements: unique by (originalCityId, replacedWithCityId, reason)
  const replacementKeys = new Set<string>();
  impact.flightAnchorReplacements = impact.flightAnchorReplacements.filter((replacement) => {
    const key = `${replacement.originalCityId}|${replacement.replacedWithCityId}|${replacement.reason}`;
    if (replacementKeys.has(key)) {
      return false; // Duplicate, filter out
    }
    replacementKeys.add(key);
    return true;
  });

  // addedGroundLegs: unique by (fromCityId, toCityId, reason)
  const groundLegKeys = new Set<string>();
  impact.addedGroundLegs = impact.addedGroundLegs.filter((leg) => {
    const key = `${leg.fromCityId}|${leg.toCityId}|${leg.reason}`;
    if (groundLegKeys.has(key)) {
      return false; // Duplicate, filter out
    }
    groundLegKeys.add(key);
    return true;
  });

  return impact;
}

/**
 * Helper function to derive UserItineraryIntent from RouteOptimizerInput.
 * This captures the original user intent before any structural corrections.
 * 
 * @param input - Original route optimizer input
 * @param tripScope - Trip scope determined during route generation
 * @returns UserItineraryIntent representing original user intent
 */
export function deriveUserItineraryIntent(
  input: RouteOptimizerInput,
  tripScope: TripScope
): UserItineraryIntent {
  const baseStops = input.stops ?? [];

  // Reconstruct original anchors (as they would have been before correction)
  const originalOutbound: FlightAnchor =
    input.outboundFlightAnchor ?? {
      fromCity: input.originCity,
      toCity: baseStops[0]?.city ?? input.originCity,
      date: input.startDate,
    };

  const originalInbound: FlightAnchor =
    input.inboundFlightAnchor ?? {
      fromCity: baseStops[baseStops.length - 1]?.city ?? input.originCity,
      toCity: input.returnCity || input.originCity,
      date: input.endDate,
    };

  return {
    originalOutboundAnchor: originalOutbound,
    originalInboundAnchor: originalInbound,
    originalStops: baseStops.map((stop) => ({ city: stop.city })),
    originalGroundRoute: [], // Original input has no explicit ground route
    tripScope,
  };
}

