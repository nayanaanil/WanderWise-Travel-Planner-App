import airportsData from './data/airports.json';

interface Airport {
  code: string;
  city: string;
  lat: number;
  lon: number;
}

/**
 * Normalizes a city name for matching
 */
function normalizeCityName(cityName: string): string {
  return cityName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s,]/g, ''); // Remove special characters except commas
}

/**
 * Checks if a string is a valid 3-letter IATA code
 */
function isIataCode(input: string): boolean {
  return /^[A-Z]{3}$/i.test(input.trim());
}

/**
 * Finds an airport IATA code by city name or returns the code if already provided
 * 
 * @param cityOrCode - City name (e.g., "Vienna", "Vienna, Austria") or IATA code (e.g., "VIE")
 * @returns IATA code if found, null otherwise
 */
export function findAirportCode(cityOrCode: string): string | null {
  if (!cityOrCode || typeof cityOrCode !== 'string') {
    return null;
  }

  const trimmed = cityOrCode.trim();

  // If input is already a 3-letter IATA code, return it
  if (isIataCode(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Normalize the input for searching
  const normalizedInput = normalizeCityName(trimmed);

  // Search airports.json for a matching city
  const airports = airportsData as Airport[];
  
  for (const airport of airports) {
    const normalizedCity = normalizeCityName(airport.city);
    
    // Check for exact match
    if (normalizedCity === normalizedInput) {
      return airport.code;
    }
    
    // Check if input matches the city name (before comma if present)
    const cityPart = normalizedCity.split(',')[0].trim();
    if (cityPart === normalizedInput || normalizedInput === cityPart) {
      return airport.code;
    }
    
    // Check if normalized input is contained in the city name
    if (normalizedCity.includes(normalizedInput) || normalizedInput.includes(cityPart)) {
      return airport.code;
    }
  }

  // If not found, return null
  return null;
}






