import { StructuralRoute, GroundLeg, FlightAnchor } from './types';

/**
 * Impact card describing a difference between baseline and candidate routes.
 * Used to communicate route changes to users.
 */
export interface ImpactCard {
  type: 'DATE_PRESENCE_SHIFT' | 'ROUTE_STRUCTURE_CHANGE' | 'TIME_STRESS' | 'INCOMPATIBLE_BOOKING';
  severity: 1 | 2 | 3 | 'BLOCKING';
  summary: string;
  affectedCities?: string[];
  affectedDates?: string[];
}

/**
 * Extract ordered list of base cities from a route's groundRoute.
 * Uses first occurrence of each city (by departureDayOffset order).
 * 
 * @param route - Structural route to extract cities from
 * @returns Ordered array of unique base city names
 */
function extractBaseCities(route: StructuralRoute): string[] {
  const cities: string[] = [];
  const seen = new Set<string>();
  
  // Sort legs by departureDayOffset to get chronological order
  const sortedLegs = [...route.groundRoute]
    .filter(leg => leg.role === 'BASE')
    .sort((a, b) => a.departureDayOffset - b.departureDayOffset);
  
  // Extract cities in order, tracking first occurrence
  for (const leg of sortedLegs) {
    // Add fromCity if not seen
    if (!seen.has(leg.fromCity)) {
      cities.push(leg.fromCity);
      seen.add(leg.fromCity);
    }
    // Add toCity if not seen
    if (!seen.has(leg.toCity)) {
      cities.push(leg.toCity);
      seen.add(leg.toCity);
    }
  }
  
  return cities;
}

/**
 * Extract chronological city sequence from a route's groundRoute.
 * Preserves all city visits in order, including repeated cities.
 * Used for split stay and backtracking detection.
 * 
 * @param route - Structural route to extract sequence from
 * @returns Ordered array of city names as traveled (may include duplicates)
 */
function extractCitySequence(route: StructuralRoute): string[] {
  const sequence: string[] = [];
  
  // Sort legs by departureDayOffset to get chronological order
  const sortedLegs = [...route.groundRoute]
    .filter(leg => leg.role === 'BASE')
    .sort((a, b) => a.departureDayOffset - b.departureDayOffset);
  
  // Extract cities in order, preserving all visits (no deduplication)
  for (const leg of sortedLegs) {
    // Add fromCity (departure point)
    sequence.push(leg.fromCity);
    // Add toCity (arrival point)
    sequence.push(leg.toCity);
  }
  
  return sequence;
}

/**
 * Derive arrival dates for each base city in a route.
 * Arrival date = tripStartDate + departureDayOffset (for leg where city is toCity).
 * The departureDayOffset of a leg represents when you depart FROM fromCity,
 * and arrive AT toCity on the same day.
 * 
 * For the first city (fromCity of first leg), arrival is on day 0 (when outbound flight lands).
 * 
 * @param route - Structural route
 * @param tripStartDate - ISO date string (YYYY-MM-DD) for trip start
 * @returns Map of city name to arrival date (ISO string)
 */
function deriveArrivalDates(route: StructuralRoute, tripStartDate: string): Map<string, string> {
  const arrivalDates = new Map<string, string>();
  const startDate = new Date(tripStartDate);
  
  // Sort legs by departureDayOffset to process chronologically
  const sortedLegs = [...route.groundRoute]
    .filter(leg => leg.role === 'BASE')
    .sort((a, b) => a.departureDayOffset - b.departureDayOffset);
  
  if (sortedLegs.length === 0) {
    return arrivalDates;
  }
  
  // First city: arrives on day 0 (when outbound flight lands, same as tripStartDate)
  // The first city is the fromCity of the first leg
  const firstLeg = sortedLegs[0];
  const firstCity = firstLeg.fromCity;
  arrivalDates.set(firstCity, tripStartDate);
  
  // For subsequent cities: arrival date = departureDayOffset of leg where city is toCity
  // The departureDayOffset represents when you arrive at toCity
  for (const leg of sortedLegs) {
    if (!arrivalDates.has(leg.toCity)) {
      const arrivalDate = new Date(startDate);
      arrivalDate.setDate(arrivalDate.getDate() + leg.departureDayOffset);
      arrivalDates.set(leg.toCity, arrivalDate.toISOString().split('T')[0]);
    }
  }
  
  return arrivalDates;
}

/**
 * Detect if a city appears non-contiguously in the route (split stay).
 * 
 * @param cities - Ordered array of city names
 * @returns Array of cities that appear non-contiguously, or empty array
 */
function detectSplitStay(cities: string[]): string[] {
  const splitCities: string[] = [];
  const lastIndex = new Map<string, number>();
  
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const prevIndex = lastIndex.get(city);
    
    if (prevIndex !== undefined && prevIndex !== i - 1) {
      // City appeared before, but not immediately before (non-contiguous)
      if (!splitCities.includes(city)) {
        splitCities.push(city);
      }
    }
    
    lastIndex.set(city, i);
  }
  
  return splitCities;
}

/**
 * Detect if a city appears again after being exited (backtracking).
 * A city is "exited" when we move to a different city, then later return to it.
 * 
 * @param cities - Ordered array of city names
 * @returns Array of cities that are backtracked to, or empty array
 */
function detectBacktracking(cities: string[]): string[] {
  const backtrackedCities: string[] = [];
  const exited = new Set<string>();
  
  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    
    if (exited.has(city)) {
      // City was exited before, now we're returning to it (backtracking)
      if (!backtrackedCities.includes(city)) {
        backtrackedCities.push(city);
      }
    }
    
    // Mark city as exited if next city is different
    if (i < cities.length - 1 && cities[i + 1] !== city) {
      exited.add(city);
    }
  }
  
  return backtrackedCities;
}

/**
 * Calculate number of nights at a city based on ground route legs.
 * 
 * @param route - Structural route
 * @param city - City name
 * @returns Number of nights, or null if city not found or cannot be determined
 */
function calculateNightsAtCity(route: StructuralRoute, city: string): number | null {
  const sortedLegs = [...route.groundRoute]
    .filter(leg => leg.role === 'BASE')
    .sort((a, b) => a.departureDayOffset - b.departureDayOffset);
  
  // Find legs where city is the fromCity (departure point)
  const departureLegs = sortedLegs.filter(leg => leg.fromCity === city);
  
  if (departureLegs.length === 0) {
    // City is the last city (no departure leg)
    // Nights = endDate - arrivalDate
    const arrivalLeg = sortedLegs.find(leg => leg.toCity === city);
    if (!arrivalLeg) return null;
    
    // For last city, we can't determine nights from groundRoute alone
    // This would require comparing with inboundFlight date
    // For now, return null (will be handled by TIME_STRESS detection differently)
    return null;
  }
  
  // Find arrival leg (where city is toCity)
  const arrivalLeg = sortedLegs.find(leg => leg.toCity === city);
  if (!arrivalLeg) return null;
  
  // Nights = departureDayOffset - arrivalDayOffset
  const arrivalOffset = arrivalLeg.departureDayOffset;
  const departureOffset = departureLegs[0].departureDayOffset;
  
  return Math.max(0, departureOffset - arrivalOffset);
}

/**
 * Compare two routes and generate impact cards describing differences.
 * 
 * Rules:
 * 1. DATE_PRESENCE_SHIFT (severity: 2) - Flight dates or city arrival dates differ
 * 2. ROUTE_STRUCTURE_CHANGE (severity: 2 or 3) - Order, additions, removals, split stays, backtracking
 * 3. TIME_STRESS (severity: 1) - Tighter travel days, earlier arrivals, later departures
 * 4. INCOMPATIBLE_BOOKING (severity: BLOCKING) - Missing required fields
 * 
 * @param baseline - Baseline route to compare against
 * @param candidate - Candidate route to compare
 * @param tripStartDate - ISO date string (YYYY-MM-DD) for trip start
 * @returns Array of impact cards, ordered by descending severity
 */
export function diffRouteToImpactCards(
  baseline: StructuralRoute,
  candidate: StructuralRoute | null | undefined,
  tripStartDate: string
): ImpactCard[] {
  const cards: ImpactCard[] = [];
  
  // Rule 4: INCOMPATIBLE_BOOKING (BLOCKING)
  if (!candidate) {
    cards.push({
      type: 'INCOMPATIBLE_BOOKING',
      severity: 'BLOCKING',
      summary: 'Candidate route is missing or invalid',
    });
    return cards; // Early return - no other checks needed
  }
  
  // Check for missing required fields
  if (!candidate.outboundFlight || !candidate.inboundFlight || !candidate.groundRoute) {
    cards.push({
      type: 'INCOMPATIBLE_BOOKING',
      severity: 'BLOCKING',
      summary: 'Candidate route is missing required fields',
    });
    return cards; // Early return
  }
  
  // Rule 1: DATE_PRESENCE_SHIFT (severity: 2)
  const dateShifts: string[] = [];
  const affectedDates: string[] = [];
  
  // Check flight dates
  if (baseline.outboundFlight.date !== candidate.outboundFlight.date) {
    dateShifts.push(`Outbound flight date shifts from ${baseline.outboundFlight.date} to ${candidate.outboundFlight.date}`);
    affectedDates.push(baseline.outboundFlight.date, candidate.outboundFlight.date);
  }
  
  if (baseline.inboundFlight.date !== candidate.inboundFlight.date) {
    dateShifts.push(`Inbound flight date shifts from ${baseline.inboundFlight.date} to ${candidate.inboundFlight.date}`);
    affectedDates.push(baseline.inboundFlight.date, candidate.inboundFlight.date);
  }
  
  // Check city arrival dates
  const baselineArrivals = deriveArrivalDates(baseline, tripStartDate);
  const candidateArrivals = deriveArrivalDates(candidate, tripStartDate);
  
  const allCities = new Set([...baselineArrivals.keys(), ...candidateArrivals.keys()]);
  const affectedCities: string[] = [];
  
  for (const city of allCities) {
    const baselineDate = baselineArrivals.get(city);
    const candidateDate = candidateArrivals.get(city);
    
    if (baselineDate && candidateDate && baselineDate !== candidateDate) {
      dateShifts.push(`Arrival date in ${city} shifts from ${baselineDate} to ${candidateDate}`);
      affectedCities.push(city);
      affectedDates.push(baselineDate, candidateDate);
    } else if (baselineDate && !candidateDate) {
      dateShifts.push(`${city} is removed from route`);
      affectedCities.push(city);
    } else if (!baselineDate && candidateDate) {
      dateShifts.push(`${city} is added to route (arrives ${candidateDate})`);
      affectedCities.push(city);
      affectedDates.push(candidateDate);
    }
  }
  
  if (dateShifts.length > 0) {
    // Emit one card even if multiple cities shift
    const summary = dateShifts.length === 1 
      ? dateShifts[0]
      : `Multiple date shifts: ${dateShifts.slice(0, 2).join('; ')}${dateShifts.length > 2 ? '...' : ''}`;
    
    cards.push({
      type: 'DATE_PRESENCE_SHIFT',
      severity: 2,
      summary,
      affectedCities: affectedCities.length > 0 ? [...new Set(affectedCities)] : undefined,
      affectedDates: affectedDates.length > 0 ? [...new Set(affectedDates)] : undefined,
    });
  }
  
  // Rule 2: ROUTE_STRUCTURE_CHANGE (severity: 2 or 3)
  const baselineCities = extractBaseCities(baseline);
  const candidateCities = extractBaseCities(candidate);
  
  // Check for order changes, additions, or removals (using deduplicated lists)
  const orderChanged = baselineCities.length === candidateCities.length &&
    baselineCities.some((city, index) => city !== candidateCities[index]);
  const citiesAdded = candidateCities.filter(c => !baselineCities.includes(c));
  const citiesRemoved = baselineCities.filter(c => !candidateCities.includes(c));
  
  // Detect split stays and backtracking (using full sequence, not deduplicated)
  // Fix: Use extractCitySequence to preserve repeated cities for accurate detection
  const candidateCitySequence = extractCitySequence(candidate);
  const candidateSplitStays = detectSplitStay(candidateCitySequence);
  const candidateBacktracking = detectBacktracking(candidateCitySequence);
  
  const hasSplitStay = candidateSplitStays.length > 0;
  const hasBacktracking = candidateBacktracking.length > 0;
  const hasReorder = orderChanged && citiesAdded.length === 0 && citiesRemoved.length === 0;
  const hasAddRemove = citiesAdded.length > 0 || citiesRemoved.length > 0;
  
  if (hasSplitStay || hasBacktracking || hasReorder || hasAddRemove) {
    let severity: 2 | 3 = 2;
    let summaryParts: string[] = [];
    
    if (hasSplitStay || hasBacktracking) {
      severity = 3;
      if (hasSplitStay) {
        summaryParts.push(`split stays in ${candidateSplitStays.join(', ')}`);
      }
      if (hasBacktracking) {
        summaryParts.push(`backtracking to ${candidateBacktracking.join(', ')}`);
      }
    } else {
      if (hasReorder) {
        summaryParts.push('cities reordered');
      }
      if (citiesAdded.length > 0) {
        summaryParts.push(`${citiesAdded.length} city added`);
      }
      if (citiesRemoved.length > 0) {
        summaryParts.push(`${citiesRemoved.length} city removed`);
      }
    }
    
    const summary = `Route structure changes: ${summaryParts.join(', ')}`;
    const affectedCities = [
      ...(hasSplitStay ? candidateSplitStays : []),
      ...(hasBacktracking ? candidateBacktracking : []),
      ...citiesAdded,
      ...citiesRemoved,
    ];
    
    cards.push({
      type: 'ROUTE_STRUCTURE_CHANGE',
      severity,
      summary,
      affectedCities: affectedCities.length > 0 ? [...new Set(affectedCities)] : undefined,
    });
  }
  
  // Rule 3: TIME_STRESS (severity: 1)
  const timeStressIssues: string[] = [];
  
  // Check earlier arrival by ≥ 1 day
  for (const city of allCities) {
    const baselineDate = baselineArrivals.get(city);
    const candidateDate = candidateArrivals.get(city);
    
    if (baselineDate && candidateDate) {
      const baselineDateObj = new Date(baselineDate);
      const candidateDateObj = new Date(candidateDate);
      const daysDiff = (baselineDateObj.getTime() - candidateDateObj.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff >= 1) {
        timeStressIssues.push(`Earlier arrival in ${city} by ${Math.floor(daysDiff)} day(s)`);
      }
    }
  }
  
  // Check later departure by ≥ 1 day (compare inbound flight dates)
  const baselineInboundDate = new Date(baseline.inboundFlight.date);
  const candidateInboundDate = new Date(candidate.inboundFlight.date);
  const inboundDaysDiff = (candidateInboundDate.getTime() - baselineInboundDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (inboundDaysDiff >= 1) {
    timeStressIssues.push(`Later departure by ${Math.floor(inboundDaysDiff)} day(s)`);
  }
  
  // Check base stay reductions (nights reduced to 1 or less when baseline had more)
  // Fix: Correctly determine arrival and departure offsets to avoid mismatched legs
  const baselineCitiesSet = new Set(baselineCities);
  const candidateCitiesSet = new Set(candidateCities);
  const commonCities = [...baselineCitiesSet].filter(c => candidateCitiesSet.has(c));
  
  for (const city of commonCities) {
    // Get all BASE legs sorted by departureDayOffset
    const baselineLegs = baseline.groundRoute
      .filter(leg => leg.role === 'BASE')
      .sort((a, b) => a.departureDayOffset - b.departureDayOffset);
    const candidateLegs = candidate.groundRoute
      .filter(leg => leg.role === 'BASE')
      .sort((a, b) => a.departureDayOffset - b.departureDayOffset);
    
    // Determine arrival offset: smallest departureDayOffset where leg.toCity === city
    // If city is the first city (fromCity of first leg), arrival offset = 0
    let baselineArrivalOffset: number | null = null;
    let candidateArrivalOffset: number | null = null;
    
    // Check if city is the first city (fromCity of first leg)
    if (baselineLegs.length > 0 && baselineLegs[0].fromCity === city) {
      baselineArrivalOffset = 0;
    } else {
      // Find smallest departureDayOffset where city is toCity
      const arrivalLeg = baselineLegs.find(leg => leg.toCity === city);
      if (arrivalLeg) {
        baselineArrivalOffset = arrivalLeg.departureDayOffset;
      }
    }
    
    if (candidateLegs.length > 0 && candidateLegs[0].fromCity === city) {
      candidateArrivalOffset = 0;
    } else {
      const arrivalLeg = candidateLegs.find(leg => leg.toCity === city);
      if (arrivalLeg) {
        candidateArrivalOffset = arrivalLeg.departureDayOffset;
      }
    }
    
    // Determine departure offset: smallest departureDayOffset where
    // leg.fromCity === city AND departureDayOffset > arrivalOffset
    // If no such leg exists, use inbound flight date offset
    let baselineDepartureOffset: number | null = null;
    let candidateDepartureOffset: number | null = null;
    
    if (baselineArrivalOffset !== null) {
      const departureLeg = baselineLegs.find(leg => 
        leg.fromCity === city && 
        leg.departureDayOffset > baselineArrivalOffset!
      );
      
      if (departureLeg) {
        baselineDepartureOffset = departureLeg.departureDayOffset;
      } else {
        // No departure leg found - use inbound flight date offset
        const baselineInboundOffset = Math.ceil(
          (baselineInboundDate.getTime() - new Date(tripStartDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        baselineDepartureOffset = baselineInboundOffset;
      }
    }
    
    if (candidateArrivalOffset !== null) {
      const departureLeg = candidateLegs.find(leg => 
        leg.fromCity === city && 
        leg.departureDayOffset > candidateArrivalOffset!
      );
      
      if (departureLeg) {
        candidateDepartureOffset = departureLeg.departureDayOffset;
      } else {
        // No departure leg found - use inbound flight date offset
        const candidateInboundOffset = Math.ceil(
          (candidateInboundDate.getTime() - new Date(tripStartDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        candidateDepartureOffset = candidateInboundOffset;
      }
    }
    
    // Calculate nights = departureOffset - arrivalOffset
    if (baselineArrivalOffset !== null && baselineDepartureOffset !== null &&
        candidateArrivalOffset !== null && candidateDepartureOffset !== null) {
      const baselineNights = baselineDepartureOffset - baselineArrivalOffset;
      const candidateNights = candidateDepartureOffset - candidateArrivalOffset;
      
      // Emit TIME_STRESS if baseline nights > 1 AND candidate nights <= 1
      if (baselineNights > 1 && candidateNights <= 1) {
        timeStressIssues.push(`Stay in ${city} reduced from ${baselineNights} nights to ${candidateNights} night(s)`);
      }
    }
  }
  
  if (timeStressIssues.length > 0) {
    const summary = timeStressIssues.length === 1
      ? timeStressIssues[0]
      : `Candidate route introduces tighter travel days: ${timeStressIssues.slice(0, 2).join('; ')}${timeStressIssues.length > 2 ? '...' : ''}`;
    
    cards.push({
      type: 'TIME_STRESS',
      severity: 1,
      summary,
    });
  }
  
  // Sort cards by descending severity (BLOCKING > 3 > 2 > 1)
  cards.sort((a, b) => {
    const severityOrder: Record<string, number> = {
      'BLOCKING': 4,
      '3': 3,
      '2': 2,
      '1': 1,
    };
    
    const aOrder = severityOrder[String(a.severity)] || 0;
    const bOrder = severityOrder[String(b.severity)] || 0;
    
    return bOrder - aOrder;
  });
  
  return cards;
}

