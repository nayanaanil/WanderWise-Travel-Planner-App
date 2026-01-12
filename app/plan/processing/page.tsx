"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { AIProcessingScreen } from '@/components/AIProcessingScreen';
import { routes } from '@/lib/navigation';
import { getTripState, resetItineraryData, saveTripState } from '@/lib/tripState';
import { generateMasterItineraries } from '@/lib/generateMasterItineraries';

export default function ProcessingPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL: Use empty dependency array to prevent re-running on router changes
  // This ensures itinerary generation only happens once, not on every navigation
  // CRITICAL: Use ref to prevent React Strict Mode from causing double execution
  const hasRunRef = useRef(false);
  
  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasRunRef.current) {
      console.log('>>> PROCESSING PAGE: useEffect skipped (already ran)');
      return;
    }
    hasRunRef.current = true;

    console.log('>>> PROCESSING PAGE: useEffect triggered from:', new Error().stack?.split('\n')[2]?.trim());
    
    const tripState = getTripState();
    const dest = tripState.destination?.value || '';
    setDestination(dest);

    // CRITICAL: Always reset itinerary data before generating new ones
    // This prevents stale data from previous trips from appearing
    console.log('>>> PROCESSING PAGE: Resetting itinerary data before generating new itineraries');
    resetItineraryData();

    // ALWAYS show loading screen for minimum 10 seconds
    // Even if data already exists, we want consistent UX
    const startTime = performance.now();
    setIsGenerating(true);
    
    // Step 1: Classify destination if it's freeform
    const classificationPromise = (async () => {
      if (tripState.destination?.isFreeform === true && tripState.destination?.value) {
        console.log('>>> PROCESSING PAGE: Classifying freeform destination:', tripState.destination.value);
        try {
          // Call API route instead of direct function call (API routes have access to env vars)
          const response = await fetch('/api/classify-destination', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userInput: tripState.destination.value,
            }),
          });

          if (!response.ok) {
            throw new Error(`Classification API error: ${response.status}`);
          }

          const classification = await response.json();
          console.log('>>> PROCESSING PAGE: Classification result:', classification);
          
          // DO NOT save classification to tripState - AI-derived fields are ephemeral
          // Only normalize the destination if it's a place (user intent, not AI inference)
          if (classification.type === 'place' && classification.normalizedPlace) {
            console.log('>>> PROCESSING PAGE: Normalizing place destination to:', classification.normalizedPlace);
            saveTripState({
              destination: {
                ...tripState.destination,
                value: classification.normalizedPlace,
                label: classification.normalizedPlace,
                isFreeform: false, // No longer freeform after normalization
              },
            });
          }
          // If classification says it's a theme, leave destination as-is
          // The API will recompute classification internally during itinerary generation
        } catch (error) {
          console.error('>>> PROCESSING PAGE: Classification failed, destination will be used as-is:', error);
          // Do not save fallback classification - API will handle it
        }
      } else {
        console.log('>>> PROCESSING PAGE: Skipping classification (not freeform or no destination)');
      }
    })();
    
    // Step 2: Wait for classification, then generate itineraries
    // ALWAYS generate fresh master itineraries - NEVER reuse old ones
    // This ensures new trip details always produce new itineraries
    console.log('>>> PROCESSING PAGE: Calling generateMasterItineraries()');
    const generatePromise = classificationPromise.then(() => generateMasterItineraries());
    
    generatePromise
      .then(async (itineraries) => {
        // Master itineraries are now stored in tripState
        // Calculate elapsed time
        const elapsed = performance.now() - startTime;
        const minDisplayTime = 10000; // 10 seconds in milliseconds
        
        // ALWAYS wait for minimum display time, even if API calls completed quickly
        if (elapsed < minDisplayTime) {
          const remainingTime = minDisplayTime - elapsed;
          console.log(`API calls completed in ${elapsed.toFixed(0)}ms, waiting ${remainingTime.toFixed(0)}ms more to reach 10 seconds`);
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        } else {
          console.log(`API calls took ${elapsed.toFixed(0)}ms, which exceeds minimum 10 seconds`);
        }
        
        // Verify we've waited at least 10 seconds
        const totalElapsed = performance.now() - startTime;
        console.log(`Total time elapsed: ${totalElapsed.toFixed(0)}ms`);
        
        // Only set isGenerating to false right before navigation
        setIsGenerating(false);
        // Small delay to allow state update, then navigate
        setTimeout(() => {
          router.push(routes.plan.itinerary);
        }, 100);
      })
      .catch((err) => {
        console.error('Error loading itinerary data:', err);
        setError(err.message || 'Failed to load itinerary options');
        setIsGenerating(false);
      });
  }, []); // Empty dependency array - only run once on mount, not on router changes

  const handleComplete = () => {
    // Navigation is handled in useEffect after API calls complete
    // This is called by AIProcessingScreen animation completion
    // but we'll let the useEffect handle actual navigation
  };

  const handleBack = () => {
    router.push(routes.plan.pace);
  };

  const handleRetry = () => {
    setError(null);
    setIsGenerating(true);
    const startTime = performance.now();
    
    // CRITICAL: Always reset itinerary data before retrying
    console.log('Resetting itinerary data before retry');
    resetItineraryData();
    
    // Get current trip state for classification
    const tripState = getTripState();
    
    // Step 1: Classify destination if it's freeform
    const classificationPromise = (async () => {
      if (tripState.destination?.isFreeform === true && tripState.destination?.value) {
        console.log('Retry: Classifying freeform destination:', tripState.destination.value);
        try {
          // Call API route instead of direct function call (API routes have access to env vars)
          const response = await fetch('/api/classify-destination', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userInput: tripState.destination.value,
            }),
          });

          if (!response.ok) {
            throw new Error(`Classification API error: ${response.status}`);
          }

          const classification = await response.json();
          console.log('Retry: Classification result:', classification);
          
          // DO NOT save classification to tripState - AI-derived fields are ephemeral
          // Only normalize the destination if it's a place (user intent, not AI inference)
          if (classification.type === 'place' && classification.normalizedPlace) {
            console.log('Retry: Normalizing place destination to:', classification.normalizedPlace);
            saveTripState({
              destination: {
                ...tripState.destination,
                value: classification.normalizedPlace,
                label: classification.normalizedPlace,
                isFreeform: false,
              },
            });
          }
          // If classification says it's a theme, leave destination as-is
          // The API will recompute classification internally during itinerary generation
        } catch (error) {
          console.error('Retry: Classification failed, destination will be used as-is:', error);
          // Do not save fallback classification - API will handle it
        }
      }
    })();
    
    // Step 2: Wait for classification, then generate itineraries
    // ALWAYS generate fresh master itineraries on retry - NEVER reuse old ones
    const generatePromise = classificationPromise.then(() => generateMasterItineraries());
    
    generatePromise
      .then(async (itineraries) => {
        // Master itineraries are now stored in tripState
        // Calculate elapsed time
        const elapsed = performance.now() - startTime;
        const minDisplayTime = 10000; // 10 seconds in milliseconds
        
        // If we finished too quickly, wait to ensure minimum display time
        // Keep isGenerating true during the wait so animation continues
        if (elapsed < minDisplayTime) {
          await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsed));
        }
        
        // Only set isGenerating to false right before navigation
        setIsGenerating(false);
        // Small delay to allow state update, then navigate
        setTimeout(() => {
          router.push(routes.plan.itinerary);
        }, 100);
      })
      .catch((err) => {
        console.error('Error loading itinerary data:', err);
        setError(err.message || 'Failed to load itinerary options');
        setIsGenerating(false);
      });
  };

  if (!destination) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <AIProcessingScreen
        destination={destination}
        onComplete={handleComplete}
        onBack={handleBack}
        isGenerating={isGenerating}
        error={error}
        onRetry={handleRetry}
      />
      <Footer />
    </>
  );
}

