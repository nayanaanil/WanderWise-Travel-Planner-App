/**
 * Phase 3: Hotel Selection Validation API
 * 
 * POST /api/phase3/hotels/booking
 * 
 * Validates if a hotel selection can be applied to the itinerary.
 * Returns success or failure with alternatives.
 * This is a soft validation step - not a payment/booking transaction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { HotelBookingRequest, HotelBookingResponse } from '@/lib/phase3/types';

/**
 * Deterministically determine if a hotel selection should fail validation due to date incompatibility.
 * Exactly one hotel per scenario fails (the first hotel in search results).
 * This mimics a common real-world case where a hotel cannot accommodate selected dates.
 */
function shouldBookingFail(hotelId: string): boolean {
  // Deterministic rule: The first hotel (pattern: hotel-{city}-1) always fails due to date incompatibility
  // This ensures exactly one hotel fails per scenario, making demos stable
  // Hotels are returned in consistent order: hotel-{city}-1, hotel-{city}-2, hotel-{city}-3
  // Alternative hotels (-alt-1, -alt-2) should NOT match this pattern and always succeed
  // Match pattern: hotel-{city}-1 (but not hotel-{city}-alt-1)
  const pattern = /^hotel-[^-]+-1$/;
  return pattern.test(hotelId);
}

/**
 * Generate alternatives for a failed selection.
 * Ensures at least one alternative always succeeds validation.
 * 
 * Guarantees:
 * - Alternative hotels use IDs ending in -alt-{number}, which do NOT match the failure pattern
 * - These hotels will always return status: "success" when selected
 * - Same-hotel room types are provided as an additional recovery option
 */
function generateAlternatives(
  hotelId: string,
  city: string,
  checkIn: string,
  checkOut: string
): HotelBookingResponse['alternatives'] {
  const alternatives: HotelBookingResponse['alternatives'] = {};
  
  // For date incompatibility, suggest alternative room types from same hotel
  // These room types may have different minimum stay requirements
  alternatives.sameHotelRoomTypes = ['Deluxe Room', 'Suite'];
  
  // Generate nearby hotels that always succeed validation
  // IDs use -alt-{number} pattern to ensure they don't match the failure pattern (hotel-{city}-1)
  // These are guaranteed to accept the selected dates and always return success
  const nearbyHotels = [
    {
      id: `hotel-${city}-alt-1`,
      name: `${city} Plaza Hotel`,
      city,
      pricePerNight: 150,
      rating: 4.2,
      amenities: ['WiFi', 'Breakfast'],
      availabilityStatus: 'available' as const,
      availabilityConfidence: 'high' as const,
    },
    {
      id: `hotel-${city}-alt-2`,
      name: `${city} Garden Inn`,
      city,
      pricePerNight: 130,
      rating: 4.0,
      amenities: ['WiFi', 'Parking'],
      availabilityStatus: 'available' as const,
      availabilityConfidence: 'high' as const,
    },
  ];
  
  alternatives.nearbyHotels = nearbyHotels;
  
  return alternatives;
}

export async function POST(request: NextRequest) {
  try {
    const body: HotelBookingRequest = await request.json();

    // Validate request
    if (!body.tripId) {
      return NextResponse.json(
        { error: 'Missing field: tripId is required' },
        { status: 400 }
      );
    }

    if (!body.hotel || !body.hotel.hotelId || !body.hotel.city) {
      return NextResponse.json(
        { error: 'Missing field: hotel.hotelId and hotel.city are required' },
        { status: 400 }
      );
    }

    // Mock validation: deterministic date incompatibility check
    // Exactly one hotel per scenario fails (the first hotel: ending in -1)
    // This ensures stable demo behavior while mimicking real-world date constraints
    
    const hotelId = body.hotel.hotelId;
    
    // Deterministic failure: first hotel (index 0, ending in -1) always fails due to date incompatibility
    const shouldFail = shouldBookingFail(hotelId);
    
    if (shouldFail) {
      // Failure reason: date incompatibility
      // Common causes: minimum stay not met, arrival date not supported, no rooms for full date range
      const reason: 'date_incompatible' = 'date_incompatible';
      
      const alternatives = generateAlternatives(
        hotelId,
        body.hotel.city,
        body.hotel.checkIn,
        body.hotel.checkOut
      );
      
      const response: HotelBookingResponse = {
        status: 'failed',
        reason,
        alternatives,
      };
      
      return NextResponse.json(response);
    }

    // Validation successful
    const response: HotelBookingResponse = {
      status: 'success',
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Phase3/HotelBooking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

