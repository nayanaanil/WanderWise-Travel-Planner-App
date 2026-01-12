/**
 * Get allowed cities based on destination and destination type
 * This is the deterministic source of truth - AI only ranks these, never invents new ones
 * 
 * SAFETY GUARANTEES:
 * - Never returns global cities
 * - Never crosses continents incorrectly
 * - Fail narrow: returns [] if destination cannot be resolved
 * - Deterministic and demo-safe
 */

// City data - must match the data in app/api/cities/route.ts
// This is duplicated here to avoid importing from route files
const allCities = [
  // International cities
  { id: '1', name: 'Bali', country: 'Indonesia', countryCode: 'ID', region: 'Bali' },
  { id: '2', name: 'Paris', country: 'France', countryCode: 'FR', region: 'Île-de-France' },
  { id: '3', name: 'Tokyo', country: 'Japan', countryCode: 'JP', region: 'Kanto' },
  { id: '4', name: 'New York', country: 'USA', countryCode: 'US', region: 'New York' },
  { id: '5', name: 'London', country: 'UK', countryCode: 'GB', region: 'England' },
  { id: '6', name: 'Dubai', country: 'UAE', countryCode: 'AE', region: 'Dubai' },
  { id: '7', name: 'Singapore', country: 'Singapore', countryCode: 'SG' },
  { id: '8', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', region: 'Bangkok' },
  { id: '9', name: 'Sydney', country: 'Australia', countryCode: 'AU', region: 'New South Wales' },
  { id: '10', name: 'Rome', country: 'Italy', countryCode: 'IT', region: 'Lazio' },
  { id: '11', name: 'Barcelona', country: 'Spain', countryCode: 'ES', region: 'Catalonia' },
  { id: '12', name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', region: 'North Holland' },
  { id: '13', name: 'Vienna', country: 'Austria', countryCode: 'AT', region: 'Vienna' },
  { id: '14', name: 'Prague', country: 'Czech Republic', countryCode: 'CZ', region: 'Prague' },
  { id: '15', name: 'Berlin', country: 'Germany', countryCode: 'DE', region: 'Berlin' },
  { id: '16', name: 'Istanbul', country: 'Turkey', countryCode: 'TR', region: 'Istanbul' },
  { id: '17', name: 'Seoul', country: 'South Korea', countryCode: 'KR', region: 'Seoul' },
  { id: '18', name: 'Kyoto', country: 'Japan', countryCode: 'JP', region: 'Kansai' },
  { id: '19', name: 'Los Angeles', country: 'USA', countryCode: 'US', region: 'California' },
  { id: '20', name: 'San Francisco', country: 'USA', countryCode: 'US', region: 'California' },
  { id: '21', name: 'Melbourne', country: 'Australia', countryCode: 'AU', region: 'Victoria' },
  { id: '22', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', region: 'Western Cape' },
  { id: '23', name: 'Marrakech', country: 'Morocco', countryCode: 'MA', region: 'Marrakech-Safi' },
  { id: '24', name: 'Santorini', country: 'Greece', countryCode: 'GR', region: 'South Aegean' },
  { id: '25', name: 'Maldives', country: 'Maldives', countryCode: 'MV' },
  
  // India - Tier-1 Cities (6)
  { id: '26', name: 'Mumbai', country: 'India', countryCode: 'IN', region: 'Maharashtra' },
  { id: '27', name: 'Delhi', country: 'India', countryCode: 'IN', region: 'Delhi' },
  { id: '28', name: 'Bangalore', country: 'India', countryCode: 'IN', region: 'Karnataka' },
  { id: '29', name: 'Chennai', country: 'India', countryCode: 'IN', region: 'Tamil Nadu' },
  { id: '30', name: 'Hyderabad', country: 'India', countryCode: 'IN', region: 'Telangana' },
  { id: '31', name: 'Kolkata', country: 'India', countryCode: 'IN', region: 'West Bengal' },
  
  // India - Tier-2 Cities (16)
  { id: '32', name: 'Pune', country: 'India', countryCode: 'IN', region: 'Maharashtra' },
  { id: '33', name: 'Ahmedabad', country: 'India', countryCode: 'IN', region: 'Gujarat' },
  { id: '34', name: 'Jaipur', country: 'India', countryCode: 'IN', region: 'Rajasthan' },
  { id: '35', name: 'Chandigarh', country: 'India', countryCode: 'IN', region: 'Chandigarh' },
  { id: '36', name: 'Coimbatore', country: 'India', countryCode: 'IN', region: 'Tamil Nadu' },
  { id: '37', name: 'Indore', country: 'India', countryCode: 'IN', region: 'Madhya Pradesh' },
  { id: '38', name: 'Bhopal', country: 'India', countryCode: 'IN', region: 'Madhya Pradesh' },
  { id: '39', name: 'Nagpur', country: 'India', countryCode: 'IN', region: 'Maharashtra' },
  { id: '40', name: 'Surat', country: 'India', countryCode: 'IN', region: 'Gujarat' },
  { id: '41', name: 'Vadodara', country: 'India', countryCode: 'IN', region: 'Gujarat' },
  { id: '42', name: 'Lucknow', country: 'India', countryCode: 'IN', region: 'Uttar Pradesh' },
  { id: '43', name: 'Kanpur', country: 'India', countryCode: 'IN', region: 'Uttar Pradesh' },
  { id: '44', name: 'Noida', country: 'India', countryCode: 'IN', region: 'Uttar Pradesh' },
  { id: '45', name: 'Gurugram', country: 'India', countryCode: 'IN', region: 'Haryana' },
  { id: '46', name: 'Faridabad', country: 'India', countryCode: 'IN', region: 'Haryana' },
  { id: '47', name: 'Ghaziabad', country: 'India', countryCode: 'IN', region: 'Uttar Pradesh' },
  
  // India - State Capitals (23)
  { id: '48', name: 'Thiruvananthapuram', country: 'India', countryCode: 'IN', region: 'Kerala' },
  { id: '49', name: 'Kochi', country: 'India', countryCode: 'IN', region: 'Kerala' },
  { id: '50', name: 'Trichy', country: 'India', countryCode: 'IN', region: 'Tamil Nadu' },
  { id: '51', name: 'Madurai', country: 'India', countryCode: 'IN', region: 'Tamil Nadu' },
  { id: '52', name: 'Patna', country: 'India', countryCode: 'IN', region: 'Bihar' },
  { id: '53', name: 'Ranchi', country: 'India', countryCode: 'IN', region: 'Jharkhand' },
  { id: '54', name: 'Raipur', country: 'India', countryCode: 'IN', region: 'Chhattisgarh' },
  { id: '55', name: 'Bhubaneswar', country: 'India', countryCode: 'IN', region: 'Odisha' },
  { id: '56', name: 'Guwahati', country: 'India', countryCode: 'IN', region: 'Assam' },
  { id: '57', name: 'Shillong', country: 'India', countryCode: 'IN', region: 'Meghalaya' },
  { id: '58', name: 'Imphal', country: 'India', countryCode: 'IN', region: 'Manipur' },
  { id: '59', name: 'Aizawl', country: 'India', countryCode: 'IN', region: 'Mizoram' },
  { id: '60', name: 'Kohima', country: 'India', countryCode: 'IN', region: 'Nagaland' },
  { id: '61', name: 'Itanagar', country: 'India', countryCode: 'IN', region: 'Arunachal Pradesh' },
  { id: '62', name: 'Gangtok', country: 'India', countryCode: 'IN', region: 'Sikkim' },
  { id: '63', name: 'Agartala', country: 'India', countryCode: 'IN', region: 'Tripura' },
  { id: '64', name: 'Dehradun', country: 'India', countryCode: 'IN', region: 'Uttarakhand' },
  { id: '65', name: 'Shimla', country: 'India', countryCode: 'IN', region: 'Himachal Pradesh' },
  { id: '66', name: 'Srinagar', country: 'India', countryCode: 'IN', region: 'Jammu and Kashmir' },
  { id: '67', name: 'Jammu', country: 'India', countryCode: 'IN', region: 'Jammu and Kashmir' },
  { id: '68', name: 'Leh', country: 'India', countryCode: 'IN', region: 'Ladakh' },
  { id: '69', name: 'Panaji', country: 'India', countryCode: 'IN', region: 'Goa' },
  
  // India - Cluster destinations (1)
  { id: '70', name: 'Goa', country: 'India', countryCode: 'IN', region: 'Goa' },
];

export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
}

/**
 * Normalize input string for matching
 * Removes commas, extra spaces, and converts to lowercase
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .split(',')[0]
    .trim();
}

/**
 * Remove duplicate cities by name (case-insensitive)
 */
function uniqueByName(cities: City[]): City[] {
  const seen = new Set<string>();
  return cities.filter(city => {
    const key = normalize(city.name);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Theme to regions mapping
 * Maps travel themes to geographic regions (based on region field in city data)
 * Uses actual region values from the city dataset
 */
const themeToRegions: Record<string, string[]> = {
  'christmas markets': ['vienna', 'prague', 'bavaria', 'budapest', 'salzburg', 'tyrol', 'zurich', 'geneva'],
  'european christmas markets': ['vienna', 'prague', 'bavaria', 'budapest', 'salzburg', 'tyrol', 'zurich', 'geneva'],
  'beach': ['bali', 'phuket'],
  'honeymoon': [],
  'europe': ['île-de-france', 'lazio', 'catalonia', 'madrid', 'north holland', 'vienna', 'prague', 'bavaria', 'berlin', 'lisbon', 'tuscany', 'veneto', 'lombardy', 'attica', 'south aegean', 'dublin', 'scotland', 'england'],
  'asia': ['kanto', 'kansai', 'seoul', 'shanghai', 'beijing', 'bangkok', 'phuket', 'jakarta', 'bali', 'kuala lumpur', 'metro manila', 'ho chi minh city', 'hanoi', 'taipei'],
  'southeast asia': ['bangkok', 'phuket', 'jakarta', 'bali', 'kuala lumpur', 'metro manila', 'ho chi minh city', 'hanoi'],
};

/**
 * Get allowed cities based on destination and destination type
 * 
 * CONTRACT:
 * - Returns geographically coherent cities only
 * - Never returns global cities or cross-continent suggestions
 * - Fails narrow: returns [] if destination cannot be resolved
 * - Deterministic and demo-safe
 */
export function getAllowedCities(params: {
  destination: string;
  destinationType: 'city' | 'country' | 'region' | 'theme';
}): City[] {
  const { destination, destinationType } = params;
  const normalizedDest = normalize(destination);

  // 1️⃣ destinationType === "city"
  if (destinationType === 'city') {
    const city = allCities.find(c => normalize(c.name) === normalizedDest);
    
    if (!city) {
      return []; // Fail narrow
    }

    // Include destination city itself
    // Include other cities in the same country
    const sameCountry = allCities.filter(
      c => c.countryCode === city.countryCode
    );

    // Include cities in the same region (sub-region) but different country
    // Only if they share the exact same region string
    const sameRegion = allCities.filter(
      c =>
        c.region &&
        city.region &&
        normalize(c.region) === normalize(city.region) &&
        c.countryCode !== city.countryCode
    );

    return uniqueByName([city, ...sameCountry, ...sameRegion])
      .filter(c => !!c.countryCode)
      .slice(0, 25);
  }

  // 2️⃣ destinationType === "country"
  if (destinationType === 'country') {
    const countryCities = allCities.filter(
      c => normalize(c.country) === normalizedDest
    );

    if (countryCities.length === 0) {
      return []; // Fail narrow
    }

    // Optionally include nearby cities in the same region (sub-region)
    // Only if we found cities with a region
    const firstCityWithRegion = countryCities.find(c => c.region);
    if (firstCityWithRegion?.region) {
      const nearby = allCities.filter(
        c =>
          c.region &&
          normalize(c.region) === normalize(firstCityWithRegion.region) &&
          normalize(c.country) !== normalizedDest
      );
      
      return uniqueByName([...countryCities, ...nearby])
        .filter(c => !!c.countryCode)
        .slice(0, 25);
    }

    return uniqueByName(countryCities)
      .filter(c => !!c.countryCode)
      .slice(0, 25);
  }

  // 3️⃣ destinationType === "region"
  if (destinationType === 'region') {
    const regionCities = allCities.filter(
      c => c.region && normalize(c.region) === normalizedDest
    );

    return uniqueByName(regionCities)
      .filter(c => !!c.countryCode)
      .slice(0, 25);
  }

  // 4️⃣ destinationType === "theme"
  if (destinationType === 'theme') {
    const theme = normalizedDest;
    const regions = themeToRegions[theme];

    if (!regions || regions.length === 0) {
      return []; // Fail narrow
    }

    const themeCities = allCities.filter(c => 
      c.region && regions.some(r => normalize(c.region!) === normalize(r))
    );

    return uniqueByName(themeCities)
      .filter(c => !!c.countryCode)
      .slice(0, 25);
  }

  // Fallback: return empty array (fail narrow, no global cities)
  return [];
}