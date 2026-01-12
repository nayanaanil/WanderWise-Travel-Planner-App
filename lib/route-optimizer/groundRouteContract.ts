import { GroundLeg, RouteStop, FlightAnchor } from './types';

/**
 * Resolved stop with optional gateway normalization tracking.
 * This is the internal type used after gateway normalization.
 */
interface ResolvedStop extends RouteStop {
  resolvedFrom?: string; // Original city if this stop was normalized to a gateway
}

/**
 * Ground route validation violation.
 */
export interface GroundRouteViolation {
  /** Type of violation */
  type: 
    | 'missing-user-stop'
    | 'duplicate-user-stop'
    | 'duplicate-city'
    | 'invalid-city'
    | 'non-increasing-offsets'
    | 'start-anchor-mismatch'
    | 'end-anchor-mismatch';
  /** Human-readable description of the violation */
  message: string;
  /** Additional context (city name, index, etc.) */
  context?: Record<string, unknown>;
}

/**
 * Validates a ground route against structural contract requirements.
 * 
 * Contract requirements (applies only to BASE legs):
 * 1. Each BASE city appears exactly once in the BASE groundRoute traversal
 * 2. No city appears more than once overall
 * 3. No city outside the BASE city set appears in the groundRoute
 * 4. Departure offsets strictly increase
 * 
 * Note: Ground routes contain only BASE-to-BASE legs. Anchor connections
 * are handled implicitly outside groundRoute and are not validated here.
 * 
 * IMPORTANT: Ground routes contain base city names (from resolvedFrom), not gateway cities.
 * Validation compares groundRoute cities against BASE city identity (resolvedFrom ?? city)
 * derived from ResolvedStop[], not raw draft user stops or gateway cities.
 * 
 * EXCURSION legs are ignored by base validation.
 * 
 * @param route - Ground route to validate (array of GroundLeg, contains base city names)
 * @param userStops - Resolved stops (ResolvedStop[]) - uses resolvedFrom ?? city for BASE city identity
 * @param anchors - Flight anchors (outbound and inbound) - not used in validation (ground routes don't contain anchors)
 * @returns Array of violations (empty if route is valid)
 */
export function validateGroundRoute(
  route: GroundLeg[],
  userStops: RouteStop[],
  anchors: { outbound: FlightAnchor; inbound: FlightAnchor }
): GroundRouteViolation[] {
  const violations: GroundRouteViolation[] = [];

  if (!route || route.length === 0) {
    // Empty route is valid (no stops to visit)
    return violations;
  }

  // Filter to only BASE legs for validation (EXCURSION legs are ignored)
  // Default to 'BASE' if role is not specified (backward compatibility)
  const baseLegs = route.filter(leg => (leg.role ?? 'BASE') !== 'EXCURSION');
  
  // If no BASE legs, route is valid (only excursions)
  if (baseLegs.length === 0) {
    return violations;
  }

  // Derive BASE cities from ResolvedStop[] using base city identity
  // BASE city = resolvedFrom ?? city (not gateway city)
  const baseCities = new Set<string>();
  for (const stop of userStops) {
    const resolvedStop = stop as ResolvedStop;
    const baseCity = resolvedStop.resolvedFrom ?? stop.city;
    baseCities.add(baseCity);
  }

  // Extract all cities from BASE legs (fromCity and toCity)
  const routeCities = new Set<string>();
  const cityOccurrences = new Map<string, number>();
  
  for (const leg of baseLegs) {
    routeCities.add(leg.fromCity);
    routeCities.add(leg.toCity);
    
    // Count occurrences: intermediate cities appear twice (as toCity and fromCity)
    // Start/end cities appear once
    cityOccurrences.set(leg.fromCity, (cityOccurrences.get(leg.fromCity) || 0) + 1);
    cityOccurrences.set(leg.toCity, (cityOccurrences.get(leg.toCity) || 0) + 1);
  }

  // Check 1: Each BASE city appears exactly once in the BASE groundRoute traversal
  // In a valid ground route:
  // - Start city appears once (as fromCity of first leg)
  // - End city appears once (as toCity of last leg)
  // - Intermediate cities appear exactly twice (as toCity of one leg, fromCity of next leg)
  // - Any city appearing more than twice indicates a loop or duplicate
  for (const baseCity of baseCities) {
    const count = cityOccurrences.get(baseCity) || 0;
    if (count === 0) {
      violations.push({
        type: 'missing-user-stop',
        message: `BASE city "${baseCity}" does not appear in the ground route`,
        context: { city: baseCity }
      });
    } else if (count > 2) {
      violations.push({
        type: 'duplicate-user-stop',
        message: `BASE city "${baseCity}" appears ${count} times in the ground route (must appear at most twice: once as start/end, or twice as intermediate)`,
        context: { city: baseCity, count }
      });
    }
  }

  // Check 2: No city appears more than twice overall
  // This catches any duplicate cities (including cities not in BASE set)
  // A city appearing more than twice indicates a loop or duplicate traversal
  for (const [city, count] of cityOccurrences.entries()) {
    if (count > 2) {
      violations.push({
        type: 'duplicate-city',
        message: `City "${city}" appears ${count} times in the ground route (must appear at most twice)`,
        context: { city, count }
      });
    }
  }

  // Check 3: No city outside the BASE city set appears in the groundRoute
  for (const city of routeCities) {
    if (!baseCities.has(city)) {
      violations.push({
        type: 'invalid-city',
        message: `City "${city}" appears in the ground route but is not a BASE city`,
        context: { city, baseCities: Array.from(baseCities) }
      });
    }
  }

  // Check 4: Departure offsets strictly increase (BASE legs only)
  for (let i = 0; i < baseLegs.length - 1; i++) {
    const currentOffset = baseLegs[i].departureDayOffset;
    const nextOffset = baseLegs[i + 1].departureDayOffset;
    
    if (nextOffset <= currentOffset) {
      violations.push({
        type: 'non-increasing-offsets',
        message: `Departure offsets must strictly increase: leg ${i} has offset ${currentOffset}, leg ${i + 1} has offset ${nextOffset}`,
        context: { 
          legIndex: i,
          currentOffset,
          nextOffset,
          fromCity: baseLegs[i].fromCity,
          toCity: baseLegs[i].toCity,
          nextFromCity: baseLegs[i + 1].fromCity,
          nextToCity: baseLegs[i + 1].toCity
        }
      });
    }
  }

  // Note: Anchor validation removed - ground routes don't contain anchor connections
  // Anchor connections are handled implicitly outside groundRoute

  return violations;
}

