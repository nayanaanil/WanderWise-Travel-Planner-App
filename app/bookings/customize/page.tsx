"use client";

import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ItineraryCustomizationScreen } from '@/components/ItineraryCustomizationScreen';
import { routes } from '@/lib/navigation';

export default function ItineraryCustomizationPage() {
  const router = useRouter();

  return (
    <>
      <Header />
      <main>
        <ItineraryCustomizationScreen
          onBack={() => router.push(routes.plan.itinerary)}
          onPlanTransport={() => router.push(routes.bookings.transport)}
        />
      </main>
      <Footer />
    </>
  );
}

