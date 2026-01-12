import { TripScope, GroundLeg } from './types';
import OpenAI from 'openai';
import { findAirportCode } from '@/lib/airports';
import airportsData from '../data/airports.json';

// Initialize OpenAI client for gateway resolution
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gateway resolution cache: stores originalCity → resolvedGateway mappings
 * This cache persists AI-suggested resolutions to avoid repeated API calls
 */
const gatewayResolutionCache = new Map<string, string>();

/**
 * Schengen visa zone countries (ISO 3166-1 alpha-2 country codes)
 * This is the ONLY visa zone handled - all other countries are treated as independent
 */
export const SCHENGEN_COUNTRIES = new Set([
  'AT', 'BE', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL',
  'PT', 'SK', 'SI', 'ES', 'SE', 'CH'
]);

/**
 * Capital cities (by country/region) - always eligible for long-haul flights
 */
const CAPITAL_CITIES = new Set([
  // Europe
  'Vienna', // Austria
  'Berlin', // Germany
  'Paris', // France
  'Amsterdam', // Netherlands
  'Madrid', // Spain
  'Rome', // Italy
  'Lisbon', // Portugal
  'London', // UK
  'Prague', // Czech Republic
  'Budapest', // Hungary
  'Warsaw', // Poland
  'Stockholm', // Sweden
  'Copenhagen', // Denmark
  'Oslo', // Norway
  'Helsinki', // Finland
  'Athens', // Greece
  'Dublin', // Ireland
  'Brussels', // Belgium
  'Bern', // Switzerland (capital, though Zurich is larger)
  // Asia
  'Tokyo', // Japan
  'Seoul', // South Korea
  'Singapore', // Singapore
  'Bangkok', // Thailand
  'Delhi', // India (New Delhi)
  'Beijing', // China
  'Jakarta', // Indonesia
  'Manila', // Philippines
  'Kuala Lumpur', // Malaysia
  // Americas
  'Washington', // USA (DC)
  'Ottawa', // Canada
  'Mexico City', // Mexico
  'Brasilia', // Brazil
  'Buenos Aires', // Argentina
  // Middle East / Africa
  'Dubai', // UAE (major hub, treated as capital-level)
  'Cairo', // Egypt
  'Johannesburg', // South Africa (major hub)
  // Oceania
  'Canberra', // Australia
  'Wellington', // New Zealand
]);

/**
 * Tier-1 international hubs - always eligible for long-haul flights
 * These are major airports that serve as international gateways regardless of capital status.
 */
const TIER1_HUBS = new Set([
  // Europe (non-capital hubs)
  'Frankfurt', // Germany - major Lufthansa hub
  'Munich', // Germany - major Lufthansa hub
  'Zurich', // Switzerland - major Swiss hub
  'Milan', // Italy - major hub
  'Barcelona', // Spain - major hub
  'Düsseldorf', // Germany - major hub
  'Brussels', // Belgium - already capital, but also major hub
  // Asia
  'Hong Kong', // Major international hub
  'Dubai', // Already listed, major Emirates hub
  'Doha', // Qatar Airways hub
  'Istanbul', // Turkey - major hub
  'Bangkok', // Already capital, major hub
  // Americas
  'New York', // USA - major hub
  'Los Angeles', // USA - major hub
  'Miami', // USA - major Latin America gateway
  'Toronto', // Canada - major hub
  'São Paulo', // Brazil - major hub
]);

/**
 * Explicitly whitelisted cities for long-haul flight anchors.
 * These cities are eligible even if they are not capitals or Tier-1 hubs.
 * Rationale: These are common European entry/exit points with good long-haul connectivity.
 */
const WHITELISTED_CITIES = new Set([
  'Vienna', // Austria - common Central Europe gateway
  'Munich', // Germany - major Lufthansa hub, common gateway
  'Frankfurt', // Germany - already Tier-1, but explicitly whitelisted
  'Paris', // France - capital, but explicitly whitelisted
  'Amsterdam', // Netherlands - capital, but explicitly whitelisted (Schiphol hub)
  'Zurich', // Switzerland - already Tier-1, but explicitly whitelisted
  'London', // UK - capital, but explicitly whitelisted (Heathrow/Gatwick)
]);

/**
 * Mapping of ineligible cities to their nearest eligible hub.
 * Used for structural correction: if a proposed anchor city is not eligible,
 * we replace it with the nearest eligible hub and add a GroundLeg for the displaced segment.
 * 
 * Priority: Capital cities first, then Tier-1 hubs, then whitelisted cities.
 */
const NEAREST_ELIGIBLE_HUB: Record<string, string> = {
  // Austria
  'Salzburg': 'Vienna', // Salzburg → Vienna (capital, ~300km by train)
  'Innsbruck': 'Vienna', // Innsbruck → Vienna (capital, ~500km by train)
  'Graz': 'Vienna', // Graz → Vienna (capital, ~200km by train)
  
  // Germany
  'Hamburg': 'Frankfurt', // Hamburg → Frankfurt (Tier-1 hub, ~500km by train)
  'Stuttgart': 'Frankfurt', // Stuttgart → Frankfurt (Tier-1 hub, ~200km by train)
  'Cologne': 'Frankfurt', // Cologne → Frankfurt (Tier-1 hub, ~200km by train)
  'Dresden': 'Berlin', // Dresden → Berlin (capital, ~200km by train)
  'Leipzig': 'Berlin', // Leipzig → Berlin (capital, ~200km by train)
  'Nuremberg': 'Munich', // Nuremberg → Munich (Tier-1 hub, ~200km by train)
  
  // France
  'Lyon': 'Paris', // Lyon → Paris (capital, ~500km by train)
  'Marseille': 'Paris', // Marseille → Paris (capital, ~800km by train)
  'Nice': 'Paris', // Nice → Paris (capital, ~950km by train)
  'Bordeaux': 'Paris', // Bordeaux → Paris (capital, ~600km by train)
  
  // Netherlands
  'Rotterdam': 'Amsterdam', // Rotterdam → Amsterdam (capital, ~60km by train)
  'The Hague': 'Amsterdam', // The Hague → Amsterdam (capital, ~60km by train)
  
  // Switzerland
  'Geneva': 'Zurich', // Geneva → Zurich (Tier-1 hub, ~280km by train)
  'Basel': 'Zurich', // Basel → Zurich (Tier-1 hub, ~90km by train)
  'Bern': 'Zurich', // Bern → Zurich (Tier-1 hub, ~120km by train)
  
  // Italy
  'Venice': 'Milan', // Venice → Milan (Tier-1 hub, ~270km by train)
  'Florence': 'Rome', // Florence → Rome (capital, ~280km by train)
  'Naples': 'Rome', // Naples → Rome (capital, ~220km by train)
  
  // Spain
  'Seville': 'Madrid', // Seville → Madrid (capital, ~550km by train)
  'Valencia': 'Barcelona', // Valencia → Barcelona (Tier-1 hub, ~350km by train)
  'Bilbao': 'Madrid', // Bilbao → Madrid (capital, ~400km by train)
  
  // Czech Republic
  'Brno': 'Prague', // Brno → Prague (capital, ~210km by train)
  'Ostrava': 'Prague', // Ostrava → Prague (capital, ~370km by train)
  
  // UK
  'Edinburgh': 'London', // Edinburgh → London (capital, ~650km by train)
  'Manchester': 'London', // Manchester → London (capital, ~330km by train)
  'Birmingham': 'London', // Birmingham → London (capital, ~190km by train)
  
  // India (for long-haul from Europe)
  'Bangalore': 'Delhi', // Bangalore → Delhi (capital, ~1750km by flight, but Delhi has better long-haul connectivity)
  'Mumbai': 'Delhi', // Mumbai → Delhi (capital, ~1400km by flight)
  'Chennai': 'Delhi', // Chennai → Delhi (capital, ~2200km by flight)
  'Kolkata': 'Delhi', // Kolkata → Delhi (capital, ~1500km by flight)
  'Hyderabad': 'Delhi', // Hyderabad → Delhi (capital, ~1500km by flight)
  'Pune': 'Mumbai', // Pune → Mumbai (major hub, ~150km by road/train)
  'Goa': 'Mumbai', // Goa → Mumbai (major hub, ~600km by flight)
};

/**
 * Normalizes a city name for matching (case-insensitive, trimmed)
 */
function normalizeCityName(city: string): string {
  return city.trim().toLowerCase();
}

/**
 * Checks if a city is a capital city
 */
function isCapitalCity(city: string): boolean {
  return CAPITAL_CITIES.has(city.trim());
}

/**
 * Checks if a city is a Tier-1 international hub
 */
function isTier1Hub(city: string): boolean {
  return TIER1_HUBS.has(city.trim());
}

/**
 * Checks if a city is explicitly whitelisted for long-haul flight anchors
 */
function isWhitelisted(city: string): boolean {
  return WHITELISTED_CITIES.has(city.trim());
}

/**
 * Finds the nearest eligible hub for an ineligible city.
 * Returns the city itself if already eligible, or the mapped hub if available.
 */
function findNearestEligibleHub(city: string): string | null {
  const normalized = normalizeCityName(city);
  
  // Check exact match first
  for (const [key, value] of Object.entries(NEAREST_ELIGIBLE_HUB)) {
    if (normalizeCityName(key) === normalized) {
      return value;
    }
  }
  
  // Check partial match (e.g., "Vienna, Austria" → "Vienna")
  const cityPart = city.split(',')[0].trim();
  const normalizedPart = normalizeCityName(cityPart);
  
  for (const [key, value] of Object.entries(NEAREST_ELIGIBLE_HUB)) {
    if (normalizeCityName(key) === normalizedPart) {
      return value;
    }
  }
  
  // If no mapping found, return null (caller should handle)
  return null;
}

/**
 * Determines flight anchor eligibility for a given city and trip scope.
 * 
 * Long-haul rules (strict):
 * - City must be a capital, OR
 * - City must be a Tier-1 international hub, OR
 * - City must be explicitly whitelisted
 * 
 * Short-haul rules:
 * - All cities are eligible (no filtering)
 * 
 * @param city - City name to check
 * @param scope - Trip scope ('long-haul' or 'short-haul')
 * @returns Object with eligibility status and optional reason
 */
export function isEligibleFlightAnchor(
  city: string,
  scope: TripScope
): { eligible: boolean; reason?: string } {
  let result: { eligible: boolean; reason?: string };
  
  if (scope === 'short-haul') {
    // Short-haul: all cities are eligible
    result = { eligible: true };
  } else {
    // Long-haul: strict eligibility rules
    const normalized = city.trim();
    
    if (isCapitalCity(normalized)) {
      result = { eligible: true, reason: 'Capital city' };
    } else if (isTier1Hub(normalized)) {
      result = { eligible: true, reason: 'Tier-1 international hub' };
    } else if (isWhitelisted(normalized)) {
      result = { eligible: true, reason: 'Explicitly whitelisted for long-haul' };
    } else {
      // Not eligible for long-haul
      result = {
        eligible: false,
        reason: `${normalized} is not a capital city, Tier-1 hub, or whitelisted city for long-haul flights`,
      };
    }
  }
  
  console.log("[DEBUG][AnchorEligibility]", {
    city,
    scope,
    eligible: result.eligible,
  });
  
  return result;
}

/**
 * Primary origin cities that should NEVER be normalized.
 * These are major international airports that are always valid as flight origins.
 */
const PRIMARY_ORIGIN_CITIES = new Set([
  'Bangalore',
  'Delhi',
  'Mumbai',
  'Chennai',
  'Hyderabad',
  'Kolkata',
]);

/**
 * Determines if a city is a primary origin (should never be normalized).
 * 
 * @param city - City name to check
 * @returns true if the city is a primary origin
 */
export function isPrimaryOrigin(city: string): boolean {
  const normalized = city.trim();
  return PRIMARY_ORIGIN_CITIES.has(normalized);
}

/**
 * Gets the nearest eligible hub for an ineligible city.
 * Used for structural correction: if a proposed anchor is not eligible,
 * replace it with the nearest eligible hub.
 * 
 * @param city - Ineligible city name
 * @returns Nearest eligible hub city name, or null if no mapping exists
 */
export function getNearestEligibleHub(city: string): string | null {
  return findNearestEligibleHub(city);
}

/**
 * Visa mode classification for gateway resolution.
 */
type VisaMode = 'SCHENGEN' | 'COUNTRY_ONLY';

/**
 * Determines the visa mode for a given country code.
 * 
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Visa mode: 'SCHENGEN' if country is in Schengen zone, 'COUNTRY_ONLY' otherwise
 */
function determineVisaMode(countryCode: string | undefined): VisaMode {
  if (!countryCode) return 'COUNTRY_ONLY';
  
  return SCHENGEN_COUNTRIES.has(countryCode)
    ? 'SCHENGEN'
    : 'COUNTRY_ONLY';
}

/**
 * Derives the set of allowed gateway country codes for a given stop.
 * 
 * Rules:
 * - SCHENGEN mode: All Schengen countries are allowed
 * - COUNTRY_ONLY mode: Only the same country is allowed
 * 
 * @param stopCountryCode - Country code of the stop being resolved
 * @returns Set of allowed gateway country codes
 */
export function allowedGatewayCountries(stopCountryCode: string | undefined): Set<string> {
  if (!stopCountryCode) return new Set(); // fail open
  
  const mode = determineVisaMode(stopCountryCode);
  
  if (mode === 'SCHENGEN') {
    return new Set(SCHENGEN_COUNTRIES);
  }
  
  // COUNTRY_ONLY
  return new Set([stopCountryCode]);
}

/**
 * Gets airports for a city from the airports dataset.
 * Returns full airport objects including city name for matching.
 * 
 * @param city - City name to look up
 * @returns Array of airport objects with code, city, lat, lon, or empty array if none found
 */
function getAirportsForCity(city: string): Array<{ code: string; city: string; lat: number; lon: number }> {
  const airports = airportsData as Array<{ code: string; city: string; lat: number; lon: number }>;
  const normalizedCity = city.toLowerCase().trim();
  const matchingAirports: Array<{ code: string; city: string; lat: number; lon: number }> = [];
  
  for (const airport of airports) {
    const normalizedAirportCity = airport.city.toLowerCase();
    const cityPart = normalizedAirportCity.split(',')[0].trim();
    
    // Check if city matches (exact match or before comma)
    if (normalizedCity === cityPart || normalizedAirportCity.includes(normalizedCity)) {
      matchingAirports.push(airport);
    }
  }
  
  return matchingAirports;
}

/**
 * Gets approximate coordinates for a city by searching airports dataset.
 * Uses fuzzy matching to find airports that might be associated with the city.
 * 
 * @param city - City name to look up
 * @returns Coordinates { lat, lon } or null if not found
 */
function getCityCoordinates(city: string): { lat: number; lon: number } | null {
  const airports = getAirportsForCity(city);
  if (airports.length > 0) {
    // Return coordinates from first matching airport
    return { lat: airports[0].lat, lon: airports[0].lon };
  }
  return null;
}

/**
 * Gets approximate city coordinates by searching for airports with similar city names.
 * This is a fallback when direct lookup fails (e.g., for metro-adjacent areas).
 * 
 * Strategy:
 * 1. Try direct match from airports dataset
 * 2. Try partial match (city name in airport city or vice versa)
 * 3. Try region-based match (e.g., "Ubud" → search for "Bali" airports)
 * 
 * @param city - City name to look up
 * @returns Coordinates { lat, lon } or null if not found
 */
function getApproximateCityCoordinates(city: string): { lat: number; lon: number } | null {
  // First try direct lookup
  const directCoords = getCityCoordinates(city);
  if (directCoords) {
    return directCoords;
  }

  // Fallback: search airports dataset for partial matches
  const airports = airportsData as Array<{ code: string; city: string; lat: number; lon: number }>;
  const normalizedCity = city.toLowerCase().trim();
  
  // Try exact or partial match
  for (const airport of airports) {
    const normalizedAirportCity = airport.city.toLowerCase();
    const cityPart = normalizedAirportCity.split(',')[0].trim();
    
    // Check if city name is contained in airport city or vice versa
    if (normalizedCity.includes(cityPart) || cityPart.includes(normalizedCity)) {
      return { lat: airport.lat, lon: airport.lon };
    }
  }
  
  // Try region-based matching (e.g., "Ubud" might be near "Bali" airports)
  // Search for airports where the city name appears in the airport city after comma (region)
  for (const airport of airports) {
    const normalizedAirportCity = airport.city.toLowerCase();
    const parts = normalizedAirportCity.split(',');
    if (parts.length > 1) {
      const regionPart = parts[parts.length - 1].trim();
      if (regionPart.includes(normalizedCity) || normalizedCity.includes(regionPart)) {
        return { lat: airport.lat, lon: airport.lon };
      }
    }
  }
  
  return null;
}

/**
 * Calculates distance between two coordinates using Haversine formula.
 * 
 * @param coord1 - First coordinate { lat, lon }
 * @param coord2 - Second coordinate { lat, lon }
 * @returns Distance in kilometers
 */
function calculateDistanceKm(
  coord1: { lat: number; lon: number },
  coord2: { lat: number; lon: number }
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) *
    Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if a city physically contains an airport using distance-based matching.
 * 
 * Returns true if any airport is within 50km of the city coordinates.
 * Falls back to string-based matching if city coordinates cannot be resolved.
 * 
 * @param city - City name to check
 * @returns true if the city has an airport within 50km, false otherwise
 */
export function cityHasPhysicalAirport(city: string): boolean {
  const AIRPORT_PROXIMITY_RADIUS_KM = 50;
  
  // Get approximate city coordinates
  const cityCoords = getApproximateCityCoordinates(city);
  
  if (!cityCoords) {
    // Fall back to previous string-based behavior if coordinates cannot be resolved
    const airports = getAirportsForCity(city);
    if (!airports || airports.length === 0) return false;
    
    const normalizedCity = city.toLowerCase().trim();
    return airports.some(a => {
      const airportCityPart = a.city.toLowerCase().split(',')[0].trim();
      return airportCityPart === normalizedCity;
    });
  }

  // Get all airports from dataset and check distance
  const airports = airportsData as Array<{ code: string; city: string; lat: number; lon: number }>;
  
  for (const airport of airports) {
    const distanceKm = calculateDistanceKm(cityCoords, { lat: airport.lat, lon: airport.lon });
    
    if (distanceKm <= AIRPORT_PROXIMITY_RADIUS_KM) {
      console.debug('[DEBUG][LongHaulEligibility][PhysicalAirport]', {
        city,
        airportCode: airport.code,
        distanceKm: Math.round(distanceKm * 100) / 100 // Round to 2 decimal places
      });
      return true;
    }
  }
  
  return false;
}

/**
 * Resolves airports for a city (returns array of airport objects with IATA codes).
 * 
 * This is a simple wrapper around findAirportCode that returns an array format.
 * 
 * @param city - City name to resolve
 * @returns Array of airport objects with iataCode, or empty array if none found
 */
function resolveAirportsForCity(city: string): Array<{ iataCode: string }> {
  const iataCode = findAirportCode(city);
  if (iataCode) {
    return [{ iataCode }];
  }
  return [];
}

/**
 * Dynamically resolves IATA codes for a city using AI when local dataset lookup fails.
 * 
 * This is a fallback mechanism to handle cities not in the local airport dataset.
 * 
 * @param city - City name to resolve
 * @returns Array of IATA codes found, or empty array if none found or on error
 */
async function resolveIataCodesDynamically(city: string): Promise<string[]> {
  try {
    const prompt = `What is the IATA airport code for "${city}"?

Return ONLY the 3-letter IATA code (e.g., "JFK", "LHR", "EVN").
If the city has multiple airports, return the primary international airport code.
If no airport exists, return "NONE".
Do not include explanations or extra text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a travel logistics assistant. Return only the 3-letter IATA code with no explanations or extra text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent code responses
      max_tokens: 10,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return [];
    }

    const trimmed = responseContent.trim().toUpperCase();
    
    // Validate it's a 3-letter IATA code
    if (/^[A-Z]{3}$/.test(trimmed) && trimmed !== 'NONE') {
      return [trimmed];
    }

    return [];
  } catch (error) {
    // Never throw - return empty array on any error
    console.debug('[DEBUG][DynamicIataResolution][Error]', { 
      city, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * AI confirmation helper: confirms if a city is a primary international gateway.
 * 
 * AI never decides legality or routing - only confirms gateway status.
 * 
 * @param city - City name to check
 * @returns true if AI confirms it's a primary international gateway, false otherwise
 */
async function confirmInternationalGatewayWithAI(city: string): Promise<boolean> {
  try {
    const prompt = `Answer ONLY true or false.

Is "${city}" a primary international air gateway for its country,
handling regular long-haul (intercontinental) commercial flights?`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a travel logistics assistant. Answer only "true" or "false" with no explanations or extra text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Very low temperature for consistent true/false responses
      max_tokens: 10,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return false;
    }

    const normalized = responseContent.trim().toLowerCase();
    return normalized === 'true';
  } catch (error) {
    // Never throw - return false on any error
    console.error('[DEBUG][LongHaulEligibility][AIError]', { city, error: error instanceof Error ? error.message : 'Unknown error' });
    return false;
  }
}

/**
 * Extracts country name from airport city string (e.g., "Vienna, Austria" → "Austria").
 */
function extractCountryFromAirportCity(airportCity: string): string | null {
  const parts = airportCity.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 1].trim();
  }
  return null;
}

/**
 * Extracts country name from city name using airport dataset lookup.
 */
function getCountryForCity(cityName: string): string | null {
  const airports = getAirportsForCity(cityName);
  if (airports.length > 0) {
    const country = extractCountryFromAirportCity(airports[0].city);
    if (country) return country;
  }
  return null;
}

/**
 * Determines if a city is eligible as a long-haul gateway based on airport metadata only.
 * 
 * This is a conservative, dataset-driven v1 implementation.
 * 
 * Rules:
 * - Look up all airports associated with the city
 * - Return true if any airport satisfies at least one of:
 *   - airport.isInternational === true
 *   - airport.internationalRoutesCount > 0
 * - Return false otherwise
 * - If airport metadata is missing, default to false
 * 
 * This function does NOT use:
 * - Heuristics
 * - Airport/city name patterns
 * - Word counts
 * - String length
 * - "International" substrings
 * - Origin-based heuristics
 * - AI
 * - Allowlists
 * 
 * @param city - City name to check for gateway eligibility
 * @returns true if the city has at least one airport that qualifies as a long-haul gateway
 */
export function isEligibleLongHaulGateway(city: string): boolean {
  // Look up all airports associated with the city
  const airports = getAirportsForCity(city);
  
  if (!airports || airports.length === 0) {
    console.debug('[DEBUG][LongHaulGatewayEligibility]', {
      city,
      airportsFound: [],
      eligible: false,
      reason: 'none'
    });
    return false;
  }
  
  // Check each airport for eligibility criteria
  for (const airport of airports) {
    // Type assertion to check for optional metadata fields
    // In v1, these fields may not exist in the dataset yet
    const airportWithMetadata = airport as { 
      code: string; 
      city: string; 
      lat: number; 
      lon: number;
      isInternational?: boolean;
      internationalRoutesCount?: number;
    };
    
    // Check if airport satisfies eligibility criteria
    const isInternational = airportWithMetadata.isInternational === true;
    const hasInternationalRoutes = (airportWithMetadata.internationalRoutesCount ?? 0) > 0;
    
    if (isInternational || hasInternationalRoutes) {
      const reason = isInternational ? 'international-hub' : 'has-international-routes';
      console.debug('[DEBUG][LongHaulGatewayEligibility]', {
        city,
        airportsFound: airports.map(a => a.code),
        eligible: true,
        reason,
        airportCode: airport.code
      });
      return true;
    }
  }
  
  // No airport met the criteria (metadata missing or criteria not met)
  console.debug('[DEBUG][LongHaulGatewayEligibility]', {
    city,
    airportsFound: airports.map(a => a.code),
    eligible: false,
    reason: 'none'
  });
  return false;
}

/**
 * @deprecated This async version is replaced by the synchronous isEligibleLongHaulGateway.
 * Kept for backward compatibility but should not be used.
 */
export async function isEligibleLongHaulGatewayAsync(city: string): Promise<boolean> {
  // Use the synchronous version
  return isEligibleLongHaulGateway(city);
}

/**
 * Minimal city-to-country-code lookup for visa compatibility checks.
 * Returns country code if found, undefined otherwise.
 * 
 * This is a minimal lookup - fails open (returns undefined) if city not found.
 */
function getCityCountryCode(cityName: string): string | undefined {
  // Minimal hardcoded lookup for common gateway cities
  // This is intentionally limited - missing cities will fail open (undefined)
  const cityCountryMap: Record<string, string> = {
    // Schengen cities
    'Vienna': 'AT', 'Berlin': 'DE', 'Paris': 'FR', 'Amsterdam': 'NL', 'Madrid': 'ES',
    'Rome': 'IT', 'Lisbon': 'PT', 'Prague': 'CZ', 'Budapest': 'HU', 'Warsaw': 'PL',
    'Stockholm': 'SE', 'Copenhagen': 'DK', 'Oslo': 'NO', 'Helsinki': 'FI', 'Athens': 'GR',
    'Brussels': 'BE', 'Bern': 'CH', 'Zurich': 'CH', 'Geneva': 'CH', 'Munich': 'DE',
    'Barcelona': 'ES', 'Florence': 'IT', 'Venice': 'IT', 'Milan': 'IT', 'Salzburg': 'AT',
    'Innsbruck': 'AT', 'Reykjavik': 'IS',
    // Non-Schengen cities
    'London': 'GB', 'Dublin': 'IE', 'Istanbul': 'TR', 'Casablanca': 'MA', 'Marrakech': 'MA',
    'Dubai': 'AE', 'Singapore': 'SG', 'Bangkok': 'TH', 'Tokyo': 'JP', 'Seoul': 'KR',
    'New York': 'US', 'Los Angeles': 'US', 'Mumbai': 'IN', 'Delhi': 'IN', 'Bangalore': 'IN',
    'Sydney': 'AU', 'Melbourne': 'AU', 'Cairo': 'EG',
  };
  
  return cityCountryMap[cityName];
}

/**
 * Visa compatibility check for long-haul anchor gateways.
 * 
 * Rules:
 * - Schengen stop → gateway must also be Schengen
 * - Non-Schengen stop → gateway must NOT be Schengen
 * 
 * This applies symmetrically for entry and exit.
 * 
 * @param candidateCityCountryCode - Country code of the candidate gateway city
 * @param referenceStopCountryCode - Country code of the original stop being resolved
 * @returns true if visa-compatible, false if incompatible
 */
function isVisaCompatible(
  candidateCityCountryCode: string | undefined,
  referenceStopCountryCode: string | undefined
): boolean {
  if (!candidateCityCountryCode || !referenceStopCountryCode) {
    return true; // fail open if data missing
  }

  const candidateIsSchengen = SCHENGEN_COUNTRIES.has(candidateCityCountryCode);
  const referenceIsSchengen = SCHENGEN_COUNTRIES.has(referenceStopCountryCode);

  // Case 1: Schengen stop → gateway must be Schengen
  if (referenceIsSchengen) {
    return candidateIsSchengen;
  }

  // Case 2: Non-Schengen stop → gateway must be SAME country
  return candidateCityCountryCode === referenceStopCountryCode;
}

/**
 * Filters AI gateway candidates by distance, preferring nearby airports over distant capitals.
 * 
 * Rejects candidates that are significantly farther than the closest one (distance > closest * 1.8).
 * 
 * @param sourceCity - Original city being resolved
 * @param sourceCoords - Coordinates of the source city
 * @param candidates - Array of candidate gateway cities from AI
 * @returns Filtered array of candidates, sorted by distance (closest first)
 */
function filterCandidatesByDistance(
  sourceCity: string,
  sourceCoords: { lat: number; lon: number },
  candidates: string[]
): string[] {
  if (candidates.length === 0) {
    return [];
  }

  // Calculate distances for all candidates
  const candidatesWithDistance = candidates.map(candidate => {
    const candidateCoords = getCityCoordinates(candidate);
    if (!candidateCoords) {
      // If coordinates not found, reject (fail closed)
      console.debug('[DEBUG][GatewayDistance]', {
        city: sourceCity,
        candidate,
        distanceKm: null,
        rejected: true,
        reason: 'no-coordinates'
      });
      return { candidate, distanceKm: Infinity, rejected: true };
    }

    const distanceKm = calculateDistanceKm(sourceCoords, candidateCoords);
    return { candidate, distanceKm, rejected: false };
  });

  // Find the closest candidate
  const validCandidates = candidatesWithDistance.filter(c => !c.rejected);
  if (validCandidates.length === 0) {
    return [];
  }

  const closestDistance = Math.min(...validCandidates.map(c => c.distanceKm));
  const distanceThreshold = closestDistance * 1.8;

  // Filter candidates: keep those within threshold
  const filtered = candidatesWithDistance
    .map(c => {
      if (c.rejected) {
        return c;
      }

      const rejected = c.distanceKm > distanceThreshold;
      console.debug('[DEBUG][GatewayDistance]', {
        city: sourceCity,
        candidate: c.candidate,
        distanceKm: c.distanceKm,
        rejected,
        closestDistanceKm: closestDistance,
        thresholdKm: distanceThreshold
      });

      return { ...c, rejected };
    })
    .filter(c => !c.rejected)
    .sort((a, b) => a.distanceKm - b.distanceKm) // Sort by distance (closest first)
    .map(c => c.candidate);

  return filtered;
}

/**
 * Resolves a city to a valid long-haul gateway.
 * 
 * Gateway resolution is AUTHORITATIVE: any city returned by this function
 * is considered a valid flight anchor by definition.
 * 
 * Resolution order:
 * 1. Cache lookup (fastest)
 * 2. Hardcoded fast-path (filtered by allowedGatewayCountryCodes)
 * 3. AI inference (constrained by allowedGatewayCountryCodes and distance)
 * 4. Hard failure if no legal gateway exists
 * 
 * This function enforces visa legality constraints BEFORE gateway discovery,
 * preventing AI from suggesting illegal third-country gateways.
 * 
 * @param city - City name to resolve
 * @param allowedGatewayCountryCodes - Set of allowed gateway country codes (determined by visa context)
 * @returns Resolved gateway city name, or null if no valid gateway found
 */
export async function nearestEligibleLongHaulGateway(
  city: string,
  allowedGatewayCountryCodes: Set<string>
): Promise<string | null> {
  // Empty constraint set means "no constraints" (fail open) - used for origins without country code
  // Non-empty but no valid gateway found will fail hard below
  const hasConstraints = allowedGatewayCountryCodes.size > 0;

  // 1. Cache lookup (authoritative - if cached, it's valid)
  const cached = gatewayResolutionCache.get(city);
  if (cached) {
    if (!hasConstraints) {
      // No constraints - check if cached gateway has physical airport (IATA code)
      // Long-haul suitability determined by anchor scoring, not blocking
      const cachedIataCode = findAirportCode(cached);
      if (cachedIataCode) {
        console.log("[DEBUG][GatewayResolution][CacheHit]", { 
          city, 
          gateway: cached,
          note: 'long-haul suitability determined by anchor scoring, not blocking'
        });
        return cached;
      }
      // Cached gateway has no physical airport - continue to resolution
    } else {
      const candidateCountryCode = getCityCountryCode(cached);
      if (candidateCountryCode && allowedGatewayCountryCodes.has(candidateCountryCode)) {
        // Visa-compatible - check if has physical airport
        // Long-haul suitability determined by anchor scoring, not blocking
        const cachedIataCode = findAirportCode(cached);
        if (cachedIataCode) {
          console.log("[DEBUG][GatewayResolution][CacheHit]", { 
            city, 
            gateway: cached,
            note: 'long-haul suitability determined by anchor scoring, not blocking'
          });
          return cached;
        }
        // Cached gateway has no physical airport - continue to resolution
      }
      // Cached gateway is not in allowed set - continue to resolution
    }
  }

  // 2. Hardcoded fast-path lookup (filtered by allowedGatewayCountryCodes)
  const hardcodedGateway = findNearestEligibleHub(city);
  if (hardcodedGateway) {
    if (!hasConstraints) {
      // No constraints - check if hardcoded gateway has physical airport (IATA code)
      // Long-haul suitability determined by anchor scoring, not blocking
      const hardcodedIataCode = findAirportCode(hardcodedGateway);
      if (hardcodedIataCode) {
        gatewayResolutionCache.set(city, hardcodedGateway);
        console.log("[DEBUG][GatewayResolution][Hardcoded]", { 
          city, 
          gateway: hardcodedGateway,
          note: 'long-haul suitability determined by anchor scoring, not blocking'
        });
        return hardcodedGateway;
      }
      // Hardcoded gateway has no physical airport - continue to AI resolution
    } else {
      const candidateCountryCode = getCityCountryCode(hardcodedGateway);
      if (candidateCountryCode && allowedGatewayCountryCodes.has(candidateCountryCode)) {
        // Visa-compatible - check if has physical airport
        // Long-haul suitability determined by anchor scoring, not blocking
        const hardcodedIataCode = findAirportCode(hardcodedGateway);
        if (hardcodedIataCode) {
          gatewayResolutionCache.set(city, hardcodedGateway);
          console.log("[DEBUG][GatewayResolution][Hardcoded]", { 
            city, 
            gateway: hardcodedGateway,
            note: 'long-haul suitability determined by anchor scoring, not blocking'
          });
          return hardcodedGateway;
        }
        // Hardcoded gateway has no physical airport - continue to AI resolution
      }
      // Hardcoded gateway is not in allowed set - continue to AI resolution
    }
  }

  // 3. AI-assisted discovery (constrained by allowedGatewayCountryCodes)
  // Get source city coordinates for distance filtering
  const sourceCoords = getCityCoordinates(city);
  
  if (!hasConstraints) {
    // No constraints - use unconstrained AI prompt (fail open for origins)
    console.debug('[DEBUG][GatewayResolution][AIRequest]', {
      city,
      allowedGatewayCountryCodes: []
    });
    const aiCandidates = await resolveGatewayWithAI(city, new Set());
    
    // Filter by distance if coordinates available
    const filteredCandidates = sourceCoords
      ? filterCandidatesByDistance(city, sourceCoords, aiCandidates)
      : aiCandidates;
    
    // Check if each AI candidate has physical airport (visa already passed - no constraints)
    // Long-haul suitability determined by anchor scoring, not blocking
    for (const candidate of filteredCandidates) {
      const candidateIataCode = findAirportCode(candidate);
      if (candidateIataCode) {
        gatewayResolutionCache.set(city, candidate);
        console.log("[DEBUG][GatewayResolution][Accepted]", { 
          city, 
          gateway: candidate,
          note: 'long-haul suitability determined by anchor scoring, not blocking'
        });
        return candidate;
      }
    }
  } else {
    // Has constraints - use constrained AI prompt
    console.debug('[DEBUG][GatewayResolution][AIRequest]', {
      city,
      allowedGatewayCountryCodes: Array.from(allowedGatewayCountryCodes)
    });
    const aiCandidates = await resolveGatewayWithAI(city, allowedGatewayCountryCodes);

    // Filter by distance if coordinates available
    const filteredCandidates = sourceCoords
      ? filterCandidatesByDistance(city, sourceCoords, aiCandidates)
      : aiCandidates;

    // Check visa compatibility AND eligibility for each AI candidate
    for (const candidate of filteredCandidates) {
      const candidateCountryCode = getCityCountryCode(candidate);

      // Enforce visa constraint ONLY when country code is known
      if (candidateCountryCode && !allowedGatewayCountryCodes.has(candidateCountryCode)) {
        console.debug('[DEBUG][VisaZoneRejected]', {
          candidate,
          candidateCountryCode,
          allowedGatewayCountryCodes: Array.from(allowedGatewayCountryCodes)
        });
        continue;
      }

      // Country code unknown OR allowed → proceed
      // Check if candidate has physical airport (IATA code)
      // Long-haul suitability determined by anchor scoring, not blocking
      const candidateIataCode = findAirportCode(candidate);
      if (candidateIataCode) {
        gatewayResolutionCache.set(city, candidate);
        console.log('[DEBUG][GatewayResolution][Accepted]', { 
          city, 
          gateway: candidate,
          note: 'long-haul suitability determined by anchor scoring, not blocking'
        });
        return candidate;
      }
    }
  }

  // 4. No gateway found - return null (fail open)
  // Long-haul suitability will be determined by anchor scoring, not blocking
  // LEGAL_IMPOSSIBILITY errors removed - gateway normalization always succeeds for cities with physical airports
  console.log("[DEBUG][GatewayResolution][Failed]", { 
    city,
    note: 'no gateway found, but long-haul suitability determined by anchor scoring, not blocking'
  });
  return null;
}

/**
 * AI resolver helper: suggests up to 3 candidate gateway cities for a given city.
 * 
 * This function:
 * - Returns up to 3 candidate city names
 * - Returns an empty array on failure
 * - NEVER throws (catches all errors internally)
 * - Constrains suggestions to allowedGatewayCountryCodes (visa legality enforced)
 * 
 * @param city - City name to resolve
 * @param allowedGatewayCountryCodes - Set of allowed gateway country codes (visa constraint)
 * @returns Array of candidate gateway city names (up to 3), or empty array on failure
 */
async function resolveGatewayWithAI(
  city: string,
  allowedGatewayCountryCodes: Set<string>
): Promise<string[]> {
  try {
    // Build AI prompt (constrained if allowedGatewayCountryCodes is non-empty, unconstrained otherwise)
    const hasConstraints = allowedGatewayCountryCodes.size > 0;
    const countryList = Array.from(allowedGatewayCountryCodes).join(', ');
    
    const prompt = hasConstraints
      ? `You are helping resolve travel logistics.

Given the city: "${city}"

Return the nearest commercial airports a traveler would realistically use to reach this city.
Prefer proximity over prominence. Do not return distant capitals unless no closer airport exists.

Candidates must be:
- LOCATED IN ONE OF THESE COUNTRIES ONLY: ${countryList}
- Geographically close to "${city}"
- Suitable as an international arrival and departure gateway

Constraints:
- Return ONLY city names, one per line
- Cities MUST be in one of the specified countries: ${countryList}
- Cities MUST have major international airports
- Prioritize geographic proximity to "${city}" over capital status or airport size
- Do NOT include the original city
- Do NOT explain reasoning
- Do NOT include countries or extra text`
      : `You are helping resolve travel logistics.

Given the city: "${city}"

Return the nearest commercial airports a traveler would realistically use to reach this city.
Prefer proximity over prominence. Do not return distant capitals unless no closer airport exists.

Return up to 3 nearby major international flight gateway cities
that are geographically close to "${city}".

Constraints:
- Return ONLY city names, one per line
- Cities MUST have major international airports
- Prioritize geographic proximity to "${city}" over capital status or airport size
- Do NOT include the original city
- Do NOT explain reasoning
- Do NOT include countries or extra text`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a travel logistics assistant. Return only city names, one per line, with no explanations or extra text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 100,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      console.log("[DEBUG][GatewayResolution][AICandidates]", { city, candidates: [] });
      return [];
    }

    // Parse response: split lines, trim whitespace, discard empty values
    const candidates = responseContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 3); // Limit to 3 candidates

    console.log("[DEBUG][GatewayResolution][AICandidates]", { city, candidates });

    return candidates;
  } catch (error) {
    // NEVER throw - return empty array on any error
    console.error("[DEBUG][GatewayResolution][AIError]", { city, error: error instanceof Error ? error.message : 'Unknown error' });
    return [];
  }
}

/**
 * Normalizes a secondary origin city if needed for long-haul trips.
 * 
 * This is SEPARATE from destination anchor eligibility:
 * - Primary origins (Bangalore, Delhi, Mumbai, etc.) are NEVER normalized
 * - Secondary origins are normalized ONLY if they're not eligible flight anchors
 * - Normalization preserves user intent by adding a ground leg
 * 
 * @param originCity - Original origin city name
 * @param tripScope - Trip scope (long-haul or short-haul)
 * @returns Normalized origin city and optional ground leg
 */
export function normalizeOriginIfNeeded(
  originCity: string,
  tripScope: TripScope
): {
  normalizedCity: string;
  groundLeg?: GroundLeg;
} {
  // Short-haul: no normalization needed
  if (tripScope !== 'long-haul') {
    return { normalizedCity: originCity };
  }

  // Primary origins: NEVER normalize
  if (isPrimaryOrigin(originCity)) {
    return { normalizedCity: originCity };
  }

  // Eligibility is now checked in nearestEligibleLongHaulGateway during gateway resolution
  // This function will normalize secondary origins, which will then go through
  // gateway resolution where eligibility is checked

  // Secondary origin is not eligible - normalize to nearest hub
  const hub = getNearestEligibleHub(originCity);
  if (!hub) {
    throw new Error(`No eligible hub found for secondary origin: ${originCity}`);
  }

  // Create ground leg to preserve user intent (hub → original origin)
  return {
    normalizedCity: hub,
    groundLeg: {
      fromCity: hub,
      toCity: originCity,
      departureDayOffset: 0,
      modeHint: 'train',
    },
  };
}

/**
 * South Asia country codes (ISO 3166-1 alpha-2)
 * Used to determine if a destination is in the same region as India.
 */
const SOUTH_ASIA_COUNTRY_CODES = new Set([
  'IN', // India
  'PK', // Pakistan
  'BD', // Bangladesh
  'NP', // Nepal
  'BT', // Bhutan
  'LK', // Sri Lanka
  'MV', // Maldives
  'AF', // Afghanistan
]);

/**
 * Determines trip scope based on origin city and destination region.
 * 
 * Long-haul: Origin country differs from destination region
 * Short-haul: Same region/country
 * 
 * Conservative classification: India → non-South Asia is ALWAYS long-haul.
 * 
 * @param originCity - Origin city name
 * @param destinationStops - Array of destination stop cities with optional countryCode
 * @returns Trip scope
 */
export function determineTripScope(
  originCity: string,
  destinationStops: { city: string; countryCode?: string }[]
): TripScope {
  const normalizedOrigin = normalizeCityName(originCity);
  
  // CRITICAL: India → non-South Asia is ALWAYS long-haul (conservative classification)
  // Check if origin is India (by city name heuristic if country code not available)
  const isIndiaOrigin =
    normalizedOrigin.includes('bangalore') ||
    normalizedOrigin.includes('mumbai') ||
    normalizedOrigin.includes('delhi') ||
    normalizedOrigin.includes('chennai') ||
    normalizedOrigin.includes('kolkata') ||
    normalizedOrigin.includes('hyderabad') ||
    normalizedOrigin.includes('pune') ||
    normalizedOrigin.includes('goa') ||
    normalizedOrigin.includes('india');
  
  if (isIndiaOrigin && destinationStops.length > 0) {
    // Check if at least one destination stop is NOT in South Asia
    for (const stop of destinationStops) {
      if (stop.countryCode) {
        // If country code is available and it's NOT in South Asia → long-haul
        if (!SOUTH_ASIA_COUNTRY_CODES.has(stop.countryCode.toUpperCase())) {
          return 'long-haul';
        }
      } else {
        // No country code available - use city name heuristic for European destinations
        // Conservative: if it looks like a European city, classify as long-haul
        const normalizedDest = normalizeCityName(stop.city);
        const isEuropeDest =
          normalizedDest.includes('vienna') ||
          normalizedDest.includes('prague') ||
          normalizedDest.includes('munich') ||
          normalizedDest.includes('frankfurt') ||
          normalizedDest.includes('paris') ||
          normalizedDest.includes('amsterdam') ||
          normalizedDest.includes('london') ||
          normalizedDest.includes('zurich') ||
          normalizedDest.includes('rome') ||
          normalizedDest.includes('madrid') ||
          normalizedDest.includes('berlin') ||
          normalizedDest.includes('budapest') ||
          normalizedDest.includes('lisbon') ||
          normalizedDest.includes('porto') ||
          normalizedDest.includes('athens') ||
          normalizedDest.includes('stockholm') ||
          normalizedDest.includes('copenhagen') ||
          normalizedDest.includes('oslo') ||
          normalizedDest.includes('helsinki') ||
          normalizedDest.includes('warsaw') ||
          normalizedDest.includes('dublin');
        
        if (isEuropeDest) {
          return 'long-haul';
        }
      }
    }
  }
  
  // Default to short-haul (can be refined with more sophisticated country/region detection)
  return 'short-haul';
}

