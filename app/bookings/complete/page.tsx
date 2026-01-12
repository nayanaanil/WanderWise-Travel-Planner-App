"use client";

import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TripCostAndBookingScreen } from '@/components/TripCostAndBookingScreen';
import { routes } from '@/lib/navigation';
import { toast } from 'sonner';

export default function TripCompletePage() {
  const router = useRouter();

  return (
    <>
      <Header />
      <main>
        <TripCostAndBookingScreen
          onBack={() => router.push(routes.bookings.summary)}
          onComplete={() => {
            toast.success('Trip confirmed! Your adventure awaits!');
            router.push(routes.home);
          }}
        />
      </main>
      <Footer />
    </>
  );
}







