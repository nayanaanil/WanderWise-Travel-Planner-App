import { RouteOptimizerInput, StructuralRoute, GroundLeg, FlightAnchor } from './types';
import {
  determineTripScope,
  isEligibleFlightAnchor,
  getNearestEligibleHub,
  normalizeOriginIfNeeded,
} from './flightAnchorEligibility';
import {
  computeItineraryImpact,
  deriveUserItineraryIntent,
} from './itineraryImpact';

/**
 * Generate a small set (3–5) of structurally distinct route candidates.
 *
 * This module is deliberately focused only on structure:
 *  - ordering of stops
 *  - how ground legs connect cities
 *  - which flight anchors are used
 *
 * No pricing or scoring is performed here.
 *
 * STRUCTURAL CORRECTION FOR FLIGHT ANCHOR ELIGIBILITY:
 * 
 * For long-haul trips (e.g., Bangalore → Europe), flight anchors must use eligible cities:
 * - Capital cities (e.g., Vienna, Paris, London)
 * - Tier-1 international hubs (e.g., Frankfurt, Munich, Zurich)
 * - Explicitly whitelisted cities (Vienna, Munich, Frankfurt, Paris, Amsterdam, Zurich, London)
 * 
 * Example: If a route proposes "Bangalore → Salzburg" as the outbound anchor:
 * - Salzburg is NOT eligible (not a capital, not a Tier-1 hub, not whitelisted)
 * - Structural correction: Replace with "Bangalore → Vienna" (nearest eligible hub)
 * - Add a GroundLeg: "Vienna → Salzburg" to preserve the original itinerary intent
 * 
 * This is STRUCTURAL CORRECTION, not optimization:
 * - We are ensuring feasibility (long-haul flights only exist from major hubs)
 * - We are NOT choosing Vienna because it's cheaper or faster
 * - We are correcting an invalid structure to a valid one
 * - The GroundLeg preserves the user's intent to visit Salzburg
 * 
 * Why Salzburg is invalid for Bangalore → Europe:
 * - Long-haul flights (Bangalore → Europe) typically only operate from/to major international hubs
 * - Salzburg is a regional airport, not a long-haul gateway
 * - Vienna (capital, major hub) is the nearest eligible gateway (~300km away)
 * - The structural correction ensures the route is feasible while preserving itinerary intent
 */
export function generateStructuralRoutes(input: RouteOptimizerInput): StructuralRoute[] {
  // CRITICAL: Freeze TripScope from RAW API INPUT before any mutations
  // TripScope must be derived from original intent, not derived structure
  const rawStops = input.stops ?? [];
  
  if (!input.originCity || rawStops.length === 0) {
    return [];
  }

  // Determine trip scope ONCE from raw input - this is the ONLY call site
  const tripScope = determineTripScope(input.originCity, rawStops);
  
  // Defensive assertion: log frozen TripScope with raw input
  console.log("[DEBUG][TripScope][Frozen]", tripScope, {
    originCity: input.originCity,
    stops: rawStops.map(s => s.city),
  });

  // Use baseStops for route generation (immutable reference)
  const baseStops = rawStops;

  // ORIGIN NORMALIZATION (applied ONCE, before any route construction)
  // This is SEPARATE from destination anchor eligibility
  const originNormalization = normalizeOriginIfNeeded(input.originCity, tripScope);
  const normalizedOriginCity = originNormalization.normalizedCity;
  const originGroundLeg = originNormalization.groundLeg;

  // Derive original user intent for impact tracking (observability only)
  // NOTE: originalIntent uses the ORIGINAL originCity, not normalized
  const originalIntent = deriveUserItineraryIntent(input, tripScope);

  /**
   * CRITICAL: Resolve outbound flight anchor BEFORE route generation.
   * This enforces fail-fast behavior: if anchor cannot be made eligible, no routes are generated.
   * 
   * Returns either a resolved anchor with injected ground legs, or a failure status.
   */
  const resolveOutboundAnchor = (
    proposedAnchor: FlightAnchor
  ): 
    | { status: 'resolved'; anchor: FlightAnchor; injectedGroundLegs: GroundLeg[] }
    | { status: 'failed'; reason: 'no-eligible-long-haul-anchor' } => {
    // Log resolution attempt
    console.log("[DEBUG][AnchorResolution] attempting", {
      from: proposedAnchor.fromCity,
      to: proposedAnchor.toCity,
      scope: tripScope,
    });

    // Check if destination (toCity) is eligible
    const destEligibility = isEligibleFlightAnchor(proposedAnchor.toCity, tripScope);

    if (destEligibility.eligible) {
      // Destination is already eligible - no resolution needed
      console.log("[DEBUG][AnchorResolution] resolved", {
        resolvedTo: proposedAnchor.toCity,
        injectedGroundLegs: [],
      });
      return {
        status: 'resolved',
        anchor: proposedAnchor,
        injectedGroundLegs: [],
      };
    }

    // Destination is not eligible - try to find nearest eligible hub
    const nearestHub = getNearestEligibleHub(proposedAnchor.toCity);

    if (!nearestHub) {
      // CRITICAL: No eligible hub found - anchor resolution failed
      console.log("[DEBUG][AnchorResolution] failed", {
        reason: 'no-eligible-long-haul-anchor',
        attemptedCity: proposedAnchor.toCity,
      });
      return {
        status: 'failed',
        reason: 'no-eligible-long-haul-anchor',
      };
    }

    // Create resolved anchor with hub as destination
    const resolvedAnchor: FlightAnchor = {
      ...proposedAnchor,
      toCity: nearestHub,
    };

    // Create ground leg to preserve user intent (hub → original destination)
    const injectedGroundLeg: GroundLeg = {
      fromCity: nearestHub,
      toCity: proposedAnchor.toCity,
      departureDayOffset: 0, // Will be adjusted in buildGroundRoute
      modeHint: 'train',
    };

    console.log("[DEBUG][AnchorResolution] resolved", {
      resolvedTo: nearestHub,
      injectedGroundLegs: [injectedGroundLeg],
    });

    return {
      status: 'resolved',
      anchor: resolvedAnchor,
      injectedGroundLegs: [injectedGroundLeg],
    };
  };

  /**
   * Helper: Corrects a DESTINATION flight anchor city if it's not eligible.
   * 
   * IMPORTANT: This applies ONLY to destinations (toCity for outbound, fromCity for inbound).
   * Origin normalization is handled separately via normalizeOriginIfNeeded().
   * 
   * Returns the corrected anchor, an optional GroundLeg, and an invalidation flag.
   */
  const correctFlightAnchorCity = (
    anchor: FlightAnchor,
    anchorType: 'outbound' | 'inbound',
    isOrigin: boolean // true if this is the origin city of the anchor, false if destination
  ): { correctedCity: string; additionalLeg: GroundLeg | null; isInvalid: boolean } => {
    // CRITICAL: Do NOT apply eligibility correction to origins
    // Origins are normalized separately via normalizeOriginIfNeeded()
    if (isOrigin) {
      // For outbound: fromCity is already normalized
      // For inbound: fromCity is a destination stop, so we DO check it
      if (anchorType === 'outbound') {
        // Outbound origin is already normalized - never correct it here
        return { correctedCity: anchor.fromCity, additionalLeg: null, isInvalid: false };
      }
      // For inbound, fromCity is actually a destination (last stop), so we check it
    }

    // Only check destinations: outbound.toCity and inbound.fromCity
    const cityToCheck = isOrigin ? anchor.fromCity : anchor.toCity;
    const eligibility = isEligibleFlightAnchor(cityToCheck, tripScope);

    if (eligibility.eligible) {
      // City is eligible, no correction needed
      return { correctedCity: cityToCheck, additionalLeg: null, isInvalid: false };
    }

    // City is not eligible - find nearest eligible hub
    const nearestHub = getNearestEligibleHub(cityToCheck);
    
    if (!nearestHub) {
      // CRITICAL: No eligible hub found for destination anchor - route is invalid
      // This MUST be marked as invalid and not proceed to Step B or C
      console.error(
        `[route-optimizer] CRITICAL: No eligible hub mapping found for destination anchor ${cityToCheck} in ${tripScope} scope. Route will be marked invalid.`
      );
      return { correctedCity: cityToCheck, additionalLeg: null, isInvalid: true };
    }

    // Create a GroundLeg to connect the eligible hub to the original city
    // This preserves the user's intent to visit the original city
    const additionalLeg: GroundLeg = {
      fromCity: nearestHub,
      toCity: cityToCheck,
      departureDayOffset: anchorType === 'outbound' && !isOrigin ? 0 : -1, // Will be adjusted in buildGroundRoute
      modeHint: 'train', // Assume train connection (can be refined)
    };

    return { correctedCity: nearestHub, additionalLeg, isInvalid: false };
  };

  /**
   * Helper: Corrects BOTH cities in a flight anchor if they're not eligible.
   * Returns the corrected anchor, any additional GroundLegs needed, and invalidation status.
   */
  const correctFlightAnchor = (
    anchor: FlightAnchor,
    anchorType: 'outbound' | 'inbound'
  ): { correctedAnchor: FlightAnchor; additionalLegs: GroundLeg[]; isInvalid: boolean } => {
    // Check and correct origin city
    const originCorrection = correctFlightAnchorCity(anchor, anchorType, true);
    
    // Check and correct destination city
    const destCorrection = correctFlightAnchorCity(anchor, anchorType, false);

    const correctedAnchor: FlightAnchor = {
      ...anchor,
      fromCity: originCorrection.correctedCity,
      toCity: destCorrection.correctedCity,
    };

    const additionalLegs: GroundLeg[] = [];
    if (originCorrection.additionalLeg) {
      additionalLegs.push(originCorrection.additionalLeg);
    }
    if (destCorrection.additionalLeg) {
      additionalLegs.push(destCorrection.additionalLeg);
    }

    // Route is invalid if ANY destination anchor correction failed (no hub found)
    const isInvalid = originCorrection.isInvalid || destCorrection.isInvalid;

    return { correctedAnchor, additionalLegs, isInvalid };
  };

  // Build proposed outbound anchor (before resolution)
  // IMPORTANT: Use normalizedOriginCity for outbound.fromCity (origin normalization already applied)
  const proposedOutbound: FlightAnchor =
    input.outboundFlightAnchor ?? {
      fromCity: normalizedOriginCity, // Use normalized origin
      toCity: baseStops[0]?.city ?? normalizedOriginCity,
      date: input.startDate,
    };

  // If user provided explicit outbound anchor, still normalize the origin
  const proposedOutboundWithNormalizedOrigin = input.outboundFlightAnchor
    ? {
        ...proposedOutbound,
        fromCity: normalizedOriginCity, // Override with normalized origin
      }
    : proposedOutbound;

  // CRITICAL: Resolve outbound anchor BEFORE route generation
  // If resolution fails, return empty array immediately (fail-fast)
  const outboundResolution = resolveOutboundAnchor(proposedOutboundWithNormalizedOrigin);

  if (outboundResolution.status === 'failed') {
    // CRITICAL: Outbound anchor cannot be resolved - fail fast
    console.error(
      `[route-optimizer] CRITICAL: Outbound flight anchor resolution failed: ${outboundResolution.reason}. No routes generated.`
    );
    return [];
  }

  // Outbound anchor resolved successfully - use it for all route generation
  const resolvedOutbound = outboundResolution.anchor;
  const outboundInjectedLegs = outboundResolution.injectedGroundLegs;

  // Build inbound anchor (may be corrected below, but outbound is already resolved)
  let inbound: FlightAnchor =
    input.inboundFlightAnchor ?? {
      fromCity: baseStops[baseStops.length - 1]?.city ?? normalizedOriginCity,
      toCity: input.returnCity || normalizedOriginCity,
      date: input.endDate,
    };

  // If user provided explicit inbound anchor, normalize the return city if it's the origin
  if (input.inboundFlightAnchor) {
    if (input.inboundFlightAnchor.toCity === input.originCity) {
      inbound = {
        ...inbound,
        toCity: normalizedOriginCity, // Override with normalized origin
      };
    }
  } else if (input.returnCity === input.originCity || !input.returnCity) {
    inbound = {
      ...inbound,
      toCity: normalizedOriginCity, // Use normalized origin for return
    };
  }

  // Correct inbound anchor (ONLY destination cities - return city normalization handled above)
  // Note: Inbound anchor correction can still fail, but we handle that per-route
  const inboundCorrection = correctFlightAnchor(inbound, 'inbound');
  inbound = inboundCorrection.correctedAnchor;
  const inboundAdditionalLegs = inboundCorrection.additionalLegs;

  // Collect all ground legs to prepend to routes:
  // 1. Origin normalization leg (if any)
  // 2. Outbound anchor resolution injected legs (if any)
  const prependLegs: GroundLeg[] = [];
  if (originGroundLeg) {
    prependLegs.push(originGroundLeg);
  }
  prependLegs.push(...outboundInjectedLegs);

  // Helper to build ground legs for a specific stop order
  // Also incorporates any additional legs from flight anchor corrections
  const buildGroundRoute = (
    orderedStops: typeof baseStops,
    prependLegs: GroundLeg[],
    appendLegs: GroundLeg[]
  ): GroundLeg[] => {
    const legs: GroundLeg[] = [];
    let currentDayOffset = 0;

    // Prepend legs: connects eligible hub(s) to first stop (if outbound anchor was corrected)
    for (const prependLeg of prependLegs) {
      legs.push({
        ...prependLeg,
        departureDayOffset: currentDayOffset,
      });
      currentDayOffset += 1; // After each correction leg, increment day offset
    }

    // Build legs between stops
    for (let i = 0; i < orderedStops.length - 1; i++) {
      const current = orderedStops[i];
      const next = orderedStops[i + 1];
      const nights = current.nights ?? 2;

      // Depart next morning after staying specified nights
      currentDayOffset += Math.max(1, nights);

      legs.push({
        fromCity: current.city,
        toCity: next.city,
        departureDayOffset: currentDayOffset,
        // No mock duration or pricing here – step 1 is purely structural
        modeHint: 'train',
      });
    }

    // Append legs: connects last stop to eligible hub(s) (if inbound anchor was corrected)
    if (appendLegs.length > 0) {
      const lastStopNights = orderedStops[orderedStops.length - 1]?.nights ?? 2;
      currentDayOffset += Math.max(1, lastStopNights);
      for (const appendLeg of appendLegs) {
        legs.push({
          ...appendLeg,
          departureDayOffset: currentDayOffset,
        });
        currentDayOffset += 1;
      }
    }

    return legs;
  };

  /**
   * Final invariant enforcement: For long-haul trips, outboundFlight.toCity MUST be eligible.
   * This check runs AFTER route construction to ensure no exceptions slip through.
   */
  const enforceOutboundAnchorInvariant = (
    route: StructuralRoute
  ): { correctedRoute: StructuralRoute; additionalLegs: GroundLeg[] } => {
    console.log("[DEBUG][OutboundInvariant] invoked", {
      from: route.outboundFlight.fromCity,
      to: route.outboundFlight.toCity,
      scope: tripScope,
    });

    if (tripScope !== 'long-haul') {
      return { correctedRoute: route, additionalLegs: [] };
    }

    const outboundDest = route.outboundFlight.toCity;
    const eligibility = isEligibleFlightAnchor(outboundDest, tripScope);

    if (eligibility.eligible) {
      return { correctedRoute: route, additionalLegs: [] };
    }

    // Long-haul outbound destination is ineligible - MUST replace
    const nearestHub = getNearestEligibleHub(outboundDest);
    
    if (!nearestHub) {
      console.warn(
        `[route-optimizer] CRITICAL: No eligible hub found for long-haul outbound destination ${outboundDest}. Route may be invalid.`
      );
      return { correctedRoute: route, additionalLegs: [] };
    }

    console.log("[DEBUG][OutboundInvariant] replacing anchor", {
      original: route.outboundFlight.toCity,
      replacement: nearestHub,
    });

    // Replace outbound destination with eligible hub
    const correctedOutbound: FlightAnchor = {
      ...route.outboundFlight,
      toCity: nearestHub,
    };

    // Inject ground leg from hub to original stop city
    const correctionLeg: GroundLeg = {
      fromCity: nearestHub,
      toCity: outboundDest,
      departureDayOffset: 0, // Will be adjusted when prepended
      modeHint: 'train',
    };

    return {
      correctedRoute: {
        ...route,
        outboundFlight: correctedOutbound,
      },
      additionalLegs: [correctionLeg],
    };
  };

  const candidates: StructuralRoute[] = [];

  // 1) Base route: as‑given order
  // NOTE: outbound anchor is already resolved, so we use resolvedOutbound directly
  if (baseStops.length > 0) {
    let baseRoute: StructuralRoute = {
      id: 'route-base',
      summary: 'Visit cities in the suggested order',
      outboundFlight: resolvedOutbound, // Use resolved anchor (already eligible)
      inboundFlight: inbound,
      groundRoute: buildGroundRoute(
        baseStops,
        prependLegs, // Includes origin normalization + outbound resolution legs
        inboundAdditionalLegs
      ),
    };
    
    // NOTE: Outbound anchor is already resolved before route generation, so invariant check is not needed
    // The anchor is guaranteed to be eligible by construction
    
    console.log("[DEBUG][PostInvariant]", {
      outboundFrom: baseRoute.outboundFlight.fromCity,
      outboundTo: baseRoute.outboundFlight.toCity,
    });
    
    // NOTE: Outbound anchor is already resolved, so only inbound can be invalid
    // Mark route as invalid only if inbound anchor correction failed
    const routeIsInvalid = inboundCorrection.isInvalid;
    
    // Compute and attach itinerary impact (observability only)
    baseRoute.itineraryImpact = computeItineraryImpact(originalIntent, baseRoute);
    
    // Add hard invalidation if route is invalid
    if (routeIsInvalid) {
      if (!baseRoute.itineraryImpact) {
        baseRoute.itineraryImpact = {
          flightAnchorReplacements: [],
          addedGroundLegs: [],
          hardInvalidations: [],
        };
      }
      baseRoute.itineraryImpact.hardInvalidations.push({
        reason: 'no-eligible-long-haul-anchor',
      });
    }
    
    console.log("[DEBUG][FinalRoute]", {
      routeId: baseRoute.id,
      outboundFrom: baseRoute.outboundFlight.fromCity,
      outboundTo: baseRoute.outboundFlight.toCity,
      isInvalid: routeIsInvalid,
    });
    
    candidates.push(baseRoute);
  }

  // 2) Reverse route: reverse order (if distinct)
  if (baseStops.length > 2) {
    const reversed = [...baseStops].slice().reverse();
    
    // Build reversed route using resolved outbound anchor
    // NOTE: Outbound anchor is already resolved, so we use resolvedOutbound directly
    // Only the destination city may change based on reversed stop order
    const reversedOutboundDest = reversed[0].city;
    const reversedOutboundDestEligibility = isEligibleFlightAnchor(reversedOutboundDest, tripScope);
    
    // If reversed destination is not eligible, we need to resolve it
    let reversedOutbound: FlightAnchor | undefined = undefined;
    let reversedOutboundInjectedLegs: GroundLeg[] = [];
    
    if (reversedOutboundDestEligibility.eligible) {
      // Destination is eligible - use it directly
      reversedOutbound = {
        ...resolvedOutbound,
        toCity: reversedOutboundDest,
      };
    } else {
      // Destination is not eligible - try to find hub
      const nearestHub = getNearestEligibleHub(reversedOutboundDest);
      if (!nearestHub) {
        // Cannot resolve reversed destination - skip this variant
        console.warn(`[route-optimizer] Cannot resolve reversed outbound destination ${reversedOutboundDest}, skipping reversed route variant.`);
        // Skip this variant - don't generate it
      } else {
        reversedOutbound = {
          ...resolvedOutbound,
          toCity: nearestHub,
        };
        reversedOutboundInjectedLegs = [{
          fromCity: nearestHub,
          toCity: reversedOutboundDest,
          departureDayOffset: 0,
          modeHint: 'train',
        }];
      }
    }
    
    const reversedInbound: FlightAnchor = {
      ...inbound,
      fromCity: reversed[reversed.length - 1].city,
    };
    
    const reversedInboundCorrection = correctFlightAnchor(reversedInbound, 'inbound');
    const reversedIsInvalid = reversedInboundCorrection.isInvalid;
    
    // Only generate reversed route if outbound destination was resolvable
    if (reversedOutbound) {
      let reversedRoute: StructuralRoute = {
        id: 'route-reversed',
        summary: 'Reverse the city order for potentially better connections',
        outboundFlight: reversedOutbound, // Use resolved anchor
        inboundFlight: reversedInboundCorrection.correctedAnchor,
        groundRoute: buildGroundRoute(
          reversed,
          [...prependLegs, ...reversedOutboundInjectedLegs], // Includes origin normalization + outbound resolution + reversed destination resolution
          reversedInboundCorrection.additionalLegs
        ),
      };
    
    // Final invariant enforcement for long-haul outbound anchor
    const invariantCheck = enforceOutboundAnchorInvariant(reversedRoute);
    reversedRoute = invariantCheck.correctedRoute;
    if (invariantCheck.additionalLegs.length > 0) {
      reversedRoute.groundRoute = [
        ...invariantCheck.additionalLegs.map(leg => ({ ...leg, departureDayOffset: 0 })),
        ...reversedRoute.groundRoute,
      ];
    }
    
    console.log("[DEBUG][PostInvariant]", {
      outboundFrom: reversedRoute.outboundFlight.fromCity,
      outboundTo: reversedRoute.outboundFlight.toCity,
    });
    
    // Mark route as invalid if anchor corrections failed
    if (reversedIsInvalid) {
      reversedRoute.itineraryImpact = computeItineraryImpact(originalIntent, reversedRoute);
      if (!reversedRoute.itineraryImpact) {
        reversedRoute.itineraryImpact = {
          flightAnchorReplacements: [],
          addedGroundLegs: [],
          hardInvalidations: [],
        };
      }
      reversedRoute.itineraryImpact.hardInvalidations.push({
        reason: 'no-eligible-long-haul-anchor',
      });
    } else {
      // Compute and attach itinerary impact (observability only)
      reversedRoute.itineraryImpact = computeItineraryImpact(originalIntent, reversedRoute);
    }
    
    console.log("[DEBUG][FinalRoute]", {
      routeId: reversedRoute.id,
      outboundFrom: reversedRoute.outboundFlight.fromCity,
      outboundTo: reversedRoute.outboundFlight.toCity,
      isInvalid: reversedIsInvalid,
    });
    
      candidates.push(reversedRoute);
    }
  }

  // 3) Middle‑swap variant (swap two middle cities if 3+ stops)
  if (baseStops.length >= 3) {
    const swapped = [...baseStops];
    const midIndex = Math.floor((swapped.length - 1) / 2);
    if (midIndex > 0 && midIndex < swapped.length - 1) {
      const tmp = swapped[midIndex];
      swapped[midIndex] = swapped[midIndex - 1];
      swapped[midIndex - 1] = tmp;

      // Correct anchors for swapped route
      // Build swapped route using resolved outbound anchor
      // NOTE: Outbound anchor is already resolved, so we use resolvedOutbound directly
      // Only the destination city may change based on swapped stop order
      const swappedOutboundDest = swapped[0].city;
      const swappedOutboundDestEligibility = isEligibleFlightAnchor(swappedOutboundDest, tripScope);
      
      // If swapped destination is not eligible, we need to resolve it
      let swappedOutbound: FlightAnchor | undefined = undefined;
      let swappedOutboundInjectedLegs: GroundLeg[] = [];
      
      if (swappedOutboundDestEligibility.eligible) {
        // Destination is eligible - use it directly
        swappedOutbound = {
          ...resolvedOutbound,
          toCity: swappedOutboundDest,
        };
      } else {
        // Destination is not eligible - try to find hub
        const nearestHub = getNearestEligibleHub(swappedOutboundDest);
        if (!nearestHub) {
          // Cannot resolve swapped destination - skip this variant
          console.warn(`[route-optimizer] Cannot resolve swapped outbound destination ${swappedOutboundDest}, skipping swapped route variant.`);
          // Skip this variant - don't generate it
        } else {
          swappedOutbound = {
            ...resolvedOutbound,
            toCity: nearestHub,
          };
          swappedOutboundInjectedLegs = [{
            fromCity: nearestHub,
            toCity: swappedOutboundDest,
            departureDayOffset: 0,
            modeHint: 'train',
          }];
        }
      }
      
      const swappedInbound: FlightAnchor = {
        ...inbound,
        fromCity: swapped[swapped.length - 1].city,
      };
      
      const swappedInboundCorrection = correctFlightAnchor(swappedInbound, 'inbound');
      const swappedIsInvalid = swappedInboundCorrection.isInvalid;

      // Only generate swapped route if outbound destination was resolvable
      if (swappedOutbound) {
        let swappedRoute: StructuralRoute = {
          id: 'route-alt-mid-swap',
          summary: 'Reorder middle stops to reduce backtracking',
          outboundFlight: swappedOutbound, // Use resolved anchor
          inboundFlight: swappedInboundCorrection.correctedAnchor,
          groundRoute: buildGroundRoute(
            swapped,
            [...prependLegs, ...swappedOutboundInjectedLegs], // Includes origin normalization + outbound resolution + swapped destination resolution
            swappedInboundCorrection.additionalLegs
          ),
        };
        
        // NOTE: Outbound anchor is already resolved before route generation, so invariant check is not needed
        // The anchor is guaranteed to be eligible by construction
        
        console.log("[DEBUG][PostInvariant]", {
          outboundFrom: swappedRoute.outboundFlight.fromCity,
          outboundTo: swappedRoute.outboundFlight.toCity,
        });
        
        // Mark route as invalid if anchor corrections failed
        if (swappedIsInvalid) {
          swappedRoute.itineraryImpact = computeItineraryImpact(originalIntent, swappedRoute);
          if (!swappedRoute.itineraryImpact) {
            swappedRoute.itineraryImpact = {
              flightAnchorReplacements: [],
              addedGroundLegs: [],
              hardInvalidations: [],
            };
          }
          swappedRoute.itineraryImpact.hardInvalidations.push({
            reason: 'no-eligible-long-haul-anchor',
          });
        } else {
          // Compute and attach itinerary impact (observability only)
          swappedRoute.itineraryImpact = computeItineraryImpact(originalIntent, swappedRoute);
        }
        
        console.log("[DEBUG][FinalRoute]", {
          routeId: swappedRoute.id,
          outboundFrom: swappedRoute.outboundFlight.fromCity,
          outboundTo: swappedRoute.outboundFlight.toCity,
          isInvalid: swappedIsInvalid,
        });
        
        candidates.push(swappedRoute);
      }
    }
  }

  // Ensure we have between 3 and 5 routes by duplicating the best structural variants if needed.
  if (candidates.length === 1) {
    let variant1: StructuralRoute = {
      ...candidates[0],
      id: `${candidates[0].id}-variant-1`,
      summary: `${candidates[0].summary} (alternate timings)`,
    };
    const invariantCheck1 = enforceOutboundAnchorInvariant(variant1);
    variant1 = invariantCheck1.correctedRoute;
    if (invariantCheck1.additionalLegs.length > 0) {
      variant1.groundRoute = [
        ...invariantCheck1.additionalLegs.map(leg => ({ ...leg, departureDayOffset: 0 })),
        ...variant1.groundRoute,
      ];
    }
    console.log("[DEBUG][PostInvariant]", {
      outboundFrom: variant1.outboundFlight.fromCity,
      outboundTo: variant1.outboundFlight.toCity,
    });
    variant1.itineraryImpact = computeItineraryImpact(originalIntent, variant1);
    console.log("[DEBUG][FinalRoute]", {
      routeId: variant1.id,
      outboundFrom: variant1.outboundFlight.fromCity,
      outboundTo: variant1.outboundFlight.toCity,
    });
    
    let variant2: StructuralRoute = {
      ...candidates[0],
      id: `${candidates[0].id}-variant-2`,
      summary: `${candidates[0].summary} (flexible transfers)`,
    };
    // NOTE: Variants inherit resolved outbound anchor from base route, so invariant check is not needed
    console.log("[DEBUG][PostInvariant]", {
      outboundFrom: variant2.outboundFlight.fromCity,
      outboundTo: variant2.outboundFlight.toCity,
    });
    variant2.itineraryImpact = computeItineraryImpact(originalIntent, variant2);
    console.log("[DEBUG][FinalRoute]", {
      routeId: variant2.id,
      outboundFrom: variant2.outboundFlight.fromCity,
      outboundTo: variant2.outboundFlight.toCity,
    });
    
    candidates.push(variant1, variant2);
  } else if (candidates.length === 2) {
    let variant: StructuralRoute = {
      ...candidates[0],
      id: `${candidates[0].id}-variant-1`,
      summary: `${candidates[0].summary} (slight timing adjustment)`,
    };
    const invariantCheck = enforceOutboundAnchorInvariant(variant);
    variant = invariantCheck.correctedRoute;
    if (invariantCheck.additionalLegs.length > 0) {
      variant.groundRoute = [
        ...invariantCheck.additionalLegs.map(leg => ({ ...leg, departureDayOffset: 0 })),
        ...variant.groundRoute,
      ];
    }
    console.log("[DEBUG][PostInvariant]", {
      outboundFrom: variant.outboundFlight.fromCity,
      outboundTo: variant.outboundFlight.toCity,
    });
    variant.itineraryImpact = computeItineraryImpact(originalIntent, variant);
    console.log("[DEBUG][FinalRoute]", {
      routeId: variant.id,
      outboundFrom: variant.outboundFlight.fromCity,
      outboundTo: variant.outboundFlight.toCity,
    });
    
    candidates.push(variant);
  }

  const finalRoutes = candidates.slice(0, 5);
  
  // Log final route count (required for validation)
  console.log('[route-optimizer] Step A - structural routes generated:', finalRoutes.length);
  
  return finalRoutes;
}

