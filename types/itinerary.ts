/**
 * Type definitions for itinerary generation
 */

export interface TravelTheme {
  type: 'place' | 'theme';
  normalizedPlace?: string; // Standardized place string if it's a place
  inferredRegion?: string; // Region to use for itinerary generation if theme
  tags?: string[]; // 2-6 keywords describing the theme
}

export interface MasterItinerariesRequest {
  origin?: string;
  destination: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  pace?: string;
  tripType?: string | string[];
  mustSee?: string[];
  budget?: string;
  travelers?: {
    adults?: number;
    kids?: number;
  };
  budgetType?: string;
  interests?: string[];
  travelTheme?: TravelTheme; // NEW: Theme classification data
  inferredRegion?: string; // NEW: Only if theme
  tags?: string[]; // NEW: Only if theme
  planningMode?: "auto" | "manual" | "map";
  userSelectedCities?: string[];
  primaryCountryCode?: string; // ISO country code for image resolution (e.g., "MA", "FR")
}







