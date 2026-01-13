/**
 * Trip state management utilities for sessionStorage persistence
 */

import type { HotelSearchResponse, HotelImpactResponse } from '@/lib/phase3/types';

export interface TripState {
  // Trip Input (Steps 1-4)
  tripInput?: {
    fromLocation?: {
      type: 'city' | 'searchPhrase';
      value: string;
      city?: any;
    };
    destination?: {
      type: 'city' | 'searchPhrase';
      value: string;
      city?: any;
    };
    dateRange?: {
      from: Date;
      to: Date;
    };
    adults?: number;
    kids?: number;
    budget?: string;
    budgetType?: string;
    pace?: string;
    styles?: string[];
    mustSeeItems?: string[];
  };
  
  // Legacy fields (for backward compatibility)
  fromLocation?: {
    type: 'city' | 'searchPhrase';
    value: string;
    city?: any;
  };
  destination?: {
    type: 'city' | 'searchPhrase';
    value: string;
    label?: string; // Display label (same as value if not specified)
    isFreeform?: boolean; // True if user entered free text, not from autocomplete
    city?: any;
    seasonalityAnchor?: {
      type: 'city' | 'country' | 'region';
      key: string; // Canonical key for seasonality data lookup (e.g., "Bali", "Indonesia", "Europe")
    };
  };
  // AI-derived fields (ephemeral, should not persist across destination changes)
  inferredRegion?: string; // AI-inferred region for theme-based trips
  aiTags?: string[]; // AI-generated tags (do NOT reuse user tags)
  travelTheme?: {
    type: string; // 'place' | 'theme'
    inferredRegion?: string; // Region to use for itinerary generation if theme
    tags?: string[]; // 2-6 keywords describing the theme
  };
  dateRange?: {
    from: Date;
    to: Date;
  };
  duration?: string; // Duration bucket: '3-5', '6-8', '9-11', '12-15'
  preferredMonth?: string; // Preferred month for travel (e.g., 'Jan', 'Feb', etc.)
  adults?: number;
  kids?: number;
  budget?: string;
  budgetType?: string;
  pace?: string;
  styles?: string[];
  mustSeeItems?: string[];
  planningMode?: 'auto' | 'manual' | 'map';
  userSelectedCities?: string[];
  
  // UI State
  ui?: {
    expandedCard?: string | null;
    selectedItinerary?: string | null;
  };
  
  // Draft Itineraries (high-level concepts)
  draftItineraries?: Array<{
    id: string;
    title: string;
    summary: string;
    cities: Array<{
      name: string;
      nights: number;
      activities: string[];
      coordinates?: { lat: number; lng: number }; // Optional coordinates from AI
    }>;
    experienceStyle?: string; // Short descriptive phrase (6-10 words)
    bestFor?: string[]; // Array of 2-4 tags describing who this suits best
    whyThisTrip?: string[]; // Array of exactly 3 differentiating bullet points
  }> | null;
  selectedDraftItineraryId?: string | null; // ID of selected draft itinerary
  
  // Trip planning phase
  phase?: 'DRAFT_SELECTED' | 'FLIGHTS_LOADING' | 'FLIGHTS_SELECTING' | 'FLIGHTS_REVIEW' | 'FLIGHTS_SELECTED' | 'FLIGHTS_LOCKED' | 'ROUTE_BUILDING' | 'ROUTE_READY' | 'ROUTE_BUILT' | 'COMPLETE';
  
  // Finalized Trip
  finalItinerary?: any; // Finalized itinerary with selected options
  
  // Transport Selection
  selectedTransport?: { [segmentId: string]: any }; // Selected transport options by segment ID
  
  // Hotel Selection
  selectedHotels?: {
    [city: string]: {
      hotelId: string;
      name: string;
      image?: string;
      rating?: number;
      pricePerNight?: number;
      // Availability context (persisted from selection time)
      availabilityStatus?: 'available' | 'limited' | 'unavailable';
      availabilityConfidence?: 'high' | 'medium' | 'low';
      availabilityReason?: string;
      restrictions?: string[];
    };
  };
  
  // Generated Activities Cache (per city)
  generatedActivitiesByCity?: {
    [city: string]: Array<{
      id: string;
      city: string;
      name: string;
      description: string;
      tags: {
        bestTime: Array<'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night'>;
        durationSlots: 1 | 2;
        vibe: 'relaxed' | 'cultural' | 'adventurous' | 'social';
        crowdLevel: 'low' | 'medium' | 'high';
      };
    }>;
  };
  
  // Activity Prefetch Status (coordination flag)
  activityPrefetchStatus?: 'idle' | 'in_progress' | 'complete';
  
  // Flight Selection
  selectedFlights?: {
    outbound?: any; // Selected outbound flight option
    return?: any; // Selected return flight option
  };
  
  // Phase 1 Gateway Options (from Phase 1 API)
  gatewayOptions?: Array<{
    id: string;
    outbound: {
      originCity: string;
      gatewayCity: string;
      date: string;
      flights: any[];
    };
    inbound: {
      gatewayCity: string;
      destinationCity: string;
      date: string;
      flights: any[];
    };
    score: {
      totalPrice?: number;
      totalTravelTimeMinutes?: number;
      reliabilityScore?: number;
    };
    explanation: string[];
  }>;
  
  // Locked Flight Anchors (immutable after Phase 1 confirmation)
  lockedFlightAnchors?: {
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
  
  // Phase 2 Structural Route (built from locked flight anchors)
  structuralRoute?: {
    id: string;
    outboundFlight: {
      fromCity: string;
      toCity: string;
      date: string; // ISO date string
      // Additional flight properties (from selected flights)
      price?: number;
      airline?: string;
      airlineName?: string;
      duration?: string;
      departureTime?: string;
      arrivalTime?: string;
      departureAirport?: string;
      arrivalAirport?: string;
      stops?: number;
      gatewayOption?: string;
      originCity?: string;
      gatewayCity?: string;
      [key: string]: any; // Allow any additional properties
    };
    inboundFlight: {
      fromCity: string;
      toCity: string;
      date: string; // ISO date string
      // Additional flight properties (from selected flights)
      price?: number;
      airline?: string;
      airlineName?: string;
      duration?: string;
      departureTime?: string;
      arrivalTime?: string;
      departureAirport?: string;
      arrivalAirport?: string;
      stops?: number;
      gatewayOption?: string;
      gatewayCity?: string;
      destinationCity?: string;
      [key: string]: any; // Allow any additional properties
    };
    groundRoute: Array<{
      fromCity: string;
      toCity: string;
      departureDayOffset: number;
      estimatedDurationMinutes?: number;
      modeHint?: string;
      role?: string;
      mode?: string;
    }>;
    derived: {
      arrivalDates: Record<string, string>;
      departureDates: Record<string, string>;
      totalTripDays: number;
      inboundSlackDays: number;
      draftStayCities?: string[];
    };
  };
  
  // Phase 3 Hotel Search Results
  hotelSearchResults?: HotelSearchResponse;
  
  // Phase 3 Hotel Impact Results
  hotelImpactResult?: HotelImpactResponse;
  
  // Phase 3 Locked Hotel Stays (persist across selections)
  lockedHotelStays?: Array<{
    city: string;
    hotelId: string;
    checkIn: string;
    checkOut: string;
  }>;
  
  // Phase 3 Hotel Booking Failure Context (for recovery UI)
  hotelBookingFailure?: {
    hotelId: string;
    hotelName: string;
    city: string;
    reason: 'sold_out' | 'room_type_unavailable' | 'price_changed' | 'date_incompatible';
    alternatives?: {
      sameHotelRoomTypes?: string[];
      nearbyHotels?: Array<{
        id: string;
        name: string;
        city: string;
        pricePerNight?: number;
        rating?: number;
        amenities?: string[];
        availabilityStatus: 'available' | 'limited' | 'unavailable';
        availabilityConfidence: 'high' | 'medium' | 'low';
        availabilityReason?: string;
      }>;
    };
  };
  
  // Optimized Route (authoritative trip spine)
  optimizedRoute?: {
    id: string;
    outboundFlight: {
      fromCity: string;
      toCity: string;
      date: string; // ISO date string
    };
    inboundFlight: {
      fromCity: string;
      toCity: string;
      date: string; // ISO date string
    };
    groundRoute: Array<{
      fromCity: string;
      toCity: string;
      departureDayOffset: number;
      estimatedDurationMinutes?: number;
      modeHint?: string;
      role?: string;
    }>;
  };
  
  // Baseline Route (for impact comparison)
  baselineRoute?: {
    routeId: string;
    structuralRoute: any; // Full StructuralRoute object
    tripStartDate: string; // ISO date string (YYYY-MM-DD)
  };
  
  // All Routes (for candidate route mapping)
  allOptimizedRoutes?: any[]; // Full OptimizedRouteOption[] array from route optimizer
}

// Draft Itinerary type (exported for use in other files)
export interface DraftItinerary {
  id: string;
  title: string;
  summary: string;
  cities: Array<{
    name: string;
    nights: number;
    activities: string[];
    coordinates?: { lat: number; lng: number }; // Optional coordinates from AI
  }>;
  experienceStyle?: string; // Short descriptive phrase (6-10 words)
  bestFor?: string[]; // Array of 2-4 tags describing who this suits best
  whyThisTrip?: string[]; // Array of exactly 3 differentiating bullet points
  primaryCountryCode?: string; // ISO country code for image resolution (e.g., "MA", "FR")
  imageFolder?: string; // AI-selected image folder when primaryCountryCode is missing (e.g., "FR", "european-christmas-markets", "_default")
}

const TRIP_STATE_KEY = 'tripState';

/**
 * Save trip state to sessionStorage
 */
export function saveTripState(state: Partial<TripState>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const currentState = getTripState();
    const updatedState = { ...currentState, ...state };
    
    // Convert Date objects to ISO strings for storage
    const serializableState: any = {
      ...updatedState,
      dateRange: updatedState.dateRange ? {
        from: updatedState.dateRange.from instanceof Date 
          ? updatedState.dateRange.from.toISOString() 
          : updatedState.dateRange.from,
        to: updatedState.dateRange.to instanceof Date 
          ? updatedState.dateRange.to.toISOString() 
          : updatedState.dateRange.to,
      } : undefined,
    };
    
    // Handle nested dateRange in tripInput
    if (serializableState.tripInput?.dateRange) {
      serializableState.tripInput.dateRange = {
        from: serializableState.tripInput.dateRange.from instanceof Date 
          ? serializableState.tripInput.dateRange.from.toISOString() 
          : serializableState.tripInput.dateRange.from,
        to: serializableState.tripInput.dateRange.to instanceof Date 
          ? serializableState.tripInput.dateRange.to.toISOString() 
          : serializableState.tripInput.dateRange.to,
      };
    }
    
    sessionStorage.setItem(TRIP_STATE_KEY, JSON.stringify(serializableState));
  } catch (error) {
    console.error('Error saving trip state:', error);
  }
}

/**
 * Get trip state from sessionStorage
 */
export function getTripState(): TripState {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = sessionStorage.getItem(TRIP_STATE_KEY);
    if (!stored) return {};
    
    const parsed = JSON.parse(stored);
    
    // Convert ISO strings back to Date objects
    if (parsed.dateRange) {
      parsed.dateRange = {
        from: parsed.dateRange.from ? (parsed.dateRange.from instanceof Date ? parsed.dateRange.from : new Date(parsed.dateRange.from)) : undefined,
        to: parsed.dateRange.to ? (parsed.dateRange.to instanceof Date ? parsed.dateRange.to : new Date(parsed.dateRange.to)) : undefined,
      };
    }
    
    // Handle nested dateRange in tripInput
    if (parsed.tripInput?.dateRange) {
      parsed.tripInput.dateRange = {
        from: parsed.tripInput.dateRange.from ? (parsed.tripInput.dateRange.from instanceof Date ? parsed.tripInput.dateRange.from : new Date(parsed.tripInput.dateRange.from)) : undefined,
        to: parsed.tripInput.dateRange.to ? (parsed.tripInput.dateRange.to instanceof Date ? parsed.tripInput.dateRange.to : new Date(parsed.tripInput.dateRange.to)) : undefined,
      };
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading trip state:', error);
    return {};
  }
}

/**
 * Clear trip state from sessionStorage
 */
export function clearTripState(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TRIP_STATE_KEY);
}

/**
 * Get a specific field from trip state
 */
export function getTripField<K extends keyof TripState>(field: K): TripState[K] {
  const state = getTripState();
  return state[field];
}

/**
 * Draft Itinerary Management Functions
 */

/**
 * Set draft itineraries
 * @param itineraries Array of draft itinerary objects
 */
export function setDraftItineraries(itineraries: DraftItinerary[]): void {
  saveTripState({
    draftItineraries: itineraries,
  });
}

/**
 * Set selected draft itinerary ID
 * @param itineraryId ID of the selected draft itinerary
 */
export function setSelectedDraftItinerary(itineraryId: string): void {
  saveTripState({
    selectedDraftItineraryId: itineraryId,
    phase: 'DRAFT_SELECTED',
    ui: {
      ...getTripState().ui,
      selectedItinerary: itineraryId,
    },
  });
}

/**
 * Get selected draft itinerary
 */
export function getSelectedDraftItinerary(): DraftItinerary | null {
  const state = getTripState();
  if (!state.selectedDraftItineraryId || !state.draftItineraries) {
    return null;
  }
  return state.draftItineraries.find(it => it.id === state.selectedDraftItineraryId) || null;
}

/**
 * Clear AI-derived fields (inferredRegion, aiTags, travelTheme)
 * These are ephemeral and should not persist across destination changes
 */
export function clearAIDerivedFields(): void {
  saveTripState({
    inferredRegion: undefined,
    aiTags: undefined,
    travelTheme: undefined,
  });
}

/**
 * Complete trip state reset - clears ALL trip data
 * Use this when starting a completely new trip
 * This is a HARD RESET - no data carries over
 */
export function resetAllTripState(): void {
  // Clear all trip state fields
  saveTripState({
    // Core planning inputs
    tripInput: undefined,
    fromLocation: undefined,
    destination: undefined,
    dateRange: undefined,
    duration: undefined,
    preferredMonth: undefined,
    adults: undefined,
    kids: undefined,
    budget: undefined,
    budgetType: undefined,
    pace: undefined,
    styles: undefined,
    mustSeeItems: undefined,
    planningMode: undefined,
    userSelectedCities: undefined,
    
    // AI-derived fields
    inferredRegion: undefined,
    aiTags: undefined,
    travelTheme: undefined,
    
    // UI State
    ui: undefined,
    
    // Draft Itineraries
    draftItineraries: undefined,
    selectedDraftItineraryId: undefined,
    
    // Phase
    phase: undefined,
    
    // Finalized Trip
    finalItinerary: undefined,
    
    // Transport Selection
    selectedTransport: undefined,
    
    // Hotel Selection & Booking
    selectedHotels: undefined,
    hotelSearchResults: undefined,
    hotelImpactResult: undefined,
    lockedHotelStays: undefined,
    hotelBookingFailure: undefined,
    
    // Generated Activities Cache
    generatedActivitiesByCity: undefined,
    activityPrefetchStatus: 'idle', // Reset to idle, not undefined
    
    // Flight Selection
    selectedFlights: undefined,
    gatewayOptions: undefined,
    lockedFlightAnchors: undefined,
    
    // Routes
    structuralRoute: undefined,
    optimizedRoute: undefined,
    baselineRoute: undefined,
    allOptimizedRoutes: undefined,
  });
  
  console.log('[ResetTrip] All trip state cleared - starting fresh');
}

/**
 * Reset itinerary data - clears all itinerary-related state
 * Call this when starting a new trip to prevent stale data
 */
export function resetItineraryData(): void {
  saveTripState({
    draftItineraries: null,
    selectedDraftItineraryId: null,
    ui: {
      ...getTripState().ui,
      expandedCard: null,
      selectedItinerary: null,
    },
  });
}

/**
 * Transport Selection Management Functions
 */

/**
 * Set selected transport option for a specific segment
 * @param segmentId Unique identifier for the transport segment (e.g., "cityA-cityB")
 * @param option Transport option object to save
 */
export function setSelectedTransport(segmentId: string, option: any): void {
  const state = getTripState();
  const currentTransport = state.selectedTransport || {};
  
  saveTripState({
    selectedTransport: {
      ...currentTransport,
      [segmentId]: option,
    },
  });
}

/**
 * Get all selected transport options
 * @returns Object mapping segment IDs to selected transport options
 */
export function getSelectedTransport(): { [segmentId: string]: any } {
  const state = getTripState();
  return state.selectedTransport || {};
}

/**
 * Clear all selected transport options
 * Does not affect draft itinerary or other trip state
 */
export function clearTransport(): void {
  saveTripState({
    selectedTransport: undefined,
  });
}

/**
 * Hotel Selection Management Functions
 */

/**
 * Set selected hotel option for a specific city
 * @param cityName Name of the city for hotel selection
 * @param option Hotel option object to save
 */
export function setSelectedHotel(cityName: string, option: any): void {
  const state = getTripState();
  const currentHotels = state.selectedHotels || {};
  
  saveTripState({
    selectedHotels: {
      ...currentHotels,
      [cityName]: option,
    },
  });
}

/**
 * Get all selected hotel options
 * @returns Object mapping city names to selected hotel options
 */
export function getSelectedHotels(): { [cityName: string]: any } {
  const state = getTripState();
  return state.selectedHotels || {};
}

/**
 * Clear all selected hotel options
 * Does not affect draft itinerary or other trip state
 */
export function clearHotels(): void {
  saveTripState({
    selectedHotels: undefined,
  });
}

/**
 * Flight Selection Management Functions
 */

/**
 * Set selected flight option for a specific leg
 * @param type Flight leg type: "outbound" or "return"
 * @param option Flight option object to save
 */
export function setSelectedFlight(type: "outbound" | "return", option: any): void {
  const state = getTripState();
  const currentFlights = state.selectedFlights || {};
  
  saveTripState({
    selectedFlights: {
      ...currentFlights,
      [type]: option,
    },
  });
}

/**
 * Get all selected flight options
 * @returns Object containing outbound and return flight options
 */
export function getSelectedFlights(): {
  outbound?: any;
  return?: any;
} {
  const state = getTripState();
  return state.selectedFlights || {};
}

/**
 * Clear all selected flight options
 * Does not affect draft itinerary or other trip state
 */
export function clearFlights(): void {
  saveTripState({
    selectedFlights: undefined,
  });
}

/**
 * Optimized Route Management Functions
 */

/**
 * Set optimized route (authoritative trip spine)
 * @param route Optimized route object to persist
 */
export function setOptimizedRoute(route: {
  id: string;
  outboundFlight: {
    fromCity: string;
    toCity: string;
    date: string;
  };
  inboundFlight: {
    fromCity: string;
    toCity: string;
    date: string;
  };
  groundRoute: Array<{
    fromCity: string;
    toCity: string;
    departureDayOffset: number;
    estimatedDurationMinutes?: number;
    modeHint?: string;
    role?: string;
  }>;
}): void {
  saveTripState({
    optimizedRoute: route,
  });
  console.debug('[DEBUG][TripState] Optimized route fetched and stored', {
    routeId: route.id,
    groundRouteLength: route.groundRoute.length,
  });
}

/**
 * Get optimized route from trip state
 * @returns Optimized route object or null if not set
 */
export function getOptimizedRoute(): {
  id: string;
  outboundFlight: {
    fromCity: string;
    toCity: string;
    date: string;
  };
  inboundFlight: {
    fromCity: string;
    toCity: string;
    date: string;
  };
  groundRoute: Array<{
    fromCity: string;
    toCity: string;
    departureDayOffset: number;
    estimatedDurationMinutes?: number;
    modeHint?: string;
    role?: string;
  }>;
} | null {
  const state = getTripState();
  if (state.optimizedRoute) {
    console.debug('[DEBUG][TripState] Optimized route loaded from storage', {
      routeId: state.optimizedRoute.id,
      groundRouteLength: state.optimizedRoute.groundRoute.length,
    });
  }
  return state.optimizedRoute || null;
}

/**
 * Clear optimized route
 * Does not affect draft itinerary or other trip state
 */
export function clearOptimizedRoute(): void {
  saveTripState({
    optimizedRoute: undefined,
  });
}

/**
 * Baseline Route Management Functions
 */

/**
 * Set baseline route (for impact comparison)
 * @param routeId ID of the baseline route
 * @param structuralRoute Full StructuralRoute object
 * @param tripStartDate ISO date string (YYYY-MM-DD) for trip start
 */
export function setBaselineRoute(
  routeId: string,
  structuralRoute: any,
  tripStartDate: string
): void {
  saveTripState({
    baselineRoute: {
      routeId,
      structuralRoute,
      tripStartDate,
    },
  });
  console.debug('[DEBUG][TripState] Baseline route stored', { routeId });
}

/**
 * Get baseline route from trip state
 * @returns Baseline route object or null if not set
 */
export function getBaselineRoute(): {
  routeId: string;
  structuralRoute: any;
  tripStartDate: string;
} | null {
  const state = getTripState();
  if (state.baselineRoute) {
    console.debug('[DEBUG][TripState] Baseline route loaded from storage', {
      routeId: state.baselineRoute.routeId,
    });
  }
  return state.baselineRoute || null;
}

/**
 * Clear baseline route
 */
export function clearBaselineRoute(): void {
  saveTripState({
    baselineRoute: undefined,
  });
}

/**
 * All Routes Management Functions
 */

/**
 * Set all optimized routes (for candidate route mapping)
 * @param routes Full OptimizedRouteOption[] array from route optimizer
 */
export function setAllOptimizedRoutes(routes: any[]): void {
  saveTripState({
    allOptimizedRoutes: routes,
  });
  console.debug('[DEBUG][TripState] All optimized routes stored', { count: routes.length });
}

/**
 * Get all optimized routes from trip state
 * @returns Array of OptimizedRouteOption or empty array
 */
export function getAllOptimizedRoutes(): any[] {
  const state = getTripState();
  return state.allOptimizedRoutes || [];
}

/**
 * Clear all optimized routes
 */
export function clearAllOptimizedRoutes(): void {
  saveTripState({
    allOptimizedRoutes: undefined,
  });
}

