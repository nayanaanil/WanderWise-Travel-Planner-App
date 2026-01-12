"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ItineraryOptionsScreen } from '@/components/ItineraryOptionsScreen';
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
}

export default function ItineraryOptionsPage() {
  const router = useRouter();
  const [tripParams, setTripParams] = useState<TripParams | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const tripState = getTripState();
    
    if (tripState.destination?.value) {
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
    } else {
      // Only redirect if we're not already navigating away
      router.push(routes.plan.destination);
    }
    setIsHydrated(true);
  }, []); // Only run once on mount - don't re-run on router changes

  const handleBack = () => {
    router.push(routes.plan.locations);
  };

  if (!isHydrated || !tripParams) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <main>
        <ItineraryOptionsScreen
          tripParams={tripParams}
          onBack={handleBack}
        />
      </main>
      <Footer />
    </>
  );
}

