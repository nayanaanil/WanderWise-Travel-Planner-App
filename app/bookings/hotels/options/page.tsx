"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { HotelImpactModal } from '@/components/HotelImpactModal';
import { getTripState, saveTripState } from '@/lib/tripState';
import { routes } from '@/lib/navigation';
import { Building2, Star, CheckCircle, AlertCircle, Calendar, AlertTriangle, Info, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { RouteReader, type RouteStep } from '@/lib/phase2/RouteReader';
import { Phase2StructuralRoute } from '@/lib/phase2/types';
import { useProcessing } from '@/lib/ProcessingContext';
import { computeHotelMeaningfulDifferencesForCity, shouldProceedWithAI, aggregateHotelTravelSignals, resolveHotelSelectionByPriority, type HotelOptionWithImpact } from '@/lib/phase3/hotelMeaningfulDifferences';
import { HotelSearchResponse } from '@/lib/phase3/types';
import { getEncouragementMessage, trackAgentDecisionSuccess, getAgentDecisionSuccessCount, getWatchfulMessage, shouldShowWatchfulMessage, markWatchfulMessageAsShown } from '@/lib/agentEncouragement';
import { AgentEncouragementMessage } from '@/components/AgentEncouragementMessage';

/**
 * Phase 3 Hotel Selection Page
 * 
 * This page:
 * - Displays hotels grouped by city with tabs
 * - Shows stay windows for each city
 * - Allows hotel selection
 * - Evaluates impact and navigates to impact page
 * 
 * This page does NOT:
 * - Mutate routes
 * - Show impact cards (navigates to impact page instead)
 */
function HotelOptionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startProcessing, stopProcessing } = useProcessing();
  const [hotelSearchResults, setHotelSearchResults] = useState<any>(null);
  const [structuralRoute, setStructuralRoute] = useState<any>(null);
  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingFailure, setBookingFailure] = useState<any>(null);
  
  // Modal state
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [impactModalData, setImpactModalData] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Hotel Priority Guidance state
  const [hotelPriorityGuidance, setHotelPriorityGuidance] = useState<{
    brief: string;
    priorities: Array<{
      id: 'fit' | 'comfort' | 'availability';
      label: string;
      helper: string;
    }>;
  } | null>(null);
  const [selectedHotelPriority, setSelectedHotelPriority] = useState<'fit' | 'comfort' | 'availability' | null>(null);
  const [showPriorityGuidance, setShowPriorityGuidance] = useState(false);
  const [agentResolvedHotelSelection, setAgentResolvedHotelSelection] = useState<{
    hotelId: string;
    priorityUsed: 'fit' | 'comfort' | 'availability';
  } | null>(null);
  const [encouragementMessage, setEncouragementMessage] = useState<string | null>(null);
  const [agentSuccessCount, setAgentSuccessCount] = useState(0);
  const [shouldShowWatchfulMsg, setShouldShowWatchfulMsg] = useState(false);
  
  // Load agent success count on mount and check if watchful message should be shown
  useEffect(() => {
    const count = getAgentDecisionSuccessCount();
    setAgentSuccessCount(count);
    setShouldShowWatchfulMsg(shouldShowWatchfulMessage(count));
    if (shouldShowWatchfulMessage(count)) {
      markWatchfulMessageAsShown();
    }
  }, []);
  
  // Auto-show guidance when it's first loaded
  useEffect(() => {
    if (hotelPriorityGuidance) {
      setShowPriorityGuidance(true);
    }
  }, [hotelPriorityGuidance]);

  useEffect(() => {
    const tripState = getTripState();

    // Guard: Check for hotelSearchResults
    if (!tripState.hotelSearchResults) {
      console.warn('[HotelOptions] No hotelSearchResults found, redirecting to hotels loader');
      // Preserve city query param if present
      const cityParam = searchParams.get('city');
      const url = cityParam 
        ? `${routes.bookings.hotels.index}?city=${encodeURIComponent(cityParam)}`
        : routes.bookings.hotels.index;
      router.push(url);
      return;
    }

    // Check for structuralRoute (needed for impact evaluation)
    if (!tripState.structuralRoute) {
      console.warn('[HotelOptions] No structuralRoute found, redirecting to logistics');
      router.push(routes.plan.logistics);
      return;
    }

    setHotelSearchResults(tripState.hotelSearchResults);
    setStructuralRoute(tripState.structuralRoute);
    
    // Load agent-resolved hotel selection if present
    if (tripState.agentResolvedHotelSelection) {
      const cityParam = searchParams.get('city');
      const targetCity = cityParam || (tripState.hotelSearchResults?.hotelsByCity?.[0]?.city);
      if (targetCity && tripState.agentResolvedHotelSelection[targetCity]) {
        setAgentResolvedHotelSelection(tripState.agentResolvedHotelSelection[targetCity]);
        // Also set the priority if we have the resolved selection
        setSelectedHotelPriority(tripState.agentResolvedHotelSelection[targetCity].priorityUsed);
      }
    }
    
    // Check for booking failure context
    if (tripState.hotelBookingFailure) {
      const bookingFailure = tripState.hotelBookingFailure;
      setBookingFailure(bookingFailure);
      
      // Set selected city to the city with the failed hotel
      if (tripState.hotelSearchResults) {
        const citiesWithHotels = tripState.hotelSearchResults.hotelsByCity.filter(
          (cityData: any) => cityData.hotels.length > 0
        );
        const targetIndex = citiesWithHotels.findIndex(
          (cityData: any) => cityData.city.toLowerCase().trim() === bookingFailure.city.toLowerCase().trim()
        );
        if (targetIndex !== -1) {
          setSelectedCityIndex(targetIndex);
        }
      }
    } else {
      // Read city query parameter and set active city tab
      const cityParam = searchParams.get('city');
      if (cityParam && tripState.hotelSearchResults) {
        const citiesWithHotels = tripState.hotelSearchResults.hotelsByCity.filter(
          (cityData: any) => cityData.hotels.length > 0
        );
        const targetIndex = citiesWithHotels.findIndex(
          (cityData: any) => cityData.city.toLowerCase().trim() === cityParam.toLowerCase().trim()
        );
        if (targetIndex !== -1) {
          setSelectedCityIndex(targetIndex);
        }
      }
    }
    
    setIsHydrated(true);
  }, [router, searchParams]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  /**
   * Generates hotel recommendation explanation copy for the agent pick section.
   * Template-based, no AI call.
   */
  const generateHotelRecommendationExplanation = (
    priority: 'fit' | 'comfort' | 'availability',
    hotel: any
  ): { explanation: string; acceptedTradeoff: string } => {
    if (priority === 'fit') {
      const exactMatch = hotel.exactMatch !== false;
      if (exactMatch) {
        return {
          explanation: 'Picked for you because you wanted minimal disruption — this hotel fits your itinerary dates perfectly with no changes needed.',
          acceptedTradeoff: 'May have fewer room type options or slightly higher price',
        };
      } else {
        return {
          explanation: 'Picked for you because you wanted minimal disruption — this hotel requires the smallest date adjustments to fit your stay.',
          acceptedTradeoff: 'Requires adjusting your stay dates slightly',
        };
      }
    } else if (priority === 'comfort') {
      const hasRoomTypes = hotel.availableRoomTypes && hotel.availableRoomTypes.length > 0;
      if (hasRoomTypes) {
        const hasSuite = hotel.availableRoomTypes.some((rt: string) =>
          rt.toLowerCase().includes('suite') ||
          rt.toLowerCase().includes('family') ||
          rt.toLowerCase().includes('apartment')
        );
        if (hasSuite) {
          return {
            explanation: 'Picked for you because you wanted the best room fit — this hotel offers suites and family rooms that accommodate your group comfortably.',
            acceptedTradeoff: 'May cost more or require date flexibility',
          };
        } else {
          return {
            explanation: 'Picked for you because you wanted the best room fit — this hotel has room types that work well for your group size.',
            acceptedTradeoff: 'May need to book multiple rooms or adjust dates',
          };
        }
      } else {
        return {
          explanation: 'Picked for you because you wanted the best room fit — this hotel offers the most suitable options for your group.',
          acceptedTradeoff: 'Room type details may need confirmation at booking',
        };
      }
    } else if (priority === 'availability') {
      const confidence = hotel.availabilityConfidence || 'medium';
      const status = hotel.availabilityStatus || 'available';
      
      if (confidence === 'high' && status === 'available') {
        return {
          explanation: 'Picked for you because you wanted booking confidence — this hotel has high availability and you can book with confidence.',
          acceptedTradeoff: 'May have fewer amenities or less ideal location',
        };
      } else if (status === 'limited') {
        return {
          explanation: 'Picked for you because you wanted booking confidence — this hotel has the best availability among your options, though rooms are limited.',
          acceptedTradeoff: 'Limited room selection or may need to book soon',
        };
      } else {
        return {
          explanation: 'Picked for you because you wanted booking confidence — this hotel offers the most reliable booking option available.',
          acceptedTradeoff: 'May require booking flexibility or have fewer options',
        };
      }
    }
    
    return {
      explanation: 'Picked for you based on your priority.',
      acceptedTradeoff: 'Consider your other priorities as well',
    };
  };

  // Aggregate hotel facts for a city
  const aggregateHotelFacts = (hotels: any[]) => {
    const totalHotels = hotels.length;
    
    // Availability mix
    const availabilityMix = {
      available: hotels.filter(h => h.availabilityStatus === 'available').length,
      limited: hotels.filter(h => h.availabilityStatus === 'limited').length,
      unavailable: hotels.filter(h => h.availabilityStatus === 'unavailable').length,
    };
    
    // Confidence mix
    const confidenceMix = {
      high: hotels.filter(h => h.availabilityConfidence === 'high').length,
      medium: hotels.filter(h => h.availabilityConfidence === 'medium').length,
      low: hotels.filter(h => h.availabilityConfidence === 'low').length,
    };
    
    // Room type mix
    const allRoomTypes = new Set<string>();
    hotels.forEach(h => {
      if (h.availableRoomTypes && h.availableRoomTypes.length > 0) {
        h.availableRoomTypes.forEach((rt: string) => allRoomTypes.add(rt));
      }
    });
    
    const hotelsWithRoomTypes = hotels.filter(h => h.availableRoomTypes && h.availableRoomTypes.length > 0).length;
    const hotelsWithoutRoomTypes = totalHotels - hotelsWithRoomTypes;
    
    // Price range
    const prices = hotels.map(h => h.pricePerNight).filter((p): p is number => typeof p === 'number' && p > 0);
    const priceRange = prices.length > 0 ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
    } : null;
    
    // Exact match mix
    const exactMatchMix = {
      exactMatch: hotels.filter(h => h.exactMatch !== false).length,
      requiresAdjustment: hotels.filter(h => h.exactMatch === false).length,
    };
    
    return {
      totalHotels,
      availabilityMix,
      confidenceMix,
      roomTypeMix: {
        uniqueRoomTypes: Array.from(allRoomTypes),
        hotelsWithRoomTypes,
        hotelsWithoutRoomTypes,
      },
      priceRange,
      exactMatchMix,
    };
  };

  // Fetch hotel priority guidance when city changes
  useEffect(() => {
    if (!isHydrated || !hotelSearchResults) return;
    
    const citiesWithStays = hotelSearchResults.hotelsByCity.filter((city: any) => city.stayWindow.nights >= 1);
    const selectedCityData = citiesWithStays[selectedCityIndex];
    
    if (!selectedCityData || !selectedCityData.hotels || selectedCityData.hotels.length === 0) {
      setHotelPriorityGuidance(null);
      setAgentResolvedHotelSelection(null);
      return;
    }

    try {
      const tripState = getTripState();
      const hotels = selectedCityData.hotels;
      
      // Compute meaningful differences
      const meaningfulDifferences = computeHotelMeaningfulDifferencesForCity(
        hotelSearchResults as HotelSearchResponse,
        selectedCityData.city
      );
      
      // Only proceed if 2+ dimensions differ
      if (!shouldProceedWithAI(meaningfulDifferences)) {
        setHotelPriorityGuidance(null);
        setAgentResolvedHotelSelection(null);
        return;
      }
      
      // Aggregate hotel facts
      const aggregatedFacts = aggregateHotelFacts(hotels);
      
      // Derive travel signals
      const groupSize = (tripState.adults || 1) + (tripState.kids || 0);
      const hotelsWithImpact: HotelOptionWithImpact[] = hotels.map((hotel: any) => ({
        id: hotel.id,
        exactMatch: hotel.exactMatch,
        availableRoomTypes: hotel.availableRoomTypes,
        availabilityStatus: hotel.availabilityStatus,
        availabilityConfidence: hotel.availabilityConfidence,
      }));
      const travelSignals = aggregateHotelTravelSignals(hotelsWithImpact, groupSize);
      
      // Get trip context
      const tripContext = {
        pace: tripState.pace,
        interests: tripState.styles,
        travelers: {
          adults: tripState.adults || 1,
          kids: tripState.kids || 0,
        },
        tripDurationDays: tripState.structuralRoute?.derived?.totalTripDays,
      };
      
      const payload = {
        city: selectedCityData.city,
        stayWindow: selectedCityData.stayWindow,
        groupSize: {
          adults: tripState.adults || 1,
          kids: tripState.kids || 0,
        },
        tripContext,
        aggregatedFacts,
        meaningfulDifferences,
        travelSignals,
      };
      
      fetch('/api/agent/hotel-priority-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return await res.json();
        })
        .then((data) => {
          if (data && data.brief && typeof data.brief === 'string' && Array.isArray(data.priorities)) {
            setHotelPriorityGuidance(data);
          } else {
            setHotelPriorityGuidance(null);
          }
        })
        .catch((err) => {
          console.error('[HotelPriorityGuidance] Failed to fetch guidance', err);
          setHotelPriorityGuidance(null);
        });
    } catch (err) {
      console.error('[HotelPriorityGuidance] Failed to prepare guidance payload', err);
      setHotelPriorityGuidance(null);
      setAgentResolvedHotelSelection(null);
    }
  }, [isHydrated, hotelSearchResults, selectedCityIndex]);

  // Resolve hotel selection when priority is selected
  useEffect(() => {
    if (!selectedHotelPriority || !isHydrated || !hotelSearchResults) {
      setAgentResolvedHotelSelection(null);
      return;
    }

    const citiesWithStays = hotelSearchResults.hotelsByCity.filter((city: any) => city.stayWindow.nights >= 1);
    const selectedCityData = citiesWithStays[selectedCityIndex];
    
    if (!selectedCityData || !selectedCityData.hotels || selectedCityData.hotels.length === 0) {
      setAgentResolvedHotelSelection(null);
      return;
    }

    try {
      const tripState = getTripState();
      const hotels = selectedCityData.hotels;
      const groupSize = (tripState.adults || 1) + (tripState.kids || 0);
      
      // Convert hotels to HotelOptionWithImpact format
      const hotelsWithImpact: HotelOptionWithImpact[] = hotels.map((hotel: any) => ({
        id: hotel.id,
        exactMatch: hotel.exactMatch,
        availableRoomTypes: hotel.availableRoomTypes,
        availabilityStatus: hotel.availabilityStatus,
        availabilityConfidence: hotel.availabilityConfidence,
      }));
      
      // Resolve hotel selection
      const resolved = resolveHotelSelectionByPriority(
        selectedHotelPriority,
        hotelsWithImpact,
        groupSize
      );
      
      if (resolved) {
        setAgentResolvedHotelSelection(resolved);
        
        // Store in tripState
        const existingResolved = tripState.agentResolvedHotelSelection || {};
        saveTripState({
          agentResolvedHotelSelection: {
            ...existingResolved,
            [selectedCityData.city]: resolved,
          },
        });
      } else {
        setAgentResolvedHotelSelection(null);
      }
    } catch (err) {
      console.error('[HotelResolution] Failed to resolve hotel selection', err);
      setAgentResolvedHotelSelection(null);
    }
  }, [selectedHotelPriority, isHydrated, hotelSearchResults, selectedCityIndex]);

  // Apply hotel silently (no impact modal) when there are no changes
  const applyHotelSilently = async (impactResult: any, hotel: any, candidate: any) => {
    try {
      startProcessing('Applying hotel to itinerary...');
      
      const tripState = getTripState();
      const updatedRoute = candidate.route;
      
      // Get existing locked hotel stays
      const existingLockedStays = tripState.lockedHotelStays || [];
      const normalizeCity = (city: string) => city.toLowerCase().trim();
      const updatedLockedStays = existingLockedStays.filter(
        stay => normalizeCity(stay.city) !== normalizeCity(impactResult.hotel.city)
      );
      
      // Add the new hotel
      updatedLockedStays.push({
        city: impactResult.hotel.city,
        hotelId: impactResult.hotel.hotelId,
        checkIn: impactResult.hotel.checkIn,
        checkOut: impactResult.hotel.checkOut,
      });

      // Save selected hotel data
      const city = impactResult.hotel.city;
      const existingHotels = tripState.selectedHotels || {};
      const hotelData = {
        hotelId: hotel.id,
        name: hotel.name,
        image: hotel.image,
        rating: hotel.rating,
        pricePerNight: hotel.pricePerNight,
        availabilityStatus: hotel.availabilityStatus,
        availabilityConfidence: hotel.availabilityConfidence,
        availabilityReason: hotel.availabilityReason,
        restrictions: hotel.restrictions,
      };

      // Check if user accepted agent pick
      const isAgentPick = agentResolvedHotelSelection && 
        agentResolvedHotelSelection.hotelId === hotel.id;
      
      if (isAgentPick && agentResolvedHotelSelection) {
        // Track success and show encouragement
        const newCount = trackAgentDecisionSuccess();
        setAgentSuccessCount(newCount);
        const message = getEncouragementMessage('hotel', agentResolvedHotelSelection.priorityUsed, newCount);
        if (message) {
          setEncouragementMessage(message);
          // Show message briefly before navigating
          setTimeout(() => {
            setEncouragementMessage(null);
          }, 3500);
        }
      }

      saveTripState({
        structuralRoute: updatedRoute,
        lockedHotelStays: updatedLockedStays,
        selectedHotels: {
          ...existingHotels,
          [city]: hotelData,
        },
      });

      // Set flag for post-action feedback
      sessionStorage.setItem('recentlyAppliedHotel', JSON.stringify({
        city,
        hotelId: hotelData.hotelId,
      }));

      stopProcessing();
      router.push(routes.plan.logistics);
    } catch (error) {
      stopProcessing();
      console.error('[HotelOptions] Silent apply error:', error);
      alert('An error occurred while applying your hotel selection. Please try again.');
    }
  };

  const handleHotelClick = async (hotel: any, cityData: any) => {
    try {
      setLoading(true);

      // Clear booking failure when user selects a new hotel
      const tripState = getTripState();
      if (tripState.hotelBookingFailure) {
        saveTripState({
          hotelBookingFailure: undefined,
        });
        setBookingFailure(null);
      }

      // Build hotel constraint
      const selectedHotel = {
        hotelId: hotel.id,
        city: hotel.city,
        checkIn: cityData.stayWindow.arrival,
        checkOut: cityData.stayWindow.departure,
        nights: cityData.stayWindow.nights,
        flexibility: 'FIXED' as const, // MVP: default to FIXED
      };

      // Get locked hotel stays from tripState
      const lockedHotelStays = tripState.lockedHotelStays || [];

      startProcessing('Evaluating hotel impact...');
      
      // Call Phase 3 hotel impact API
      const response = await fetch('/api/phase3/hotels/impact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: hotelSearchResults.tripId,
          baselineRoute: structuralRoute,
          lockedHotelStays,
          newHotelConstraint: selectedHotel,
        }),
      });

      if (!response.ok) {
        stopProcessing();
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.statusText}`);
      }

      const impactResult = await response.json();
      stopProcessing();

      // PART 1: Check if impact is trivial (no impact cards = no changes)
      const candidate = impactResult.candidates?.[0];
      const impactCards = candidate?.impactCards || [];
      
      // If no impact and no blocking issues, apply silently
      if (impactCards.length === 0 && candidate?.route) {
        // Apply hotel directly without showing modal
        await applyHotelSilently(impactResult, hotel, candidate);
        return;
      }

      // Find baseline and candidate stays for modal display
      const findCityStay = (route: any, city: string) => {
        try {
          const phase2Route: Phase2StructuralRoute = {
            ...route,
            derived: route.derived || {
              arrivalDates: {},
              departureDates: {},
              totalTripDays: 0,
              inboundSlackDays: 0,
              draftStayCities: [],
            },
          };
          const reader = new RouteReader(phase2Route);
          const steps = Array.from(reader.steps());
          const normalizedCity = city.toLowerCase().trim();
          
          for (const step of steps) {
            if (step.kind === 'STAY') {
              const stayStep = step as Extract<RouteStep, { kind: 'STAY' }>;
              if (stayStep.city.toLowerCase().trim() === normalizedCity) {
                return stayStep;
              }
            }
          }
          return null;
        } catch {
          return null;
        }
      };

      const affectedCity = impactResult.hotel.city;
      const baselineStay = findCityStay(structuralRoute, affectedCity);
      const candidateStay = candidate?.route ? findCityStay(candidate.route, affectedCity) : null;

      // Show modal instead of navigating
      setImpactModalData({
        impactResult,
        hotel,
        baselineStay,
        candidateStay,
      });
      setShowImpactModal(true);
      setLoading(false);
    } catch (err) {
      stopProcessing();
      console.error('[HotelOptions] Error evaluating hotel impact:', err);
      alert(err instanceof Error ? err.message : 'Failed to evaluate hotel impact');
      setLoading(false);
    }
  };

  const handleModalApprove = async () => {
    if (!impactModalData) return;
    
    const { impactResult, hotel } = impactModalData;
    const candidate = impactResult.candidates?.[0];
    
    if (!candidate || !candidate.route) {
      alert('No valid candidate route found');
      return;
    }

    // Check for blocking errors
    const hasBlocking = candidate.impactCards?.some(
      (card: any) => card.severity === 'BLOCKING'
    );

    if (hasBlocking) {
      alert('Cannot apply: This hotel has blocking issues. Please choose a different hotel.');
      return;
    }

    try {
      setIsApproving(true);
      
      const tripState = getTripState();
      const tripId = structuralRoute?.id || 'trip-' + Date.now();
      
      // Attempt to validate hotel selection
      const bookingResponse = await fetch('/api/phase3/hotels/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          hotel: impactResult.hotel,
        }),
      });

      if (!bookingResponse.ok) {
        throw new Error('Selection validation failed');
      }

      const bookingResult = await bookingResponse.json();

      if (bookingResult.status === 'failed') {
        // Selection could not be applied - show failure context
        const hotelName = hotel?.name || `${impactResult.hotel.city} Hotel`;
        
        saveTripState({
          hotelBookingFailure: {
            hotelId: impactResult.hotel.hotelId,
            hotelName,
            city: impactResult.hotel.city,
            reason: bookingResult.reason || 'sold_out',
            alternatives: bookingResult.alternatives,
          },
        });

        // Close modal and show failure banner
        setShowImpactModal(false);
        setImpactModalData(null);
        setIsApproving(false);
        
        // Reload the page to show failure context
        window.location.reload();
        return;
      }

      // Selection validated successfully - proceed with route update
      const updatedRoute = candidate.route;

      // Get existing locked hotel stays
      const existingLockedStays = tripState.lockedHotelStays || [];
      
      // Upsert the new hotel into lockedHotelStays
      const normalizeCity = (city: string) => city.toLowerCase().trim();
      const updatedLockedStays = existingLockedStays.filter(
        stay => normalizeCity(stay.city) !== normalizeCity(impactResult.hotel.city)
      );
      
      updatedLockedStays.push({
        city: impactResult.hotel.city,
        hotelId: impactResult.hotel.hotelId,
        checkIn: impactResult.hotel.checkIn,
        checkOut: impactResult.hotel.checkOut,
      });

      // Save selected hotel data for display
      const city = impactResult.hotel.city;
      const existingHotels = tripState.selectedHotels || {};
      const hotelData = {
        hotelId: hotel?.id || impactResult.hotel.hotelId,
        name: hotel?.name || `${city} Hotel`,
        image: hotel?.image,
        rating: hotel?.rating,
        pricePerNight: hotel?.pricePerNight,
        // Persist availability context from selection time
        availabilityStatus: hotel?.availabilityStatus,
        availabilityConfidence: hotel?.availabilityConfidence,
        availabilityReason: hotel?.availabilityReason,
        restrictions: hotel?.restrictions,
      };

      // Check if user accepted agent pick
      const isAgentPick = agentResolvedHotelSelection && 
        agentResolvedHotelSelection.hotelId === (hotel?.id || impactResult.hotel.hotelId);
      
      if (isAgentPick && agentResolvedHotelSelection) {
        // Track success and show encouragement
        const newCount = trackAgentDecisionSuccess();
        setAgentSuccessCount(newCount);
        const message = getEncouragementMessage('hotel', agentResolvedHotelSelection.priorityUsed, newCount);
        if (message) {
          setEncouragementMessage(message);
          // Show message briefly before navigating
          setTimeout(() => {
            setEncouragementMessage(null);
          }, 3500);
        }
      }

      // Save updated route, locked hotel stays, selected hotel
      saveTripState({
        structuralRoute: updatedRoute,
        lockedHotelStays: updatedLockedStays,
        selectedHotels: {
          ...existingHotels,
          [city]: hotelData,
        },
        hotelImpactResult: undefined,
        hotelBookingFailure: undefined,
      });

      // Navigate to logistics page
      router.push(routes.plan.logistics);
    } catch (error) {
      console.error('[HotelOptions] Apply error:', error);
      alert('An error occurred while applying your hotel selection. Please try again.');
      setIsApproving(false);
    }
  };

  const handleModalChooseDifferent = () => {
    // Close modal and stay on options page
    setShowImpactModal(false);
    setImpactModalData(null);
  };

  const handleModalClose = () => {
    if (!isApproving) {
      setShowImpactModal(false);
      setImpactModalData(null);
    }
  };

  const handleBack = () => {
    router.push(routes.plan.logistics);
  };

  if (!isHydrated || !hotelSearchResults) {
    return (
      <>
        <div className="fixed inset-0 bg-gray-900 -z-10" />
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading hotel options...</p>
          </div>
        </div>
      </>
    );
  }

  const { hotelsByCity } = hotelSearchResults;

  // Filter cities with nights >= 1 (should already be filtered, but double-check)
  const citiesWithStays = hotelsByCity.filter((city: any) => city.stayWindow.nights >= 1);

  if (citiesWithStays.length === 0) {
    return (
      <>
        <div className="fixed inset-0 bg-gray-900 -z-10" />
        <Header />
        <main className="flex flex-col min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50">
          <StepHeader
            title="Hotel Selection"
            currentStep={7}
            totalSteps={9}
            onBack={handleBack}
          />
          <div className="flex-1 overflow-y-auto pt-[120px] pb-40">
            <div className="max-w-md mx-auto px-4 text-center">
              <p className="text-gray-600">No cities with stays found in your itinerary.</p>
            </div>
          </div>
          <Footer />
        </main>
      </>
    );
  }

  const selectedCityData = citiesWithStays[selectedCityIndex] || citiesWithStays[0];
  let selectedCityHotels = selectedCityData?.hotels || [];
  
  // Inject nearby hotels from booking failure if present and city matches
  if (bookingFailure && 
      bookingFailure.alternatives?.nearbyHotels && 
      selectedCityData?.city.toLowerCase().trim() === bookingFailure.city.toLowerCase().trim()) {
    // Add nearby hotels to the list (mark them as alternatives)
    // Ensure they have the correct city and stay window data
    selectedCityHotels = [
      ...selectedCityHotels,
      ...bookingFailure.alternatives.nearbyHotels.map((hotel: any) => ({
        ...hotel,
        city: bookingFailure.city, // Ensure city matches
        isAlternative: true, // Mark as alternative
      })),
    ];
  }

  return (
    <>
      <div className="fixed inset-0 bg-gray-900 -z-10" />
      <Header />
      <main className="flex flex-col min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50">
        <StepHeader
          title="Choose Hotels"
          currentStep={8}
          totalSteps={10}
          onBack={handleBack}
        />

        <div className="flex-1 overflow-y-auto pt-[120px] pb-40">
          <div className="max-w-md mx-auto px-4">
            {/* City Tabs */}
            {citiesWithStays.length > 1 && (
              <div className="mb-6 overflow-x-auto">
                <div className="flex gap-2 pb-2 border-b border-gray-200">
                  {citiesWithStays.map((cityData: any, index: number) => (
                    <button
                      key={cityData.city}
                      onClick={() => setSelectedCityIndex(index)}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                        selectedCityIndex === index
                          ? 'bg-[#FE4C40] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cityData.city}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selection Validation Recovery Banner */}
            {bookingFailure && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-orange-900 mb-1">
                      {bookingFailure.reason === 'date_incompatible'
                        ? 'These dates are not supported by this hotel'
                        : bookingFailure.reason === 'sold_out' 
                        ? 'This hotel just became unavailable'
                        : bookingFailure.reason === 'room_type_unavailable'
                        ? 'This option is no longer available'
                        : 'Hotel pricing has changed'}
                    </h3>
                    <p className="text-sm text-orange-800 leading-relaxed">
                      Availability can change quickly — here are the closest alternatives.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stay Window */}
            {selectedCityData && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl relative">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Your stay</h3>
                </div>
                <p className="text-blue-800">
                  {formatDate(selectedCityData.stayWindow.arrival)} → {formatDate(selectedCityData.stayWindow.departure)} · {selectedCityData.stayWindow.nights} {selectedCityData.stayWindow.nights === 1 ? 'night' : 'nights'}
                </p>
                
                {/* Main Compass Icon - Top Right */}
                {hotelPriorityGuidance && (
                  <div className="absolute top-4 right-4 relative">
                    <motion.button
                      type="button"
                      onClick={() => setShowPriorityGuidance(!showPriorityGuidance)}
                      className="flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                      aria-label="Get hotel guidance"
                      initial={{ x: 0, y: 0, rotate: 0 }}
                      animate={
                        agentSuccessCount >= 2
                          ? {
                              scale: [1, 1.05, 1, 1.05, 1],
                              transition: {
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              },
                            }
                          : {
                              x: [0, -2, 2, -2, 2, -1, 1, 0],
                              y: [0, -1, 1, -1, 1, 0],
                              rotate: [0, -3, 3, -3, 3, 0],
                            }
                      }
                      transition={
                        agentSuccessCount >= 2
                          ? {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                          : {
                              duration: 2,
                              times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
                              ease: "easeInOut",
                              repeat: Infinity,
                              repeatDelay: 1,
                            }
                      }
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-lg shadow-orange-300/40">
                        <Compass className="w-6 h-6 text-white" />
                      </div>
                    </motion.button>
                    {/* Encouragement Message */}
                    {encouragementMessage && (
                      <AgentEncouragementMessage
                        message={encouragementMessage}
                        onDismiss={() => setEncouragementMessage(null)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Page-level Hotel Priority Guidance */}
            {hotelPriorityGuidance && showPriorityGuidance && (
              <section className="mb-6 p-4 rounded-xl bg-gradient-to-br from-[#FFF5F4] via-white to-[#FFF5F4] border border-[#FED7D2] shadow-sm">
                <p className={`text-sm text-[#4B5563] ${hotelPriorityGuidance.priorities.length > 0 ? 'mb-3' : ''}`}>
                  {hotelPriorityGuidance.brief}
                </p>
                {/* Watchful message after 4+ successes (once per session) */}
                {shouldShowWatchfulMsg && (
                  <p className="text-xs text-[#6B7280] italic mt-3 pt-3 border-t border-orange-200">
                    {getWatchfulMessage()}
                  </p>
                )}
                {/* Only render priorities if array is not empty */}
                {hotelPriorityGuidance.priorities.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {hotelPriorityGuidance.priorities.map((priority) => {
                      const isSelected = selectedHotelPriority === priority.id;
                      return (
                        <button
                          key={priority.id}
                          type="button"
                          onClick={() =>
                            setSelectedHotelPriority(
                              selectedHotelPriority === priority.id ? null : priority.id
                            )
                          }
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                            isSelected
                              ? 'bg-[#FE4C40] text-white border-[#FE4C40]'
                              : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#FE4C40]'
                          }`}
                        >
                          <div className="font-medium">{priority.label}</div>
                          <div className="text-[11px] opacity-80">{priority.helper}</div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Agent Pick Section - Shows after priority is selected */}
                {selectedHotelPriority && agentResolvedHotelSelection && (() => {
                  const resolvedHotel = selectedCityHotels.find((h: any) => h.id === agentResolvedHotelSelection.hotelId);
                  
                  if (!resolvedHotel) {
                    return null;
                  }

                  const { explanation, acceptedTradeoff } = generateHotelRecommendationExplanation(
                    agentResolvedHotelSelection.priorityUsed,
                    resolvedHotel
                  );

                  return (
                    <div className="mt-4 pt-4 border-t border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Compass className="w-5 h-5 text-orange-500" />
                        <h3 className="text-sm font-semibold text-[#1F2937]">WanderWise Agent Pick</h3>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-orange-200 mb-3">
                        <div className="font-medium text-[#1F2937] mb-2">{resolvedHotel.name}</div>
                        <p className="text-sm text-[#4B5563] mb-2 leading-relaxed">
                          {explanation}
                        </p>
                        <p className="text-xs text-[#6B7280] italic">
                          Accepted tradeoff: {acceptedTradeoff}
                        </p>
                      </div>
                      <button
                        onClick={() => !loading && handleHotelClick(resolvedHotel, selectedCityData)}
                        className="w-full px-4 py-2 bg-[#FE4C40] text-white font-medium rounded-lg hover:bg-[#E63C30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        Select this hotel
                      </button>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Hotel List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Hotels in {selectedCityData?.city}
              </h2>

              {selectedCityHotels.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No hotels found for this city.</p>
                </div>
              ) : (
                <>
                  {selectedCityHotels.map((hotel: any, index: number) => {
                  const totalPrice = hotel.pricePerNight 
                    ? hotel.pricePerNight * (selectedCityData?.stayWindow.nights || 1)
                    : null;
                  const exactMatch = hotel.exactMatch !== false; // Default to true if not specified
                  
                  // Check if this is the failed hotel
                  const isFailedHotel = bookingFailure && hotel.id === bookingFailure.hotelId;
                  // Check if this is an alternative hotel
                  const isAlternativeHotel = hotel.isAlternative === true;
                  // Check if this is the agent-resolved hotel
                  const isResolved = agentResolvedHotelSelection && hotel.id === agentResolvedHotelSelection.hotelId;

                  return (
                    <div key={hotel.id}>
                      <div
                        onClick={() => !loading && handleHotelClick(hotel, selectedCityData)}
                        className={`relative border-2 rounded-xl p-5 shadow-sm transition-all cursor-pointer ${
                          loading
                            ? 'opacity-50 cursor-not-allowed bg-white'
                            : isResolved
                            ? 'border-orange-300 bg-gradient-to-br from-orange-50/80 via-orange-50/60 to-orange-50/40 shadow-md ring-2 ring-orange-200/50'
                            : isFailedHotel
                            ? 'border-orange-300 bg-orange-50/30'
                            : isAlternativeHotel
                            ? 'border-blue-300 bg-blue-50/30'
                            : 'bg-white hover:border-[#FE4C40] hover:shadow-md'
                        }`}
                      >
                        {/* Resolved Hotel Visual Indicator - Top Right Compass Badge */}
                        {isResolved && (
                          <div className="absolute top-3 right-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-lg shadow-orange-300/40">
                              <Compass className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Alternative Hotel Label */}
                        {isAlternativeHotel && (
                          <div className="mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Info className="w-3 h-3 mr-1" />
                              Similar option nearby
                            </span>
                          </div>
                        )}
                        
                        {/* Failed Hotel Label */}
                        {isFailedHotel && (
                          <div className="mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Unavailable — see alternatives below
                            </span>
                          </div>
                        )}

                        {/* Hotel Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className={`text-lg font-semibold ${isResolved ? 'text-orange-900' : 'text-gray-900'}`}>
                                {hotel.name}
                              </h3>
                              {isResolved && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                                  <Compass className="w-3 h-3 mr-1.5" />
                                  Agent Pick
                                </span>
                              )}
                            </div>
                          {hotel.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className={`text-sm ${isResolved ? 'text-orange-800' : 'text-gray-600'}`}>
                                {hotel.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Availability Badge */}
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              exactMatch
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {exactMatch ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Fits itinerary
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Requires date adjustment
                              </div>
                            )}
                          </div>
                          {/* Availability Status Badge */}
                          {hotel.availabilityStatus && (
                            <div
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                hotel.availabilityStatus === 'unavailable'
                                  ? 'bg-red-100 text-red-800'
                                  : hotel.availabilityStatus === 'limited'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {hotel.availabilityStatus === 'unavailable'
                                ? 'Unavailable'
                                : hotel.availabilityStatus === 'limited'
                                ? 'Limited'
                                : 'Available'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Availability Warning for Low Confidence */}
                      {hotel.availabilityConfidence === 'low' && hotel.availabilityReason && (
                        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-xs font-medium text-orange-900 mb-1">
                                Availability risk
                              </div>
                              <p className="text-xs text-orange-800 leading-relaxed mb-2">
                                {hotel.availabilityReason}
                              </p>
                              {hotel.restrictions && hotel.restrictions.length > 0 && (
                                <p className="text-xs text-orange-700 italic">
                                  Consider: {hotel.restrictions[0]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Amenities */}
                      {hotel.amenities && hotel.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {hotel.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="flex items-end justify-between pt-3 border-t border-gray-200">
                        <div>
                          {hotel.pricePerNight && (
                            <div className={`text-sm ${isResolved ? 'text-orange-800' : 'text-gray-600'}`}>
                              ${hotel.pricePerNight.toLocaleString()}
                              <span className="text-xs">/night</span>
                            </div>
                          )}
                          {totalPrice && (
                            <div className={`text-lg font-semibold mt-1 ${isResolved ? 'text-orange-900' : 'text-gray-900'}`}>
                              ${totalPrice.toLocaleString()} total
                            </div>
                          )}
                        </div>
                        <div className={`font-medium ${isResolved ? 'text-orange-600' : 'text-[#FE4C40]'}`}>
                          {isResolved ? (
                            <span className="flex items-center gap-1">
                              <Compass className="w-4 h-4" />
                              Agent Pick →
                            </span>
                          ) : (
                            'Select →'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Resolved Hotel Confirmation Copy */}
                    {isResolved && agentResolvedHotelSelection && (() => {
                      const { explanation } = generateHotelRecommendationExplanation(
                        agentResolvedHotelSelection.priorityUsed,
                        hotel
                      );
                      return (
                        <div className="mt-3 pl-3 pr-3 py-2 text-xs text-orange-700 italic border-l-2 border-orange-300 bg-orange-50/40 rounded-r">
                          {explanation}
                        </div>
                      );
                    })()}
                    
                    {/* Same Hotel Alternative Options */}
                    {isFailedHotel && bookingFailure?.alternatives?.sameHotelRoomTypes && bookingFailure.alternatives.sameHotelRoomTypes.length > 0 && (
                      <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-300">
                        <div className="text-xs font-medium text-gray-700 mb-2">Try a different option in the same hotel:</div>
                        <div className="space-y-2">
                          {bookingFailure.alternatives.sameHotelRoomTypes.map((roomType: string, roomIndex: number) => (
                            <button
                              key={roomIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                // For MVP, clicking alternative option navigates to impact with modified hotel
                                // In a real system, this would create a new hotel constraint with the specific option
                                const roomTypeHotel = {
                                  ...hotel,
                                  id: `${hotel.id}-${roomType.toLowerCase().replace(/\s+/g, '-')}`,
                                  name: `${hotel.name} - ${roomType}`,
                                };
                                handleHotelClick(roomTypeHotel, selectedCityData);
                              }}
                              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                            >
                              <div className="text-sm font-medium text-gray-900">{roomType}</div>
                              <div className="text-xs text-gray-600">Alternative option in this hotel</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  );
                })}
                </>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </main>
      
      {/* Impact Review Modal */}
      {impactModalData && (
        <HotelImpactModal
          isOpen={showImpactModal}
          onClose={handleModalClose}
          onApprove={handleModalApprove}
          onChooseDifferent={handleModalChooseDifferent}
          hotelImpactResult={impactModalData.impactResult}
          selectedHotel={impactModalData.hotel}
          baselineStay={impactModalData.baselineStay}
          candidateStay={impactModalData.candidateStay}
          isApproving={isApproving}
        />
      )}
    </>
  );
}

export default function HotelOptionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HotelOptionsPageContent />
    </Suspense>
  );
}

