"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { PaceStyleParametersScreen } from '@/components/PaceStyleParametersScreen';
import { routes } from '@/lib/navigation';
import { getTripState } from '@/lib/tripState';

export default function PacePage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');

  useEffect(() => {
    const tripState = getTripState();
    // Try to get destination from tripState first, then fallback to old tripParams
    const dest = tripState.destination?.value || 
                  (() => {
                    const tripParams = sessionStorage.getItem('tripParams');
                    if (tripParams) {
                      const params = JSON.parse(tripParams);
                      return params.destination || '';
                    }
                    return '';
                  })();
    setDestination(dest);
  }, []);

  const handleContinue = (params: { pace: string; styles: string[] }) => {
    // State is already saved by PaceStyleParametersScreen component
    // Keep backward compatibility with old tripParams format
    const tripParams = JSON.parse(sessionStorage.getItem('tripParams') || '{}');
    sessionStorage.setItem('tripParams', JSON.stringify({ ...tripParams, ...params }));
    router.push(routes.plan.locations);
  };

  const handleBack = () => {
    router.push(routes.plan.duration);
  };

  if (!destination) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <main>
        <PaceStyleParametersScreen
          destination={destination}
          onContinue={handleContinue}
          onBack={handleBack}
        />
      </main>
      <Footer />
    </>
  );
}

