export type ConfidenceLevel = 'high' | 'medium' | 'price-sensitive';

/**
 * Trip scope determines flight anchor eligibility rules.
 * - 'long-haul': Origin country differs from destination region (strict eligibility)
 * - 'short-haul': Same region/country (all cities eligible)
 */
export type TripScope = 'long-haul' | 'short-haul';

/**
 * High‑level input describing the traveler, trip and constraints.
 * This is the only shape accepted by the public API.
 */
export interface RouteOptimizerInput {
  /** Origin city for the overall trip (e.g. home city) */
  originCity: string;
  /** Final return city for the overall trip (often same as origin) */
  returnCity?: string;

  /** Inclusive trip date range (ISO 8601, e.g. 2025-03-10) */
  startDate: string;
  endDate: string;

  /** Ordered list of primary cities/regions that should be visited */
  stops: RouteStop[];

  /** Optional fixed or preferred outbound flight anchor */
  outboundFlightAnchor?: FlightAnchor;

  /** Optional fixed or preferred inbound/return flight anchor */
  inboundFlightAnchor?: FlightAnchor;

  /** User preferences and constraints for optimization */
  preferences?: RoutePreferences;
}

export interface RouteStop {
  city: string;
  countryCode?: string;
  /** Number of nights to stay; 0 means pass-through only */
  nights?: number;
  /** If true, this stop must appear in the route */
  required?: boolean;
}

export interface FlightAnchor {
  fromCity: string;
  toCity: string;
  /** ISO 8601 date string (YYYY-MM-DD) for departure */
  date: string;
  /** Optional time window constraints in local time (HH:mm) */
  timeWindow?: {
    earliest?: string;
    latest?: string;
  };
  /** Maximum number of allowed stops / layovers */
  maxStops?: number;
  /** Optional upper bound on acceptable price in source currency */
  maxPrice?: number;
}

export interface GroundLeg {
  /** City name of leg origin */
  fromCity: string;
  /** City name of leg destination */
  toCity: string;
  /** Day offset from trip start when this leg departs (0‑based) */
  departureDayOffset: number;
  /** Expected duration of the leg in minutes (structural estimate) */
  estimatedDurationMinutes?: number;
  /** Preferred or assumed mode for this leg */
  modeHint?: 'train' | 'bus' | 'car' | 'flight' | 'ferry' | 'ground-transfer';
  /** Role of this leg in the route structure */
  role?: 'BASE' | 'EXCURSION';
}

/**
 * A purely structural representation of a candidate route:
 * which cities in which order, how they are connected, and
 * which flights anchor the trip.
 */
export interface StructuralRoute {
  /** Stable identifier for this route candidate */
  id: string;

  /** Human‑readable description of the core structure */
  summary: string;

  /** Outbound flight anchor actually used for this route */
  outboundFlight: FlightAnchor;

  /** Inbound / return flight anchor used for this route */
  inboundFlight: FlightAnchor;

  /** Ordered ground segments between cities */
  groundRoute: GroundLeg[];

  /** Optional observability data tracking structural corrections applied to original intent */
  itineraryImpact?: import('./itineraryImpact').ItineraryImpact;
}

export interface RouteMetrics {
  /** Total estimated price for the entire trip (in base currency) */
  totalPrice: number;

  /** Total in‑vehicle travel time (minutes) across flights + ground */
  totalTravelMinutes: number;

  /** Sum of layover / connection times in minutes */
  totalTransferMinutes: number;

  /** Number of distinct transport segments (flights + ground legs) */
  totalTransfers: number;

  /** 0–1 reliability of data sources (1 = real, 0 = pure heuristic) */
  reliabilityScore: number;

  /** Indicates if pricing is real, mixed, or mock/placeholder */
  pricingSource: 'real' | 'mixed' | 'mock';
}

/**
 * A structural route with attached quantitative & qualitative evaluation.
 * This is an internal type — not returned directly by the API.
 */
export interface EvaluatedRoute {
  structural: StructuralRoute;
  metrics: RouteMetrics;
  /** Bullet‑point explanations of tradeoffs, assumptions, caveats */
  explanations: string[];
}

/**
 * Final option returned to the UI after ranking and trimming.
 * Contains both structure and key metrics, plus a confidence label.
 */
export interface OptimizedRouteOption {
  id: string;

  /** Short label suitable for cards, e.g. "Fastest via Vienna" */
  title: string;

  /** One‑line summary of why this route is recommended */
  summary: string;

  /** Underlying structural plan for the route */
  structural: StructuralRoute;

  /** Quantitative metrics used for ranking and display */
  metrics: RouteMetrics;

  /** Explanation bullets surfaced to the user */
  explanations: string[];

  /** Overall confidence in this recommendation */
  confidence: ConfidenceLevel;

  /** Higher score = better (used for sorting/ranking) */
  score: number;
}

export interface RoutePreferences {
  /** Primary objective for optimization */
  objective?: 'balanced' | 'price' | 'time' | 'comfort';
  /** Maximum acceptable total budget (same currency as metrics.totalPrice) */
  maxBudget?: number;
  /** Maximum acceptable total travel time in minutes */
  maxTotalTravelMinutes?: number;
  /** Maximum number of transfers across the whole trip */
  maxTransfers?: number;
  /** Whether to strongly prefer rail / coach over short flights */
  preferLowCarbon?: boolean;
}


