"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Footer } from '@/components/Footer';
import { DestinationSelectionScreen, DestinationData } from '@/components/DestinationSelectionScreen';
import { routes } from '@/lib/navigation';
import { clearAIDerivedFields } from '@/lib/tripState';

export default function DestinationPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');

  const handleDestinationSelected = (dest: string | DestinationData) => {
    // Clear AI-derived fields when destination changes
    clearAIDerivedFields();
    
    // Handle both string (backward compatibility) and DestinationData
    let destinationValue: string;
    let destinationData: DestinationData;

    if (typeof dest === 'string') {
      destinationValue = dest;
      destinationData = {
        type: 'searchPhrase',
        value: dest,
      };
    } else {
      destinationValue = dest.value;
      destinationData = dest;
    }

    setDestination(destinationValue);
    // Store both the string value (for backward compatibility) and the full data structure
    // Note: The DestinationSelectionScreen component already saves to tripState
    sessionStorage.setItem('tripDestination', destinationValue);
    sessionStorage.setItem('tripDestinationData', JSON.stringify(destinationData));
    router.push(routes.plan.timing);
  };

  const handleBack = () => {
    router.push(routes.home);
  };

  return (
    <>
      <main>
        <DestinationSelectionScreen
          onDestinationSelected={handleDestinationSelected}
          onBack={handleBack}
        />
      </main>
      <Footer />
    </>
  );
}

