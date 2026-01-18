"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/navigation';
import { getTripState, saveTripState, getSelectedDraftItinerary, getSelectedFlights } from '@/lib/tripState';
import { GroundRouteRequest, GroundRouteResponse } from '@/lib/phase2/types';

/**
 * Phase 2 Ground Route Builder Loader
 * 
 * This page:
 * - Builds deterministic ground route from locked flight anchors
 * - Orders cities geographically
 * - Derives dates and computes inbound slack
 * 
 * This page does NOT:
 * - Show timeline
 * - Render route visualization
 * - Allow route modifications
 */
export default function RouteBuildingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    buildGroundRoute();
  }, []);

  const buildGroundRoute = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tripState = getTripState();

      // Guard: Check for locked flight anchors
      if (!tripState.lockedFlightAnchors) {
        console.warn('[Phase2] No lockedFlightAnchors found, redirecting to flights');
        router.push(routes.bookings.flights.index);
        return;
      }

      // Get selected draft itinerary for draftStops
      const selectedDraft = getSelectedDraftItinerary();
      if (!selectedDraft) {
        console.warn('[Phase2] No draft itinerary selected, redirecting to itinerary selection');
        router.push(routes.plan.itinerary);
        return;
      }

      // Set phase to ROUTE_BUILDING
      saveTripState({
        phase: 'ROUTE_BUILDING',
      });

      // Prepare Phase 2 API request
      const allDraftStops = selectedDraft.cities.map(city => ({
        city: city.name,
        desiredNights: city.nights,
      }));

      // draftStayCities: Original draft itinerary cities (source of truth for stays, includes gateways)
      // This preserves the user's original intent - gateway cities should still show as stays if they were in the draft
      const draftStayCities = allDraftStops;

      // Sanitize draftStops: Remove gateway cities (these are flight anchors, not ground route stops)
      // draftStops is used ONLY for routing, not for stay inference
      const outboundGateway = tripState.lockedFlightAnchors.outboundFlight.toCity;
      const inboundGateway = tripState.lockedFlightAnchors.inboundFlight.fromCity;
      
      const sanitizedDraftStops = allDraftStops.filter(stop => {
        const isGateway = stop.city === outboundGateway || stop.city === inboundGateway;
        return !isGateway;
      });

      // Debug log: Report removed gateway cities
      const removedCities = allDraftStops.filter(stop => 
        stop.city === outboundGateway || stop.city === inboundGateway
      ).map(stop => stop.city);

      if (removedCities.length > 0) {
        console.debug('[Phase2] Removed gateway cities from draftStops (routing only)', {
          removedCities,
          outboundGateway,
          inboundGateway,
          originalCount: allDraftStops.length,
          sanitizedCount: sanitizedDraftStops.length,
          draftStayCitiesCount: draftStayCities.length,
        });
      }

      // Generate trip ID if not exists
      const tripId = `trip-${Date.now()}`;

      const request: GroundRouteRequest = {
        tripId,
        lockedFlightAnchors: tripState.lockedFlightAnchors,
        draftStops: sanitizedDraftStops,
        draftStayCities: draftStayCities,
        preferences: {
          avoidBacktracking: true, // Default preference
        },
      };

      console.debug('[Phase2] Calling ground-route API', {
        tripId,
        outboundGateway,
        inboundGateway,
        draftStopsCount: sanitizedDraftStops.length,
      });

      // Call Phase 2 API
      const response = await fetch('/api/phase2/ground-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to build ground route`);
      }

      const data: GroundRouteResponse = await response.json();

      // Verify response has structuralRoute
      if (!data.structuralRoute) {
        throw new Error('Invalid API response: missing structuralRoute');
      }

      // Persist structuralRoute and inboundSlackDays
      const structuralRoute = data.structuralRoute;
      
      // Enrich structuralRoute with full flight data from selectedFlights
      // Only merge if structuralRoute doesn't already have price (prevents overwriting on re-runs)
      const selectedFlights = getSelectedFlights();
      const currentTripState = getTripState();
      const existingStructuralRoute = currentTripState.structuralRoute;
      
      // Check if structuralRoute already has flight data with price
      const existingOutboundHasPrice = existingStructuralRoute?.outboundFlight && 'price' in existingStructuralRoute.outboundFlight;
      const existingInboundHasPrice = existingStructuralRoute?.inboundFlight && 'price' in existingStructuralRoute.inboundFlight;
      
      // Only merge from selectedFlights if:
      // 1. selectedFlights has data AND
      // 2. existing structuralRoute doesn't already have price (prevent overwriting on re-runs)
      const shouldMergeOutbound = selectedFlights.outbound && !existingOutboundHasPrice;
      const shouldMergeInbound = selectedFlights.return && !existingInboundHasPrice;
      
      const enrichedStructuralRoute = {
        id: structuralRoute.id,
        outboundFlight: shouldMergeOutbound
          ? { ...structuralRoute.outboundFlight, ...selectedFlights.outbound }
          : (existingStructuralRoute?.outboundFlight || structuralRoute.outboundFlight),
        inboundFlight: shouldMergeInbound
          ? { ...structuralRoute.inboundFlight, ...selectedFlights.return }
          : (existingStructuralRoute?.inboundFlight || structuralRoute.inboundFlight),
        groundRoute: structuralRoute.groundRoute,
        derived: structuralRoute.derived,
      };
      
      saveTripState({
        structuralRoute: enrichedStructuralRoute,
        phase: 'ROUTE_READY',
        selectedFlights: undefined, // Clear temporary selections now that they're in structuralRoute
      });

      console.log('[FLIGHTS_LOCKED_IN_ROUTE]', {
        outbound: enrichedStructuralRoute.outboundFlight,
        inbound: enrichedStructuralRoute.inboundFlight,
        outboundHasPrice: 'price' in enrichedStructuralRoute.outboundFlight,
        inboundHasPrice: 'price' in enrichedStructuralRoute.inboundFlight,
        outboundPrice: enrichedStructuralRoute.outboundFlight.price,
        inboundPrice: enrichedStructuralRoute.inboundFlight.price,
      });

      console.debug('[Phase2] Ground route built successfully', {
        routeId: structuralRoute.id,
        totalTripDays: structuralRoute.derived.totalTripDays,
        inboundSlackDays: structuralRoute.derived.inboundSlackDays,
        groundLegsCount: structuralRoute.groundRoute.length,
      });

      // Navigate to logistics page
      router.push(routes.plan.logistics);

    } catch (err) {
      console.error('[Phase2] Error building ground route:', err);
      setError(err instanceof Error ? err.message : 'Failed to build ground route');
      setIsLoading(false);
      
      // Phase remains ROUTE_BUILDING so user can retry
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    buildGroundRoute().finally(() => {
      setIsRetrying(false);
    });
  };

  // Show loading state
  if (isLoading && !error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Building your route...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Build Route</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full py-3 px-6 bg-[#FE4C40] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
            <button
              onClick={() => router.push(routes.bookings.flights.index)}
              className="w-full py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
            >
              Back to Flights
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but return null just in case
  return null;
}

