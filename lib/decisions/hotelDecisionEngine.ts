/**
 * Hotel Decision Engine v2
 * 
 * Deterministic evaluation of hotel booking decisions with human travel agent behavior.
 * 
 * Rules:
 * - Pure function (no side effects)
 * - No state mutation
 * - Hotels as soft constraints (not hard blocks)
 * - Partial availability explained, not blocked
 * - Split stays suggested, not auto-applied
 * - AI explains decisions, never invents them
 * - Never modifies itinerary structure
 */

import { DecisionResult, DecisionOption } from './types';

export type HotelDecisionInput = {
  stay: {
    city: string;
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  selectedHotel?: {
    id: string;
    name: string;
    availabilityStatus: 'available' | 'limited' | 'unavailable';
    availabilityConfidence: 'high' | 'medium' | 'low';
    availabilityReason?: string;
    pricePerNight?: number;
    restrictions?: string[];
    // Partial availability support (for CASE C)
    availableNights?: number; // If provided, indicates hotel is available for X of stay.nights
  };
  allHotelsInCity?: Array<{
    id: string;
    name: string;
    availabilityStatus: 'available' | 'limited' | 'unavailable';
    availabilityConfidence: 'high' | 'medium' | 'low';
    availabilityReason?: string;
    pricePerNight?: number;
    restrictions?: string[];
  }>;
};

/**
 * Evaluate hotel booking decision
 * 
 * Implements deterministic cases:
 * - CASE A: Fully available, high confidence → OK
 * - CASE B: Available but low confidence/limited → WARNING
 * - CASE C: Partially available → WARNING (suggest split stay)
 * - CASE D: Fully unavailable → BLOCKED
 */
export function evaluateHotelDecision(input: HotelDecisionInput): DecisionResult {
  const { stay, selectedHotel, allHotelsInCity = [] } = input;

  // Case 0: No hotel selected - OK status with recommendation
  if (!selectedHotel) {
    return {
      domain: 'hotel',
      status: 'OK',
      facts: [
        `No hotel selected for ${stay.city}`,
        `Stay dates: ${stay.checkIn} to ${stay.checkOut} (${stay.nights} nights)`,
      ],
      recommendation: `Consider selecting a hotel for your stay in ${stay.city}`,
      options: allHotelsInCity
        .filter(hotel => hotel.availabilityStatus !== 'unavailable')
        .slice(0, 3)
        .map((hotel, index) => ({
          id: `hotel-option-${index}`,
          label: hotel.name,
          description: `${hotel.availabilityStatus === 'limited' ? 'Limited availability' : 'Available'} hotel in ${stay.city}`,
          tradeoffs: hotel.restrictions ? [hotel.restrictions.join(', ')] : undefined,
          action: {
            type: 'SELECT_HOTEL',
            payload: {
              hotelId: hotel.id,
              city: stay.city,
            },
          },
        })),
    };
  }

  // CASE C: Partially available (key MVP case)
  // Check if hotel is available for fewer nights than requested
  if (selectedHotel.availableNights !== undefined && 
      selectedHotel.availableNights < stay.nights && 
      selectedHotel.availableNights > 0) {
    
    const facts: string[] = [
      `Hotel "${selectedHotel.name}" is available for ${selectedHotel.availableNights} of ${stay.nights} nights`,
      `Stay dates: ${stay.checkIn} to ${stay.checkOut}`,
    ];
    
    if (selectedHotel.availabilityReason) {
      facts.push(selectedHotel.availabilityReason);
    }

    const risks: string[] = [
      `Hotel unavailable for ${stay.nights - selectedHotel.availableNights} night(s) during your stay`,
      'You may need to stay at multiple hotels or adjust dates',
    ];

    const options: DecisionOption[] = [
      {
        id: 'suggest-split-stay',
        label: `Stay here for ${selectedHotel.availableNights} nights (suggestion)`,
        description: `Consider staying at ${selectedHotel.name} for the available ${selectedHotel.availableNights} nights, then switching to another hotel for the remaining ${stay.nights - selectedHotel.availableNights} nights`,
        tradeoffs: [
          'Requires booking multiple hotels',
          'May need to move between accommodations',
          'Split stay may add complexity',
        ],
        action: {
          type: 'SUGGEST_SPLIT_STAY',
          payload: {
            hotelId: selectedHotel.id,
            city: stay.city,
            availableNights: selectedHotel.availableNights,
            totalNights: stay.nights,
            // NOTE: This is a suggestion only - NO route modification
          },
        },
      },
      {
        id: 'choose-different-room',
        label: 'Try a different option in the same hotel',
        description: 'Explore alternative options that may have full availability',
        action: {
          type: 'CHECK_ROOM_TYPES',
          payload: {
            hotelId: selectedHotel.id,
            city: stay.city,
          },
        },
      },
    ];

    // Add nearby hotel options for full stay
    const nearbyHotels = allHotelsInCity
      .filter(hotel => 
        hotel.id !== selectedHotel.id && 
        hotel.availabilityStatus === 'available' &&
        hotel.availabilityConfidence === 'high'
      )
      .slice(0, 2);

    nearbyHotels.forEach((hotel, index) => {
      options.push({
        id: `nearby-full-stay-${index}`,
        label: hotel.name,
        description: `Available for full ${stay.nights} nights in ${stay.city}`,
        tradeoffs: hotel.pricePerNight && selectedHotel.pricePerNight
          ? hotel.pricePerNight > selectedHotel.pricePerNight
            ? [`Higher price ($${hotel.pricePerNight}/night vs $${selectedHotel.pricePerNight}/night)`]
            : [`Similar or lower price ($${hotel.pricePerNight}/night)`]
          : undefined,
        action: {
          type: 'SELECT_HOTEL',
          payload: {
            hotelId: hotel.id,
            city: stay.city,
          },
        },
      });
    });

    options.push({
      id: 'cancel-partial',
      label: 'Cancel selection',
      description: 'Remove this hotel and explore other options',
      action: {
        type: 'CANCEL_HOTEL_SELECTION',
        payload: {
          city: stay.city,
        },
      },
    });

    return {
      domain: 'hotel',
      status: 'WARNING',
      facts,
      risks,
      recommendation: `This hotel is partially available. Consider a split stay or selecting an alternative hotel with full availability.`,
      options,
    };
  }

  // CASE D: Fully unavailable - BLOCKED
  if (selectedHotel.availabilityStatus === 'unavailable') {
    const facts: string[] = [
      `Hotel "${selectedHotel.name}" is unavailable for your stay`,
      `Stay dates: ${stay.checkIn} to ${stay.checkOut} (${stay.nights} nights)`,
    ];
    
    if (selectedHotel.availabilityReason) {
      facts.push(selectedHotel.availabilityReason);
    }

    const risks: string[] = [
      'Cannot proceed with booking this hotel',
      'May need to adjust travel dates or choose different accommodation',
    ];

    const alternativeHotels = allHotelsInCity
      .filter(hotel => hotel.id !== selectedHotel.id && hotel.availabilityStatus !== 'unavailable')
      .slice(0, 3);

    const options: DecisionOption[] = alternativeHotels.map((hotel, index) => ({
      id: `alternative-hotel-${index}`,
      label: hotel.name,
      description: `${hotel.availabilityStatus === 'limited' ? 'Limited availability' : 'Available'} alternative in ${stay.city}`,
      tradeoffs: hotel.restrictions ? [hotel.restrictions.join(', ')] : undefined,
      action: {
        type: 'SELECT_HOTEL',
        payload: {
          hotelId: hotel.id,
          city: stay.city,
        },
      },
    }));

    // Add option to adjust dates if flexibility exists
    // Note: This is a suggestion - actual date adjustment would be handled elsewhere
    options.push({
      id: 'suggest-date-adjustment',
      label: 'Explore date flexibility',
      description: 'Check if adjusting your stay dates by a few days would improve availability',
      tradeoffs: ['May require changing other travel arrangements'],
      action: {
        type: 'EXPLORE_DATE_FLEXIBILITY',
        payload: {
          city: stay.city,
          originalCheckIn: stay.checkIn,
          originalCheckOut: stay.checkOut,
        },
      },
    });

    options.push({
      id: 'cancel-unavailable',
      label: 'Cancel selection',
      description: 'Remove this hotel and continue planning',
      action: {
        type: 'CANCEL_HOTEL_SELECTION',
        payload: {
          city: stay.city,
        },
      },
    });

    return {
      domain: 'hotel',
      status: 'BLOCKED',
      facts,
      risks,
      recommendation: alternativeHotels.length > 0
        ? `Consider alternative hotels in ${stay.city} or adjusting your travel dates`
        : `No available alternatives found for ${stay.city}. Consider adjusting travel dates.`,
      options,
    };
  }

  // CASE B: Available but low confidence / limited rooms
  if (selectedHotel.availabilityStatus === 'limited' || selectedHotel.availabilityConfidence === 'low') {
    const facts: string[] = [
      `Hotel "${selectedHotel.name}" is available but with some concerns`,
      `Stay dates: ${stay.checkIn} to ${stay.checkOut} (${stay.nights} nights)`,
    ];

    if (selectedHotel.availabilityStatus === 'limited') {
      facts.push('Limited room availability during your stay');
    }
    
    if (selectedHotel.availabilityConfidence === 'low') {
      facts.push('Low booking confidence - availability may change');
    }

    if (selectedHotel.availabilityReason) {
      facts.push(selectedHotel.availabilityReason);
    }

    const risks: string[] = [
      'Hotel may become unavailable before booking confirmation',
      'Limited options or dates may restrict flexibility',
    ];

    if (selectedHotel.restrictions && selectedHotel.restrictions.length > 0) {
      risks.push(...selectedHotel.restrictions);
    }

    const alternativeHotels = allHotelsInCity
      .filter(hotel => 
        hotel.id !== selectedHotel.id && 
        (hotel.availabilityStatus === 'available' || 
         (hotel.availabilityStatus === 'limited' && hotel.availabilityConfidence === 'high'))
      )
      .slice(0, 2);

    const options: DecisionOption[] = [
      {
        id: 'book-anyway',
        label: 'Apply anyway',
        description: `Proceed with selecting ${selectedHotel.name} despite availability concerns`,
        tradeoffs: ['Higher risk if unavailable at time of booking', 'May need to adjust if unavailable'],
        action: {
          type: 'PROCEED_BOOKING',
          payload: {
            hotelId: selectedHotel.id,
            city: stay.city,
          },
        },
      },
      {
        id: 'check-room-types',
        label: 'Try a different option in the same hotel',
        description: 'Explore alternative options that may have better availability',
        action: {
          type: 'CHECK_ROOM_TYPES',
          payload: {
            hotelId: selectedHotel.id,
            city: stay.city,
          },
        },
      },
    ];

    // Add safer nearby hotel options
    alternativeHotels.forEach((hotel, index) => {
      options.push({
        id: `safer-alternative-${index}`,
        label: hotel.name,
        description: `Nearby hotel with ${hotel.availabilityConfidence === 'high' ? 'better' : 'similar'} availability confidence`,
        tradeoffs: hotel.pricePerNight && selectedHotel.pricePerNight
          ? hotel.pricePerNight > selectedHotel.pricePerNight
            ? [`Higher price ($${hotel.pricePerNight}/night vs $${selectedHotel.pricePerNight}/night)`]
            : [`Similar or lower price ($${hotel.pricePerNight}/night)`]
          : undefined,
        action: {
          type: 'SELECT_HOTEL',
          payload: {
            hotelId: hotel.id,
            city: stay.city,
          },
        },
      });
    });

    return {
      domain: 'hotel',
      status: 'WARNING',
      facts,
      risks,
      recommendation: 'This hotel is available but has some availability concerns. Consider booking quickly or selecting a safer alternative.',
      options,
    };
  }

  // CASE A: Fully available, high confidence - OK
  return {
    domain: 'hotel',
    status: 'OK',
    facts: [
      `Hotel "${selectedHotel.name}" is available for your stay`,
      `Stay dates: ${stay.checkIn} to ${stay.checkOut} (${stay.nights} nights)`,
      `Booking confidence: ${selectedHotel.availabilityConfidence}`,
      selectedHotel.pricePerNight ? `Price: $${selectedHotel.pricePerNight} per night` : '',
    ].filter(Boolean),
    recommendation: 'This hotel fits your stay perfectly. You can proceed with booking.',
    options: [
      {
        id: 'book-hotel',
        label: 'Apply to itinerary',
        description: `Confirm your selection of ${selectedHotel.name}`,
        action: {
          type: 'PROCEED_BOOKING',
          payload: {
            hotelId: selectedHotel.id,
            city: stay.city,
          },
        },
      },
    ],
  };
}
