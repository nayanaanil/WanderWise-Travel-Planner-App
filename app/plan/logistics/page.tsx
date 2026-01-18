"use client";

import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { routes } from '@/lib/navigation';
import { getTripState, DraftItinerary, saveTripState } from '@/lib/tripState';
import { getItineraryImagePath as resolveItineraryImagePath } from '@/lib/itineraryImages';
import { MapPin, ArrowRight, Plane, Building2, Map as MapIcon, ChevronDown, ChevronUp, Train, Car, Bus, ArrowLeft, Calendar, Users, Star, ChevronRight, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { RouteReader, type RouteStep } from '@/lib/phase2/RouteReader';
import { getCityCoordinates } from './utils/cityCoordinates';
import type { TimeSlot } from '@/lib/decisions/activityDecisionEngine';

// Helper to get slots based on pace
function getSlotsForPace(pace: string | undefined): string[] {
  // Simplified to Day/Night only
  if (pace === 'relaxed') return ['day'];
  if (pace === 'moderate') return ['day', 'night'];
  if (pace === 'packed') return ['day', 'night'];
  // Default to moderate if pace is not recognized
  return ['day', 'night'];
}

/**
 * Helper mapping for travel style IDs to copy phrases
 */
const TAG_COPY_MAP: Record<string, string> = {
  'adventure': 'active exploration',
  'cultural': 'cultural exploration',
  'photography': 'scenic photography',
  'shopping': 'local shopping',
  'foodie': 'food-focused experiences',
  'relaxation': 'unhurried downtime',
  // Fallback mappings for capitalized keys (if they exist)
  'Culture': 'cultural exploration',
  'Photography': 'scenic photography',
  'Shopping': 'local shopping',
  'Foodie': 'food-focused experiences',
  'Nature': 'natural landscapes',
  'Adventure': 'active exploration',
  'Relaxation': 'unhurried downtime',
};

/**
 * Generate a deterministic summary sentence explaining the itinerary
 */
function generateTripSummarySentence({
  destination,
  durationDays,
  pace,
  tags
}: {
  destination: string;
  durationDays: number;
  pace: string | undefined;
  tags: string[];
}) {
  const intent = tags
    .filter(tag => TAG_COPY_MAP[tag])
    .slice(0, 3)
    .map(tag => TAG_COPY_MAP[tag])
    .join(', ');

  // Map pace values: 'moderate' -> 'balanced', others as specified
  const paceCopy =
    pace === 'relaxed'
      ? 'a relaxed, unhurried pace'
      : pace === 'moderate' || pace === 'balanced'
      ? 'a balanced, well-paced rhythm'
      : pace === 'packed'
      ? 'a packed, experience-rich pace'
      : 'a thoughtful pace'; // Fallback for unknown pace values

  // Only show intent if we have tags, otherwise simplify
  if (!intent) {
    return `A thoughtfully curated ${durationDays}-day ${destination} journey, designed for ${paceCopy}.`;
  }

  return `A thoughtfully curated ${durationDays}-day ${destination} journey focused on ${intent}, designed for ${paceCopy}.`;
}

/**
 * Logistics Page - Phase 2 Route Display
 * 
 * This page:
 * - Displays Phase 2 structural route (immutable)
 * - Shows timeline derived from Phase 2 output (derived-driven, not leg-driven)
 * - Infers stays from derived.arrivalDates and derived.departureDates only
 * - Displays inbound slack days warning
 * 
 * Timeline rendering rules:
 * - A stay exists if and only if both arrival and departure dates exist and departure > arrival
 * - Never infers stays from groundRoute.role (BASE/TRANSFER)
 * - Gateway cities may have stays if derived dates indicate so
 * - Flights use flight dates directly
 * 
 * This page does NOT:
 * - Recompute routes
 * - Use draft itinerary cities (uses Phase 2 output only)
 * - Allow route modifications
 */
/**
 * Helper function to get itinerary hero image URL for logistics.
 * Delegates to the shared Blob-backed resolver in `lib/itineraryImages.ts`.
 */
function getItineraryImagePath(
  itinerary: DraftItinerary & { theme?: string; themeSlug?: string; primaryCountryCode?: string; imageFolder?: string },
  imageIndex: number
): string {
  // Legacy filesystem-based paths (now replaced by Blob-backed itineraryImageMap):
  // - /public/itinerary-images/_themes/${themeSlug}/${imageIndex}.jpg
  // - /public/itinerary-images/${imageFolder}/${imageIndex}.jpg
  // - /public/itinerary-images/${primaryCountryCode}/${imageIndex}.jpg
  // - /public/itinerary-images/_default/1.jpg
  //
  // All resolution now flows through the shared image map utility.
  return resolveItineraryImagePath(
    {
      themeSlug: (itinerary as any).themeSlug,
      theme: (itinerary as any).theme,
      imageFolder: itinerary.imageFolder,
      primaryCountryCode: itinerary.primaryCountryCode,
    },
    imageIndex
  );
}

/**
 * Helper function to get city thumbnail image path
 * Uses similar logic to itinerary images but for individual cities
 */
function getCityThumbnailPath(cityName: string, tripState: any): string {
  // Legacy filesystem-based thumbnails (now replaced by Blob-backed itineraryImageMap):
  // - /public/itinerary-images/${destination.city.countryCode}/1.jpg
  // - /public/itinerary-images/_default/1.jpg
  //
  // Use the shared image resolver, preferring the trip's primaryCountryCode when available.
  const destination = tripState.destination;
  const primaryCountryCode = destination?.city?.countryCode;

  return resolveItineraryImagePath(
    {
      primaryCountryCode,
    },
    1
  );
}

export default function LogisticsPage() {
  const router = useRouter();
  const [structuralRoute, setStructuralRoute] = useState<any>(null);
  const [selectedDraftItinerary, setSelectedDraftItinerary] = useState<DraftItinerary | null>(null);
  const [tripState, setTripState] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [allDaysExpanded, setAllDaysExpanded] = useState(true); // Default: expand all days
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null); // For post-action feedback
  const activitiesPrefetchedRef = useRef(false); // Guard for activity prefetch
  const [showCTA, setShowCTA] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  // Store activities as plain object: { [date: string]: { day?: Activity, night?: Activity } }
  type Activity = { id: string; name: string; timeSlot: TimeSlot; duration?: number; activityName?: string };
  type DayActivities = {
    [date: string]: {
      day?: Activity;
      night?: Activity;
    };
  };
  // Initialize from sessionStorage to persist across remounts
  const [dayActivities, setDayActivities] = useState<DayActivities>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('dayActivities');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('[Logistics] Failed to load activities from sessionStorage:', e);
      }
    }
    return {};
  });
  
  // Persist to sessionStorage whenever activities change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dayActivities', JSON.stringify(dayActivities));
      } catch (e) {
        console.warn('[Logistics] Failed to save activities to sessionStorage:', e);
      }
    }
  }, [dayActivities]);
  const timelineRefs = useRef<{ [city: string]: HTMLDivElement | null }>({});
  const timelineSectionRef = useRef<HTMLDivElement | null>(null);
  const daywisePlanHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const landingSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentTripState = getTripState();
    
    // Guard: Check phase is ROUTE_READY
    if (currentTripState.phase !== 'ROUTE_READY') {
      console.warn('[Logistics] Phase is not ROUTE_READY, redirecting to flights');
      router.push(routes.bookings.flights.index);
      return;
    }

    // Guard: Check for structuralRoute
    if (!currentTripState.structuralRoute) {
      console.warn('[Logistics] No structuralRoute found, redirecting to flights');
      router.push(routes.bookings.flights.index);
      return;
    }

    // Get selected draft itinerary for hero image
    const selectedId = currentTripState.selectedDraftItineraryId;
    if (selectedId && currentTripState.draftItineraries) {
      const selected = currentTripState.draftItineraries.find((it: DraftItinerary) => it.id === selectedId);
      if (selected) {
        setSelectedDraftItinerary(selected);
      }
    }

    setTripState(currentTripState);
    setStructuralRoute(currentTripState.structuralRoute);
    setIsHydrated(true);
  }, [router]);


  // Scroll detection for progressive CTA and scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      // Check if user scrolled past landing section
      if (landingSectionRef.current) {
        const landingRect = landingSectionRef.current.getBoundingClientRect();
        setShowScrollIndicator(landingRect.bottom > window.innerHeight);
      }

      // Check if user scrolled into timeline section (for CTA)
      if (timelineSectionRef.current) {
        const rect = timelineSectionRef.current.getBoundingClientRect();
        const isTimelineVisible = rect.top < window.innerHeight * 0.7;
        setShowCTA(isTimelineVisible);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHydrated]);


  // Load activities from URL params on mount (if returning from activities page)
  // Use a ref to ensure we only process URL params once per navigation
  const urlParamsProcessedRef = useRef<string>('');
  
  useEffect(() => {
    // Only check URL params if component is hydrated - tripState is not needed for URL param processing
    if (!isHydrated) return;
    
    // Check for recently applied hotel (set by hotel impact page via sessionStorage)
    const recentlyAppliedHotel = sessionStorage.getItem('recentlyAppliedHotel');
    if (recentlyAppliedHotel) {
      try {
        const { city, hotelId } = JSON.parse(recentlyAppliedHotel);
        
        // Clear the flag immediately
        sessionStorage.removeItem('recentlyAppliedHotel');
        
        // Find the day where this hotel appears (first day of stay in this city)
        const sortedEntries = Array.from(dayUnits.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [date, units] of sortedEntries) {
          const stayDayUnits = units.filter((u): u is DayUnit & { kind: 'STAY_DAY' } => u.kind === 'STAY_DAY');
          const firstDayOfStay = stayDayUnits.some(u => u.kind === 'STAY_DAY' && u.dayIndexInStay === 1);
          const cityName = stayDayUnits.length > 0 ? stayDayUnits[0].city : null;
          
          if (firstDayOfStay && cityName?.toLowerCase().trim() === city.toLowerCase().trim()) {
            // Scroll to this day
            setTimeout(() => {
              const dayElement = document.getElementById(`day-${date}`);
              if (dayElement) {
                dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setExpandedDayId(`day-${date}`);
                // Highlight the hotel card
                setHighlightedCard(`${date}-hotel-${hotelId}`);
                setTimeout(() => setHighlightedCard(null), 1500);
              }
            }, 100);
            break;
          }
        }
      } catch (e) {
        console.error('[Logistics] Error processing recently applied hotel:', e);
      }
    }
    
    // Check URL params for scheduled activity (from activities selection page)
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action'); // Check for composite actions like MOVE_AND_ADD
    
    // PART 4: Handle MOVE_AND_ADD composite action
    if (action === 'MOVE_AND_ADD') {
      const moveActivityId = params.get('moveActivityId');
      const moveActivityName = params.get('moveActivityName');
      const moveToSlot = params.get('moveToSlot');
      const addActivityId = params.get('addActivityId');
      const addToSlot = params.get('addToSlot');
      const addActivityName = params.get('addActivityName');
      const scheduledDate = params.get('scheduledDate');
      
      if (moveActivityId && moveToSlot && addActivityId && addToSlot && addActivityName && scheduledDate) {
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        setDayActivities(prev => {
          if (!prev || typeof prev !== 'object') {
            prev = {};
          }
          
          const existingDay = prev[scheduledDate] || {};
          
          // Find the activity to move
          const activityToMove = existingDay.day?.id === moveActivityId ? existingDay.day :
                                 existingDay.night?.id === moveActivityId ? existingDay.night :
                                 null;
          
          if (!activityToMove) {
            console.error('[Logistics] Activity to move not found:', moveActivityId);
            return prev; // Don't update if activity not found
          }
          
          // Create updated day object
          const updatedDay: { day?: Activity; night?: Activity } = {};
          
          // Preserve activities not being moved
          if (existingDay.day && existingDay.day.id !== moveActivityId) {
            updatedDay.day = existingDay.day;
          }
          if (existingDay.night && existingDay.night.id !== moveActivityId) {
            updatedDay.night = existingDay.night;
          }
          
          // Move the existing activity to new slot
          const moveToSlotKey = moveToSlot as 'day' | 'night';
          const newTimeSlot: TimeSlot = moveToSlot as TimeSlot;
          updatedDay[moveToSlotKey] = {
            ...activityToMove,
            timeSlot: newTimeSlot,
          };
          
          // Add the new activity to its slot
          const addToSlotKey = addToSlot as 'day' | 'night';
          const timeSlotForStorage: TimeSlot = addToSlot as TimeSlot;
          updatedDay[addToSlotKey] = {
            id: addActivityId,
            name: addActivityName,
            activityName: addActivityName,
            timeSlot: timeSlotForStorage,
          };
          
          return {
            ...prev,
            [scheduledDate]: updatedDay,
          };
        });
        
        // Scroll to the day and highlight
        setTimeout(() => {
          const dayElement = document.getElementById(`day-${scheduledDate}`);
          if (dayElement) {
            dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setExpandedDayId(`day-${scheduledDate}`);
            // Highlight the newly added activity card
            setHighlightedCard(`${scheduledDate}-${addActivityId}`);
            setTimeout(() => setHighlightedCard(null), 1500); // Remove highlight after 1.5s
          }
        }, 100);
        
            return;
      }
    }
    
    // PART 5: Handle SWAP_ACTIVITIES action (for high-effort day-swap suggestions)
    if (action === 'SWAP_ACTIVITIES') {
      const activity1Id = params.get('activity1Id');
      const activity1NewDate = params.get('activity1NewDate');
      const activity1NewSlot = params.get('activity1NewSlot');
      const activity2Id = params.get('activity2Id');
      const activity2NewDate = params.get('activity2NewDate');
      const activity2NewSlot = params.get('activity2NewSlot');
      const activity1Name = params.get('activity1Name'); // Name of the high-effort activity being selected
      
      if (activity1Id && activity1NewDate && activity1NewSlot && activity2Id && activity2NewDate && activity2NewSlot && activity1Name) {
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        setDayActivities(prev => {
          if (!prev || typeof prev !== 'object') {
            prev = {};
          }
          
          // activity1 (high-effort) is the NEW activity being selected for activity2NewDate (original day)
          // activity2 (lower-effort) is already scheduled on activity1NewDate (the other day)
          // After swap:
          // - activity1 goes to activity1NewDate (where activity2 currently is)
          // - activity2 goes to activity2NewDate (the original day)
          
          const dayWithActivity2 = prev[activity1NewDate] || {}; // Day where activity2 currently is
          const originalDay = prev[activity2NewDate] || {}; // Original day where activity1 was being scheduled
          
          // Find activity2 (lower-effort activity) from the day it's currently on
          // Check both slots to find where activity2 is
          const activity2 = dayWithActivity2.day?.id === activity2Id ? dayWithActivity2.day :
                           dayWithActivity2.night?.id === activity2Id ? dayWithActivity2.night :
                           null;
          
          if (!activity2) {
            console.error('[Logistics] Activity to swap not found:', activity2Id);
            return prev; // Don't update if activity not found
          }
          
          // Create updated day objects
          const updatedDayWithActivity2: { day?: Activity; night?: Activity } = {};
          const updatedOriginalDay: { day?: Activity; night?: Activity } = {};
          
          // Preserve activities not being swapped in dayWithActivity2 (where activity2 currently is)
          if (dayWithActivity2.day && dayWithActivity2.day.id !== activity2Id) {
            updatedDayWithActivity2.day = dayWithActivity2.day;
          }
          if (dayWithActivity2.night && dayWithActivity2.night.id !== activity2Id) {
            updatedDayWithActivity2.night = dayWithActivity2.night;
          }
          
          // Preserve activities not being swapped in originalDay
          if (originalDay.day) {
            updatedOriginalDay.day = originalDay.day;
          }
          if (originalDay.night) {
            updatedOriginalDay.night = originalDay.night;
          }
          
          // Place activity1 (high-effort, NEW) in dayWithActivity2 at activity1NewSlot (replacing activity2)
          // activity1NewSlot is the slot where activity2 currently is
          const activity1SlotKey = activity1NewSlot as 'day' | 'night';
          updatedDayWithActivity2[activity1SlotKey] = {
            id: activity1Id,
            name: activity1Name,
            activityName: activity1Name,
            timeSlot: activity1NewSlot as TimeSlot,
          };
          
          // Place activity2 (lower-effort, MOVED) in originalDay at activity2NewSlot
          const activity2SlotKey = activity2NewSlot as 'day' | 'night';
          updatedOriginalDay[activity2SlotKey] = {
            ...activity2,
            timeSlot: activity2NewSlot as TimeSlot,
          };
          
          return {
            ...prev,
            [activity1NewDate]: updatedDayWithActivity2, // activity2 removed, activity1 added
            [activity2NewDate]: updatedOriginalDay, // activity2 added
          };
        });
        
        // Scroll to the day and highlight
        setTimeout(() => {
          const dayElement = document.getElementById(`day-${activity1NewDate}`);
          if (dayElement) {
            dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setExpandedDayId(`day-${activity1NewDate}`);
            // Highlight the swapped activity card
            setHighlightedCard(`${activity1NewDate}-${activity1Id}`);
            setTimeout(() => setHighlightedCard(null), 1500);
          }
        }, 100);
        
        return;
      }
    }

    // PART 6: Handle SMART_REORDER action (for smart reorder suggestions)
    if (action === 'SMART_REORDER') {
      const activityId = params.get('activityId');
      const targetDate = params.get('targetDate');
      const targetSlot = params.get('targetSlot');
      const movesParam = params.get('moves');
      
      if (activityId && targetDate && targetSlot) {
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        setDayActivities(prev => {
          if (!prev || typeof prev !== 'object') {
            prev = {};
          }
          
          const updated = { ...prev };
          
          // Parse moves if provided
          let moves: Array<{ activityId: string; fromDate: string; fromSlot: string; toDate: string; toSlot: string }> = [];
          if (movesParam) {
            try {
              moves = JSON.parse(movesParam);
            } catch (e) {
              console.error('[Logistics] Failed to parse moves:', e);
            }
          }
          
          // Apply all moves first (rearrange existing activities)
          for (const move of moves) {
            const fromDay = updated[move.fromDate] || {};
            const toDay = updated[move.toDate] || {};
            
            // Find the activity being moved
            const activityToMove = fromDay.day?.id === move.activityId ? fromDay.day :
                                 fromDay.night?.id === move.activityId ? fromDay.night :
                                 null;
            
            if (activityToMove) {
              // Remove from source slot
              const updatedFromDay: { day?: any; night?: any } = {};
              if (fromDay.day && fromDay.day.id !== move.activityId) {
                updatedFromDay.day = fromDay.day;
              }
              if (fromDay.night && fromDay.night.id !== move.activityId) {
                updatedFromDay.night = fromDay.night;
              }
              updated[move.fromDate] = updatedFromDay;
              
              // Add to target slot
              const updatedToDay = { ...toDay };
              const targetSlotKey = move.toSlot as 'day' | 'night';
              updatedToDay[targetSlotKey] = {
                ...activityToMove,
                timeSlot: targetSlotKey,
              };
              updated[move.toDate] = updatedToDay;
            }
          }
          
          // Finally, add the new activity to target date/slot
          const targetDay = updated[targetDate] || {};
          const targetSlotKey = targetSlot as 'day' | 'night';
          
          // Get activity name from tripState or use a placeholder
          const tripState = getTripState();
          const allActivities = tripState?.generatedActivitiesByCity || {};
          const cityActivities = Object.values(allActivities).flat();
          const activityDetails = cityActivities.find((a: any) => a.id === activityId);
          const activityName = activityDetails?.name || 'Activity';
          
          updated[targetDate] = {
            ...targetDay,
            [targetSlotKey]: {
              id: activityId,
              name: activityName,
              activityName: activityName,
              timeSlot: targetSlot,
            },
          };
          
          return updated;
        });
        
        // Scroll to the day and highlight
        setTimeout(() => {
          const dayElement = document.getElementById(`day-${targetDate}`);
          if (dayElement) {
            dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setExpandedDayId(`day-${targetDate}`);
            // Highlight the newly added activity card
            setHighlightedCard(`${targetDate}-${activityId}`);
            setTimeout(() => setHighlightedCard(null), 1500);
          }
        }, 100);
        
        return;
      }
    }
    
    // Standard single-activity actions
    const scheduledActivity = params.get('scheduledActivity');
    const scheduledDate = params.get('scheduledDate');
    const scheduledSlot = params.get('scheduledSlot'); // This is the timeSlot (day/night)
    const scheduledSlotName = params.get('slot'); // This is the slot name (day/night)
    const scheduledName = params.get('scheduledName');
    const removeActivity = params.get('removeActivity');
    
    // Create a unique key for this set of params to prevent double-processing
    const paramKey = scheduledActivity && scheduledDate && scheduledSlotName 
      ? `${scheduledActivity}-${scheduledDate}-${scheduledSlotName}` 
      : '';
    
    if (scheduledActivity && scheduledDate && scheduledSlot && scheduledName && scheduledSlotName) {
      // Prevent processing the same params twice
      if (urlParamsProcessedRef.current === paramKey) {
          return;
        }

      // Mark these params as processed BEFORE state update
      urlParamsProcessedRef.current = paramKey;
      
      // Validate slot name
      const validSlots = ['day', 'night'];
      if (!validSlots.includes(scheduledSlotName)) {
        console.error('[Logistics] Invalid slot name:', scheduledSlotName);
        urlParamsProcessedRef.current = ''; // Reset on error
        return;
      }

      // Clear URL params IMMEDIATELY to prevent re-processing
      window.history.replaceState({}, '', window.location.pathname);

      // CRITICAL FIX: Use functional update to ensure we always have the latest state
      // This prevents race conditions where prev might be stale
      setDayActivities(prev => {
        // CRITICAL: Verify prev is an object (should never be null/undefined with useState)
        if (!prev || typeof prev !== 'object') {
          console.error('[ActivityWrite] Invalid previous state:', prev);
          prev = {};
        }
        
        // Get existing activities for this day - CRITICAL: preserve all existing slots
        const existingDay = prev[scheduledDate] || {};
        
        // Map slot name directly to TimeSlot (now simplified to day/night)
        const timeSlotForStorage: TimeSlot = scheduledSlot as TimeSlot;
        
        // Build the new activity object
        const newActivity: Activity = {
          id: scheduledActivity,
          name: scheduledName,
          activityName: scheduledName,
          timeSlot: timeSlotForStorage,
        };
        
        // Handle REPLACE_ACTIVITY action - find and remove the activity from any slot
        let updatedDay: { day?: Activity; night?: Activity } = { ...existingDay };
        if (removeActivity) {
          // Create a new day object excluding the activity to remove
          updatedDay = {};
          if (existingDay.day && existingDay.day.id !== removeActivity) {
            updatedDay.day = existingDay.day;
          }
          if (existingDay.night && existingDay.night.id !== removeActivity) {
            updatedDay.night = existingDay.night;
          }
        }
        
        // CRITICAL: Deep merge to preserve ALL existing state
        // Step 1: Spread all existing dates (preserves activities for other days)
        // Step 2: For the target date, spread existing slots (preserves other slots)
        // Step 3: Set only the target slot
        const newState: DayActivities = {
          ...prev,  // Preserve all other dates
          [scheduledDate]: {
            ...updatedDay,  // Preserve all other slots in this date
            [scheduledSlotName]: newActivity,  // Update only the target slot
          },
        };
        
        return newState;
      });
      
      // Scroll to the day after a short delay and highlight
      setTimeout(() => {
        const dayElement = document.getElementById(`day-${scheduledDate}`);
        if (dayElement) {
          dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Expand the day
          setExpandedDayId(`day-${scheduledDate}`);
          // Highlight the newly added activity card
          setHighlightedCard(`${scheduledDate}-${scheduledActivity}`);
          setTimeout(() => setHighlightedCard(null), 2000); // Remove highlight after 2s
        }
      }, 100);
        } else {
      // Reset the processed ref when there are no URL params (allows processing new params)
      if (urlParamsProcessedRef.current !== '') {
        urlParamsProcessedRef.current = '';
        }
      }
  }, [isHydrated]); // Removed tripState dependency - not needed for URL param processing

  // Prefetch activities for all cities on page load
  useEffect(() => {
    if (!isHydrated || !tripState || !structuralRoute || activitiesPrefetchedRef.current) return;
    
    // We need to extract cities, but dayUnits is computed inline below
    // Instead, compute unique cities from structuralRoute directly
    const uniqueCities = new Set<string>();
    
    if (structuralRoute.groundRoute) {
      // Extract cities from groundRoute
      const allCities = new Set<string>();
      allCities.add(structuralRoute.outboundFlight.toCity);
      structuralRoute.groundRoute.forEach((leg: { fromCity: string; toCity: string }) => {
        allCities.add(leg.fromCity);
        allCities.add(leg.toCity);
      });
      allCities.add(structuralRoute.inboundFlight.fromCity);
      
      uniqueCities.clear();
      allCities.forEach(city => uniqueCities.add(city.toLowerCase().trim()));
    }
    
    if (uniqueCities.size === 0) return;
    
    // Mark as prefetched to prevent duplicate calls
    activitiesPrefetchedRef.current = true;
    
    // Get user context for personalization
    const userContext = {
      interests: (tripState as any).interests || tripState.styles || [],
      groupSize: (tripState.adults || 0) + (tripState.kids || 0),
      tripType: tripState.tripType as 'leisure' | 'romantic' | 'family' | 'adventure' | undefined,
    };
    
    const pace = tripState.preferences?.pace || tripState.pace || 'moderate';
    
    // Prefetch activities for all cities in parallel
    const existingActivities = tripState.generatedActivitiesByCity || {};
    const citiesToFetch = Array.from(uniqueCities).filter(city => !existingActivities[city]);
    
    if (citiesToFetch.length === 0) {
      console.log('[Logistics] All city activities already cached');
      return;
    }
    
    console.log('[Logistics] Prefetching activities for cities:', citiesToFetch);
    
    // Mark prefetch as in progress
    saveTripState({
      activityPrefetchStatus: 'in_progress',
    });
    
    Promise.all(
      citiesToFetch.map(async (city) => {
        try {
          const response = await fetch('/api/agent/generate-activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city,
              pace,
              userContext,
            }),
          });
          
          if (!response.ok) {
            console.error(`[Logistics] Failed to fetch activities for ${city}`);
            return null;
          }
          
          const data = await response.json();
          return { city, activities: data.activities };
        } catch (error) {
          console.error(`[Logistics] Error fetching activities for ${city}:`, error);
          return null;
        }
      })
    ).then((results) => {
      // Update tripState with all fetched activities
      const currentState = getTripState();
      const updatedActivities = { ...(currentState.generatedActivitiesByCity || {}) };
      
      results.forEach((result) => {
        if (result && result.activities) {
          updatedActivities[result.city] = result.activities;
        }
      });
      
      saveTripState({
        generatedActivitiesByCity: updatedActivities,
        activityPrefetchStatus: 'complete', // Mark prefetch as complete
      });
      
      console.log('[Logistics] Activities prefetched and cached for', Object.keys(updatedActivities).length, 'cities');
    }).catch((error) => {
      // Handle prefetch failure gracefully
      console.error('[Logistics] Prefetch failed:', error);
      saveTripState({
        activityPrefetchStatus: 'idle', // Reset to allow fallback
      });
    });
  }, [isHydrated, tripState, structuralRoute]);

  const handleBack = () => {
    router.push(routes.bookings.flights.options);
  };


  const handleContinueToBookings = () => {
    console.log('[STATE_BEFORE_BOOKINGS_NAV]', getTripState());
    router.push(routes.bookings.dashboard);
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Build timeline steps using RouteReader (strict Phase 2 interpretation)
  // RouteReader is the single source of truth - no sorting, no merging, no inference
  const buildTimelineSteps = () => {
    if (!structuralRoute) return [];
    const reader = new RouteReader(structuralRoute);
    return Array.from(reader.steps());
  };

  /**
   * Day-wise plan structure
   */
  type DayPlan = {
    dayIndex: number;        // 1-based (Day 1, Day 2, ...)
    date: string;            // ISO date (YYYY-MM-DD)
    label: string;           // "Day 1"
    steps: RouteStep[];      // ordered steps for that day
  };

  /**
   * DayUnit - Normalized renderable unit for a single calendar day
   * Expands multi-night STAY steps into per-day units
   */
  type DayUnit =
    | {
        kind: 'FLIGHT';
        step: RouteStep & ({ kind: 'OUTBOUND_FLIGHT' } | { kind: 'INBOUND_FLIGHT' });
        date: string;
      }
    | {
        kind: 'TRAVEL';
        step: RouteStep & { kind: 'TRAVEL' };
        date: string;
      }
    | {
        kind: 'STAY_DAY';
        city: string;
        date: string;
        dayIndexInStay: number;    // 1-based (Day 1 of stay, Day 2 of stay, etc.)
        totalDaysInStay: number;
        originalStay: RouteStep & { kind: 'STAY' };
      };

  /**
   * Build day-wise plan structure from flat timeline steps
   * Groups steps by calendar day while preserving original order
   */
  function buildDayPlans(steps: RouteStep[]): DayPlan[] {
    if (steps.length === 0) return [];

    // Map to group steps by date (YYYY-MM-DD)
    const stepsByDate = new Map<string, RouteStep[]>();
    let currentDate: string | null = null;

    for (const step of steps) {
      let stepDate: string | null = null;

      // Assign date based on step type
      if (step.kind === 'OUTBOUND_FLIGHT') {
        // Outbound flight assigned to its date (Day 1)
        stepDate = step.date;
        currentDate = stepDate;
      } else if (step.kind === 'STAY') {
        // STAY steps assigned ONLY to arrival date - never duplicated across days
        // A multi-night stay appears only on the day it starts
        stepDate = step.arrival;
        // Update currentDate for subsequent TRAVEL steps, but STAY itself only goes to arrival day
        currentDate = stepDate;
      } else if (step.kind === 'INBOUND_FLIGHT') {
        // Inbound flight assigned to its date
        stepDate = step.date;
        currentDate = stepDate;
      } else if (step.kind === 'TRAVEL') {
        // TRAVEL has no date - inherit from previous step's currentDate
        stepDate = currentDate;
      }

      // Ensure we have a valid date (should never be null after first step)
      if (!stepDate) {
        console.warn('[buildDayPlans] Step without date:', step);
        continue;
      }

      // Normalize date to YYYY-MM-DD format (in case it includes time)
      const normalizedDate = stepDate.split('T')[0];

      // Add step to the date group exactly once
      // Each step appears in exactly one day bucket
      if (!stepsByDate.has(normalizedDate)) {
        stepsByDate.set(normalizedDate, []);
      }
      stepsByDate.get(normalizedDate)!.push(step);
    }

    // Convert map to sorted array of DayPlan objects
    // Steps within each day maintain their original order
    const sortedDates = Array.from(stepsByDate.keys()).sort();
    
    return sortedDates.map((date, index) => ({
      dayIndex: index + 1,
      date,
      label: `Day ${index + 1}`,
      steps: stepsByDate.get(date)!,
    }));
  }

  /**
   * Helper to add days to a date string (YYYY-MM-DD)
   */
  function addDaysToDate(dateStr: string, days: number): string {
    const date = new Date(dateStr + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Build normalized day units from day plans
   * Expands multi-night STAY steps into per-day STAY_DAY units
   */
  function buildDayUnits(dayPlans: DayPlan[]): Map<string, DayUnit[]> {
    const unitsByDate = new Map<string, DayUnit[]>();

    // First pass: collect all STAY steps and expand them into per-day units
    const stayExpansions = new Map<string, DayUnit[]>();
    
    for (const dayPlan of dayPlans) {
      for (const step of dayPlan.steps) {
        if (step.kind === 'STAY') {
          // Expand multi-night STAY into STAY_DAY units for each calendar day
          const arrivalDate = step.arrival.split('T')[0];
          const departureDate = step.departure.split('T')[0];
          const totalDays = step.nights;

          // Generate STAY_DAY units for each day from arrival to departure-1
          for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
            const stayDayDate = addDaysToDate(arrivalDate, dayOffset);
            const dayIndexInStay = dayOffset + 1;

            // Ensure date bucket exists
            if (!stayExpansions.has(stayDayDate)) {
              stayExpansions.set(stayDayDate, []);
            }

            // Add STAY_DAY unit for this calendar day
            stayExpansions.get(stayDayDate)!.push({
              kind: 'STAY_DAY',
              city: step.city,
              date: stayDayDate,
              dayIndexInStay,
              totalDaysInStay: totalDays,
              originalStay: step,
            });
          }
        }
      }
    }

    // Track the most recent STAY step and flight dates for TRAVEL assignment
    let lastStayStep: (RouteStep & { kind: 'STAY' }) | null = null;
    let outboundFlightDate: string | null = null;
    let inboundFlightDate: string | null = null;

    // Second pass: process all steps in order to collect FLIGHT and TRAVEL units with correct dates
    // First, collect all non-STAY units with their correct dates
    const flightUnits: Array<{ unit: DayUnit; date: string }> = [];
    const travelUnits: Array<{ unit: DayUnit; date: string }> = [];

    for (const dayPlan of dayPlans) {
      const dayDate = dayPlan.date;

      // Process steps in original order
      for (const step of dayPlan.steps) {
        if (step.kind === 'OUTBOUND_FLIGHT' || step.kind === 'INBOUND_FLIGHT') {
          // Track flight dates for TRAVEL assignment special cases
          if (step.kind === 'OUTBOUND_FLIGHT') {
            outboundFlightDate = step.date.split('T')[0];
          } else {
            inboundFlightDate = step.date.split('T')[0];
          }

          // Create FLIGHT unit
          flightUnits.push({
            unit: {
              kind: 'FLIGHT',
              step: step as RouteStep & ({ kind: 'OUTBOUND_FLIGHT' } | { kind: 'INBOUND_FLIGHT' }),
              date: dayDate,
            },
            date: dayDate,
          });
        } else if (step.kind === 'TRAVEL') {
          // TRAVEL date assignment logic:
          // 1. If a previous STAY exists, use its departure date
          // 2. If no previous STAY (before first STAY), use outbound flight date
          // 3. If after last STAY (before inbound flight), use inbound flight date
          let travelDate: string;

          if (lastStayStep) {
            // Use departure date of the immediately preceding STAY
            travelDate = lastStayStep.departure.split('T')[0];
          } else if (outboundFlightDate) {
            // Before first STAY (airport → first city transfer)
            travelDate = outboundFlightDate;
          } else if (inboundFlightDate) {
            // After last STAY (last city → airport transfer)
            travelDate = inboundFlightDate;
          } else {
            // Fallback to dayPlan date (should not happen, but safe)
            travelDate = dayDate;
          }

          // Debug log for transfer assignment
          console.debug(
            `[TransferAssignment] ${step.from} → ${step.to} assignedDate=${travelDate}`
          );

          // Create TRAVEL unit with corrected date
          travelUnits.push({
            unit: {
              kind: 'TRAVEL',
              step: step as RouteStep & { kind: 'TRAVEL' },
              date: travelDate,
            },
            date: travelDate,
          });
        } else if (step.kind === 'STAY') {
          // Track the most recent STAY step for subsequent TRAVEL assignments
          lastStayStep = step as RouteStep & { kind: 'STAY' };
        }
        // STAY steps are handled separately in stayExpansions
      }
    }

    // Third pass: organize units by date, merging FLIGHT and TRAVEL units with STAY_DAY units
    // Collect all unique dates
    const allDates = new Set<string>();
    flightUnits.forEach(({ date }) => allDates.add(date.split('T')[0]));
    travelUnits.forEach(({ date }) => allDates.add(date.split('T')[0]));
    stayExpansions.forEach((_, date) => allDates.add(date.split('T')[0]));

    for (const date of allDates) {
      const normalizedDate = date.split('T')[0];
      const dayUnits: DayUnit[] = [];

      // Add FLIGHT units for this date
      flightUnits.forEach(({ unit, date: unitDate }) => {
        if (unitDate.split('T')[0] === normalizedDate) {
          dayUnits.push(unit);
        }
      });

      // Add TRAVEL units for this date
      travelUnits.forEach(({ unit, date: unitDate }) => {
        if (unitDate.split('T')[0] === normalizedDate) {
          dayUnits.push(unit);
        }
      });

      // Merge STAY_DAY units for this date (if any)
      // Insert them after any TRAVEL steps but maintain relative order
      const stayDaysForDate = stayExpansions.get(normalizedDate) || [];
      
      // Find the last TRAVEL unit index to insert STAY_DAY units after
      let insertIndex = dayUnits.length;
      for (let i = dayUnits.length - 1; i >= 0; i--) {
        if (dayUnits[i].kind === 'TRAVEL') {
          insertIndex = i + 1;
          break;
        }
        if (dayUnits[i].kind === 'FLIGHT') {
          insertIndex = i + 1;
          break;
        }
      }

      // Insert STAY_DAY units after the last non-STAY unit
      dayUnits.splice(insertIndex, 0, ...stayDaysForDate);

      // Store units for this day (if any)
      if (dayUnits.length > 0) {
        unitsByDate.set(normalizedDate, dayUnits);
      } else if (stayDaysForDate.length > 0) {
        // Day has only STAY_DAY units (no flights/transfers)
        unitsByDate.set(normalizedDate, stayDaysForDate);
      }
    }

    // Fourth pass: ensure all dates with STAY_DAY expansions are included
    // (even if they don't have flights/transfers in the original dayPlan)
    for (const [date, stayUnits] of stayExpansions.entries()) {
      const normalizedDate = date.split('T')[0];
      if (!unitsByDate.has(normalizedDate)) {
        // This date only has STAY_DAY units, no other steps
        unitsByDate.set(normalizedDate, stayUnits);
      }
    }

    // Normalization pass: flatten, sort by date, then re-group to ensure strict chronological order
    // This fixes cases where units are grouped by city/stay rather than date
    // Calendar date is the single source of truth - never rely on city order, stay order, or dayPlans iteration order
    
    // Step 1: Flatten all DayUnits into a single array
    const allUnits: DayUnit[] = [];
    for (const [date, units] of unitsByDate.entries()) {
      // Ensure date is normalized to YYYY-MM-DD format (remove time component if present)
      const normalizedDate = date.split('T')[0];
      for (const unit of units) {
        // Ensure unit.date is also normalized
        unit.date = unit.date.split('T')[0];
        allUnits.push(unit);
      }
    }

    // Step 2: Sort all units strictly by calendar date (ascending)
    // Use unit.date as the single source of truth for ordering
    allUnits.sort((a, b) => {
      // Normalize dates to ensure consistent comparison
      const dateA = a.date.split('T')[0];
      const dateB = b.date.split('T')[0];
      // Compare using Date objects for accurate chronological sorting
      const timeA = new Date(dateA + 'T00:00:00Z').getTime();
      const timeB = new Date(dateB + 'T00:00:00Z').getTime();
      return timeA - timeB;
    });

    // Step 3: Re-group by date, preserving intra-day ordering
    // Units that share the same date retain their relative order (FLIGHT → TRAVEL → STAY_DAY)
    const normalizedUnitsByDate = new Map<string, DayUnit[]>();
    for (const unit of allUnits) {
      // Normalize date to YYYY-MM-DD
      const normalizedDate = unit.date.split('T')[0];
      if (!normalizedUnitsByDate.has(normalizedDate)) {
        normalizedUnitsByDate.set(normalizedDate, []);
      }
      normalizedUnitsByDate.get(normalizedDate)!.push(unit);
    }

    // Step 4: Apply intra-day sorting by unit priority
    // Priority order: OUTBOUND_FLIGHT (1) → TRAVEL (2) → STAY_DAY (3) → INBOUND_FLIGHT (4)
    const getUnitPriority = (unit: DayUnit): number => {
      if (unit.kind === 'FLIGHT') {
        // Determine if it's outbound or inbound by checking the step
        const flightStep = unit.step;
        if (flightStep.kind === 'OUTBOUND_FLIGHT') {
          return 1; // OUTBOUND_FLIGHT
        } else if (flightStep.kind === 'INBOUND_FLIGHT') {
          return 4; // INBOUND_FLIGHT
        }
        return 2; // Fallback (shouldn't happen)
      } else if (unit.kind === 'TRAVEL') {
        return 2; // TRAVEL
      } else if (unit.kind === 'STAY_DAY') {
        return 3; // STAY_DAY
      }
      return 99; // Unknown (shouldn't happen)
    };

    // Sort units within each day by priority
    for (const [date, units] of normalizedUnitsByDate.entries()) {
      // Create a stable sort that preserves relative order for units with the same priority
      // Use the original index to maintain stability
      const unitsWithIndex = units.map((unit, originalIndex) => ({
        unit,
        originalIndex,
        priority: getUnitPriority(unit),
      }));

      // Sort by priority, then by original index (stable sort)
      unitsWithIndex.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Same priority - preserve original order
        return a.originalIndex - b.originalIndex;
      });

      // Replace the units array with the sorted order
      normalizedUnitsByDate.set(date, unitsWithIndex.map(item => item.unit));
    }

    // Validation: Log the chronological order to verify correctness
    console.log(
      '[DayUnits]',
      Array.from(normalizedUnitsByDate.entries())
        .sort(([dateA], [dateB]) => {
          const timeA = new Date(dateA + 'T00:00:00Z').getTime();
          const timeB = new Date(dateB + 'T00:00:00Z').getTime();
          return timeA - timeB;
        })
        .map(([date, units], i) => ({
          day: i + 1,
          date,
          kinds: units.map(u => u.kind),
          cities: units.filter(u => u.kind === 'STAY_DAY').map(u => (u as any).city),
        }))
    );

    return normalizedUnitsByDate;
  }

  // Extract cities with coordinates (used for map navigation)
  const getMapCities = () => {
    if (!structuralRoute) return [];

    const cities: Array<{
      city: string;
      lat: number;
      lng: number;
      role: 'BASE' | 'OUTBOUND' | 'INBOUND';
    }> = [];

    const { outboundFlight, inboundFlight, groundRoute, derived } = structuralRoute;

    // Build set of cities that have stays (from draftStayCities - source of truth for stay eligibility)
    const stayCities = new Set<string>();
    const draftStayCitiesSet = new Set((derived.draftStayCities || []).map((c: string) => c.toLowerCase().trim()));
    
    // Only mark cities as BASE if they're in draftStayCities AND have valid dates
    for (const city in derived.arrivalDates) {
      const normalizedCity = city.toLowerCase().trim();
      if (!draftStayCitiesSet.has(normalizedCity)) {
        continue; // Not in original draft intent, don't mark as BASE
      }
      
      const arrivalDate = derived.arrivalDates[city];
      const departureDate = derived.departureDates[city];
      if (arrivalDate && departureDate && departureDate > arrivalDate) {
        stayCities.add(city);
      }
    }

    // Add outbound gateway
    const outboundCoords = getCityCoordinates(outboundFlight.toCity);
    if (outboundCoords) {
      cities.push({
        city: outboundFlight.toCity,
        lat: outboundCoords.lat,
        lng: outboundCoords.lng,
        role: stayCities.has(outboundFlight.toCity) ? 'BASE' : 'OUTBOUND',
      });
    }

    // Add all cities from ground route
    for (const leg of groundRoute) {
      // Add fromCity
      const fromCoords = getCityCoordinates(leg.fromCity);
      if (fromCoords && !cities.some(c => c.city === leg.fromCity)) {
        cities.push({
          city: leg.fromCity,
          lat: fromCoords.lat,
          lng: fromCoords.lng,
          role: stayCities.has(leg.fromCity) ? 'BASE' : 'OUTBOUND',
        });
      }

      // Add toCity
      const toCoords = getCityCoordinates(leg.toCity);
      if (toCoords && !cities.some(c => c.city === leg.toCity)) {
        cities.push({
          city: leg.toCity,
          lat: toCoords.lat,
          lng: toCoords.lng,
          role: stayCities.has(leg.toCity) ? 'BASE' : 'INBOUND',
        });
      }
    }

    // Add inbound gateway (if different from outbound)
    if (inboundFlight.fromCity !== outboundFlight.toCity) {
    const inboundCoords = getCityCoordinates(inboundFlight.fromCity);
      if (inboundCoords && !cities.some(c => c.city === inboundFlight.fromCity)) {
      cities.push({
        city: inboundFlight.fromCity,
        lat: inboundCoords.lat,
        lng: inboundCoords.lng,
          role: stayCities.has(inboundFlight.fromCity) ? 'BASE' : 'INBOUND',
      });
      }
    }

    return cities;
  };



  if (!isHydrated || !structuralRoute) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading logistics overview...</p>
        </div>
      </div>
    );
  }

  const { derived } = structuralRoute;
  
  // Get locked hotel stays and hotel search results from tripState
  const currentTripState = tripState || getTripState();
  const lockedHotelStays = currentTripState.lockedHotelStays || [];
  const hotelSearchResults = currentTripState.hotelSearchResults;
  
  // Helper to normalize city names for hotel lookup
  const normalizeCity = (city: string): string => city.toLowerCase().trim();
  
  // Helper to find locked hotel for a city and get its name from search results
  const getHotelForCity = (city: string) => {
    const normalized = normalizeCity(city);
    const lockedStay = lockedHotelStays.find(
      (stay: { city: string; hotelId: string; checkIn: string; checkOut: string }) => normalizeCity(stay.city) === normalized
    );
    
    if (!lockedStay) return null;
    
    // Try to find hotel name from search results
    let hotelName: string | undefined;
    if (hotelSearchResults) {
      const cityData = hotelSearchResults.hotelsByCity?.find(
        (cd: { city: string; hotels: Array<{ id: string; name: string }> }) => normalizeCity(cd.city) === normalized
      );
      const hotel = cityData?.hotels?.find(
        (h: { id: string; name: string }) => h.id === lockedStay.hotelId
      );
      hotelName = hotel?.name;
    }
    
    return {
      ...lockedStay,
      hotelName,
    };
  };


  // Helper to format date in compact format (e.g., "Tue, Jun 9")
  const formatCompactDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to format date as month + day only (e.g., "June 9")
  const formatMonthDay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Map travel style IDs to display names
  const getStyleDisplayName = (styleId: string): string => {
    const styleMap: Record<string, string> = {
      'adventure': 'Adventure',
      'cultural': 'Culture',
      'shopping': 'Shopping',
      'foodie': 'Food',
      'photography': 'Photography',
      'relaxation': 'Relaxation',
    };
    return styleMap[styleId] || styleId;
  };

  // Helper function to get travel icon
  const getTravelIcon = (mode?: string) => {
    if (!mode) return <Car className="w-5 h-5 text-white" />;
    const modeLower = mode.toLowerCase();
    if (modeLower.includes('train')) return <Train className="w-5 h-5 text-white" />;
    if (modeLower.includes('bus')) return <Bus className="w-5 h-5 text-white" />;
    return <Car className="w-5 h-5 text-white" />;
  };

  // Extract step rendering into helper functions (NO LOGIC CHANGE)
  const renderOutboundFlight = (step: RouteStep & { kind: 'OUTBOUND_FLIGHT' }, index: number) => {
    return (
      <div
        key={`outbound-${index}`}
        className="relative"
      >
        <div className="flex gap-4">
          <div className="relative z-10 flex-shrink-0">
            <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center shadow-lg">
              <Plane className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 bg-white border-2 border-gray-200 rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Outbound Flight</div>
                <div className="text-sm font-bold text-gray-900">{step.from} → {step.to}</div>
                <div className="text-xs text-gray-600 mt-1">{formatCompactDate(step.date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTravel = (step: RouteStep & { kind: 'TRAVEL' }, index: number) => {
    return (
      <div
        key={`travel-${index}`}
        className="relative"
      >
        <div className="flex gap-4">
          <div className="relative z-10 flex-shrink-0">
            <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center shadow-md">
              {getTravelIcon(step.mode)}
            </div>
          </div>
          <div className="flex-1 bg-white border-2 border-gray-200 rounded-xl shadow-md p-4">
            <div className="text-xs text-gray-500 mb-1">Transfer</div>
            <div className="text-sm font-semibold text-gray-900">{step.from} → {step.to}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderStay = (step: RouteStep & { kind: 'STAY' }, index: number) => {
    const hotel = getHotelForCity(step.city);
    const isExpanded = false; // Legacy function - not used in accordion layout

    return (
      <div
        key={`stay-${step.city}-${index}`}
        id={`timeline-city-${step.city}`}
        ref={(el) => {
          timelineRefs.current[step.city] = el;
        }}
        className="relative"
      >
        <div 
          className="relative flex gap-4 cursor-pointer"
          onClick={() => {}} // Legacy function - not used in accordion layout
        >
          <div className="relative z-10 flex-shrink-0">
            <div className="w-12 h-12 bg-white border-2 border-[#FE4C40] rounded-full flex items-center justify-center shadow-md">
              {hotel ? (
                <Building2 className="w-6 h-6 text-[#FE4C40]" />
              ) : (
                <MapPin className="w-6 h-6 text-[#FE4C40]" />
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-white border-2 border-gray-200 rounded-xl shadow-md overflow-hidden transition-all">
            {/* Collapsed State */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {/* City Thumbnail */}
                <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={getCityThumbnailPath(step.city, tripState)}
                    alt={step.city}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Prevent infinite loops: if we've already tried a fallback, stop here
                      if (target.dataset.hasTriedFallback === 'true') {
                        console.error('[IMAGE_LOAD_ERROR] Fallback also failed, stopping retry loop', target.src);
                        return;
                      }
                      console.error('[IMAGE_LOAD_ERROR]', target.src);
                      // Mark that we're trying a fallback BEFORE changing src
                      target.dataset.hasTriedFallback = 'true';
                      target.src = resolveItineraryImagePath({}, 1);
                    }}
                  />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900">
                    {step.city}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280] bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  {step.nights} night{step.nights !== 1 ? 's' : ''}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded State */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
                {/* Date Range & Duration */}
                <div className="space-y-1.5">
                  <div className="text-sm text-[#6B7280]">
                    {hotel && hotel.checkIn && hotel.checkOut ? (
                      <>
                        <span className="font-medium text-gray-700">Confirmed: </span>
                        {formatCompactDate(hotel.checkIn)} → {formatCompactDate(hotel.checkOut)}
                      </>
                    ) : (
                      <>
                        {formatCompactDate(step.arrival)} → {formatCompactDate(step.departure)}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.nights} {step.nights === 1 ? 'night' : 'nights'} stay
                  </div>
                </div>

                {/* Hotel */}
                {hotel ? (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Building2 className="w-4 h-4 text-[#FE4C40]" />
                    <span>{hotel.hotelName || hotel.hotelId || 'Hotel'}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Choose later
                  </div>
                )}

                {/* Placeholder Activities */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-500 mb-2">Example experiences</div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">• Explore local markets and cuisine</div>
                    <div className="text-sm text-gray-600">• Visit key landmarks and cultural sites</div>
                    <div className="text-sm text-gray-600">• Relax and enjoy the local atmosphere</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderInboundFlight = (step: RouteStep & { kind: 'INBOUND_FLIGHT' }, index: number) => {
    return (
      <div
        key={`inbound-${index}`}
        className="relative"
      >
        <div className="flex gap-4">
          <div className="relative z-10 flex-shrink-0">
            <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center shadow-lg">
              <Plane className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 bg-white border-2 border-gray-200 rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1">Inbound Flight</div>
                <div className="text-sm font-bold text-gray-900">{step.from} → {step.to}</div>
                <div className="text-xs text-gray-600 mt-1">{formatCompactDate(step.date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main step renderer that dispatches to specific renderers
  const renderTimelineStep = (step: RouteStep, index: number) => {
    switch (step.kind) {
      case 'OUTBOUND_FLIGHT':
        return renderOutboundFlight(step, index);
      case 'TRAVEL':
        return renderTravel(step, index);
      case 'STAY':
        return renderStay(step, index);
      case 'INBOUND_FLIGHT':
        return renderInboundFlight(step, index);
      default:
        return null;
    }
  };

  // Render DayUnit cards (for vertical accordion layout)
  const renderFlightCard = (unit: DayUnit & { kind: 'FLIGHT' }) => {
    const step = unit.step;
    const isOutbound = step.kind === 'OUTBOUND_FLIGHT';
    return (
      <div className="w-full bg-white border-2 border-gray-200 rounded-xl shadow-md p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-1">
              {isOutbound ? 'Outbound Flight' : 'Inbound Flight'}
            </div>
            <div className="text-sm font-bold text-gray-900 truncate">
              {step.from} → {step.to}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {formatCompactDate(step.date)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTravelCard = (unit: DayUnit & { kind: 'TRAVEL' }) => {
    const step = unit.step;
    return (
      <div className="w-full bg-white border-2 border-gray-200 rounded-xl shadow-md p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
            {getTravelIcon(step.mode)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-1">Transfer</div>
            <div className="text-sm font-semibold text-gray-900 truncate">
              {step.from} → {step.to}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStayDayCard = (unit: DayUnit & { kind: 'STAY_DAY' }) => {
    const hotel = getHotelForCity(unit.city);
    const isExpanded = false; // Legacy function - not used in accordion layout
    const cardKey = `stay-${unit.city}-${unit.date}`;

  return (
      <div className="flex-shrink-0 w-64 bg-white border-2 border-gray-200 rounded-xl shadow-md overflow-hidden">
        {/* Collapsed State */}
        <div
          className="p-4 cursor-pointer"
          onClick={() => {}} // Legacy function - not used in accordion layout
        >
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden">
              <Image
                src={getCityThumbnailPath(unit.city, tripState)}
                alt={unit.city}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Prevent infinite loops: if we've already tried a fallback, stop here
                  if (target.dataset.hasTriedFallback === 'true') {
                    console.error('[IMAGE_LOAD_ERROR] Fallback also failed, stopping retry loop', target.src);
                    return;
                  }
                  console.error('[IMAGE_LOAD_ERROR]', target.src);
                  // Mark that we're trying a fallback BEFORE changing src
                  target.dataset.hasTriedFallback = 'true';
                  target.src = resolveItineraryImagePath({}, 1);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {unit.city}
              </h3>
              <div className="text-xs text-[#6B7280] mt-1">
                Day {unit.dayIndexInStay} of {unit.totalDaysInStay}
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Expanded State */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
            <div className="space-y-1.5">
              <div className="text-sm text-[#6B7280]">
                {hotel && hotel.checkIn && hotel.checkOut ? (
                  <>
                    <span className="font-medium text-gray-700">Confirmed: </span>
                    {formatCompactDate(hotel.checkIn)} → {formatCompactDate(hotel.checkOut)}
                  </>
                ) : (
                  <>
                    {formatCompactDate(unit.originalStay.arrival)} → {formatCompactDate(unit.originalStay.departure)}
                  </>
                )}
              </div>
            </div>

            {hotel ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Building2 className="w-4 h-4 text-[#FE4C40]" />
                <span className="truncate">{hotel.hotelName || hotel.hotelId || 'Hotel'}</span>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Choose later
            </div>
          )}

            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 mb-2">Example experiences</div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">• Explore local markets and cuisine</div>
                <div className="text-sm text-gray-600">• Visit key landmarks and cultural sites</div>
                <div className="text-sm text-gray-600">• Relax and enjoy the local atmosphere</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Hotel CTA Card Component (Presentational Only)
  const HotelCTACard = ({ city }: { city: string }) => {
    const router = useRouter();
    
    const handleClick = () => {
      router.push(`/bookings/hotels/options?city=${encodeURIComponent(city)}`);
    };

    return (
      <div
        onClick={handleClick}
        className="w-full bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-all cursor-pointer"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-400 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              Choose your hotel in {city}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Select where you&apos;ll stay during this part of your trip
            </p>
          </div>
        </div>
              <button
          className="w-full mt-3 py-2.5 px-4 bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          Add hotel
              </button>
            </div>
    );
  };

  // Hotel Summary Card Component (Presentational Only)
  const HotelSummaryCard = ({ 
    hotel,
    date,
  }: { 
    hotel: { 
      hotelId: string; 
      name: string; 
      image?: string; 
      rating?: number; 
      pricePerNight?: number;
      availabilityStatus?: 'available' | 'limited' | 'unavailable';
      availabilityConfidence?: 'high' | 'medium' | 'low';
      availabilityReason?: string;
      restrictions?: string[];
    };
    date?: string;
  }) => {
    const router = useRouter();
    
    const handleClick = () => {
      // Navigate to hotel options page to change selection
      router.push(`/bookings/hotels/options`);
    };

    // Check if this card should be highlighted (post-action feedback)
    const cardId = date ? `${date}-hotel-${hotel.hotelId}` : null;
    const isHighlighted = cardId && highlightedCard === cardId;

    // Determine if we should show availability warning
    const hasAvailabilityRisk = 
      hotel.availabilityStatus === 'limited' || 
      hotel.availabilityConfidence === 'low';
    
    // Determine status badge to display
    const getStatusBadge = () => {
      // Check for partial stay (not currently tracked, but structure is here for future)
      // For now, we focus on availability status and confidence
      
      if (hotel.availabilityStatus === 'limited') {
        return {
          text: 'Hotel added to plan · Limited availability',
          icon: AlertTriangle,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
        };
      }
      
      if (hotel.availabilityConfidence === 'low') {
        return {
          text: 'Hotel added to plan · Limited availability',
          icon: AlertTriangle,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
        };
      }
      
      // Default: added to plan status
      return {
        text: 'Hotel added to plan',
        icon: CheckCircle,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        iconColor: 'text-green-600',
      };
    };
    
    const statusBadge = getStatusBadge();
    const StatusIcon = statusBadge.icon;

    return (
      <div
        onClick={handleClick}
        className={`w-full bg-white border-2 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-500 cursor-pointer ${
          isHighlighted 
            ? 'border-green-400 shadow-lg shadow-green-200 animate-pulse' 
            : 'border-gray-200'
        }`}
      >
        {/* Status Badge - Always Visible */}
        <div className={`mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full ${statusBadge.bgColor} w-fit`}>
          <StatusIcon className={`w-3.5 h-3.5 ${statusBadge.iconColor}`} />
          <span className={`text-xs font-medium ${statusBadge.textColor}`}>
            {statusBadge.text}
                  </span>
        </div>
        
        {/* Subtext clarifying booking happens later */}
        <div className="mb-3 text-xs text-gray-500">
          Final booking happens later
        </div>
        
        {/* Availability Warning Details - Only if Risk Exists */}
        {hasAvailabilityRisk && hotel.availabilityReason && (
          <div className="mb-3 flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-orange-900 mb-0.5">
                Availability risk
              </div>
              <p className="text-xs text-orange-800 leading-snug">
                {hotel.availabilityReason}
              </p>
              {hotel.restrictions && hotel.restrictions.length > 0 && (
                <p className="text-xs text-orange-700 italic mt-1">
                  {hotel.restrictions[0]}
                </p>
                )}
              </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          {hotel.image && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
              <Image
                src={hotel.image}
                alt={hotel.name}
                width={64}
                height={64}
                className="object-cover w-full h-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Prevent infinite loops: if we've already tried hiding, stop here
                  if (target.dataset.hasTriedFallback === 'true') {
                    console.error('[IMAGE_LOAD_ERROR] Already hidden, stopping retry loop', target.src);
                    return;
                  }
                  console.error('[IMAGE_LOAD_ERROR]', target.src);
                  // Mark that we've tried a fallback
                  target.dataset.hasTriedFallback = 'true';
                  target.style.display = 'none';
                }}
              />
            </div>
          )}
          {!hotel.image && (
            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1 truncate">
              {hotel.name}
            </h4>
            {hotel.rating && (
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-600">{hotel.rating.toFixed(1)}</span>
              </div>
            )}
            {hotel.pricePerNight && (
              <div className="text-xs text-gray-700 font-medium">
                ${hotel.pricePerNight.toLocaleString()}/night
              </div>
            )}
            <div className="text-xs text-blue-600 mt-2 font-medium">
              Change hotel →
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Map GeneratedActivity bestTime to TimeSlot format for decision engine (simplified to day/night)
  const mapBestTimeToSlot = (bestTime: string): TimeSlot | null => {
    if (bestTime === 'early_morning' || bestTime === 'morning' || bestTime === 'afternoon') return 'day';
    if (bestTime === 'evening' || bestTime === 'night') return 'night';
    return null;
  };


  // Render scheduled activity card (read-only display)
  const renderScheduledActivityCard = (activity: { id: string; name: string; timeSlot: TimeSlot; activityName?: string }, slotName?: string, date?: string) => {
    // Use slotName if provided (for 'night' display), otherwise use timeSlot
    const displaySlot = slotName || activity.timeSlot;
    const slotLabel = displaySlot.charAt(0).toUpperCase() + displaySlot.slice(1);
    
    // Check if this card should be highlighted (post-action feedback)
    const cardId = date ? `${date}-${activity.id}` : null;
    const isHighlighted = cardId && highlightedCard === cardId;
                      
                      return (
                        <div
        className={`w-full border-2 rounded-xl p-4 transition-all duration-500 ${
          isHighlighted 
            ? 'border-green-400 shadow-lg shadow-green-200 animate-pulse bg-gradient-to-br from-[#FFF5F4] to-white' 
            : 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-lg'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-1">
              {slotLabel}
                            </div>
            <h4 className="text-sm font-semibold text-gray-900">
              {activity.activityName || activity.name}
            </h4>
                          </div>
                            </div>
                            </div>
    );
  };

  // Horizontal Card Carousel Component with Navigation

  // Accordion: Day-wise timeline renderer with vertical collapsible sections
  // Uses dayUnits as the single source of truth - no dependency on dayPlans or allTimelineSteps
  const renderDayWiseTimeline = () => {
    if (dayUnits.size === 0) {
      return null;
    }

    // Get trip pace for activity card count
    const pace = tripState?.preferences?.pace || 'balanced';
    const activityCount = pace === 'relaxed' ? 1 : pace === 'balanced' ? 2 : pace === 'packed' ? 3 : 2;

    // Sort dates chronologically using Date comparison (not string sort)
    const sortedEntries = Array.from(dayUnits.entries()).sort(([dateA], [dateB]) => {
      const timeA = new Date(dateA + 'T00:00:00Z').getTime();
      const timeB = new Date(dateB + 'T00:00:00Z').getTime();
      return timeA - timeB;
    });

    return (
      <div className="space-y-4">
        {sortedEntries.map(([date, units], dayIndex) => {
          if (units.length === 0) return null;

          const dayId = `day-${date}`;
          const isExpanded = allDaysExpanded || expandedDayId === dayId;

          // Extract STAY_DAY units to get city name for header
          const stayDayUnits = units.filter((u): u is DayUnit & { kind: 'STAY_DAY' } => u.kind === 'STAY_DAY');
          const cityName = stayDayUnits.length > 0 ? stayDayUnits[0].city : null;

          // Filter out STAY_DAY units from card rendering (they act as context, not visible cards)
          const cardUnits = units.filter(u => u.kind !== 'STAY_DAY');

          // Determine if this is a transition day (has both TRAVEL and STAY_DAY)
          const hasTravel = cardUnits.some(u => u.kind === 'TRAVEL');
          const hasStayDay = stayDayUnits.length > 0;

          // Check if this day qualifies for hotel CTA/summary (first day of stay)
          const firstDayOfStay = stayDayUnits.some(
            (u): u is DayUnit & { kind: 'STAY_DAY' } => 
              u.kind === 'STAY_DAY' && u.dayIndexInStay === 1
          );
          const hotelCTACity = firstDayOfStay && cityName ? cityName : null;
          
          // Look up selected hotel for this city (if any) - case-insensitive matching
          let selectedHotel = null;
          if (hotelCTACity && tripState?.selectedHotels) {
            // Try exact match first
            selectedHotel = tripState.selectedHotels[hotelCTACity] || null;
            // If no exact match, try case-insensitive lookup
            if (!selectedHotel) {
              const normalizedCity = hotelCTACity.toLowerCase().trim();
              const matchingKey = Object.keys(tripState.selectedHotels).find(
                key => key.toLowerCase().trim() === normalizedCity
              );
              if (matchingKey) {
                selectedHotel = tripState.selectedHotels[matchingKey];
              }
            }
          }

          // Day label with city name if available: "Day X, <City Name> · <Weekday, Date>"
          const dayLabel = cityName 
            ? `Day ${dayIndex + 1}, ${cityName} · ${formatCompactDate(date)}`
            : `Day ${dayIndex + 1} · ${formatCompactDate(date)}`;

          // Build single array of all cards for this day in correct order
          const dayCards: React.ReactNode[] = [];

          // 1. FLIGHT cards (if any)
          cardUnits.forEach((unit, unitIndex) => {
            if (unit.kind === 'FLIGHT') {
              dayCards.push(
                <div key={`${date}-flight-${unitIndex}`}>
                  {renderFlightCard(unit)}
                          </div>
              );
            }
          });

          // 2. TRAVEL cards (if any)
          cardUnits.forEach((unit, unitIndex) => {
            if (unit.kind === 'TRAVEL') {
              dayCards.push(
                <div key={`${date}-travel-${unitIndex}`}>
                  {renderTravelCard(unit)}
                        </div>
                      );
                    }
          });

          // 3. HOTEL card (if present - only on first day of stay)
          if (hotelCTACity) {
            dayCards.push(
              <div key={`${date}-hotel`}>
                {selectedHotel ? (
                  <HotelSummaryCard hotel={selectedHotel} date={date} />
                ) : (
                  <HotelCTACard city={hotelCTACity} />
                )}
              </div>
            );
          }

          // 4. ACTIVITY cards (if day has STAY_DAY units)
          if (hasStayDay && cityName) {
            // Get scheduled activities for this day - use object access instead of Map.get()
            const activitiesForDay = dayActivities[date] || {};
            
            // Get slots based on user's pace
            const pace = tripState?.preferences?.pace || 'moderate';
            const slots = getSlotsForPace(pace);
            
            // Prepare existing activities data for URL params (slots are optional properties now)
            const existingActivitiesForParam = [
              activitiesForDay.day,
              activitiesForDay.night,
            ]
              .filter((a): a is Activity => a !== undefined)
              .map(a => ({
                id: a.id,
                name: a.name,
                timeSlot: a.timeSlot,
                duration: a.duration,
              }));
            const existingActivitiesParam = encodeURIComponent(JSON.stringify(existingActivitiesForParam));
            
            // Render one card per slot based on pace
            slots.forEach((slotName) => {
              const activity = activitiesForDay[slotName as 'day' | 'night'];
              
              if (activity) {
                // Render scheduled activity card with slot name (for correct 'night' label)
                dayCards.push(
                  <div key={`${date}-activity-${slotName}-${activity.id}`}>
                    {renderScheduledActivityCard(activity, slotName, date)}
                  </div>
                );
              } else {
                // Render empty slot card with label
                const slotLabel = slotName.charAt(0).toUpperCase() + slotName.slice(1); // Capitalize first letter
                // slotName is already normalized to 'day' or 'night' - use it directly
                const slotTimeForAPI = slotName as TimeSlot;
                
                dayCards.push(
                  <div
                    key={`${date}-empty-slot-${slotName}`}
                    className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-[#FE4C40] transition-colors"
                    onClick={() => {
                      // Navigate to activities selection page with slot name
                      router.push(`/activities/select?city=${encodeURIComponent(cityName)}&day=${encodeURIComponent(date)}&slot=${slotName}&slotTime=${slotTimeForAPI}&existing=${existingActivitiesParam}`);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-2">{slotLabel}</div>
                        <div className="text-sm text-gray-500 font-medium mb-1">Add activity</div>
                        <div className="text-xs text-gray-400">Tap to browse</div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                          </div>
                );
              }
            });
          }

          const handleDayHeaderClick = () => {
            if (allDaysExpanded) {
              // If all days are expanded, collapse this day and disable "all expanded" mode
              setAllDaysExpanded(false);
              setExpandedDayId(null);
            } else if (isExpanded) {
              // If this day is expanded individually, collapse it
              setExpandedDayId(null);
            } else {
              // If this day is collapsed, expand it
              setExpandedDayId(dayId);
            }
          };

          return (
            <DayAccordionItem
              key={date}
              dayId={dayId}
              dayIndex={dayIndex}
              dayLabel={dayLabel}
              isExpanded={isExpanded}
              onToggle={handleDayHeaderClick}
              dayCards={dayCards}
              isLast={dayIndex === sortedEntries.length - 1}
              allDaysExpanded={allDaysExpanded}
            />
          );
        })}
      </div>
    );
  };

  // Accordion item component with IntersectionObserver for auto-collapse
  const DayAccordionItem = ({
    dayId,
    dayIndex,
    dayLabel,
    isExpanded,
    onToggle,
    dayCards,
    isLast,
    allDaysExpanded,
  }: {
    dayId: string;
    dayIndex: number;
    dayLabel: string;
    isExpanded: boolean;
    onToggle: () => void;
    dayCards: React.ReactNode[];
    isLast: boolean;
    allDaysExpanded: boolean;
  }) => {
    const dayRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver for auto-collapse when scrolled out of view
    // Only enable auto-collapse when NOT in "all days expanded" mode
    useEffect(() => {
      if (!isExpanded || !dayRef.current || allDaysExpanded) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // If the expanded day is no longer intersecting (scrolled out of view), collapse it
            if (!entry.isIntersecting && expandedDayId === dayId) {
              setExpandedDayId(null);
            }
          });
        },
        {
          threshold: 0.1, // Trigger when 10% or less is visible
        }
      );

      observer.observe(dayRef.current);

      return () => {
        observer.disconnect();
      };
    }, [isExpanded, dayId, expandedDayId, allDaysExpanded]);

    return (
      <div ref={dayRef} id={dayId} className="relative">
        {/* Day Header with Vertical Timeline Line */}
        <div className="flex items-start gap-4">
          {/* Timeline Line (vertical) - only one per day */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-[#FE4C40] rounded-full flex items-center justify-center shadow-md border-2 border-white z-10">
              <span className="text-white text-xs font-bold">{dayIndex + 1}</span>
            </div>
            {/* Vertical line connecting to next day (except last day) */}
            {!isLast && (
              <div className="absolute left-1/2 top-12 -translate-x-1/2 w-0.5 h-16 bg-gradient-to-b from-gray-200 to-gray-300" />
                              )}
                            </div>
                            
          {/* Day Info */}
          <div className="flex-1 pt-2">
            {/* Clickable Day Header */}
                              <button
              onClick={onToggle}
              className="w-full flex items-center justify-between gap-2 mb-4 hover:opacity-80 transition-opacity text-left"
                              >
              <h3 className="text-base font-semibold text-gray-900">{dayLabel}</h3>
                                {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                ) : (
                <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                )}
                              </button>
                              
            {/* Expanded Content - Vertical Stack */}
                              {isExpanded && (
              <div className="space-y-3 pb-4">
                {dayCards}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
  };

  // Helper to calculate days between dates
  const daysBetween = (startDate: string, endDate: string): number => {
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Group STAY steps by city (to avoid repetition)
  const groupedCityStays = () => {
    if (!structuralRoute) return [];
    const timelineSteps = buildTimelineSteps();
    const stays = timelineSteps.filter(step => step.kind === 'STAY');
    
    // Group consecutive stays in same city
    const grouped: Array<{
      city: string;
      arrival: string;
      departure: string;
      nights: number;
    }> = [];
    
    for (const stay of stays) {
      if (stay.kind === 'STAY') {
        const existing = grouped.find(g => g.city === stay.city && g.departure === stay.arrival);
        if (existing) {
          // Extend existing stay
          existing.departure = stay.departure;
          existing.nights = daysBetween(existing.arrival, existing.departure);
        } else {
          grouped.push({
            city: stay.city,
            arrival: stay.arrival,
            departure: stay.departure,
            nights: stay.nights,
          });
        }
      }
    }
    
    return grouped;
  };

  // Calculate trip summary data for hero overlay
  const tripSummaryData = structuralRoute && tripState ? (() => {
    const { outboundFlight, inboundFlight, derived } = structuralRoute;
    const stayCities = groupedCityStays().map(s => s.city);
    
    const firstDate = derived.arrivalDates[Object.keys(derived.arrivalDates)[0]];
    const lastDate = derived.departureDates[Object.keys(derived.departureDates).pop() || ''];
    let tripDuration = 0;
    if (firstDate && lastDate) {
      tripDuration = daysBetween(firstDate, lastDate);
    }

    const citiesString = stayCities.length > 0 
      ? stayCities.join(' → ')
      : outboundFlight.toCity;

    return {
      tripDuration,
      citiesString,
      outboundFlight,
      inboundFlight,
    };
  })() : null;

  // Get all timeline steps (OUTBOUND_FLIGHT, TRAVEL, STAY, INBOUND_FLIGHT)
  const allTimelineSteps = buildTimelineSteps();

  // Build day-wise plan structure (for future day-wise view)
  const dayPlans = buildDayPlans(allTimelineSteps);
  
  // Debug log to validate day-wise grouping
  console.log(
    '[DayPlans]',
    dayPlans.map(d => ({
      day: d.label,
      date: d.date,
      stepKinds: d.steps.map(s => s.kind),
    }))
  );

  // Build normalized day units (expands multi-night STAY steps into per-day units)
  const dayUnits = buildDayUnits(dayPlans);

  // Debug log to validate day unit expansion
  console.log(
    '[DayUnits]',
    Array.from(dayUnits.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, units]) => {
        const dayPlan = dayPlans.find(dp => dp.date === date);
        const dayLabel = dayPlan ? dayPlan.label : `Day ${date}`;
        return `${dayLabel} (${date}): [${units.map(u => `'${u.kind}'`).join(', ')}]`;
      })
      .join('\n')
  );

  // Scroll to content function - scrolls to Day-wise plan heading with proper offset
  const scrollToContent = () => {
    const target = document.getElementById('day-wise-plan-header');
    if (target) {
      const headerHeight = 80; // Approximate header height
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ 
        top: targetPosition, 
        behavior: 'smooth' 
      });
    }
  };

                      return (
    <>
      {/* Header */}
      <StepHeader
        title="Your Trip Plan"
        currentStep={9}
        totalSteps={10}
        onBack={handleBack}
      />

      {/* Single parent gradient surface - wraps hero + summary + timeline */}
      <div className="relative bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 max-w-md mx-auto w-full overflow-x-hidden">
        <div className="max-w-md mx-auto w-full relative">
          {/* LandingSection - Hero + Summary + Scroll Indicator */}
          <section 
            ref={landingSectionRef}
            className="relative h-[calc(100dvh-120px-80px)] pt-[80px] flex flex-col"
          >
            {/* Hero Image */}
            {selectedDraftItinerary && (
            <div className="w-full">
              <Image
                src={getItineraryImagePath(selectedDraftItinerary, 1)}
                alt="Trip destination"
                width={1200}
                height={800}
                priority
                className="w-full h-auto object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.dataset.hasTriedFallback === 'true') {
                    console.error('[IMAGE_LOAD_ERROR] Fallback also failed, stopping retry loop', target.src);
                    return;
                  }
                  console.error('[IMAGE_LOAD_ERROR]', target.src);
                  target.dataset.hasTriedFallback = 'true';
                  target.src = resolveItineraryImagePath({}, 1);
                }}
              />

              {/* Soft internal fade at bottom of hero */}
              <div className="pointer-events-none h-[25%] bg-gradient-to-t from-orange-50 to-transparent -mt-[25%]" />
            </div>
          )}

          {/* Trip Summary Card - Floating */}
          {structuralRoute && tripState && tripSummaryData && (() => {
          const { derived } = structuralRoute;
          const firstDate = derived.arrivalDates[Object.keys(derived.arrivalDates)[0]];
          const lastDate = derived.departureDates[Object.keys(derived.departureDates).pop() || ''];
          
          // Get destination name from tripState
          const destinationName = tripState.destination?.value || tripState.destination?.label || 'Your destination';
          
          // Get travel interests/styles (use interests if available, otherwise styles)
          const interests = (tripState as any).interests || tripState.styles || [];
          
          // Generate summary sentence
          const summarySentence = generateTripSummarySentence({
            destination: destinationName,
            durationDays: tripSummaryData.tripDuration,
            pace: tripState.pace,
            tags: interests,
          });
          
          // Get origin location
          const originLocation = tripState.fromLocation?.value || 
                                structuralRoute.outboundFlight?.fromCity || 
                                '';
          
          // Get number of travelers
          const adults = tripState.adults || 0;
          const kids = tripState.kids || 0;
          const totalTravelers = adults + kids;
          
          // Get locations with stays
          const stayCities = groupedCityStays().map(s => s.city);
          
          return (
            <div className="relative -mt-12 md:mt-12 mx-4 bg-white rounded-2xl shadow-xl px-6 py-6 pb-8 z-10">
              {/* Destination Title */}
              <div className="text-2xl font-bold text-foreground mb-3">
                {destinationName}
              </div>

              {/* Travel Interest Tags */}
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {interests.map((interestId: string) => (
                    <span
                      key={interestId}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-coral-light text-primary"
                    >
                      {getStyleDisplayName(interestId)}
                    </span>
                  ))}
                </div>
              )}

              {/* Summary Sentence */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {summarySentence}
              </p>

              {/* Trip Info Grid: Dates, Duration, Origin, Travelers */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Dates - Top Left */}
                {firstDate && lastDate && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/80">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Dates</div>
                      <div className="text-xs font-semibold text-foreground">{formatMonthDay(firstDate)} – {formatMonthDay(lastDate)}</div>
                          </div>
                        </div>
                )}

                {/* Duration - Top Right */}
                {tripSummaryData && tripSummaryData.tripDuration > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/80">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Duration</div>
                      <div className="text-xs font-semibold text-foreground">{tripSummaryData.tripDuration} {tripSummaryData.tripDuration === 1 ? 'day' : 'days'}</div>
                </div>
                  </div>
                )}

                {/* From - Bottom Left */}
                {originLocation && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/80">
                    <Plane className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">From</div>
                      <div className="text-xs font-semibold text-foreground">{originLocation}</div>
              </div>
            </div>
          )}

                {/* Travelers - Bottom Right */}
                {totalTravelers > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/80">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Travelers</div>
                      <div className="text-xs font-semibold text-foreground">{totalTravelers} {totalTravelers === 1 ? 'person' : 'people'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Row: Location Pins + Scroll Indicator */}
              {stayCities.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  {/* Left side - Location pins */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {stayCities.slice(0, 3).map((city, index) => (
                        <div key={index} className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 ring-2 ring-card flex items-center justify-center">
                          <MapPin className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stayCities.join(' → ')}
                    </span>
                  </div>

                  {/* Right side - Scroll indicator */}
              <button
                    onClick={scrollToContent}
                    className="flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    <span>Itinerary</span>
                    <motion.div
                      animate={{ y: [0, 3, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
              </button>
                </div>
              )}

              {/* Total Cost Block */}
              {(() => {
                // Calculate flight costs
                const outboundFlightPrice = structuralRoute.outboundFlight?.price || 0;
                const inboundFlightPrice = structuralRoute.inboundFlight?.price || 0;
                const flightCost = (outboundFlightPrice + inboundFlightPrice) * (totalTravelers || 1);
                const flightsBooked = outboundFlightPrice > 0 && inboundFlightPrice > 0;

                // Calculate hotel costs
                const selectedHotels = tripState.selectedHotels || {};
                const cityStays = groupedCityStays();
                let hotelCost = 0;
                let hotelsBooked = false;

                if (Object.keys(selectedHotels).length > 0) {
                  hotelsBooked = true;
                  cityStays.forEach((stay) => {
                    const normalizedCity = stay.city.toLowerCase().trim();
                    const hotelEntry = Object.entries(selectedHotels).find(([city]) => 
                      city.toLowerCase().trim() === normalizedCity
                    );
                    const hotel = hotelEntry ? (hotelEntry[1] as { pricePerNight?: number }) : null;
                    
                    // pricePerNight is per room, not per person
                    if (hotel && hotel.pricePerNight) {
                      hotelCost += hotel.pricePerNight * stay.nights;
                    }
                  });
                }

                const totalCost = flightCost + hotelCost;
                const hasBookings = flightsBooked || hotelsBooked;

                // Generate booking status message (under 5 words)
                let bookingStatusMessage = '';
                if (!flightsBooked && !hotelsBooked) {
                  bookingStatusMessage = 'Nothing booked yet';
                } else if (flightsBooked && !hotelsBooked) {
                  bookingStatusMessage = 'Flights booked';
                } else if (!flightsBooked && hotelsBooked) {
                  bookingStatusMessage = 'Hotels booked';
                } else {
                  bookingStatusMessage = 'Flights & hotels booked';
                }

                return (
                  <div className="pt-4 mt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">Total cost so far</span>
                      <span className="text-lg font-bold text-primary">
                        ${totalCost > 0 ? totalCost.toLocaleString() : '0'}
                      </span>
                    </div>
                    {hasBookings && (
                      <p className="text-xs text-muted-foreground">
                        {bookingStatusMessage}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

          {/* Scroll Indicator */}
          {showScrollIndicator && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-20">
              <ChevronDown className="w-6 h-6 text-gray-400 animate-bounce" />
            </div>
          )}
        </section>

          {/* Itinerary Section - Complete Timeline */}
          {/* Background is transparent - inherits parent gradient surface */}
          <section 
            ref={timelineSectionRef}
            className="relative px-4 pb-[180px]"
          >
          <div className="relative mb-6 flex items-center justify-between pt-8">
            <h2 id="day-wise-plan-header" ref={daywisePlanHeadingRef} className="text-sm font-medium text-gray-500">Day-wise plan</h2>
              <button
              onClick={() => router.push(routes.plan.map)}
              className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
              <MapIcon className="w-3 h-3" />
              <span>View route on map</span>
              </button>
              </div>
              
              {/* STAGE 4: Day-wise timeline with horizontal scrolling cards */}
              {renderDayWiseTimeline()}
          </section>

          {/* Sticky CTA - Only shows after scrolling into itinerary */}
          <div 
            className={`sticky bottom-20 w-full max-w-md mx-auto z-[60] transition-opacity duration-300 ${
              showCTA ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 border-t border-orange-100/50 px-6 py-4 shadow-lg">
              <p className="text-xs text-[#9CA3AF] text-center mb-3">
                We&apos;ll move to finalizing your trip once you&apos;re happy with this plan.
              </p>
              <button
                onClick={handleContinueToBookings}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#FE4C40] to-[#FF6B5A] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to bookings</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
              </div>
            </div>
              </div>

      <Footer />

    </>
  );
}
