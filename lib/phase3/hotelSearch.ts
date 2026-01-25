/**
 * Phase 3: Hotel Search (Route-Aware, No Impact)
 * 
 * Rules:
 * - Only return hotels for cities in visits
 * - Stay window = visit arrival → departure
 * - No routing logic
 * - Stub provider allowed (MVP)
 */

import { HotelSearchRequest, HotelSearchResponse, HotelTags } from './types';

/**
 * High-demand cities that affect availability
 */
const HIGH_DEMAND_CITIES = ['florence', 'paris', 'rome', 'venice', 'santorini', 'barcelona', 'amsterdam'];

/**
 * Determines if a check-in date falls on a weekend (Friday or Saturday)
 */
function isWeekendCheckIn(checkInDate: string): boolean {
  try {
    const date = new Date(checkInDate);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    return dayOfWeek === 5 || dayOfWeek === 6;
  } catch {
    return false;
  }
}

/**
 * Determines if a hotel name suggests a boutique property
 */
function isBoutiqueHotel(hotelName: string): boolean {
  const boutiqueKeywords = ['boutique', 'inn', 'lodge', 'villa', 'suite', 'manor'];
  const lowerName = hotelName.toLowerCase();
  return boutiqueKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Computes availability status and confidence based on deterministic rules
 */
function computeAvailability(
  city: string,
  visit: { arrival: string; departure: string; nights: number },
  hotelName: string,
  hotelIndex: number // For deterministic variation
): {
  availabilityStatus: 'available' | 'limited' | 'unavailable';
  availabilityConfidence: 'high' | 'medium' | 'low';
  availabilityReason?: string;
  priceSignal?: 'normal' | 'high';
  availableRoomTypes?: string[];
  restrictions?: string[];
} {
  const normalizedCity = city.toLowerCase().trim();
  const isHighDemand = HIGH_DEMAND_CITIES.includes(normalizedCity);
  const isWeekend = isWeekendCheckIn(visit.arrival);
  const isOneNight = visit.nights === 1;
  const isBoutique = isBoutiqueHotel(hotelName);
  
  // Build reason parts
  const reasonParts: string[] = [];
  let confidenceScore = 3; // Start with high confidence (3), decrease for risk factors
  
  // Risk factors that reduce confidence
  if (isOneNight) {
    confidenceScore -= 1;
    reasonParts.push('1-night stays often have limited availability');
  }
  
  if (isWeekend) {
    confidenceScore -= 1;
    reasonParts.push('weekend check-ins are often in higher demand');
  }
  
  if (isHighDemand) {
    confidenceScore -= 1;
    reasonParts.push(`${city} is a popular destination`);
  }
  
  if (isBoutique) {
    confidenceScore -= 1;
    reasonParts.push('smaller properties may have limited inventory');
  }
  
  // Clamp confidence between 1 (low) and 3 (high)
  confidenceScore = Math.max(1, Math.min(3, confidenceScore));
  
  // Map score to confidence level
  let availabilityConfidence: 'high' | 'medium' | 'low';
  if (confidenceScore >= 3) {
    availabilityConfidence = 'high';
  } else if (confidenceScore === 2) {
    availabilityConfidence = 'medium';
  } else {
    availabilityConfidence = 'low';
  }
  
  // Determine availability status
  // Unavailable only in extreme cases (high demand + weekend + 1 night + boutique)
  let availabilityStatus: 'available' | 'limited' | 'unavailable';
  if (isHighDemand && isWeekend && isOneNight && isBoutique && hotelIndex === 2) {
    availabilityStatus = 'unavailable';
    reasonParts.push('all rooms are currently booked');
  } else if (confidenceScore <= 1) {
    availabilityStatus = 'limited';
    reasonParts.push('only a few rooms may be available');
  } else {
    availabilityStatus = 'available';
  }
  
  // Price signal: high demand + weekend = high price
  const priceSignal = (isHighDemand || isWeekend) ? 'high' : 'normal';
  
  // Room types based on availability
  const availableRoomTypes = availabilityStatus === 'unavailable' 
    ? [] 
    : availabilityStatus === 'limited'
    ? ['Standard Room']
    : ['Standard Room', 'Deluxe Room', availabilityConfidence === 'high' ? 'Suite' : undefined].filter(Boolean) as string[];
  
  // Restrictions
  const restrictions: string[] = [];
  if (isWeekend && availabilityConfidence !== 'high') {
    restrictions.push('Minimum 2-night stay may be required');
  }
  if (isOneNight && isHighDemand) {
    restrictions.push('Single-night bookings may have limited options');
  }
  
  // Build final reason string
  const availabilityReason = reasonParts.length > 0 
    ? reasonParts.join(', ')
    : undefined;
  
  return {
    availabilityStatus,
    availabilityConfidence,
    availabilityReason,
    priceSignal,
    availableRoomTypes,
    restrictions: restrictions.length > 0 ? restrictions : undefined,
  };
}

/**
 * Mock hotel data for MVP with deterministic availability and preference tags
 */
function mockHotelsForCity(city: string, visit: { arrival: string; departure: string; nights: number }) {
  // Hotel 1: Premium, central, foodie/culture/shopping vibe
  const hotel1Tags: HotelTags = {
    priceCategory: 'premium',
    vibeMatch: ['foodie', 'culture', 'shopping'],
    paceMatch: ['packed', 'moderate'],
    locationVibe: 'central',
    groupFit: ['solo', 'couple'],
  };

  // Hotel 2: Moderate, quiet-residential, relaxation/photography vibe
  const hotel2Tags: HotelTags = {
    priceCategory: 'moderate',
    vibeMatch: ['relaxation', 'photography'],
    paceMatch: ['relaxed', 'moderate'],
    locationVibe: 'quiet-residential',
    groupFit: ['family', 'small-group'],
  };

  // Hotel 3: Budget, central, adventure/culture vibe
  const hotel3Tags: HotelTags = {
    priceCategory: 'budget',
    vibeMatch: ['adventure', 'culture'],
    paceMatch: ['packed', 'moderate'],
    locationVibe: 'central',
    groupFit: ['solo', 'couple'],
  };

  const mockHotels = [
    {
      id: `hotel-${city}-1`,
      name: `Old Town ${city} Suites`,
      city,
      pricePerNight: 220,
      rating: 4.3,
      amenities: ['WiFi', 'City Center', 'Rooftop Bar'],
      exactMatch: true,
      availableRoomTypes: ['Standard Room', 'Deluxe Room'],
      availabilityStatus: 'available' as const,
      availabilityConfidence: 'high' as const,
      tags: hotel1Tags,
    },
    {
      id: `hotel-${city}-2`,
      name: `Grand ${city} Hotel`,
      city,
      pricePerNight: 165,
      rating: 4.5,
      amenities: ['WiFi', 'Breakfast', 'Pool', 'Family Friendly', 'Quiet Location'],
      exactMatch: true,
      availableRoomTypes: ['Standard Room', 'Deluxe Room', 'Family Suite'],
      availabilityStatus: 'limited' as const,
      availabilityConfidence: 'medium' as const,
      availabilityReason: 'Popular property, only a few suites remaining for your dates',
      tags: hotel2Tags,
    },
    {
      id: `hotel-${city}-3`,
      name: `${city} Central Inn`,
      city,
      pricePerNight: 85,
      rating: 4.0,
      amenities: ['WiFi', 'Parking', '24hr Reception'],
      exactMatch: true,
      availableRoomTypes: ['Standard Room', 'Twin Room'],
      availabilityStatus: 'available' as const,
      availabilityConfidence: 'high' as const,
      restrictions: ['No family rooms - groups may need multiple bookings'],
      tags: hotel3Tags,
    },
  ];

  return mockHotels;
}

/**
 * Search hotels for route visits
 * 
 * @param req - Hotel search request with visits and preferences
 * @returns Hotels grouped by city with stay windows
 */
export function searchHotels(req: HotelSearchRequest): HotelSearchResponse {
  const hotelsByCity = req.visits.map(visit => ({
    city: visit.city,
    stayWindow: {
      arrival: visit.arrival,
      departure: visit.departure,
      nights: visit.nights,
    },
    hotels: mockHotelsForCity(visit.city, visit),
  }));

  return {
    tripId: req.tripId,
    hotelsByCity,
  };
}

