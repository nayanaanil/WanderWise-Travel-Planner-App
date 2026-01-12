/**
 * Phase 2 API: Ground Route Builder
 * 
 * This endpoint is responsible ONLY for:
 * - Computing deterministic ground routes from locked flight anchors
 * - Ordering base cities geographically
 * - Assigning day offsets and deriving dates
 * 
 * This endpoint does NOT:
 * - Select or modify flight anchors (Phase 1 responsibility)
 * - Search for flights
 * - Generate multiple route options
 * - Handle hotel availability
 * - Schedule activities
 * 
 * HARD RULES:
 * - Gateways are immutable (outboundFlight.toCity, inboundFlight.fromCity)
 * - Linear, acyclic route: outbound gateway → base cities → inbound gateway
 * - No loops, revisits, or gateways in middle
 * - Deterministic output (same input → same output)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GroundRouteRequest, GroundRouteResponse } from '@/lib/phase2/types';
import { buildGroundRoute } from '@/lib/phase2/groundRouteBuilder';

export async function POST(request: NextRequest) {
  try {
    const body: GroundRouteRequest = await request.json();
    
    // Validate required fields
    if (!body.tripId) {
      return NextResponse.json(
        { error: 'Missing required field: tripId' },
        { status: 400 }
      );
    }
    
    if (!body.lockedFlightAnchors?.outboundFlight || !body.lockedFlightAnchors?.inboundFlight) {
      return NextResponse.json(
        { error: 'Missing required field: lockedFlightAnchors.outboundFlight and lockedFlightAnchors.inboundFlight' },
        { status: 400 }
      );
    }
    
    const { outboundFlight, inboundFlight } = body.lockedFlightAnchors;
    
    if (!outboundFlight.fromCity || !outboundFlight.toCity || !outboundFlight.date) {
      return NextResponse.json(
        { error: 'Missing required fields in outboundFlight: fromCity, toCity, date' },
        { status: 400 }
      );
    }
    
    if (!inboundFlight.fromCity || !inboundFlight.toCity || !inboundFlight.date) {
      return NextResponse.json(
        { error: 'Missing required fields in inboundFlight: fromCity, toCity, date' },
        { status: 400 }
      );
    }
    
    if (!body.draftStops || !Array.isArray(body.draftStops)) {
      return NextResponse.json(
        { error: 'Missing or invalid field: draftStops must be an array' },
        { status: 400 }
      );
    }
    
    if (!body.draftStayCities || !Array.isArray(body.draftStayCities)) {
      return NextResponse.json(
        { error: 'Missing or invalid field: draftStayCities must be an array' },
        { status: 400 }
      );
    }
    
    // Phase 2 validation: gateways must not appear in draftStops
    const outboundGateway = outboundFlight.toCity.toLowerCase().trim();
    const inboundGateway = inboundFlight.fromCity.toLowerCase().trim();
    
    const gatewayInStops = body.draftStops.some(stop => {
      const normalized = stop.city.toLowerCase().trim();
      return normalized === outboundGateway || normalized === inboundGateway;
    });
    
    if (gatewayInStops) {
      return NextResponse.json(
        { error: 'Gateways cannot appear in draftStops. Gateways are immutable and must only appear in lockedFlightAnchors.' },
        { status: 400 }
      );
    }
    
    // Build ground route (deterministic)
    console.debug('[DEBUG][Phase2] Building ground route', {
      tripId: body.tripId,
      outboundGateway: outboundFlight.toCity,
      inboundGateway: inboundFlight.fromCity,
      baseCities: body.draftStops.map(s => s.city),
    });
    
    const structuralRoute = buildGroundRoute(body);
    
    console.debug('[DEBUG][Phase2] Ground route built', {
      tripId: body.tripId,
      totalLegs: structuralRoute.groundRoute.length,
      totalTripDays: structuralRoute.derived.totalTripDays,
    });
    
    const response: GroundRouteResponse = {
      structuralRoute,
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('[ERROR][Phase2] Ground route API error:', error);
    
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

