/**
 * Phase 1 Flight Search
 * 
 * Searches for bookable flights using Duffel API.
 * Only returns flights with valid airport codes and successful API responses.
 */

import { findAirportCode } from '@/lib/airports';
import { transformDuffelOffers } from '@/lib/transformDuffelFlights';
import { FlightOption } from './types';

/**
 * Search flights using Duffel API
 */
async function searchDuffelFlights(
  origin: string,
  destination: string,
  departureDate: string,
  passengers: { adults: number; children: number },
  cabinClass: string,
  apiKey: string
): Promise<any> {
  const requestBody = {
    data: {
      slices: [
        {
          origin,
          destination,
          departure_date: departureDate,
        },
      ],
      passengers: [
        ...Array(passengers.adults).fill({ type: 'adult' }),
        ...Array(passengers.children).fill({ type: 'child' }),
      ],
      cabin_class: cabinClass || 'economy',
      max_connections: 2,
    },
  };

  const response = await fetch('https://api.duffel.com/air/offer_requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Duffel-Version': 'v2',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Duffel API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Search flights for a gateway pair.
 * Returns empty array if airport codes cannot be resolved or API call fails.
 */
export async function searchGatewayFlights(
  originCity: string,
  gatewayCity: string,
  departureDate: string,
  passengers: { adults: number; children: number },
  cabinClass: string = 'economy',
  duffelApiKey: string
): Promise<FlightOption[]> {
  // Resolve airport codes
  const originCode = findAirportCode(originCity);
  const gatewayCode = findAirportCode(gatewayCity);
  
  if (!originCode) {
    console.warn('[DEBUG][Phase1][FlightSearch] Cannot resolve origin airport', {
      originCity
    });
    return [];
  }
  
  if (!gatewayCode) {
    console.warn('[DEBUG][Phase1][FlightSearch] Cannot resolve gateway airport', {
      gatewayCity
    });
    return [];
  }
  
  // Search flights
  try {
    const duffelResponse = await searchDuffelFlights(
      originCode,
      gatewayCode,
      departureDate,
      passengers,
      cabinClass,
      duffelApiKey
    );
    
    // Transform Duffel response to FlightOption array
    const transformedFlights = transformDuffelOffers(duffelResponse?.data || null);
    
    // Map to Phase 1 FlightOption format
    const flights: FlightOption[] = transformedFlights.map(flight => ({
      id: flight.id,
      airline: flight.airline,
      airlineName: flight.airline,
      price: flight.price,
      duration: flight.duration,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      departureAirport: flight.origin,
      arrivalAirport: flight.destination,
      stops: flight.stops,
      // Include full timestamps if available
      ...(flight.departureTimestamp && { departureTimestamp: flight.departureTimestamp }),
      ...(flight.arrivalTimestamp && { arrivalTimestamp: flight.arrivalTimestamp }),
      // Include legs array if available
      ...(flight.legs && flight.legs.length > 0 && { legs: flight.legs }),
    }));
    
    // Deduplicate flights
    const seenKeys = new Set<string>();
    const dedupedFlights: FlightOption[] = [];
    for (const flight of flights) {
      const key = [
        flight.airline || '',
        flight.departureTime || '',
        flight.arrivalTime || '',
        flight.departureAirport || '',
        flight.arrivalAirport || '',
      ].join('|');
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      dedupedFlights.push(flight);
    }
    
    console.debug('[DEBUG][Phase1][FlightSearch] Found flights', {
      originCity,
      gatewayCity,
      count: dedupedFlights.length
    });
    
    return dedupedFlights;
  } catch (error) {
    console.error('[DEBUG][Phase1][FlightSearch] Duffel API error', {
      originCity,
      gatewayCity,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Return empty array on error (exclude this option)
    return [];
  }
}

