import airportsData from '@/lib/data/airports.json';
import cityCoordinatesData from '@/lib/data/cityCoordinates.json';
import { getCoordinatesFromRegistry } from './coordinateRegistry';

/**
 * Get city coordinates from multiple sources (priority order):
 * 1. Coordinate registry (AI-generated coordinates from draft itineraries)
 * 2. Static cityCoordinates dataset
 * 3. Static airports dataset
 * @param city - City name to look up
 * @returns Coordinates { lat, lng } or null if not found
 */
export function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  // First, try coordinate registry (AI-generated coordinates)
  const registryCoords = getCoordinatesFromRegistry(city);
  if (registryCoords) {
    return registryCoords;
  }
  
  // Normalize city name for matching (remove country suffixes, handle variations)
  const normalizeCity = (name: string) => {
    return name
      .toLowerCase()
      .replace(/,.*$/, '') // Remove country suffix (e.g., "Paris, France" -> "paris")
      .trim();
  };
  
  const normalizedCity = normalizeCity(city);
  
  // Try cityCoordinates dataset (has cities like Hakone that aren't in airports.json)
  const cityCoords = cityCoordinatesData as Record<string, { lat: number; lng: number; country?: string }>;
  if (cityCoords[normalizedCity]) {
    return { lat: cityCoords[normalizedCity].lat, lng: cityCoords[normalizedCity].lng };
  }
  
  // Fall back to airports dataset
  const airports = airportsData as Array<{ code: string; city: string; lat: number; lon: number }>;
  
  // Try exact match first (normalized)
  const exactMatch = airports.find(
    airport => normalizeCity(airport.city) === normalizedCity
  );
  if (exactMatch) {
    return { lat: exactMatch.lat, lng: exactMatch.lon };
  }
  
  // Try partial match (city name contains airport city or vice versa)
  const partialMatch = airports.find(
    airport => {
      const normalizedAirportCity = normalizeCity(airport.city);
      return (
        normalizedAirportCity.includes(normalizedCity) ||
        normalizedCity.includes(normalizedAirportCity)
      );
    }
  );
  if (partialMatch) {
    return { lat: partialMatch.lat, lng: partialMatch.lon };
  }
  
  // Log missing coordinates for debugging
  console.debug('[DEBUG][Map] Missing coordinates for city', { city });
  return null;
}

