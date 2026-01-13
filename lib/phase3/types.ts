/**
 * Phase 3: Hotels Impact Engine
 * 
 * Phase 3 introduces Hotels as constraints, not mutations.
 * 
 * Rules:
 * - NEVER auto-mutate routes
 * - NEVER change flights or gateways
 * - ONLY evaluate impact and return candidates + impact cards
 * - No AI. Fully deterministic.
 */

import { StructuralRoute } from '@/lib/route-optimizer/types';
import { Phase2StructuralRoute } from '@/lib/phase2/types';

export type HotelConstraint = {
  hotelId: string;
  city: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  nights: number;
  flexibility: 'FIXED' | '±1_DAY' | 'DATE_RANGE';
};

export type HotelSearchRequest = {
  tripId: string;
  visits: Array<{
    city: string;
    arrival: string;
    departure: string;
    nights: number;
  }>;
  preferences?: {
    priceRange?: [number, number];
    ratingMin?: number;
    amenities?: string[];
  };
};

export type HotelSearchResponse = {
  tripId: string;
  hotelsByCity: Array<{
    city: string;
    stayWindow: {
      arrival: string;
      departure: string;
      nights: number;
    };
    hotels: Array<{
      id: string;
      name: string;
      city: string;
      pricePerNight?: number;
      rating?: number;
      amenities?: string[];
      exactMatch?: boolean;
      availabilityStatus: 'available' | 'limited' | 'unavailable';
      availableRoomTypes?: string[];
      restrictions?: string[];
      priceSignal?: 'normal' | 'high';
      availabilityConfidence: 'high' | 'medium' | 'low';
      availabilityReason?: string;
    }>;
  }>;
};

export type HotelImpactRequest = {
  tripId: string;
  baselineRoute: Phase2StructuralRoute;
  lockedHotelStays?: Array<{
    city: string;
    hotelId: string;
    checkIn: string;
    checkOut: string;
  }>;
  newHotelConstraint: HotelConstraint;
};

export type HotelImpactResponse = {
  hotel: HotelConstraint;
  baselineRouteId: string;
  candidates: Array<{
    route: Phase2StructuralRoute;
    impactCards: Array<import('@/lib/route-optimizer/routeDiff').ImpactCard>;
  }>;
};

export type HotelBookingRequest = {
  tripId: string;
  hotel: HotelConstraint;
};

export type HotelBookingResponse = {
  status: 'success' | 'failed';
  reason?: 'sold_out' | 'room_type_unavailable' | 'price_changed' | 'date_incompatible';
  alternatives?: {
    sameHotelRoomTypes?: string[];
    nearbyHotels?: Array<{
      id: string;
      name: string;
      city: string;
      pricePerNight?: number;
      rating?: number;
      amenities?: string[];
      availabilityStatus: 'available' | 'limited' | 'unavailable';
      availabilityConfidence: 'high' | 'medium' | 'low';
      availabilityReason?: string;
    }>;
  };
};

