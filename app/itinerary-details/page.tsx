"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { DetailedItineraryScreen } from '@/components/DetailedItineraryScreen';
import { routes } from '@/lib/navigation';
import { getTripState } from '@/lib/tripState';

interface TripParams {
  destination: string;
  dateRange?: { from: Date; to: Date };
  adults?: number;
  kids?: number;
  budget?: string;
  pace?: string;
  styles?: string[];
  mustSeeItems?: string[];
  bookedItems?: any[];
}

export default function ItineraryDetailsPage() {
  const router = useRouter();
  const [tripParams, setTripParams] = useState<TripParams | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // CRITICAL: Always wait a moment to allow state to persist after navigation
    // This prevents race conditions where state hasn't been written yet
    const loadTimer = setTimeout(() => {
      const tripState = getTripState();
      
      if (!tripState.destination?.value) {
        router.push(routes.plan.destination);
        return;
      }

      // Check if an itinerary has been selected (use master itinerary ID)
      const selectedItineraryId = tripState.selectedDraftItineraryId || tripState.ui?.selectedItinerary;
      
      if (!selectedItineraryId || !tripState.draftItineraries) {
        // Only redirect if still missing after delay
        console.warn('No selected itinerary or master data found, redirecting to options');
        router.push(routes.plan.itinerary);
        return;
      }
      
      // State is available - proceed normally
      const params: TripParams = {
        destination: tripState.destination.value,
        dateRange: tripState.dateRange,
        adults: tripState.adults,
        kids: tripState.kids,
        budget: tripState.budget,
        pace: tripState.pace,
        styles: tripState.styles,
        mustSeeItems: tripState.mustSeeItems,
      };
      setTripParams(params);
      setIsHydrated(true);
    }, 100); // Small delay to allow sessionStorage write to complete
    
    return () => clearTimeout(loadTimer);
  }, []); // Only run once on mount - don't re-run on router changes

  const handleSave = () => {
    console.log('Saving itinerary...');
  };

  const handleBack = () => {
    router.push(routes.plan.itinerary);
  };

  if (!isHydrated || !tripParams) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <main>
        <DetailedItineraryScreen
          tripParams={tripParams}
          onSave={handleSave}
          onBack={handleBack}
        />
      </main>
      <Footer />
    </>
  );
}

