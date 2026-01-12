/**
 * Phase 1 Gateway Resolution
 * 
 * Resolves gateway-eligible cities from draft stops.
 * This is a strict, deterministic process that:
 * - Checks airport code availability
 * - Uses existing gateway eligibility logic
 * - Never treats base cities as gateways unless explicitly eligible
 * - Resolves to nearest gateway if base city is not eligible
 */

import { findAirportCode } from '@/lib/airports';
import { 
  determineTripScope, 
  nearestEligibleLongHaulGateway,
  allowedGatewayCountries 
} from '@/lib/route-optimizer/flightAnchorEligibility';
import { TripScope } from '@/lib/route-optimizer/types';

/**
 * Check if a city is gateway-eligible (has a physical airport with IATA code).
 * This is the core invariant: flight anchors must always be gateway-eligible.
 */
function isGatewayEligible(city: string): boolean {
  const airportCode = findAirportCode(city);
  return airportCode !== null && airportCode !== undefined;
}

/**
 * Resolve gateway candidates from draft stops.
 * 
 * For each draft stop:
 * - If gateway-eligible → use as-is
 * - If not gateway-eligible → resolve to nearest gateway
 * - If no gateway can be resolved → exclude from candidates
 * 
 * @param draftStops - Draft itinerary stops
 * @param originCity - User's origin city
 * @returns Array of gateway-eligible cities (deduplicated)
 */
export async function resolveGatewayCandidates(
  draftStops: Array<{ city: string; country?: string }>,
  originCity: string
): Promise<string[]> {
  const tripScope = determineTripScope(originCity, draftStops.map(s => ({ city: s.city })));
  const gatewayCandidates = new Set<string>();
  
  // Extract country codes from draft stops for visa constraints
  const stopCountryCodes = draftStops
    .map(stop => stop.country)
    .filter((code): code is string => code !== undefined);
  const allowedGatewayCountryCodes = allowedGatewayCountries(
    stopCountryCodes.length > 0 ? stopCountryCodes[0] : undefined
  );
  
  for (const stop of draftStops) {
    const city = stop.city;
    
    // Check if city is gateway-eligible
    if (isGatewayEligible(city)) {
      gatewayCandidates.add(city);
      console.debug('[DEBUG][Phase1][GatewayResolution] Direct gateway', {
        city,
        reason: 'has-airport-code'
      });
      continue;
    }
    
    // City is not gateway-eligible, resolve to nearest gateway
    console.debug('[DEBUG][Phase1][GatewayResolution] Resolving non-gateway', {
      city,
      tripScope
    });
    
    if (tripScope === 'long-haul') {
      const nearestGateway = await nearestEligibleLongHaulGateway(city, allowedGatewayCountryCodes);
      if (nearestGateway) {
        gatewayCandidates.add(nearestGateway);
        console.debug('[DEBUG][Phase1][GatewayResolution] Resolved to gateway', {
          originalCity: city,
          gateway: nearestGateway
        });
      } else {
        console.warn('[DEBUG][Phase1][GatewayResolution] No gateway found', {
          city
        });
        // Exclude this city from candidates
      }
    } else {
      // Short-haul: try to find any nearby city with airport code
      // For MVP, use the same logic as long-haul
      const nearestGateway = await nearestEligibleLongHaulGateway(city, allowedGatewayCountryCodes);
      if (nearestGateway) {
        gatewayCandidates.add(nearestGateway);
        console.debug('[DEBUG][Phase1][GatewayResolution] Resolved to gateway (short-haul)', {
          originalCity: city,
          gateway: nearestGateway
        });
      } else {
        console.warn('[DEBUG][Phase1][GatewayResolution] No gateway found (short-haul)', {
          city
        });
      }
    }
  }
  
  const candidates = Array.from(gatewayCandidates);
  console.debug('[DEBUG][Phase1][GatewayResolution] Final candidates', {
    count: candidates.length,
    candidates
  });
  
  return candidates;
}




