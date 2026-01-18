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
import { GatewayFlightsRequest, GatewayFlightsResponse, GatewayOption, GatewayContext } from '@/lib/phase1/types';
import { resolveGatewayCandidates } from '@/lib/phase1/gatewayResolution';
import { searchGatewayFlights } from '@/lib/phase1/flightSearch';
import { computeGatewayOptionScore, scoreGatewayOption, generateExplanation, rankAndFilterFlights } from '@/lib/phase1/scoring';

/**
 * Derives gatewayContext for a single gateway option.
 * 
 * This is a deterministic derivation that:
 * - Calculates rank (1-3) from position in sorted array
 * - Ranks strengths (best/good/weak) for price, time, and reliability
 * - Identifies primary tradeoff (weakest dimension)
 * - Determines resolution type (direct vs resolved from another city)
 */
function deriveGatewayContext(
  gateway: GatewayOption,
  allTopOptions: GatewayOption[],
  draftStopCities: string[],
  rank: number // 1-based rank (1 = best, 2 = second, 3 = third)
): GatewayContext {
  const gatewayCity = gateway.outbound.gatewayCity;
  
  // Derive strengths by ranking each gateway separately for each dimension
  // Rank 0 = best, 1 = middle, 2 = worst
  const sortedByPrice = [...allTopOptions].sort((a, b) => {
    const priceA = a.score.totalPrice ?? Number.MAX_SAFE_INTEGER;
    const priceB = b.score.totalPrice ?? Number.MAX_SAFE_INTEGER;
    return priceA - priceB; // Lower price = better
  });
  
  const sortedByTime = [...allTopOptions].sort((a, b) => {
    const timeA = a.score.totalTravelTimeMinutes ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.score.totalTravelTimeMinutes ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB; // Lower time = better
  });
  
  const sortedByReliability = [...allTopOptions].sort((a, b) => {
    const relA = a.score.reliabilityScore ?? 0;
    const relB = b.score.reliabilityScore ?? 0;
    return relB - relA; // Higher reliability = better
  });
  
  // Find position in each sorted array (0 = best, 1 = middle, 2 = worst)
  const priceRank = sortedByPrice.findIndex(g => g.id === gateway.id);
  const timeRank = sortedByTime.findIndex(g => g.id === gateway.id);
  const reliabilityRank = sortedByReliability.findIndex(g => g.id === gateway.id);
  
  // Map rank to strength: 0 = "best", 1 = "good", 2 = "weak"
  const rankToStrength = (rank: number): "best" | "good" | "weak" => {
    if (rank === 0) return "best";
    if (rank === 1) return "good";
    return "weak";
  };
  
  const strengths = {
    price: rankToStrength(priceRank),
    time: rankToStrength(timeRank),
    reliability: rankToStrength(reliabilityRank),
  };
  
  // Derive tradeoff: identify the weakest dimension
  // Find the gateway that is "best" in each dimension
  const bestPriceGateway = sortedByPrice[0];
  const bestTimeGateway = sortedByTime[0];
  const bestReliabilityGateway = sortedByReliability[0];
  
  // Determine which dimension is weakest for this gateway
  const weaknesses: Array<{ dimension: "price" | "time" | "reliability"; strength: "good" | "weak" }> = [];
  if (strengths.price !== "best") {
    weaknesses.push({ dimension: "price", strength: strengths.price });
  }
  if (strengths.time !== "best") {
    weaknesses.push({ dimension: "time", strength: strengths.time });
  }
  if (strengths.reliability !== "best") {
    weaknesses.push({ dimension: "reliability", strength: strengths.reliability });
  }
  
  // If no weaknesses (this is best in all dimensions), use balanced message
  let tradeoff: { comparedTo: "price" | "time" | "reliability"; description: string };
  if (weaknesses.length === 0) {
    tradeoff = {
      comparedTo: "price", // Default, but description indicates balance
      description: "Best overall balance",
    };
  } else {
    // Prioritize "weak" over "good" weaknesses
    weaknesses.sort((a, b) => {
      if (a.strength === "weak" && b.strength !== "weak") return -1;
      if (a.strength !== "weak" && b.strength === "weak") return 1;
      return 0;
    });
    
    const primaryWeakness = weaknesses[0];
    const bestInDimension = 
      primaryWeakness.dimension === "price" ? bestPriceGateway :
      primaryWeakness.dimension === "time" ? bestTimeGateway :
      bestReliabilityGateway;
    
    // Generate factual description comparing to the best option in that dimension
    const bestCity = bestInDimension.outbound.gatewayCity;
    let description: string;
    
    if (primaryWeakness.dimension === "price") {
      if (primaryWeakness.strength === "weak") {
        description = `Significantly higher price than ${bestCity}`;
      } else {
        description = `Slightly higher price than ${bestCity}`;
      }
    } else if (primaryWeakness.dimension === "time") {
      if (primaryWeakness.strength === "weak") {
        description = `Longer travel time than ${bestCity}`;
      } else {
        description = `Slightly longer travel time than ${bestCity}`;
      }
    } else {
      // reliability
      if (primaryWeakness.strength === "weak") {
        description = `Fewer flight options or more stops than ${bestCity}`;
      } else {
        description = `Slightly fewer options than ${bestCity}`;
      }
    }
    
    tradeoff = {
      comparedTo: primaryWeakness.dimension,
      description,
    };
  }
  
  // Derive resolution: check if gateway city exists in original draft stops
  // Case-insensitive comparison for robustness
  const draftStopCitiesLower = draftStopCities.map(c => c.toLowerCase().trim());
  const gatewayCityLower = gatewayCity.toLowerCase().trim();
  const isDirect = draftStopCitiesLower.includes(gatewayCityLower);
  
  const resolution: GatewayContext['resolution'] = isDirect
    ? { type: "direct" }
    : {
        type: "resolved",
        // Use first draft stop as original city (deterministic fallback)
        originalCity: draftStopCities.length > 0 ? draftStopCities[0] : undefined,
      };
  
  return {
    city: gatewayCity,
    rank,
    strengths,
    tradeoff,
    resolution,
  };
}

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
    
    // Step 5: Derive gatewayContext for each top option
    // Extract draft stop cities for resolution checking
    const draftStopCities = body.draftStops.map(stop => stop.city);
    
    // Derive and attach gatewayContext to each option
    const enrichedOptions = topOptions.map((option, index) => {
      const rank = index + 1; // 1-based rank (1 = best, 2 = second, 3 = third)
      const context = deriveGatewayContext(option, topOptions, draftStopCities, rank);
      return {
        ...option,
        gatewayContext: context,
      };
    });
    
    console.debug('[DEBUG][Phase1] Returning gateway options', {
      total: gatewayOptions.length,
      returned: enrichedOptions.length
    });
    
    const response: GatewayFlightsResponse = {
      gatewayOptions: enrichedOptions,
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




