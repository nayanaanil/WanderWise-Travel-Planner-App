"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { HomeScreen } from '@/components/HomeScreen';
import { TripSessionModal } from '@/components/TripSessionModal';
import { Toaster } from '@/ui/sonner';
import { getTripState, resetAllTripState, getSelectedDraftItinerary } from '@/lib/tripState';
import { routes } from '@/lib/navigation';

export default function Home() {
  const router = useRouter();
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripDestination, setTripDestination] = useState<string>('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if there's an active trip on mount
    const tripState = getTripState();
    
    // Consider a trip "active" if it has a destination set
    if (tripState.destination?.value) {
      setTripDestination(tripState.destination.value);
      setShowTripModal(true);
    }
    
    setIsChecking(false);
  }, []);

  const handleContinueTrip = () => {
    setShowTripModal(false);
    // Navigate to the appropriate step based on progress
    const tripState = getTripState();
    
    // Determine where to resume based on what's been filled
    if (tripState.draftItineraries && tripState.draftItineraries.length > 0) {
      router.push(routes.plan.logistics);
    } else if (getSelectedDraftItinerary()) {
      router.push(routes.plan.itinerary);
    } else if (tripState.pace) {
      router.push(routes.plan.processing);
    } else if (tripState.duration) {
      router.push(routes.plan.pace);
    } else if (tripState.preferredMonth) {
      router.push(routes.plan.duration);
    } else if (tripState.destination) {
      router.push(routes.plan.timing);
    } else {
      router.push(routes.plan.destination);
    }
  };

  const handleNewTrip = () => {
    setShowTripModal(false);
    
    // HARD RESET - Clear ALL trip state
    resetAllTripState();
    
    // Navigate to home screen with completely clean state
    router.push(routes.home);
  };

  const handlePlanTripClick = () => {
    // If there's an active trip, show modal; otherwise go straight to planning
    const tripState = getTripState();
    if (tripState.destination?.value) {
      setTripDestination(tripState.destination.value);
      setShowTripModal(true);
    } else {
      router.push(routes.plan.destination);
    }
  };

  // Don't render anything while checking for active trip
  if (isChecking) {
    return null;
  }

  return (
    <>
      <main className="min-h-[100dvh]">
        <HomeScreen 
          onPlanTrip={handlePlanTripClick}
        />
      </main>
      <Toaster />
      
      {showTripModal && (
        <TripSessionModal
          onContinueTrip={handleContinueTrip}
          onNewTrip={handleNewTrip}
          tripDestination={tripDestination}
        />
      )}
    </>
  );
}

