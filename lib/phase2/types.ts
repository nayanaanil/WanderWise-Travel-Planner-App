/**
 * Phase 2: Ground Route Builder
 * 
 * This phase is responsible ONLY for:
 * - Computing deterministic ground routes from locked flight anchors
 * - Ordering base cities geographically
 * - Assigning day offsets and deriving dates
 * 
 * Phase 2 does NOT:
 * - Select or modify flight anchors
 * - Search for flights
 * - Optimize for pricing or time
 * - Generate multiple route options
 * - Handle hotel availability
 * - Schedule activities
 */

import { StructuralRoute, GroundLeg, FlightAnchor } from '@/lib/route-optimizer/types';

/**
 * Phase 2 API request
 */
export interface GroundRouteRequest {
  tripId: string;

  lockedFlightAnchors: {
    outboundFlight: {
      fromCity: string; // user origin
      toCity: string; // outbound gateway (locked, immutable)
      date: string; // ISO date
    };
    inboundFlight: {
      fromCity: string; // inbound gateway (locked, immutable)
      toCity: string; // user origin
      date: string; // ISO date
    };
  };

  draftStops: {
    city: string;
    desiredNights?: number; // soft preference only
  }[];

  draftStayCities: {
    city: string;
    desiredNights?: number; // source of truth for stay intent (includes gateways)
  }[];

  preferences?: {
    maxDailyTravelHours?: number;
    avoidBacktracking?: boolean;
    preferredModes?: ('train' | 'car' | 'bus')[];
  };
}

/**
 * Phase 2 API response
 */
export interface GroundRouteResponse {
  structuralRoute: Phase2StructuralRoute;
}

/**
 * Phase 2 StructuralRoute (extends base with derived metadata)
 */
export interface Phase2StructuralRoute extends Omit<StructuralRoute, 'summary' | 'itineraryImpact'> {
  // Inherits: outboundFlight, inboundFlight, groundRoute, id
  
  derived: {
    arrivalDates: Record<string, string>; // city name → ISO date
    departureDates: Record<string, string>; // city name → ISO date
    totalTripDays: number;
    inboundSlackDays: number; // days between derived arrival at inbound gateway and inbound flight date (positive = buffer, negative = overrun)
    draftStayCities: string[]; // source of truth for stay eligibility (preserves original draft intent, includes gateways)
  };
}

/**
 * Phase 2 GroundLeg (extends base with role)
 */
export interface Phase2GroundLeg extends GroundLeg {
  role: 'TRANSFER' | 'BASE';
  mode: 'train' | 'car' | 'bus';
}

