/**
 * Phase 1 Scoring and Ranking
 * 
 * Scores gateway + flight options based on:
 * - Total price
 * - Total travel time
 * - Reliability (flight availability, stops)
 * 
 * Deterministic ranking: best → worst
 */

import { GatewayOption, FlightOption } from './types';

/**
 * Parse duration string (e.g., "7h 30m", "2h", "45m") into minutes
 */
function parseDurationToMinutes(duration: string | undefined | null): number {
  if (!duration || typeof duration !== 'string') return Number.MAX_SAFE_INTEGER;
  const hoursMatch = duration.match(/(\d+)\s*h/);
  const minutesMatch = duration.match(/(\d+)\s*m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : Number.MAX_SAFE_INTEGER;
}

/**
 * Calculates total duration in minutes from flight legs if available,
 * otherwise falls back to parsing duration string.
 */
function getFlightDurationMinutes(flight: FlightOption): number {
  // Try to calculate from legs array first (most accurate)
  if (flight.legs && flight.legs.length > 0) {
    let totalMinutes = 0;
    for (const leg of flight.legs) {
      if ('durationMinutes' in leg) {
        // This is a FlightLeg
        totalMinutes += leg.durationMinutes;
      }
      if ('layoverMinutes' in leg) {
        // FlightLayover
        totalMinutes += leg.layoverMinutes;
      }
    }
    if (totalMinutes > 0) {
      return totalMinutes;
    }
  }
  
  // Fallback to parsing duration string
  return parseDurationToMinutes(flight.duration);
}

/**
 * Score a gateway option
 */
export function scoreGatewayOption(option: GatewayOption): number {
  // Extract metrics
  const totalPrice = option.score.totalPrice ?? Number.MAX_SAFE_INTEGER;
  const totalTravelTime = option.score.totalTravelTimeMinutes ?? Number.MAX_SAFE_INTEGER;
  const reliabilityScore = option.score.reliabilityScore ?? 0;
  
  // Weighted scoring (lower is better)
  // Price: 60% weight
  // Travel time: 30% weight
  // Reliability penalty: 10% weight (subtract from score)
  const priceScore = totalPrice * 0.6;
  const timeScore = totalTravelTime * 0.3;
  const reliabilityPenalty = (1 - reliabilityScore) * 1000; // Penalty for low reliability
  
  return priceScore + timeScore + reliabilityPenalty;
}

/**
 * Compute score metrics for a gateway option
 */
export function computeGatewayOptionScore(
  outboundFlights: FlightOption[],
  inboundFlights: FlightOption[]
): {
  totalPrice: number;
  totalTravelTimeMinutes: number;
  reliabilityScore: number;
} {
  // Find cheapest outbound and inbound flights
  const cheapestOutbound = outboundFlights.reduce((min, f) => 
    !min || f.price < min.price ? f : min, 
    null as FlightOption | null
  );
  const cheapestInbound = inboundFlights.reduce((min, f) => 
    !min || f.price < min.price ? f : min, 
    null as FlightOption | null
  );
  
  // Compute total price
  const totalPrice = (cheapestOutbound?.price ?? 0) + (cheapestInbound?.price ?? 0);
  
  // Compute total travel time
  const outboundDuration = parseDurationToMinutes(cheapestOutbound?.duration);
  const inboundDuration = parseDurationToMinutes(cheapestInbound?.duration);
  const totalTravelTimeMinutes = outboundDuration + inboundDuration;
  
  // Compute reliability score (0-1)
  // Higher score = more reliable (more flight options, fewer stops)
  const outboundOptions = outboundFlights.length;
  const inboundOptions = inboundFlights.length;
  const avgStops = outboundFlights.concat(inboundFlights).reduce((sum, f) => 
    sum + (f.stops ?? 0), 0) / Math.max(1, outboundFlights.length + inboundFlights.length);
  
  // Reliability factors:
  // - More options = more reliable (0.4 weight)
  // - Fewer stops = more reliable (0.6 weight)
  const optionsScore = Math.min(1, (outboundOptions + inboundOptions) / 10) * 0.4;
  const stopsScore = Math.max(0, 1 - (avgStops / 3)) * 0.6;
  const reliabilityScore = optionsScore + stopsScore;
  
  return {
    totalPrice,
    totalTravelTimeMinutes,
    reliabilityScore,
  };
}

/**
 * Generate factual explanation for a gateway option
 */
export function generateExplanation(
  gatewayCity: string,
  outboundFlights: FlightOption[],
  inboundFlights: FlightOption[]
): string[] {
  const explanations: string[] = [];
  
  explanations.push(`Gateway: ${gatewayCity}`);
  
  if (outboundFlights.length > 0) {
    const cheapest = outboundFlights.reduce((min, f) => 
      !min || f.price < min.price ? f : min, 
      null as FlightOption | null
    );
    if (cheapest) {
      explanations.push(`Outbound: ${cheapest.airline || 'Multiple airlines'} from ${cheapest.price} per person`);
    }
  }
  
  if (inboundFlights.length > 0) {
    const cheapest = inboundFlights.reduce((min, f) => 
      !min || f.price < min.price ? f : min, 
      null as FlightOption | null
    );
    if (cheapest) {
      explanations.push(`Return: ${cheapest.airline || 'Multiple airlines'} from ${cheapest.price} per person`);
    }
  }
  
  if (outboundFlights.length === 0 || inboundFlights.length === 0) {
    explanations.push('Limited flight availability');
  }
  
  return explanations;
}

/**
 * Checks if a flight is from Duffel Airways (filtered out)
 */
function isDuffelAirways(flight: FlightOption): boolean {
  const airlineName = (flight.airline || flight.airlineName || '').toLowerCase().trim();
  return airlineName.includes('duffel') || airlineName === 'duffel airways';
}

/**
 * Ranks and filters flights to return top 5 best options per direction.
 * 
 * Filters out Duffel Airways flights before ranking.
 * 
 * Uses weighted scoring:
 * - Price: 0.5 weight
 * - Duration: 0.3 weight
 * - Stops: 0.2 weight
 * 
 * Always includes:
 * - Cheapest flight
 * - Fastest flight
 * - Non-stop flight (if available)
 * 
 * Final ordering:
 * - Fastest tagged flights first
 * - Cheapest tagged flights next
 * - Remaining flights by score
 * 
 * @param flights Array of flight options to rank
 * @returns Top 5 ranked flights with required flights guaranteed
 */
export function rankAndFilterFlights(flights: FlightOption[]): FlightOption[] {
  if (flights.length === 0) return [];
  
  // Filter out Duffel Airways flights
  const filteredFlights = flights.filter(f => !isDuffelAirways(f));
  
  if (filteredFlights.length === 0) {
    // If all flights were filtered out, return empty array
    return [];
  }
  
  // Use filtered flights for all subsequent operations
  const flightsToRank = filteredFlights;
  
  // If we have 5 or fewer flights, return all (but still mark cheapest/fastest/non-stop)
  if (flightsToRank.length <= 5) {
    // Still mark the flags for UI
    const cheapest = flightsToRank.reduce((min, f) => (!min || f.price < min.price ? f : min), null as FlightOption | null);
    const fastest = flightsToRank.reduce((min, f) => {
      const fDuration = getFlightDurationMinutes(f);
      const minDuration = min ? getFlightDurationMinutes(min) : Number.MAX_SAFE_INTEGER;
      return !min || fDuration < minDuration ? f : min;
    }, null as FlightOption | null);
    
    const markedFlights = flightsToRank.map(f => ({
      ...f,
      cheapest: f.id === cheapest?.id,
      fastest: f.id === fastest?.id,
    }));
    
    // Create simple scores for sorting (price * 0.6 + duration * 0.4)
    const simpleScores = markedFlights.map(f => {
      const price = f.price || Number.MAX_SAFE_INTEGER;
      const duration = getFlightDurationMinutes(f);
      const score = price * 0.6 + duration * 0.4;
      return { flight: f, score };
    });
    
    // Sort: fastest first, then cheapest, then by score
    const sortedFlights = sortFlightsWithTagsUsingScores(markedFlights, fastest?.id, cheapest?.id, simpleScores);
    // Mark top-ranked flight as recommended
    return markRecommendedFlight(sortedFlights);
  }
  
  // Extract metrics for normalization
  const prices = flightsToRank.map(f => f.price).filter(p => p > 0);
  const durations = flightsToRank.map(f => getFlightDurationMinutes(f)).filter(d => d < Number.MAX_SAFE_INTEGER);
  const stopsCounts = flightsToRank.map(f => f.stops ?? 0);
  
  // Find min/max for normalization
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const durationRange = maxDuration - minDuration;
  
  const minStops = Math.min(...stopsCounts);
  const maxStops = Math.max(...stopsCounts);
  const stopsRange = maxStops - minStops;
  
  // Find required flights before ranking
  const cheapest = flightsToRank.reduce((min, f) => (!min || f.price < min.price ? f : min), null as FlightOption | null);
  const fastest = flightsToRank.reduce((min, f) => {
    const fDuration = getFlightDurationMinutes(f);
    const minDuration = min ? getFlightDurationMinutes(min) : Number.MAX_SAFE_INTEGER;
    return !min || fDuration < minDuration ? f : min;
  }, null as FlightOption | null);
  const nonStop = flightsToRank.find(f => (f.stops ?? 0) === 0);
  
  // Calculate scores for all flights
  const flightsWithScores = flightsToRank.map(flight => {
    // Normalize each dimension to [0, 1]
    const normalizedPrice = priceRange > 0 
      ? (flight.price - minPrice) / priceRange 
      : 0;
    
    const flightDuration = getFlightDurationMinutes(flight);
    const normalizedDuration = durationRange > 0 
      ? (flightDuration - minDuration) / durationRange 
      : 0;
    
    const normalizedStops = stopsRange > 0 
      ? ((flight.stops ?? 0) - minStops) / stopsRange 
      : 0;
    
    // Weighted score (lower is better)
    const w_price = 0.5;
    const w_duration = 0.3;
    const w_stops = 0.2;
    
    const score = 
      w_price * normalizedPrice +
      w_duration * normalizedDuration +
      w_stops * normalizedStops;
    
    return {
      flight,
      score,
    };
  });
  
  // Sort by score (ascending - lower score = better)
  flightsWithScores.sort((a, b) => a.score - b.score);
  
  // Collect top 5 + required flights
  const top5Ids = new Set<string>();
  const result: FlightOption[] = [];
  
  // Add top 5 by score
  for (let i = 0; i < Math.min(5, flightsWithScores.length); i++) {
    const { flight } = flightsWithScores[i];
    top5Ids.add(flight.id);
    result.push({
      ...flight,
      cheapest: flight.id === cheapest?.id,
      fastest: flight.id === fastest?.id,
    });
  }
  
  // Add required flights if not already included
  const requiredFlights = [cheapest, fastest, nonStop].filter(Boolean) as FlightOption[];
  
  for (const required of requiredFlights) {
    if (required && !top5Ids.has(required.id)) {
      result.push({
        ...required,
        cheapest: required.id === cheapest?.id,
        fastest: required.id === fastest?.id,
      });
      top5Ids.add(required.id);
    }
  }
  
  // If we added required flights, we might have more than 5, so sort again and limit
  if (result.length > 5) {
    // Sort by score again (recalculate scores for the merged list)
    const resultWithScores = result.map(f => {
      const scoreData = flightsWithScores.find(s => s.flight.id === f.id);
      return {
        flight: f,
        score: scoreData?.score ?? Number.MAX_SAFE_INTEGER,
      };
    });
    
    resultWithScores.sort((a, b) => a.score - b.score);
    
    // Start with top 5 by score
    const finalResult: FlightOption[] = [];
    const includedIds = new Set<string>();
    
    // First, add required flights (they have priority)
    for (const required of requiredFlights) {
      if (required && !includedIds.has(required.id)) {
        finalResult.push(required);
        includedIds.add(required.id);
      }
    }
    
    // Then, add top-scoring flights until we reach 5 total
    for (const { flight } of resultWithScores) {
      if (finalResult.length >= 5) break;
      if (!includedIds.has(flight.id)) {
        finalResult.push(flight);
        includedIds.add(flight.id);
      }
    }
    
    // Sort: fastest first, then cheapest, then by score
    const sortedFlights = sortFlightsWithTagsUsingScores(finalResult, fastest?.id, cheapest?.id, flightsWithScores);
    // Mark top-ranked flight as recommended
    return markRecommendedFlight(sortedFlights);
  }
  
  // Sort final result: fastest first, then cheapest, then by score
  const sortedFlights = sortFlightsWithTagsUsingScores(result, fastest?.id, cheapest?.id, flightsWithScores);
  // Mark top-ranked flight as recommended
  return markRecommendedFlight(sortedFlights);
}

/**
 * Sorts flights with tagged flights (fastest, cheapest) appearing first.
 * Order: fastest tagged flights first, cheapest tagged flights next, then by score.
 */
function sortFlightsWithTagsUsingScores(
  flights: FlightOption[],
  fastestId: string | undefined,
  cheapestId: string | undefined,
  flightsWithScores: Array<{ flight: FlightOption; score: number }>
): FlightOption[] {
  // Map flights with their scores and tags
  const flightsWithScoresAndTags = flights.map(f => {
    const scoreData = flightsWithScores.find(s => s.flight.id === f.id);
    const score = scoreData?.score ?? Number.MAX_SAFE_INTEGER;
    
    return {
      flight: f,
      score,
      isFastest: fastestId ? f.id === fastestId : false,
      isCheapest: cheapestId ? f.id === cheapestId : false,
    };
  });
  
  // Sort: fastest first, then cheapest (if not fastest), then by score
  flightsWithScoresAndTags.sort((a, b) => {
    // Fastest flights first
    if (a.isFastest && !b.isFastest) return -1;
    if (!a.isFastest && b.isFastest) return 1;
    
    // If both are fastest, or neither is fastest, check cheapest
    // Cheapest flights next (but only if not fastest, since fastest is already first)
    if (!a.isFastest && !b.isFastest) {
      if (a.isCheapest && !b.isCheapest) return -1;
      if (!a.isCheapest && b.isCheapest) return 1;
    }
    
    // Then by score (lower is better)
    return a.score - b.score;
  });
  
  return flightsWithScoresAndTags.map(s => s.flight);
}

/**
 * Marks the first (top-ranked) flight as recommended with explanation.
 * Sets recommended = false for all other flights.
 */
function markRecommendedFlight(flights: FlightOption[]): FlightOption[] {
  if (flights.length === 0) return flights;
  
  return flights.map((flight, index) => ({
    ...flight,
    recommended: index === 0,
    explanation: index === 0 
      ? "Best balance of price, total travel time, and number of stops for your trip"
      : undefined,
  }));
}




