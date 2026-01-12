import { StructuralRoute, OptimizedRouteOption } from './types';
import { findAirportCode } from '@/lib/airports';

/**
 * Flight selection data structure
 */
export interface SelectedFlightPair {
  outbound: {
    destination: string; // City name or IATA code
    date: string; // ISO date string (YYYY-MM-DD)
  };
  return: {
    origin: string; // City name or IATA code
    date: string; // ISO date string (YYYY-MM-DD)
  };
}

/**
 * Map selected flight pair to a candidate route from all optimized routes.
 * 
 * Matching logic:
 * 1. Outbound flight destination must match route's outboundFlight.toCity
 * 2. Return flight origin must match route's inboundFlight.fromCity
 * 3. Dates should match (or be within 1 day tolerance)
 * 
 * @param selectedFlights Selected outbound and return flights
 * @param allRoutes All OptimizedRouteOption[] from route optimizer
 * @returns Matching StructuralRoute or null if no match found
 */
export function mapFlightsToCandidateRoute(
  selectedFlights: SelectedFlightPair,
  allRoutes: OptimizedRouteOption[]
): StructuralRoute | null {
  if (!allRoutes || allRoutes.length === 0) {
    console.debug('[DEBUG][FlightToRouteMapper] No routes available');
    return null;
  }

  // Normalize flight cities (try to resolve to city name if IATA code)
  const normalizeCity = (cityOrCode: string): string => {
    // If it's already a city name (not 3-letter code), return as-is
    if (cityOrCode.length > 3 || !/^[A-Z]{3}$/.test(cityOrCode.toUpperCase())) {
      return cityOrCode;
    }
    // For IATA codes, we'd need a reverse lookup - for now, try to match directly
    // This is a simplification; in production, you'd want a proper airport-to-city mapping
    return cityOrCode;
  };

  const outboundDestination = normalizeCity(selectedFlights.outbound.destination);
  const returnOrigin = normalizeCity(selectedFlights.return.origin);

  // Try to find matching route
  for (const route of allRoutes) {
    const structural = route.structural;
    
    // Match outbound destination
    const outboundMatches = 
      structural.outboundFlight.toCity.toLowerCase() === outboundDestination.toLowerCase() ||
      structural.outboundFlight.toCity.toLowerCase().includes(outboundDestination.toLowerCase()) ||
      outboundDestination.toLowerCase().includes(structural.outboundFlight.toCity.toLowerCase());
    
    // Match return origin
    const returnMatches =
      structural.inboundFlight.fromCity.toLowerCase() === returnOrigin.toLowerCase() ||
      structural.inboundFlight.fromCity.toLowerCase().includes(returnOrigin.toLowerCase()) ||
      returnOrigin.toLowerCase().includes(structural.inboundFlight.fromCity.toLowerCase());
    
    // Match dates (within 1 day tolerance)
    const outboundDateMatch = datesMatch(
      selectedFlights.outbound.date,
      structural.outboundFlight.date,
      1
    );
    
    const returnDateMatch = datesMatch(
      selectedFlights.return.date,
      structural.inboundFlight.date,
      1
    );
    
    if (outboundMatches && returnMatches && outboundDateMatch && returnDateMatch) {
      console.debug('[DEBUG][FlightToRouteMapper] Found matching route', {
        routeId: route.id,
        outboundDestination,
        returnOrigin,
        outboundDate: selectedFlights.outbound.date,
        returnDate: selectedFlights.return.date,
      });
      return structural;
    }
  }

  console.debug('[DEBUG][FlightToRouteMapper] No matching route found', {
    outboundDestination,
    returnOrigin,
    outboundDate: selectedFlights.outbound.date,
    returnDate: selectedFlights.return.date,
    availableRoutes: allRoutes.length,
  });
  
  return null;
}

/**
 * Check if two dates match within tolerance (in days)
 */
function datesMatch(date1: string, date2: string, toleranceDays: number = 0): boolean {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= toleranceDays;
  } catch {
    return false;
  }
}

