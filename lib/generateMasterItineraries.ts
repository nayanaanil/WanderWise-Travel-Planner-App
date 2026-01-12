/**
 * Generate draft itineraries using the draft API
 */

import { getTripState, saveTripState } from './tripState';
import { MasterItinerariesRequest } from '@/types/itinerary';

// Draft Itinerary structure
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

interface DraftItinerariesResponse {
  itineraries: DraftItinerary[];
}

// Global flag to prevent concurrent generation calls
let isGenerating = false;
let generationPromise: Promise<DraftItinerary[]> | null = null;

/**
 * Generate draft itineraries by calling the draft API
 * Returns draft itineraries exactly as provided by the API
 */
export async function generateMasterItineraries(): Promise<DraftItinerary[]> {
  const timestamp = Date.now();
  const stackTrace = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
  console.log(`>>> GENERATION TRIGGERED FROM: ${stackTrace}, timestamp: ${timestamp}`);

  const tripState = getTripState();

  // Validate required fields
  if (!tripState.destination?.value) {
    throw new Error('Destination is required');
  }

  if (!tripState.dateRange?.from || !tripState.dateRange?.to) {
    throw new Error('Start date and end date are required');
  }

  // Check if already generated
  if (tripState.draftItineraries && tripState.draftItineraries.length > 0) {
    console.log(`>>> GENERATION SKIPPED: Draft itineraries already exist (${tripState.draftItineraries.length} items)`);
    return tripState.draftItineraries;
  }

  // Prevent concurrent generation calls
  if (isGenerating && generationPromise) {
    console.log(`>>> GENERATION SKIPPED: Already in progress, returning existing promise (timestamp: ${timestamp})`);
    return generationPromise;
  }

  // Mark as generating and create promise
  console.log(`>>> GENERATION STARTING: Setting isGenerating=true (timestamp: ${timestamp})`);
  isGenerating = true;
  generationPromise = (async () => {
    try {
      // Validate dateRange before using it
      const dateRange = tripState.dateRange;
      
      if (!dateRange?.from || !dateRange?.to) {
        console.error(">>> ERROR: Missing or invalid dateRange in tripState:", dateRange);
        throw new Error("Start date and end date must be selected before generating itineraries.");
      }

      // Convert dates to ISO strings
      const startDate = dateRange.from.toISOString().split('T')[0]; // YYYY-MM-DD format
      const endDate = dateRange.to.toISOString().split('T')[0]; // YYYY-MM-DD format

      // DEV-ONLY: Runtime guard to detect AI field leaks (non-blocking)
      if (process.env.NODE_ENV === 'development') {
        if (tripState.inferredRegion || tripState.travelTheme || tripState.aiTags?.length) {
          console.warn('⚠️ AI-derived fields leaked into itinerary generation', {
            inferredRegion: tripState.inferredRegion,
            travelTheme: tripState.travelTheme,
            aiTags: tripState.aiTags,
          });
        }
      }

      // Extract primaryCountryCode from destination
      let primaryCountryCode: string | undefined;
      
      // Priority 1: If destination has a city object with countryCode, use it
      if (tripState.destination?.city?.countryCode) {
        primaryCountryCode = tripState.destination.city.countryCode;
      }
      // Priority 2: If destination type is "searchPhrase" (could be a country), look it up
      else if (tripState.destination?.type === 'searchPhrase') {
        // Fetch countries list to look up country code
        try {
          const countriesResponse = await fetch('/api/cities?q=');
          if (countriesResponse.ok) {
            const countriesData = await countriesResponse.json();
            const countries = countriesData.countries || [];
            const destinationValue = tripState.destination.value;
            
            // Find matching country (case-insensitive)
            const matchedCountry = countries.find((c: any) => 
              c.name.toLowerCase() === destinationValue.toLowerCase()
            );
            
            if (matchedCountry?.countryCode) {
              primaryCountryCode = matchedCountry.countryCode;
            }
          }
        } catch (error) {
          // Silent fail - primaryCountryCode remains undefined
          console.debug('Failed to fetch countries for country code lookup:', error);
        }
      }

      // Prepare request body - only include explicit user intent
      // DO NOT include AI-derived fields (travelTheme, inferredRegion, aiTags)
      // These will be recomputed inside the API if needed
      // Note: tripState.destination is validated at the start of the function (line 46)
      const requestBody: MasterItinerariesRequest = {
        origin: tripState.fromLocation?.value,
        destination: tripState.destination!.value,
        startDate,
        endDate,
        pace: tripState.pace,
        tripType: tripState.styles && tripState.styles.length > 0 ? tripState.styles : undefined,
        interests: tripState.styles && tripState.styles.length > 0 ? tripState.styles : undefined,
        mustSee: tripState.mustSeeItems && tripState.mustSeeItems.length > 0 ? tripState.mustSeeItems : undefined,
        budget: tripState.budget,
        travelers: {
          adults: tripState.adults,
          kids: tripState.kids,
        },
        budgetType: tripState.budgetType,
        planningMode: tripState.planningMode,
        userSelectedCities: tripState.userSelectedCities && tripState.userSelectedCities.length > 0 ? tripState.userSelectedCities : undefined,
        primaryCountryCode: primaryCountryCode,
        // Explicitly exclude: travelTheme, inferredRegion, tags
      };

      // Call the draft API
      console.log('[DRAFT_API_REQUEST_PAYLOAD]', requestBody);
      console.log(`>>> GENERATION API CALL: Fetching from /api/itinerary/draft (timestamp: ${Date.now()})`);
      const response = await fetch('/api/itinerary/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
      }

      const data: DraftItinerariesResponse = await response.json();

      // Validate response
      if (!data.itineraries || !Array.isArray(data.itineraries)) {
        throw new Error('Invalid response format: missing itineraries array');
      }

      const draftItineraries = data.itineraries;

      // Save to trip state
      saveTripState({
        draftItineraries: draftItineraries,
      });

      console.log(`>>> GENERATION COMPLETED: ${draftItineraries.length} draft itineraries generated`);
      return draftItineraries;
    } finally {
      // Reset flags after completion
      console.log(`>>> GENERATION CLEANUP: Resetting isGenerating=false (timestamp: ${Date.now()})`);
      isGenerating = false;
      generationPromise = null;
    }
  })();

  return generationPromise;
}
