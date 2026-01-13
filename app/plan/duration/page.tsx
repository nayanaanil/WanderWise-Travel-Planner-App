"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { DurationParametersScreen } from '@/components/DurationParametersScreen';
import { routes } from '@/lib/navigation';
import { getTripState } from '@/lib/tripState';

function DurationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [destination, setDestination] = useState('');

  useEffect(() => {
    const tripState = getTripState();
    // Try to get destination from tripState first, then fallback to old sessionStorage keys
    const dest = tripState.destination?.value || 
                  searchParams.get('destination') || 
                  sessionStorage.getItem('tripDestination') || 
                  '';
    setDestination(dest);
  }, [searchParams]);

  const handleContinue = (params: {
    dateRange: { from: Date; to: Date };
    adults: number;
    kids: number;
    budget: string;
  }) => {
    // State is already saved by DurationParametersScreen component
    // Keep backward compatibility with old tripParams format
    sessionStorage.setItem('tripParams', JSON.stringify({ destination, ...params }));
    router.push(routes.plan.pace);
  };

  const handleBack = () => {
    router.push(routes.plan.timing);
  };

  if (!destination) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <main>
        <DurationParametersScreen
          destination={destination}
          onContinue={handleContinue}
          onBack={handleBack}
        />
      </main>
      <Footer />
    </>
  );
}

export default function DurationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DurationPageContent />
    </Suspense>
  );
}

