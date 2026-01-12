/**
 * Phase 3: Hotel Search API
 * 
 * POST /api/phase3/hotels/search
 * 
 * Returns hotels for each city in the route visits.
 * No routing logic, no impact evaluation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchHotels } from '@/lib/phase3/hotelSearch';
import { HotelSearchRequest } from '@/lib/phase3/types';

export async function POST(request: NextRequest) {
  try {
    const body: HotelSearchRequest = await request.json();

    // Validate request
    if (!body.tripId || !body.visits || !Array.isArray(body.visits)) {
      return NextResponse.json(
        { error: 'Missing or invalid field: tripId and visits are required' },
        { status: 400 }
      );
    }

    // Search hotels
    const response = searchHotels(body);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Phase3/HotelSearch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



