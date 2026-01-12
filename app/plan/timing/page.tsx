"use client";

import { useRouter } from 'next/navigation';
import { TripTimingScreen } from '@/components/TripTimingScreen';
import { Footer } from '@/components/Footer';
import { routes } from '@/lib/navigation';
import { saveTripState } from '@/lib/tripState';

export default function TripTimingPage() {
  const router = useRouter();

  const handleContinue = (params: { preferredMonth?: string }) => {
    // Save preferred month to tripState
    saveTripState({
      preferredMonth: params.preferredMonth,
    });
    // Navigate to duration page
    router.push(routes.plan.duration);
  };

  const handleBack = () => {
    router.push(routes.plan.destination);
  };

  return (
    <>
      <main>
        <TripTimingScreen
          onContinue={handleContinue}
          onBack={handleBack}
        />
      </main>
      <Footer />
    </>
  );
}

