/**
 * Phase 1 API: Gateway + Flight Options
 * 
 * This endpoint is responsible ONLY for:
 * - Resolving gateway-eligible cities from draft itinerary
 * - Finding bookable flight options for gateway pairs
 * - Ranking gateway + flight combinations
 * 
 * This endpoint does NOT:
 * - Build ground routes
 * - Optimize city order
 * - Assign base stays
 * - Repair anchors
 * - Return multiple route options
 * - Mutate any existing spine
 */

import { NextRequest, NextResponse } from 'next/server';
import { GatewayFlightsRequest, GatewayFlightsResponse, GatewayOption } from '@/lib/phase1/types';
import { resolveGatewayCandidates } from '@/lib/phase1/gatewayResolution';
import { searchGatewayFlights } from '@/lib/phase1/flightSearch';
import { computeGatewayOptionScore, scoreGatewayOption, generateExplanation, rankAndFilterFlights } from '@/lib/phase1/scoring';

export async function POST(request: NextRequest) {
  try {
    const body: GatewayFlightsRequest = await request.json();
    
    // Validate required fields
    if (!body.originCity || !body.draftStops || body.draftStops.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: originCity and draftStops' },
        { status: 400 }
      );
    }
    
    if (!body.dateWindow?.earliestStart || !body.dateWindow?.latestEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: dateWindow.earliestStart and dateWindow.latestEnd' },
        { status: 400 }
      );
    }
    
    if (!body.passengers?.adults || body.passengers.adults < 1) {
      return NextResponse.json(
        { error: 'At least 1 adult passenger is required' },
        { status: 400 }
      );
    }
    
    // Get Duffel API key
    const duffelApiKey = process.env.DUFFEL_API_KEY;
    if (!duffelApiKey) {
      console.error('DUFFEL_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Flight search service is not configured' },
        { status: 500 }
      );
    }
    
    // Step 1: Resolve gateway candidates from draft stops
    console.debug('[DEBUG][Phase1] Resolving gateway candidates', {
      draftStops: body.draftStops.map(s => s.city),
      originCity: body.originCity
    });
    
    const gatewayCandidates = await resolveGatewayCandidates(
      body.draftStops,
      body.originCity
    );
    
    if (gatewayCandidates.length === 0) {
      return NextResponse.json(
        { error: 'No gateway-eligible cities found for the draft itinerary' },
        { status: 400 }
      );
    }
    
    // Step 2: Generate gateway pairs (MVP: same gateway for outbound and inbound)
    // Future: allow different inbound/outbound gateways
    const gatewayPairs: Array<{ outbound: string; inbound: string }> = [];
    for (const gateway of gatewayCandidates) {
      gatewayPairs.push({ outbound: gateway, inbound: gateway });
    }
    
    console.debug('[DEBUG][Phase1] Generated gateway pairs', {
      count: gatewayPairs.length,
      pairs: gatewayPairs
    });
    
    // Step 3: Search flights for each gateway pair
    const cabinClass = body.preferences?.cabinClass || 'economy';
    const passengers = {
      adults: body.passengers.adults,
      children: body.passengers.children || 0,
    };
    
    // Use earliest start date for outbound, latest end date for inbound (MVP)
    // Future: optimize dates within window
    const outboundDate = body.dateWindow.earliestStart;
    const inboundDate = body.dateWindow.latestEnd;
    
    const gatewayOptions: GatewayOption[] = [];
    
    for (let i = 0; i < gatewayPairs.length; i++) {
      const pair = gatewayPairs[i];
      
      // Search outbound flights
      const allOutboundFlights = await searchGatewayFlights(
        body.originCity,
        pair.outbound,
        outboundDate,
        passengers,
        cabinClass,
        duffelApiKey
      );
      
      // Search inbound flights
      const allInboundFlights = await searchGatewayFlights(
        pair.inbound,
        body.originCity,
        inboundDate,
        passengers,
        cabinClass,
        duffelApiKey
      );
      
      // Only include options with at least one flight in each direction
      if (allOutboundFlights.length === 0 || allInboundFlights.length === 0) {
        console.debug('[DEBUG][Phase1] Skipping gateway pair (no flights)', {
          gateway: pair.outbound,
          outboundCount: allOutboundFlights.length,
          inboundCount: allInboundFlights.length
        });
        continue;
      }
      
      // Rank and filter to top 5 flights per direction
      const outboundFlights = rankAndFilterFlights(allOutboundFlights);
      const inboundFlights = rankAndFilterFlights(allInboundFlights);
      
      console.debug('[DEBUG][Phase1] Filtered flights', {
        gateway: pair.outbound,
        outboundOriginal: allOutboundFlights.length,
        outboundFiltered: outboundFlights.length,
        inboundOriginal: allInboundFlights.length,
        inboundFiltered: inboundFlights.length,
      });
      
      // Compute score metrics
      const score = computeGatewayOptionScore(outboundFlights, inboundFlights);
      
      // Generate explanation
      const explanation = generateExplanation(pair.outbound, outboundFlights, inboundFlights);
      
      // Create gateway option
      const option: GatewayOption = {
        id: `gateway-${i}-${pair.outbound}`,
        outbound: {
          originCity: body.originCity,
          gatewayCity: pair.outbound,
          date: outboundDate,
          flights: outboundFlights,
        },
        inbound: {
          gatewayCity: pair.inbound,
          destinationCity: body.originCity,
          date: inboundDate,
          flights: inboundFlights,
        },
        score,
        explanation,
      };
      
      gatewayOptions.push(option);
    }
    
    // Step 4: Score and rank options (best → worst)
    gatewayOptions.sort((a, b) => {
      const scoreA = scoreGatewayOption(a);
      const scoreB = scoreGatewayOption(b);
      return scoreA - scoreB; // Lower score = better
    });
    
    // Limit to top N options (N = 3 for MVP)
    const topOptions = gatewayOptions.slice(0, 3);
    
    console.debug('[DEBUG][Phase1] Returning gateway options', {
      total: gatewayOptions.length,
      returned: topOptions.length
    });
    
    const response: GatewayFlightsResponse = {
      gatewayOptions: topOptions,
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('[ERROR][Phase1] Gateway flights API error:', error);
    
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




