/**
 * Coordinate Registry
 * 
 * Stores coordinates for cities that are not in the static coordinate map.
 * Coordinates are populated from AI-generated draft itineraries.
 */

type Coordinates = { lat: number; lng: number };

// In-memory registry keyed by normalized city name
const coordinateRegistry = new Map<string, Coordinates>();

/**
 * Normalize city name for consistent lookup
 */
function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .replace(/,.*$/, '') // Remove country suffix (e.g., "Paris, France" -> "paris")
    .trim();
}

/**
 * Register coordinates for a city
 * @param city - City name
 * @param coordinates - Latitude and longitude
 */
export function registerCoordinates(city: string, coordinates: Coordinates): void {
  const normalized = normalizeCityName(city);
  coordinateRegistry.set(normalized, coordinates);
}

/**
 * Register coordinates for multiple cities from a draft itinerary
 * @param cities - Array of cities with optional coordinates
 */
export function registerCoordinatesFromCities(
  cities: Array<{ name: string; coordinates?: { lat: number; lng: number } }>
): void {
  for (const city of cities) {
    if (city.coordinates) {
      registerCoordinates(city.name, city.coordinates);
    }
  }
}

/**
 * Get coordinates for a city from the registry
 * @param city - City name
 * @returns Coordinates or null if not found
 */
export function getCoordinatesFromRegistry(city: string): Coordinates | null {
  const normalized = normalizeCityName(city);
  return coordinateRegistry.get(normalized) || null;
}

/**
 * Clear the coordinate registry (useful for testing or resetting)
 */
export function clearCoordinateRegistry(): void {
  coordinateRegistry.clear();
}

