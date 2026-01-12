"use client";

import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AccommodationSelectionScreenV2 } from '@/components/AccommodationSelectionScreenV2';
import { routes } from '@/lib/navigation';

export default function AccommodationPage() {
  const router = useRouter();

  return (
    <>
      <Header />
      <main>
        <AccommodationSelectionScreenV2
          onBack={() => router.push(routes.bookings.transport)}
          onContinue={() => router.push(routes.bookings.summary)}
        />
      </main>
      <Footer />
    </>
  );
}







