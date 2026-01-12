import { NextRequest, NextResponse } from 'next/server';
import { findAirportCode } from '@/lib/airports';

interface FlightSearchParams {
  origin: string; // IATA code, e.g. "BLR"
  destination: string; // IATA code, e.g. "VIE"
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD (optional)
  passengers?: number | { adults?: number; children?: number; infants?: number }; // default 1
  cabinClass?: string; // ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
}

/**
 * Calls Duffel API to search for flight offers
 */
async function searchDuffelFlights(
  origin: string,
  destination: string,
  departureDate: string,
  passengers: number,
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
        { type: 'adult' },
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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: FlightSearchParams = await request.json();

    // Validate required fields
    if (!body.origin || !body.destination || !body.departureDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Duffel API key from environment variables
    const duffelApiKey = process.env.DUFFEL_API_KEY;
    if (!duffelApiKey) {
      console.error('DUFFEL_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Flight search service is not configured' },
        { status: 500 }
      );
    }

    // Handle passengers - can be number or object
    let passengerCount = 1;
    if (typeof body.passengers === 'number') {
      passengerCount = body.passengers;
    } else if (body.passengers && typeof body.passengers === 'object') {
      passengerCount = body.passengers.adults ?? 1;
    }

    // Validate passengers
    if (passengerCount < 1) {
      return NextResponse.json(
        { error: 'At least 1 passenger is required' },
        { status: 400 }
      );
    }

    const cabinClass = body.cabinClass?.toLowerCase() ?? 'economy';

    // Resolve airport codes for origin and destination
    const originCode = findAirportCode(body.origin);
    const destinationCode = findAirportCode(body.destination);

    if (!originCode) {
      return NextResponse.json(
        { error: `Unable to resolve airport code for ${body.origin}` },
        { status: 400 }
      );
    }

    if (!destinationCode) {
      return NextResponse.json(
        { error: `Unable to resolve airport code for ${body.destination}` },
        { status: 400 }
      );
    }

    // Search outbound flight
    let outboundResponse: any = null;
    try {
      outboundResponse = await searchDuffelFlights(
        originCode,
        destinationCode,
        body.departureDate,
        passengerCount,
        cabinClass,
        duffelApiKey
      );
    } catch (error) {
      console.error('Duffel outbound flight search error:', error);
      return NextResponse.json(
        {
          error: 'Duffel API error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 502 }
      );
    }

    // Search return flight if returnDate is provided
    let returnResponse: any = null;
    if (body.returnDate) {
      try {
        returnResponse = await searchDuffelFlights(
          destinationCode,
          originCode,
          body.returnDate,
          passengerCount,
          cabinClass,
          duffelApiKey
        );
      } catch (error) {
        console.error('Duffel return flight search error:', error);
        // If return flight search fails, we still return outbound results
        // but log the error
        returnResponse = null;
      }
    }

    // Return only the Duffel `data` payloads for outbound and return
    return NextResponse.json({
      outbound: outboundResponse?.data ?? null,
      return: returnResponse?.data ?? null,
    });

  } catch (error) {
    console.error('Error in flights API route:', error);

    // Handle different error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
