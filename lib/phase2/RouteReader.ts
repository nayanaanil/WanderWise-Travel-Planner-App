/**
 * RouteReader: Strict Phase 2 Route Interpretation
 * 
 * This class provides a single source of truth for reading Phase 2 routes.
 * It emits steps in strict path order without any sorting, merging, or inference.
 * 
 * Rules:
 * - Steps are emitted in exact path order (outbound → groundRoute → inbound)
 * - Stays are path-scoped (computed per visit, not per city)
 * - Stay boundaries are determined by the next departure in the path
 * - Stay eligibility comes solely from derived.draftStayCities
 * - No sorting, no merging, no role-based inference
 */

import { Phase2StructuralRoute } from './types';

export type RouteStep =
  | { kind: 'OUTBOUND_FLIGHT'; from: string; to: string; date: string }
  | { kind: 'TRAVEL'; from: string; to: string; mode?: string }
  | { kind: 'STAY'; city: string; arrival: string; departure: string; nights: number }
  | { kind: 'INBOUND_FLIGHT'; from: string; to: string; date: string };

export class RouteReader {
  constructor(private route: Phase2StructuralRoute) {}

  *steps(): Generator<RouteStep> {
    const { outboundFlight, inboundFlight, groundRoute, derived } = this.route;

    // Helper to normalize city names for comparison
    const normalizeCity = (city: string): string => city.toLowerCase().trim();
    
    // Helper to check if a city is a stay city
    const isStayCity = (city: string): boolean => {
      const normalized = normalizeCity(city);
      return derived.draftStayCities?.some(c => normalizeCity(c) === normalized) ?? false;
    };

    // Helper to calculate days between dates
    const daysBetween = (arrivalStr: string, departureStr: string): number => {
      const arrival = new Date(arrivalStr + 'T00:00:00Z');
      const departure = new Date(departureStr + 'T00:00:00Z');
      return Math.round(
        (departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)
      );
    };

    // Helper to add days to a date string
    const addDays = (dateStr: string, days: number): string => {
      const date = new Date(dateStr + 'T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().split('T')[0];
    };

    // Step 1: Build visit sequence by walking the route path
    type Visit = {
      city: string;
      arrival: string;
      departure: string;
    };

    const visits: Visit[] = [];
    const startDate = outboundFlight.date;
    let currentCity = outboundFlight.toCity;
    let currentDate = startDate;

    // Walk through ground route legs to build visits
    for (const leg of groundRoute) {
      const nextCity = leg.toCity;
      // Arrival at nextCity is when the leg departs (departureDayOffset from trip start)
      // The leg.departureDayOffset represents when we leave currentCity
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
      departure: inboundFlight.date,
    });

    // Emit outbound flight (always first)
    yield {
      kind: 'OUTBOUND_FLIGHT',
      from: outboundFlight.fromCity,
      to: outboundFlight.toCity,
      date: outboundFlight.date,
    };

    // Step 2: Emit travel segments and stays in path order
    // visitIndex tracks which visit we're at (starts at 0 = outbound gateway)
    let visitIndex = 0;

    // Emit stay for outbound gateway visit if applicable
    if (visitIndex < visits.length) {
      const visit = visits[visitIndex];
      if (isStayCity(visit.city)) {
        const nights = daysBetween(visit.arrival, visit.departure);
        if (nights >= 1) {
          yield {
            kind: 'STAY',
            city: visit.city,
            arrival: visit.arrival,
            departure: visit.departure,
            nights,
          };
        }
      }
    }

    // Process each ground route leg
    for (const leg of groundRoute) {
      // Emit travel segment
      yield {
        kind: 'TRAVEL',
        from: leg.fromCity,
        to: leg.toCity,
        mode: leg.mode,
      };

      // Move to next visit (after traveling, we're at the destination)
      visitIndex++;

      // Emit stay for this visit if applicable
      if (visitIndex < visits.length) {
        const visit = visits[visitIndex];
        if (isStayCity(visit.city)) {
          const nights = daysBetween(visit.arrival, visit.departure);
          if (nights >= 1) {
            yield {
              kind: 'STAY',
              city: visit.city,
              arrival: visit.arrival,
              departure: visit.departure,
              nights,
            };
          }
        }
      }
    }

    // Emit inbound flight (always last)
    yield {
      kind: 'INBOUND_FLIGHT',
      from: inboundFlight.fromCity,
      to: inboundFlight.toCity,
      date: inboundFlight.date,
    };
  }
}

