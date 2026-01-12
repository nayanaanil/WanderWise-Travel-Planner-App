"use client";

import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TransportationOptimizationScreen } from '@/components/TransportationOptimizationScreen';
import { routes } from '@/lib/navigation';

export default function TransportationPage() {
  const router = useRouter();

  return (
    <>
      <Header />
      <main>
        <TransportationOptimizationScreen
          onBack={() => router.push(routes.bookings.customize)}
          onLockChoices={() => router.push(routes.bookings.accommodation)}
        />
      </main>
      <Footer />
    </>
  );
}

