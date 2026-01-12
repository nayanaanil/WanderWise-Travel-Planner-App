"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { LocationsSelectionScreen } from '@/components/LocationsSelectionScreen';
import { routes } from '@/lib/navigation';
import { getTripState } from '@/lib/tripState';

export default function LocationsPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');

  useEffect(() => {
    const tripState = getTripState();
    const dest = tripState.destination?.value || '';
    setDestination(dest);
  }, []);

  const handleContinue = () => {
    router.push(routes.plan.processing);
  };

  const handleBack = () => {
    router.push(routes.plan.pace);
  };

  if (!destination) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <main>
        <LocationsSelectionScreen
          destination={destination}
          onContinue={handleContinue}
          onBack={handleBack}
        />
      </main>
      <Footer />
    </>
  );
}


