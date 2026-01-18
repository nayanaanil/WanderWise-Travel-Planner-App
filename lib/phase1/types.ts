/**
 * Phase 1: Gateway + Flight Selection
 * 
 * This phase is responsible ONLY for:
 * - Resolving gateway-eligible cities from draft itinerary
 * - Finding bookable flight options for gateway pairs
 * - Ranking gateway + flight combinations
 * 
 * Phase 1 does NOT:
 * - Build ground routes
 * - Optimize city order
 * - Assign base stays
 * - Repair anchors
 * - Return multiple route options
 * - Mutate any existing spine
 */

export interface GatewayFlightsRequest {
  tripId: string;
  
  originCity: string; // e.g. "Bangalore"
  
  draftStops: {
    city: string; // e.g. "Fes"
    country?: string;
    desiredNights?: number;
  }[];
  
  dateWindow: {
    earliestStart: string; // ISO date string
    latestEnd: string; // ISO date string
  };
  
  passengers: {
    adults: number;
    children: number;
  };
  
  preferences?: {
    maxStops?: number;
    avoidRedEye?: boolean;
    cabinClass?: "economy" | "premium" | "business";
    budgetRange?: { min?: number; max?: number };
  };
}

export interface GatewayFlightsResponse {
  gatewayOptions: GatewayOption[];
}

export interface GatewayContext {
  city: string;
  rank: number; // 1 | 2 | 3
  strengths: {
    price: "best" | "good" | "weak";
    time: "best" | "good" | "weak";
    reliability: "best" | "good" | "weak";
  };
  tradeoff: {
    comparedTo: "price" | "time" | "reliability";
    description: string;
  };
  resolution: {
    type: "direct" | "resolved";
    originalCity?: string;
  };
}

export interface GatewayOption {
  id: string;
  
  outbound: {
    originCity: string; // user origin
    gatewayCity: string; // gateway-eligible only
    date: string; // ISO date
    flights: FlightOption[];
  };
  
  inbound: {
    gatewayCity: string;
    destinationCity: string; // user origin
    date: string; // ISO date
    flights: FlightOption[];
  };
  
  score: {
    totalPrice?: number;
    totalTravelTimeMinutes?: number;
    reliabilityScore?: number;
  };
  
  explanation: string[]; // factual, non-AI prose
  
  gatewayContext?: GatewayContext; // Derived context for AI explanation
}

/**
 * Flight leg (actual flight segment)
 */
export interface FlightLeg {
  fromAirport: string; // IATA code
  toAirport: string; // IATA code
  departureTimestamp: string; // ISO 8601 timestamp with timezone
  arrivalTimestamp: string; // ISO 8601 timestamp with timezone
  durationMinutes: number; // Flight duration in minutes
}

/**
 * Layover (stop between flight segments)
 */
export interface FlightLayover {
  layoverMinutes: number; // Layover duration in minutes
  airport: string; // IATA code of the connecting airport
}

/**
 * Union type for leg or layover
 */
export type FlightLegOrLayover = FlightLeg | FlightLayover;

export interface FlightOption {
  id: string;
  airline?: string;
  airlineName?: string;
  price: number;
  duration?: string;
  departureTime?: string; // HH:mm format (backward compatible)
  arrivalTime?: string; // HH:mm format (backward compatible)
  departureAirport?: string;
  arrivalAirport?: string;
  stops?: number;
  cheapest?: boolean;
  fastest?: boolean;
  recommended?: boolean;
  explanation?: string; // Short explanation for why this flight is recommended
  // New fields for accurate timezone-aware calculations
  departureTimestamp?: string; // ISO 8601 timestamp with timezone (e.g., "2026-01-10T03:30:00+05:30")
  arrivalTimestamp?: string; // ISO 8601 timestamp with timezone (e.g., "2026-01-10T12:45:00+01:00")
  // New field for detailed leg and layover information
  legs?: FlightLegOrLayover[]; // Array of legs and layovers in sequence
  [key: string]: any;
}




