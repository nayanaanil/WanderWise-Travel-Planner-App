"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getTripState, saveTripState } from '@/lib/tripState';
import { routes } from '@/lib/navigation';

/**
 * Global Trip State Guard Component
 * 
 * Prevents corrupted or partial UI states by:
 * 1. Detecting structuralRoute without lockedFlightAnchors → reset and redirect
 * 2. Guarding bookings pages without draft itinerary → redirect to draft selection
 * 3. Guarding hotels routes (Phase 3) → require ROUTE_READY phase and structuralRoute
 * 
 * This component should be included in the root layout.
 */
export function TripStateGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const tripState = getTripState();

    // Guard 1: structuralRoute exists but lockedFlightAnchors missing
    // This is an invalid state - structuralRoute depends on lockedFlightAnchors
    if (tripState.structuralRoute && !tripState.lockedFlightAnchors) {
      console.warn('[TripStateGuard] Detected corrupted state: structuralRoute without lockedFlightAnchors. Resetting.');
      
      // Reset trip state (clear structuralRoute and related data)
      saveTripState({
        structuralRoute: undefined,
        phase: 'FLIGHTS_SELECTING',
      });
      
      // Redirect to flights
      router.push(routes.bookings.flights.index);
      return;
    }

    // Guard 2: Bookings pages require draft itinerary
    // Exclude hotels routes from this guard (handled by Guard 3)
    const isBookingsPage = pathname.startsWith('/bookings');
    const isHotelsRoute = pathname.startsWith('/bookings/hotels');
    
    if (isBookingsPage && !isHotelsRoute) {
      // Check if draft itinerary exists
      // We check for selectedDraftItineraryId (which means a draft itinerary was selected)
      const hasDraftItinerary = tripState.selectedDraftItineraryId;
      
      if (!hasDraftItinerary) {
        console.warn('[TripStateGuard] Bookings page accessed without draft itinerary. Redirecting.');
        // Redirect to draft itinerary selection page
        router.push(routes.plan.itinerary); // This is the draft itinerary selection page
        return;
      }
    }

    // Guard 3: Hotels routes (Phase 3) require ROUTE_READY phase and structuralRoute
    if (isHotelsRoute) {
      const hasCorrectPhase = tripState.phase === 'ROUTE_READY';
      const hasStructuralRoute = !!tripState.structuralRoute;
      
      if (!hasCorrectPhase || !hasStructuralRoute) {
        console.warn('[TripStateGuard] Hotels route accessed without ROUTE_READY phase or structuralRoute. Redirecting.');
        // Redirect to logistics page
        router.push(routes.plan.logistics);
        return;
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}

