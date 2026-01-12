"use client";

import { useRouter } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { FlightOptionsResultsScreen } from '@/components/FlightOptionsResultsScreen';
import { routes } from '@/lib/navigation';

export default function FlightOptionsPage() {
  const router = useRouter();

  return (
    <>
      <FlightOptionsResultsScreen
        onBack={() => router.push(routes.plan.itinerary)}
        onSelectFlight={() => router.push(routes.plan.building)}
        onBackToPreferences={() => router.push(routes.plan.itinerary)}
      />
      <Footer />
    </>
  );
}



