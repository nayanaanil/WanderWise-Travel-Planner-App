import { NextRequest, NextResponse } from 'next/server';

interface HotelSearchParams {
  destination: string;
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  guests?: {
    adults?: number;
    children?: number;
    rooms?: number;
  };
  budget?: number;
  stars?: number; // Hotel rating (1-5)
  amenities?: string[]; // e.g., ['wifi', 'pool', 'gym']
  [key: string]: any; // Allow additional parameters
}

interface HotelOption {
  id: string;
  name: string;
  pricePerNight?: number;
  price?: number;
  rating?: number;
  stars?: number;
  reviewCount?: number;
  amenities?: string[];
  bestValue?: boolean;
  topRated?: boolean;
  recommended?: boolean;
  badge?: string;
  [key: string]: any;
}

interface HotelsResponse {
  city: string;
  checkIn: string;
  checkOut: string;
  hotels: HotelOption[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: HotelSearchParams = await request.json();

    // Validate required fields
    if (!body.destination || !body.checkIn || !body.checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields: destination, checkIn, checkOut' },
        { status: 400 }
      );
    }

    // Validate date range
    const checkInDate = new Date(body.checkIn);
    const checkOutDate = new Date(body.checkOut);
    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'checkOut date must be after checkIn date' },
        { status: 400 }
      );
    }

    // Get n8n webhook URL from environment variables
    const n8nUrl = process.env.N8N_HOTELS_URL;
    
    let hotels: HotelOption[] = [];
    
    if (n8nUrl) {
      try {
        // Forward request to n8n webhook
        const response = await fetch(n8nUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        // Check if n8n request was successful
        if (response.ok) {
          const data = await response.json();
          // Normalize n8n response to expected shape
          if (Array.isArray(data.hotels)) {
            hotels = data.hotels;
          } else if (Array.isArray(data)) {
            // If response is directly an array of hotels
            hotels = data;
          } else if (data.data && Array.isArray(data.data)) {
            // If hotels are nested under data
            hotels = data.data;
          } else if (data.results && Array.isArray(data.results)) {
            // Alternative nested structure
            hotels = data.results;
          }
        } else {
          console.warn('n8n webhook returned error, using fallback:', response.status);
        }
      } catch (error) {
        console.warn('n8n webhook request failed, using fallback:', error);
      }
    }

    // Fallback: Generate mock hotels if n8n is not configured or failed
    if (hotels.length === 0) {
      hotels = generateMockHotels(body.destination);
    }

    // Normalize response to always match expected shape
    const normalizedResponse: HotelsResponse = {
      city: body.destination,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      hotels: hotels,
    };

    return NextResponse.json(normalizedResponse, { status: 200 });

  } catch (error) {
    console.error('Error in hotels API route:', error);
    
    // Handle different error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Failed to connect to hotel search service' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate mock hotels for fallback when n8n is not available
 */
function generateMockHotels(city: string): HotelOption[] {
  const baseHotels: HotelOption[] = [
    {
      id: `${city.toLowerCase().replace(/\s+/g, '-')}-1`,
      name: `Grand ${city} Hotel`,
      pricePerNight: 120,
      price: 120,
      rating: 4.5,
      stars: 4,
      reviewCount: 234,
      amenities: ['WiFi', 'Breakfast', 'Parking'],
      recommended: true,
    },
    {
      id: `${city.toLowerCase().replace(/\s+/g, '-')}-2`,
      name: `${city} Central Inn`,
      pricePerNight: 85,
      price: 85,
      rating: 4.2,
      stars: 3,
      reviewCount: 189,
      amenities: ['WiFi', 'Breakfast'],
      bestValue: true,
    },
    {
      id: `${city.toLowerCase().replace(/\s+/g, '-')}-3`,
      name: `Luxury ${city} Suites`,
      pricePerNight: 200,
      price: 200,
      rating: 4.8,
      stars: 5,
      reviewCount: 456,
      amenities: ['WiFi', 'Breakfast', 'Pool', 'Gym', 'Spa'],
      topRated: true,
    },
    {
      id: `${city.toLowerCase().replace(/\s+/g, '-')}-4`,
      name: `Budget ${city} Hostel`,
      pricePerNight: 45,
      price: 45,
      rating: 3.9,
      stars: 2,
      reviewCount: 123,
      amenities: ['WiFi'],
    },
    {
      id: `${city.toLowerCase().replace(/\s+/g, '-')}-5`,
      name: `${city} Boutique Hotel`,
      pricePerNight: 150,
      price: 150,
      rating: 4.6,
      stars: 4,
      reviewCount: 298,
      amenities: ['WiFi', 'Breakfast', 'Gym'],
    },
  ];

  return baseHotels;
}



