"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { getTripState, saveTripState } from '@/lib/tripState';
import { RouteReader, type RouteStep } from '@/lib/phase2/RouteReader';
import { Phase2StructuralRoute } from '@/lib/phase2/types';
import { routes } from '@/lib/navigation';

/**
 * Phase 3 Hotels Loader Page
 * 
 * This page:
 * - Loads hotels for cities in the route with stays (nights >= 1)
 * - Uses RouteReader to extract visits from structuralRoute
 * - Calls Phase 3 hotel search API
 * - Navigates to hotel options page on success
 * 
 * This page does NOT:
 * - Display hotel selection UI
 * - Mutate routes
 * - Allow hotel selection
 */
function HotelsLoaderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tripState = getTripState();

    // Guard: Check phase is ROUTE_READY
    if (tripState.phase !== 'ROUTE_READY') {
      console.warn('[HotelsLoader] Phase is not ROUTE_READY, redirecting to logistics');
      router.push(routes.plan.logistics);
      return;
    }

    // Guard: Check for structuralRoute
    if (!tripState.structuralRoute) {
      console.warn('[HotelsLoader] No structuralRoute found, redirecting to logistics');
      router.push(routes.plan.logistics);
      return;
    }

    // Search hotels
    searchHotels();
  }, [router, searchParams]);

  const searchHotels = async () => {
    try {
      setLoading(true);
      setError(null);

      const tripState = getTripState();
      const structuralRoute = tripState.structuralRoute as Phase2StructuralRoute;

      if (!structuralRoute) {
        throw new Error('Structural route not found');
      }

      // Use RouteReader to compute visits from structuralRoute
      const reader = new RouteReader(structuralRoute);
      const steps = Array.from(reader.steps());

      // Extract visits with nights >= 1 from STAY steps
      const visits = steps
        .filter((step): step is RouteStep & { kind: 'STAY' } => step.kind === 'STAY' && step.nights >= 1)
        .map(step => ({
          city: step.city,
          arrival: step.arrival,
          departure: step.departure,
          nights: step.nights,
        }));

      // If no visits with stays, redirect to options (empty results)
      if (visits.length === 0) {
        console.warn('[HotelsLoader] No visits with stays found');
        saveTripState({
          hotelSearchResults: {
            tripId: structuralRoute.id || 'unknown',
            hotelsByCity: [],
          },
        });
        // Preserve city query parameter if present
        const cityParam = searchParams.get('city');
        const url = cityParam 
          ? `${routes.bookings.hotels.options}?city=${encodeURIComponent(cityParam)}`
          : routes.bookings.hotels.options;
        router.push(url);
        return;
      }

      // Call Phase 3 hotel search API
      const response = await fetch('/api/phase3/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: structuralRoute.id || 'unknown',
          visits,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const searchResults = await response.json();

      // Store results in tripState
      saveTripState({
        hotelSearchResults: searchResults,
      });

      // Navigate to hotel options page (preserve city query parameter if present)
      const cityParam = searchParams.get('city');
      const url = cityParam 
        ? `${routes.bookings.hotels.options}?city=${encodeURIComponent(cityParam)}`
        : routes.bookings.hotels.options;
      router.push(url);
    } catch (err) {
      console.error('[HotelsLoader] Error searching hotels:', err);
      setError(err instanceof Error ? err.message : 'Failed to search hotels');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    searchHotels();
  };

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Hotel Search Failed
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-[#FE4C40] text-white font-semibold rounded-xl hover:bg-[#E63C30] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Finding hotels that fit your itinerary…</p>
      </div>
    </div>
  );
}

export default function HotelsLoaderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HotelsLoaderPageContent />
    </Suspense>
  );
}

