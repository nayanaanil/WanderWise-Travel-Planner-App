import { NextRequest, NextResponse } from 'next/server';

/**
 * Origin Cities Endpoint
 * 
 * Returns only major Indian cities that can be used as starting/departure locations.
 * Limited to 6 tier-1 cities for focused user experience.
 */

// Major Indian cities for origin (starting locations)
const originCities = [
  { id: 'origin-1', name: 'Bangalore', country: 'India', countryCode: 'IN', region: 'Karnataka', type: 'city' as const },
  { id: 'origin-2', name: 'Mumbai', country: 'India', countryCode: 'IN', region: 'Maharashtra', type: 'city' as const },
  { id: 'origin-3', name: 'Delhi', country: 'India', countryCode: 'IN', region: 'Delhi', type: 'city' as const },
  { id: 'origin-4', name: 'Chennai', country: 'India', countryCode: 'IN', region: 'Tamil Nadu', type: 'city' as const },
  { id: 'origin-5', name: 'Hyderabad', country: 'India', countryCode: 'IN', region: 'Telangana', type: 'city' as const },
  { id: 'origin-6', name: 'Kolkata', country: 'India', countryCode: 'IN', region: 'West Bengal', type: 'city' as const },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.toLowerCase().trim() || '';

  if (!query) {
    // Return all origin cities if no query (for compatibility with empty query usage)
    return NextResponse.json({ cities: originCities });
  }

  // Filter cities based on query
  const filteredCities = originCities.filter((city) => {
    const nameMatch = city.name.toLowerCase().includes(query);
    const countryMatch = city.country.toLowerCase().includes(query);
    const regionMatch = city.region?.toLowerCase().includes(query);
    const fullName = `${city.name}, ${city.country}`.toLowerCase();
    const fullNameWithRegion = city.region 
      ? `${city.name}, ${city.region}, ${city.country}`.toLowerCase()
      : fullName;
    
    return nameMatch || countryMatch || regionMatch || fullName.includes(query) || fullNameWithRegion.includes(query);
  });

  // Sort by relevance: exact matches > prefix matches > fuzzy matches
  const sorted = filteredCities.sort((a, b) => {
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
    
    // Otherwise alphabetical
    return aNameLower.localeCompare(bNameLower);
  });

  // Limit to 10 results (though we only have 6 cities)
  return NextResponse.json({ cities: sorted.slice(0, 10) });
}


