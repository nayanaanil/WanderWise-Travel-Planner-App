"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { routes } from '@/lib/navigation';
import { getTripState, saveTripState, getSelectedDraftItinerary } from '@/lib/tripState';
import { GatewayFlightsRequest } from '@/lib/phase1/types';

/**
 * Phase 1 Flight Loader Page
 * 
 * This page:
 * - Verifies draft itinerary exists
 * - Calls Phase 1 API to load gateway + flight options
 * - Redirects to options page on success
 * - Shows retry UI on error
 * 
 * This page does NOT:
 * - Render timeline
 * - Select default gateway or flight
 * - Mutate routes
 */
export default function FlightsLoaderPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    loadGatewayFlights();
  }, []);

  const loadGatewayFlights = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get trip state
      const tripState = getTripState();

      // Verify draft itinerary exists
      const selectedDraft = getSelectedDraftItinerary();
      if (!selectedDraft) {
        // No draft itinerary selected - redirect to selection page
        router.push(routes.plan.itinerary);
        return;
      }

      // Verify required trip input data
      if (!tripState.fromLocation?.value || !tripState.dateRange) {
        console.error('[Phase1] Missing required trip data:', {
          hasFromLocation: !!tripState.fromLocation,
          hasDateRange: !!tripState.dateRange,
        });
        router.push(routes.plan.itinerary);
        return;
      }

      // Set phase to FLIGHTS_LOADING
      saveTripState({
        phase: 'FLIGHTS_LOADING',
      });

      // Prepare Phase 1 API request
      const originCity = tripState.fromLocation.value;
      const dateRange = tripState.dateRange;
      
      if (!dateRange || !dateRange.from || !dateRange.to) {
        throw new Error('Date range is required');
      }
      
      // Convert draft itinerary cities to draftStops format
      const draftStops = selectedDraft.cities.map(city => ({
        city: city.name,
        desiredNights: city.nights,
      }));

      // Prepare date window (earliest start to latest end)
      // Handle both Date objects and ISO strings
      const fromDate = dateRange.from instanceof Date 
        ? dateRange.from 
        : new Date(dateRange.from);
      const toDate = dateRange.to instanceof Date 
        ? dateRange.to 
        : new Date(dateRange.to);
      
      const earliestStart = fromDate.toISOString().split('T')[0];
      const latestEnd = toDate.toISOString().split('T')[0];

      // Prepare passengers
      const passengers = {
        adults: tripState.adults || 1,
        children: tripState.kids || 0,
      };

      // Generate trip ID if not exists
      const tripId = `trip-${Date.now()}`;

      const request: GatewayFlightsRequest = {
        tripId,
        originCity,
        draftStops,
        dateWindow: {
          earliestStart,
          latestEnd,
        },
        passengers,
        preferences: {
          cabinClass: 'economy', // Default for MVP
        },
      };

      console.debug('[Phase1] Calling gateway-flights API', {
        tripId,
        originCity,
        draftStopsCount: draftStops.length,
        dateWindow: { earliestStart, latestEnd },
        passengers,
      });

      // Call Phase 1 API
      const response = await fetch('/api/phase1/gateway-flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to load flight options`);
      }

      const data = await response.json();

      // Verify response has gatewayOptions
      if (!data.gatewayOptions || !Array.isArray(data.gatewayOptions)) {
        throw new Error('Invalid API response: missing gatewayOptions');
      }

      // Store gateway options in trip state
      saveTripState({
        gatewayOptions: data.gatewayOptions,
        phase: 'FLIGHTS_SELECTING',
      });

      console.debug('[Phase1] Gateway options loaded', {
        count: data.gatewayOptions.length,
      });

      // Navigate to options page
      router.push(routes.bookings.flights.options);

    } catch (err) {
      console.error('[Phase1] Error loading gateway flights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flight options');
      setIsLoading(false);
      
      // Reset phase on error (stay in current phase, don't advance)
      // Phase remains FLIGHTS_LOADING so user can retry
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    loadGatewayFlights().finally(() => {
      setIsRetrying(false);
    });
  };

  // Show loading state
  if (isLoading && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Finding flight options...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Flights</h2>
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
              onClick={() => router.push(routes.plan.itinerary)}
              className="w-full py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
            >
              Back to Itinerary Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but return null just in case
  return null;
}

