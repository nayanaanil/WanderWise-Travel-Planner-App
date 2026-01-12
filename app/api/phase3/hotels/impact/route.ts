/**
 * Phase 3: Hotel Impact API
 * 
 * POST /api/phase3/hotels/impact
 * 
 * Evaluates impact of a hotel selection on the baseline route.
 * Returns candidates with impact cards.
 * Never mutates routes - only evaluates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { evaluateHotelImpact } from '@/lib/phase3/hotelImpactEngine';
import { HotelImpactRequest } from '@/lib/phase3/types';
import { Phase2StructuralRoute } from '@/lib/phase2/types';

export async function POST(request: NextRequest) {
  try {
    const body: HotelImpactRequest = await request.json();

    // Validate request
    if (!body.tripId) {
      return NextResponse.json(
        { error: 'Missing field: tripId is required' },
        { status: 400 }
      );
    }

    if (!body.baselineRoute) {
      return NextResponse.json(
        { error: 'Missing field: baselineRoute is required' },
        { status: 400 }
      );
    }

    if (!body.newHotelConstraint) {
      return NextResponse.json(
        { error: 'Missing field: newHotelConstraint is required' },
        { status: 400 }
      );
    }

    // Validate baselineRoute structure
    if (!body.baselineRoute.outboundFlight || !body.baselineRoute.inboundFlight || !body.baselineRoute.groundRoute) {
      return NextResponse.json(
        { error: 'Invalid baselineRoute: missing required fields (outboundFlight, inboundFlight, or groundRoute)' },
        { status: 400 }
      );
    }

    // Ensure baselineRoute has derived property (required for Phase2StructuralRoute)
    const baseline = body.baselineRoute as any;
    if (!baseline.derived) {
      return NextResponse.json(
        { error: 'Invalid baselineRoute: missing required field "derived"' },
        { status: 400 }
      );
    }

    // Validate hotel constraint
    const hotel = body.newHotelConstraint;
    if (!hotel.hotelId || !hotel.city || !hotel.checkIn || !hotel.checkOut || !hotel.nights) {
      return NextResponse.json(
        { error: 'Invalid newHotelConstraint: missing required fields' },
        { status: 400 }
      );
    }

    // Evaluate impact (with locked hotel stays if provided)
    // Type assertion: baseline should be Phase2StructuralRoute since it has derived property
    const response = evaluateHotelImpact(baseline as Phase2StructuralRoute, hotel, body.lockedHotelStays);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Phase3/HotelImpact] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

