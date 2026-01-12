import { NextRequest, NextResponse } from 'next/server';

// Curated list of countries for MVP (~25)
const countries = [
  { id: 'country-1', name: 'India', countryCode: 'IN', type: 'country' },
  { id: 'country-2', name: 'Japan', countryCode: 'JP', type: 'country' },
  { id: 'country-3', name: 'Italy', countryCode: 'IT', type: 'country' },
  { id: 'country-4', name: 'France', countryCode: 'FR', type: 'country' },
  { id: 'country-5', name: 'Spain', countryCode: 'ES', type: 'country' },
  { id: 'country-6', name: 'Thailand', countryCode: 'TH', type: 'country' },
  { id: 'country-7', name: 'Indonesia', countryCode: 'ID', type: 'country' },
  { id: 'country-8', name: 'Greece', countryCode: 'GR', type: 'country' },
  { id: 'country-9', name: 'Switzerland', countryCode: 'CH', type: 'country' },
  { id: 'country-10', name: 'United Kingdom', countryCode: 'GB', type: 'country' },
  { id: 'country-11', name: 'Germany', countryCode: 'DE', type: 'country' },
  { id: 'country-12', name: 'Netherlands', countryCode: 'NL', type: 'country' },
  { id: 'country-13', name: 'Austria', countryCode: 'AT', type: 'country' },
  { id: 'country-14', name: 'Portugal', countryCode: 'PT', type: 'country' },
  { id: 'country-15', name: 'Turkey', countryCode: 'TR', type: 'country' },
  { id: 'country-16', name: 'United States', countryCode: 'US', type: 'country' },
  { id: 'country-17', name: 'Canada', countryCode: 'CA', type: 'country' },
  { id: 'country-18', name: 'Australia', countryCode: 'AU', type: 'country' },
  { id: 'country-19', name: 'New Zealand', countryCode: 'NZ', type: 'country' },
  { id: 'country-20', name: 'Singapore', countryCode: 'SG', type: 'country' },
  { id: 'country-21', name: 'United Arab Emirates', countryCode: 'AE', type: 'country' },
  { id: 'country-22', name: 'Maldives', countryCode: 'MV', type: 'country' },
  { id: 'country-23', name: 'South Africa', countryCode: 'ZA', type: 'country' },
  { id: 'country-24', name: 'Mexico', countryCode: 'MX', type: 'country' },
  { id: 'country-25', name: 'Egypt', countryCode: 'EG', type: 'country' },
];

// Curated list of regions for MVP (~15)
const regions = [
  { id: 'region-1', name: 'Europe', type: 'region' },
  { id: 'region-2', name: 'Central Europe', type: 'region' },
  { id: 'region-3', name: 'Mediterranean', type: 'region' },
  { id: 'region-4', name: 'Scandinavia', type: 'region' },
  { id: 'region-5', name: 'South East Asia', type: 'region' },
  { id: 'region-6', name: 'Middle East', type: 'region' },
  { id: 'region-7', name: 'North India', type: 'region' },
  { id: 'region-8', name: 'South India', type: 'region' },
  { id: 'region-9', name: 'Himalayan Region', type: 'region' },
  { id: 'region-10', name: 'East Africa', type: 'region' },
  { id: 'region-11', name: 'Southern Africa', type: 'region' },
  { id: 'region-12', name: 'West Coast USA', type: 'region' },
  { id: 'region-13', name: 'East Coast USA', type: 'region' },
  { id: 'region-14', name: 'Caribbean', type: 'region' },
  { id: 'region-15', name: 'Swiss Alps', type: 'region' },
];

// Curated list of cities and clusters for MVP (~26)
// Note: Bali, Maldives, and Goa are cluster destinations, not urban cities
const cities = [
  { id: 'city-1', name: 'Paris', country: 'France', countryCode: 'FR', region: 'Île-de-France' },
  { id: 'city-2', name: 'London', country: 'United Kingdom', countryCode: 'GB', region: 'England' },
  { id: 'city-3', name: 'Rome', country: 'Italy', countryCode: 'IT', region: 'Lazio' },
  { id: 'city-4', name: 'Barcelona', country: 'Spain', countryCode: 'ES', region: 'Catalonia' },
  { id: 'city-5', name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', region: 'North Holland' },
  { id: 'city-6', name: 'Vienna', country: 'Austria', countryCode: 'AT', region: 'Vienna' },
  { id: 'city-7', name: 'Prague', country: 'Czech Republic', countryCode: 'CZ', region: 'Prague' },
  { id: 'city-8', name: 'Berlin', country: 'Germany', countryCode: 'DE', region: 'Berlin' },
  { id: 'city-9', name: 'Istanbul', country: 'Turkey', countryCode: 'TR', region: 'Istanbul' },
  { id: 'city-10', name: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', region: 'Dubai' },
  { id: 'city-11', name: 'Singapore', country: 'Singapore', countryCode: 'SG' },
  { id: 'city-12', name: 'Bangkok', country: 'Thailand', countryCode: 'TH', region: 'Bangkok' },
  { id: 'city-13', name: 'Tokyo', country: 'Japan', countryCode: 'JP', region: 'Kanto' },
  { id: 'city-14', name: 'Kyoto', country: 'Japan', countryCode: 'JP', region: 'Kansai' },
  { id: 'city-15', name: 'Seoul', country: 'South Korea', countryCode: 'KR', region: 'Seoul' },
  { id: 'city-16', name: 'New York', country: 'United States', countryCode: 'US', region: 'New York' },
  { id: 'city-17', name: 'Los Angeles', country: 'United States', countryCode: 'US', region: 'California' },
  { id: 'city-18', name: 'San Francisco', country: 'United States', countryCode: 'US', region: 'California' },
  { id: 'city-19', name: 'Sydney', country: 'Australia', countryCode: 'AU', region: 'New South Wales' },
  { id: 'city-20', name: 'Melbourne', country: 'Australia', countryCode: 'AU', region: 'Victoria' },
  { id: 'city-21', name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', region: 'Western Cape' },
  { id: 'city-22', name: 'Marrakech', country: 'Morocco', countryCode: 'MA', region: 'Marrakech-Safi' },
  { id: 'city-23', name: 'Bali', country: 'Indonesia', countryCode: 'ID', region: 'Bali' }, // Cluster destination
  { id: 'city-24', name: 'Maldives', country: 'Maldives', countryCode: 'MV' }, // Cluster destination
  { id: 'city-25', name: 'Goa', country: 'India', countryCode: 'IN', region: 'Goa' }, // Cluster destination
  { id: 'city-26', name: 'Santorini', country: 'Greece', countryCode: 'GR', region: 'South Aegean' },
];

// Add type field to cities
const citiesWithType = cities.map(city => ({
  ...city,
  type: 'city' as const,
}));

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLowerCase().trim() || '';

  if (!query) {
    return NextResponse.json({ cities: [] });
  }

  // Filter countries based on query
  const filteredCountries = countries.filter((country) => {
    const nameMatch = country.name.toLowerCase().includes(query);
    return nameMatch;
  });

  // Filter regions based on query
  const filteredRegions = regions.filter((region) => {
    const nameMatch = region.name.toLowerCase().includes(query);
    return nameMatch;
  });

  // Filter cities based on query
  const filteredCities = citiesWithType.filter((city) => {
    const nameMatch = city.name.toLowerCase().includes(query);
    const countryMatch = city.country.toLowerCase().includes(query);
    const regionMatch = city.region?.toLowerCase().includes(query);
    const fullName = `${city.name}, ${city.country}`.toLowerCase();
    const fullNameWithRegion = city.region 
      ? `${city.name}, ${city.region}, ${city.country}`.toLowerCase()
      : fullName;
    
    return nameMatch || countryMatch || regionMatch || fullName.includes(query) || fullNameWithRegion.includes(query);
  });

  // Combine countries, regions, and cities
  const allResults = [...filteredCountries, ...filteredRegions, ...filteredCities];

  // Sort by relevance with priority: exact matches > prefix matches > countries > regions > cities > fuzzy matches
  const sorted = allResults.sort((a, b) => {
    const aNameLower = a.name.toLowerCase();
    const bNameLower = b.name.toLowerCase();
    
    // Exact name match gets highest priority
    if (aNameLower === query) return -1;
    if (bNameLower === query) return 1;
    
    // Starts with query gets second priority
    const aStartsWith = aNameLower.startsWith(query);
    const bStartsWith = bNameLower.startsWith(query);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // If both start with query, prioritize by type: country > region > city
    if (aStartsWith && bStartsWith) {
      if (a.type === 'country' && b.type !== 'country') return -1;
      if (a.type !== 'country' && b.type === 'country') return 1;
      if (a.type === 'region' && b.type === 'city') return -1;
      if (a.type === 'city' && b.type === 'region') return 1;
    }
    
    // For fuzzy matches, prioritize by type: country > region > city
    if (!aStartsWith && !bStartsWith) {
      if (a.type === 'country' && b.type !== 'country') return -1;
      if (a.type !== 'country' && b.type === 'country') return 1;
      if (a.type === 'region' && b.type === 'city') return -1;
      if (a.type === 'city' && b.type === 'region') return 1;
    }
    
    // Otherwise alphabetical
    return aNameLower.localeCompare(bNameLower);
  });

  // Limit to 10 results (prioritize countries if query matches)
  return NextResponse.json({ cities: sorted.slice(0, 10) });
}
