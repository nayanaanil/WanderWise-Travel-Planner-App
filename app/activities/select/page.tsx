"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { StepHeader } from '@/components/StepHeader';
import { ActivityDecisionModal } from '@/components/ActivityDecisionModal';
import { evaluateActivityDecision, type ActivityDecisionInput, type TimeSlot } from '@/lib/decisions/activityDecisionEngine';
import { DecisionResult } from '@/lib/decisions/types';
import type { GeneratedActivity } from '@/app/api/agent/generate-activities/route';
import { getTripState, saveTripState } from '@/lib/tripState';
import { routes } from '@/lib/navigation';
import { useProcessing } from '@/lib/ProcessingContext';
import { rankActivities, type RankedActivity, getLabelText, getLabelBadgeClasses } from '@/lib/activities/rankActivities';
import { computeActivityMeaningfulDifferences, shouldProceedWithAI, resolveActivityByPriority, aggregateActivityTravelSignals } from '@/lib/activities/activityMeaningfulDifferences';
import { getEncouragementMessage, trackAgentDecisionSuccess, getAgentDecisionSuccessCount, getWatchfulMessage, shouldShowWatchfulMessage, markWatchfulMessageAsShown } from '@/lib/agentEncouragement';
import { AgentEncouragementMessage } from '@/components/AgentEncouragementMessage';

function ActivitySelectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startProcessing, stopProcessing } = useProcessing();
  const city = searchParams.get('city') || '';
  const day = searchParams.get('day') || '';
  const slotName = searchParams.get('slot') || 'day'; // This is now the slot name (day/night)
  const slotTime = (searchParams.get('slotTime') || 'day') as TimeSlot;
  const existingActivitiesParam = searchParams.get('existing') || '[]';

  const [activities, setActivities] = useState<GeneratedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDecision, setActiveDecision] = useState<DecisionResult | null>(null);
  const [activeExplanation, setActiveExplanation] = useState<{ summary: string; optionSummaries: Record<string, string> } | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<GeneratedActivity | null>(null);
  const [tripState, setTripState] = useState<any>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [dayActivitiesVersion, setDayActivitiesVersion] = useState(0); // Track changes to dayActivities
  
  // Activity Priority Guidance state
  const [activityPriorityGuidance, setActivityPriorityGuidance] = useState<{
    brief: string;
    priorities: Array<{ id: string; label: string; helper: string }>;
  } | null>(null);
  const [selectedActivityPriority, setSelectedActivityPriority] = useState<'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity' | null>(null);
  const [agentResolvedActivity, setAgentResolvedActivity] = useState<{
    activityId: string;
    priorityUsed: 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity';
  } | null>(null);
  // Store pre-resolved activities for all priorities to ensure distinct recommendations
  const [resolvedActivitiesByPriority, setResolvedActivitiesByPriority] = useState<Map<string, { activityId: string; priorityUsed: string }>>(new Map());
  const [showPriorityGuidance, setShowPriorityGuidance] = useState(false); // Control visibility of AI guidance
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
    if (activityPriorityGuidance) {
      setShowPriorityGuidance(true);
    }
  }, [activityPriorityGuidance]);

  // Listen for storage changes to reactively update when dayActivities changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dayActivities') {
        setDayActivitiesVersion(prev => prev + 1);
      }
    };
    
    // Also poll periodically to catch changes from same-tab updates
    const pollInterval = setInterval(() => {
      const stored = sessionStorage.getItem('dayActivities');
      const currentVersion = stored ? JSON.stringify(stored) : '';
      if (currentVersion !== sessionStorage.getItem('_dayActivitiesVersion')) {
        sessionStorage.setItem('_dayActivitiesVersion', currentVersion);
        setDayActivitiesVersion(prev => prev + 1);
      }
    }, 500);
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Get assigned activity IDs for the current city from dayActivities
  const assignedActivityIds = useMemo(() => {
    if (typeof window === 'undefined' || !city) {
      return new Set<string>();
    }
    
    try {
      const stored = sessionStorage.getItem('dayActivities');
      if (!stored) {
        return new Set<string>();
      }
      
      const dayActivities: { [date: string]: { day?: { id: string }; night?: { id: string } } } = JSON.parse(stored);
      
      // Get all activity IDs assigned for this city (across all dates and slots)
      // Note: We need to check if the date corresponds to this city
      // Since dayActivities is keyed by date, we need to match dates to cities via structuralRoute
      const assignedIds = new Set<string>();
      
      // Get structural route to map dates to cities
      const currentTripState = tripState || getTripState();
      const structuralRoute = currentTripState?.structuralRoute;
      
      if (structuralRoute?.derived?.arrivalDates && structuralRoute?.derived?.departureDates) {
        // Find all dates that correspond to this city
        const cityDates = new Set<string>();
        
        // Check arrival dates
        Object.entries(structuralRoute.derived.arrivalDates).forEach(([cityName, date]) => {
          if (cityName.toLowerCase().trim() === city.toLowerCase().trim() && typeof date === 'string') {
            cityDates.add(date);
          }
        });
        
        // Check departure dates (for multi-day stays)
        Object.entries(structuralRoute.derived.departureDates).forEach(([cityName, date]) => {
          if (cityName.toLowerCase().trim() === city.toLowerCase().trim() && typeof date === 'string') {
            // Add all dates between arrival and departure for this city
            const arrivalDate = structuralRoute.derived.arrivalDates[cityName];
            if (arrivalDate && typeof arrivalDate === 'string') {
              const arrival = new Date(arrivalDate);
              const departure = new Date(date);
              
              // Add all dates in the range
              for (let d = new Date(arrival); d <= departure; d.setDate(d.getDate() + 1)) {
                cityDates.add(d.toISOString().split('T')[0]);
              }
            }
          }
        });
        
        // Collect activity IDs from all dates for this city
        cityDates.forEach(date => {
          const dayData = dayActivities[date];
          if (dayData) {
            if (dayData.day?.id) {
              assignedIds.add(dayData.day.id);
            }
            if (dayData.night?.id) {
              assignedIds.add(dayData.night.id);
            }
          }
        });
      } else {
        // Fallback: if we can't map dates to cities, check all dates
        // This is less precise but ensures we don't show duplicates
        Object.values(dayActivities).forEach(dayData => {
          if (dayData.day?.id) {
            assignedIds.add(dayData.day.id);
          }
          if (dayData.night?.id) {
            assignedIds.add(dayData.night.id);
          }
        });
      }
      
      return assignedIds;
    } catch (e) {
      console.warn('[ActivitySelect] Failed to load dayActivities from sessionStorage:', e);
      return new Set<string>();
    }
  }, [city, tripState, dayActivitiesVersion]);

  // Filter out already assigned activities
  const availableActivities = useMemo(() => {
    if (!activities || activities.length === 0) {
      return [];
    }
    
    return activities.filter(activity => !assignedActivityIds.has(activity.id));
  }, [activities, assignedActivityIds]);

  // Rank activities at read-time (pure, stateless, recomputed on render)
  const rankedActivities = useMemo(() => {
    if (!availableActivities || availableActivities.length === 0 || !tripState) {
      return [];
    }
    
    // Get user interests from tripState
    const userInterests = (tripState as any).interests || tripState.styles || [];
    
    // Rank activities deterministically
    return rankActivities(availableActivities, userInterests);
  }, [availableActivities, tripState]);

  useEffect(() => {
    const currentTripState = getTripState();
    setTripState(currentTripState);

    if (!city || !day) {
      router.push(routes.plan.logistics);
      return;
    }

    // Helper function to trigger fallback fetch
    const triggerFallbackFetch = (tripState: any, cityKey: string) => {
      const pace = tripState.preferences?.pace || tripState.pace || 'moderate';
      
      // Get user context for personalization
      const userContext = {
        interests: (tripState as any).interests || tripState.styles || [],
        groupSize: (tripState.adults || 0) + (tripState.kids || 0),
        tripType: tripState.tripType,
      };

      startProcessing('Generating activities...');
      fetch('/api/agent/generate-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityKey, pace, userContext }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.activities && Array.isArray(data.activities)) {
            setActivities(data.activities);
            
            // Cache activities in tripState
            const updatedTripState = getTripState();
            if (!updatedTripState.generatedActivitiesByCity) {
              updatedTripState.generatedActivitiesByCity = {};
            }
            updatedTripState.generatedActivitiesByCity[cityKey.toLowerCase().trim()] = data.activities;
            saveTripState(updatedTripState);
          }
          setLoading(false);
          stopProcessing();
        })
        .catch(err => {
          console.error('[ActivitySelect] Failed to load activities:', err);
          setLoading(false);
          stopProcessing();
        });
    };

    // Read activities from cache (should always be prefetched by logistics page)
    const cachedActivities = currentTripState.generatedActivitiesByCity?.[city.toLowerCase().trim()];
    
    if (cachedActivities && Array.isArray(cachedActivities) && cachedActivities.length > 0) {
      // Use cached activities (cast to GeneratedActivity[] since they have the tags structure we need)
      setActivities(cachedActivities as GeneratedActivity[]);
      setLoading(false);
      return;
    }

    // Check prefetch status before triggering fallback
    const prefetchStatus = currentTripState.activityPrefetchStatus || 'idle';
    
    if (prefetchStatus === 'in_progress') {
      // Prefetch is still running - wait for it to complete
      console.log('[ActivitySelect] Prefetch in progress, waiting for cache to populate...');
      setLoading(true);
      
      // Poll for cache availability (prefetch should complete soon)
      const pollInterval = setInterval(() => {
        const latestState = getTripState();
        const latestCachedActivities = latestState.generatedActivitiesByCity?.[city.toLowerCase().trim()];
        const latestStatus = latestState.activityPrefetchStatus;
        
        if (latestCachedActivities && Array.isArray(latestCachedActivities) && latestCachedActivities.length > 0) {
          // Cache populated - use it (cast to GeneratedActivity[] since they have the tags structure we need)
          console.log('[ActivitySelect] Cache populated by prefetch');
          setActivities(latestCachedActivities as GeneratedActivity[]);
          setLoading(false);
          clearInterval(pollInterval);
        } else if (latestStatus === 'complete' || latestStatus === 'idle') {
          // Prefetch completed but no cache entry - trigger fallback
          console.warn('[ActivitySelect] Prefetch completed but no cache entry, triggering fallback');
          clearInterval(pollInterval);
          triggerFallbackFetch(currentTripState, city);
        }
      }, 200); // Poll every 200ms
      
      // Safety timeout: fallback after 5 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        const latestState = getTripState();
        const latestCachedActivities = latestState.generatedActivitiesByCity?.[city.toLowerCase().trim()];
        
        if (!latestCachedActivities || latestCachedActivities.length === 0) {
          console.warn('[ActivitySelect] Prefetch timeout, triggering fallback');
          triggerFallbackFetch(currentTripState, city);
        }
      }, 5000);
      
      return;
    }

    // Cache miss and prefetch is not in progress - trigger fallback
    console.warn('[ActivitySelect] Cache miss for city:', city, '- generating activities as fallback');
    triggerFallbackFetch(currentTripState, city);
  }, [city, day, router, startProcessing, stopProcessing]);

  // Fetch AI explanation when activeDecision changes and show modal
  useEffect(() => {
    if (!activeDecision || !tripState || !city) return;

    const pace = tripState.preferences?.pace || 'moderate';

    fetch('/api/agent/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: activeDecision,
        context: { pace, city },
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.summary && data.optionSummaries) {
          setActiveExplanation(data);
          setShowDecisionModal(true); // Show modal when explanation is ready
        }
      })
      .catch(err => {
        console.error('[ActivitySelect] Failed to load explanation:', err);
        // Use fallback
        if (activeDecision) {
          setActiveExplanation({
            summary: activeDecision.recommendation || activeDecision.facts.join('. '),
            optionSummaries: Object.fromEntries(
              activeDecision.options.map(opt => [opt.id, opt.description])
            ),
          });
          setShowDecisionModal(true); // Show modal even with fallback
        }
      });
  }, [activeDecision, tripState, city]);

  const handleActivitySelect = (activity: GeneratedActivity) => {
    // Check if user accepted agent pick
    const isAgentPick = agentResolvedActivity && 
      agentResolvedActivity.activityId === activity.id;
    
    if (isAgentPick && agentResolvedActivity) {
      // Track success and show encouragement
      const newCount = trackAgentDecisionSuccess();
      setAgentSuccessCount(newCount);
      const message = getEncouragementMessage('activity', agentResolvedActivity.priorityUsed, newCount);
      if (message) {
        setEncouragementMessage(message);
      }
    }
    
    setSelectedActivity(activity);

    // Parse existing activities from URL params
    let existingActivities: Array<{ id: string; name: string; timeSlot: TimeSlot; duration?: number; physicalEffort?: 'low' | 'medium' | 'high' }> = [];
    try {
      existingActivities = JSON.parse(existingActivitiesParam);
    } catch (e) {
      console.error('[ActivitySelect] Failed to parse existing activities:', e);
    }

    // Get structuralRoute to determine arrival day and other days in city
    const currentTripState = tripState || getTripState();
    const structuralRoute = currentTripState?.structuralRoute;
    
    // Check if this is the arrival day for the city
    let isArrivalDay = false;
    if (structuralRoute?.derived?.arrivalDates) {
      const cityArrivalDate = structuralRoute.derived.arrivalDates[city];
      if (cityArrivalDate && cityArrivalDate === day) {
        isArrivalDay = true;
      }
    }
    
    // Get all dates for this city and their activities
    const otherDaysInCity: Array<{
      date: string;
      activities: Array<{
        id: string;
        name: string;
        timeSlot: TimeSlot;
        physicalEffort?: 'low' | 'medium' | 'high';
      }>;
    }> = [];
    
    if (structuralRoute?.derived?.arrivalDates && structuralRoute?.derived?.departureDates) {
      // Fix Issue 3: Normalize city name for matching (case-insensitive, trimmed)
      const normalizedCity = city.toLowerCase().trim();
      
      // Try to find city with normalized name, fallback to original city name
      const cityArrivalDate = structuralRoute.derived.arrivalDates[normalizedCity] || 
                               structuralRoute.derived.arrivalDates[city];
      const cityDepartureDate = structuralRoute.derived.departureDates[normalizedCity] || 
                                 structuralRoute.derived.departureDates[city];
      
      if (cityArrivalDate && cityDepartureDate) {
        // Get dayActivities from sessionStorage
        let dayActivities: { [date: string]: { day?: { id: string; name: string }; night?: { id: string; name: string } } } = {};
        if (typeof window !== 'undefined') {
          try {
            const stored = sessionStorage.getItem('dayActivities');
            if (stored) {
              dayActivities = JSON.parse(stored);
            }
          } catch (e) {
            console.warn('[ActivitySelect] Failed to load dayActivities:', e);
          }
        }
        
        // Generate all dates between arrival and departure
        const arrival = new Date(cityArrivalDate);
        const departure = new Date(cityDepartureDate);
        
        for (let d = new Date(arrival); d <= departure; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // Fix Issue 3: Validate date is within city's date range (safety check)
          const dateTime = d.getTime();
          const arrivalTime = arrival.getTime();
          const departureTime = departure.getTime();
          
          // Skip if date is outside city's range (shouldn't happen, but safety check)
          if (dateTime < arrivalTime || dateTime > departureTime) {
            continue;
          }
          
          // Skip the current day (we're evaluating for this day)
          if (dateStr === day) {
            continue;
          }
          
          // Get activities for this date from dayActivities
          const dayData = dayActivities[dateStr];
          const activitiesForDay: Array<{
            id: string;
            name: string;
            timeSlot: TimeSlot;
            physicalEffort?: 'low' | 'medium' | 'high';
          }> = [];
          
          if (dayData) {
            if (dayData.day) {
              // Try to get physicalEffort from the activity metadata
              // We need to look it up from the generated activities
              const dayActivity = dayData.day;
              const fullActivity = availableActivities.find(a => a.id === dayActivity.id);
              activitiesForDay.push({
                id: dayActivity.id,
                name: dayActivity.name,
                timeSlot: 'day',
                physicalEffort: fullActivity?.physicalEffort,
              });
            }
            if (dayData.night) {
              const nightActivity = dayData.night;
              const fullActivity = availableActivities.find(a => a.id === nightActivity.id);
              activitiesForDay.push({
                id: nightActivity.id,
                name: nightActivity.name,
                timeSlot: 'night',
                physicalEffort: fullActivity?.physicalEffort,
              });
            }
          }
          
          otherDaysInCity.push({
            date: dateStr,
            activities: activitiesForDay,
          });
        }
      }
    }

    // Map activity bestTime to TimeSlot (simplified to day/night)
    const mapBestTimeToSlot = (bestTime: string): TimeSlot | null => {
      if (bestTime === 'early_morning' || bestTime === 'morning' || bestTime === 'afternoon') return 'day';
      if (bestTime === 'evening' || bestTime === 'night') return 'night';
      return null;
    };

    const bestTimeSlots = activity.tags.bestTime
      .map(mapBestTimeToSlot)
      .filter((slot): slot is TimeSlot => slot !== null);

    // Get flight duration for arrival-day fatigue check
    let flightDurationHours: number | undefined;
    if (isArrivalDay && currentTripState?.selectedFlights?.outbound) {
      // Try to get flight duration from outbound flight
      const outboundFlight = currentTripState.selectedFlights.outbound;
      if (outboundFlight.duration) {
        flightDurationHours = outboundFlight.duration;
      } else if (outboundFlight.durationHours) {
        flightDurationHours = outboundFlight.durationHours;
      }
    }

    // Get full activity details for existing activities to check durationSlots
    const allActivities: GeneratedActivity[] = (currentTripState?.generatedActivitiesByCity?.[city.toLowerCase().trim()] || []) as GeneratedActivity[];
    const existingActivitiesWithDetails = existingActivities.map(act => {
      const fullActivity = allActivities.find((a: GeneratedActivity) => a.id === act.id);
      return {
        id: act.id,
        name: act.name,
        timeSlot: act.timeSlot,
        duration: act.duration,
        physicalEffort: act.physicalEffort,
        durationSlots: fullActivity?.durationSlots as 1 | 2 | undefined,
      };
    });

    // Build allCityActivities and allCityActivityDetails for smart reorder
    let allCityActivities: Array<{ date: string; day?: { id: string; name: string }; night?: { id: string; name: string } }> = [];
    let allCityActivityDetails: Array<{ id: string; name: string; physicalEffort?: 'low' | 'medium' | 'high'; durationSlots?: 1 | 2; bestTime?: TimeSlot | TimeSlot[]; timingSensitivity?: 'low' | 'medium' | 'high' }> = [];
    
    if (structuralRoute?.derived?.arrivalDates && structuralRoute?.derived?.departureDates) {
      // Fix Issue 3: Normalize city name for matching (case-insensitive, trimmed)
      const normalizedCity = city.toLowerCase().trim();
      
      // Try to find city with normalized name, fallback to original city name
      const cityArrivalDate = structuralRoute.derived.arrivalDates[normalizedCity] || 
                               structuralRoute.derived.arrivalDates[city];
      const cityDepartureDate = structuralRoute.derived.departureDates[normalizedCity] || 
                                 structuralRoute.derived.departureDates[city];
      
      if (cityArrivalDate && cityDepartureDate) {
        // Get dayActivities from sessionStorage
        let dayActivities: { [date: string]: { day?: { id: string; name: string }; night?: { id: string; name: string } } } = {};
        if (typeof window !== 'undefined') {
          try {
            const stored = sessionStorage.getItem('dayActivities');
            if (stored) {
              dayActivities = JSON.parse(stored);
            }
          } catch (e) {
            console.warn('[ActivitySelect] Failed to load dayActivities:', e);
          }
        }
        
        // Generate all dates between arrival and departure
        const arrival = new Date(cityArrivalDate);
        const departure = new Date(cityDepartureDate);
        
        const activityIds = new Set<string>();
        
        for (let d = new Date(arrival); d <= departure; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // Fix Issue 3: Validate date is within city's date range (safety check)
          const dateTime = d.getTime();
          const arrivalTime = arrival.getTime();
          const departureTime = departure.getTime();
          
          // Skip if date is outside city's range (shouldn't happen, but safety check)
          if (dateTime < arrivalTime || dateTime > departureTime) {
            continue;
          }
          
          const dayData = dayActivities[dateStr] || {};
          
          allCityActivities.push({
            date: dateStr,
            day: dayData.day,
            night: dayData.night,
          });
          
          if (dayData.day) activityIds.add(dayData.day.id);
          if (dayData.night) activityIds.add(dayData.night.id);
        }
        
        // Build allCityActivityDetails from all activities
        allCityActivityDetails = Array.from(activityIds)
          .map(id => {
            const fullActivity = allActivities.find((a: GeneratedActivity) => a.id === id);
            if (!fullActivity) return null;
            
            const bestTimeSlots = fullActivity.tags.bestTime
              .map((bt: string) => {
                if (bt === 'early_morning' || bt === 'morning' || bt === 'afternoon') return 'day';
                if (bt === 'evening' || bt === 'night') return 'night';
                return null;
              })
              .filter((slot): slot is TimeSlot => slot !== null);
            
            return {
              id: fullActivity.id,
              name: fullActivity.name,
              physicalEffort: fullActivity.physicalEffort,
              durationSlots: fullActivity.durationSlots as 1 | 2,
              bestTime: bestTimeSlots.length > 0 ? (bestTimeSlots.length === 1 ? bestTimeSlots[0] : bestTimeSlots) : undefined,
              timingSensitivity: fullActivity.timingSensitivity,
            };
          })
          .filter((a): a is NonNullable<typeof a> => a !== null);
      }
    }

    // PART 1 & 3: Evaluate decision with existing activities and requested slot
    const decisionInput: ActivityDecisionInput = {
      activity: {
        id: activity.id,
        name: activity.name,
        bestTime: bestTimeSlots.length > 0 ? (bestTimeSlots.length === 1 ? bestTimeSlots[0] : bestTimeSlots) : undefined,
        duration: activity.tags.durationSlots === 1 ? 3 : 5,
        physicalEffort: activity.physicalEffort,
        durationSlots: activity.durationSlots as 1 | 2,
      },
      day: { date: day, city },
      requestedSlot: slotTime, // PART 1: Pass requested slot for override option
      existingActivities: existingActivitiesWithDetails,
      isArrivalDay,
      otherDaysInCity,
      flightDurationHours,
      allCityActivities,
      allCityActivityDetails,
    };

    const decision = evaluateActivityDecision(decisionInput);
    
    // PART 1: Skip impact UI if status is OK and there's only one obvious option
    if (decision.status === 'OK' && decision.options.length === 1 && decision.options[0].action.type === 'SCHEDULE_ACTIVITY') {
      // Apply silently without showing modal
      const payload = decision.options[0].action.payload;
      const finalSlot = payload?.timeSlot || slotTime;
      const params = new URLSearchParams({
        scheduledActivity: activity.id,
        scheduledDate: day,
        scheduledSlot: finalSlot,
        scheduledName: activity.name,
        slot: finalSlot, // finalSlot is already 'day' or 'night' from decision engine
      });
      router.push(`/plan/logistics?${params.toString()}`);
      return;
    }
    
    setActiveDecision(decision);
    setActiveExplanation(null); // Will be loaded by useEffect
  };

  const handleOptionSelect = (option: DecisionResult['options'][0]) => {
    if (!selectedActivity) return;
    setIsApplying(true);

    const actionType = option.action.type;
    const payload = option.action.payload;

    // PART 4: Apply only the chosen option - no auto-resolution
    // MOVE_AND_ADD requires moving one activity and adding another
    if (actionType === 'MOVE_AND_ADD' && payload) {
      // Parse existing activities from URL params
      let existingActivities: Array<{ id: string; name: string; timeSlot: TimeSlot; duration?: number }> = [];
      try {
        existingActivities = JSON.parse(existingActivitiesParam);
      } catch (e) {
        console.error('[ActivitySelect] Failed to parse existing activities:', e);
      }
      
      // Find the activity being moved to get its name
      const activityToMove = existingActivities.find((a: { id: string; name: string }) => a.id === payload.moveActivityId);
      const moveActivityName = activityToMove?.name || '';
      
      // Use composite action format to handle both operations atomically
      const compositeParams = new URLSearchParams({
        action: 'MOVE_AND_ADD',
        moveActivityId: payload.moveActivityId,
        moveActivityName: moveActivityName,
        moveToSlot: payload.moveToSlot,
        addActivityId: payload.addActivityId,
        addToSlot: payload.addToSlot,
        addActivityName: selectedActivity.name,
        scheduledDate: day,
      });
      router.push(`/plan/logistics?${compositeParams.toString()}`);
      return;
    }

    // PART 5: Handle SWAP_ACTIVITIES action (for high-effort day-swap suggestions)
    if (actionType === 'SWAP_ACTIVITIES' && payload) {
      const swapParams = new URLSearchParams({
        action: 'SWAP_ACTIVITIES',
        activity1Id: payload.activity1Id,
        activity1NewDate: payload.activity1NewDate,
        activity1NewSlot: payload.activity1NewSlot,
        activity1Name: selectedActivity.name,
        activity2Id: payload.activity2Id,
        activity2NewDate: payload.activity2NewDate,
        activity2NewSlot: payload.activity2NewSlot,
      });
      router.push(`/plan/logistics?${swapParams.toString()}`);
      return;
    }

    // PART 6: Handle SMART_REORDER action (for smart reorder suggestions)
    if (actionType === 'SMART_REORDER' && payload) {
      const smartReorderParams = new URLSearchParams({
        action: 'SMART_REORDER',
        activityId: payload.activityId,
        targetDate: payload.targetDate,
        targetSlot: payload.targetSlot,
        moves: JSON.stringify(payload.moves || []),
      });
      router.push(`/plan/logistics?${smartReorderParams.toString()}`);
      return;
    }

    // Standard single-activity actions
    let finalSlot = slotTime;
    let finalActivityId = selectedActivity.id;
    let finalDate = day; // Default to original day
    let removeActivityId: string | undefined = undefined;

    if (actionType === 'SCHEDULE_ACTIVITY' && payload?.timeSlot) {
      finalSlot = payload.timeSlot;
      finalActivityId = payload.activityId || selectedActivity.id;
      // Fix Issue 1: Extract date from payload if provided (for move-to-different-day suggestions)
      finalDate = payload.date || day;
    } else if (actionType === 'REPLACE_ACTIVITY' && payload?.addActivityId) {
      finalActivityId = payload.addActivityId;
      finalSlot = payload.timeSlot || slotTime;
      removeActivityId = payload.removeActivityId;
    } else if (actionType === 'MOVE_TO_SLOT' && payload?.timeSlot) {
      finalSlot = payload.timeSlot;
      finalActivityId = payload.activityId || selectedActivity.id;
      // Extract date if provided
      finalDate = payload.date || day;
    } else if (actionType === 'PROCEED_ANYWAY' && payload?.activityId && payload?.timeSlot) {
      finalActivityId = payload.activityId;
      finalSlot = payload.timeSlot;
      // Extract date if provided
      finalDate = payload.date || day;
    }

    // Build URL params
    const params = new URLSearchParams({
      scheduledActivity: finalActivityId,
      scheduledDate: finalDate, // Use extracted date instead of original day
      scheduledSlot: finalSlot,
      scheduledName: selectedActivity.name,
      slot: finalSlot, // finalSlot is already 'day' or 'night' from decision engine
    });
    
    if (removeActivityId) {
      params.set('removeActivity', removeActivityId);
    }

    // Navigate back to logistics page with scheduled activity in URL params
    router.push(`/plan/logistics?${params.toString()}`);
  };

  const handleModalClose = () => {
    if (!isApplying) {
      setShowDecisionModal(false);
      setActiveDecision(null);
      setActiveExplanation(null);
      setSelectedActivity(null);
    }
  };

  const handleBack = () => {
    router.push(routes.plan.logistics);
  };

  // Aggregate activity facts for priority guidance
  const aggregateActivityFacts = (activities: GeneratedActivity[]) => {
    const totalActivities = activities.length;
    
    // Timing mix
    const timingMix = {
      early_morning: 0,
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
    
    // Timing sensitivity mix
    const timingSensitivityMix = {
      low: 0,
      medium: 0,
      high: 0,
    };
    
    // Crowd level mix
    const crowdLevelMix = {
      low: 0,
      medium: 0,
      high: 0,
    };
    
    // Physical effort mix
    const physicalEffortMix = {
      low: 0,
      medium: 0,
      high: 0,
    };
    
    // Duration mix
    const durationMix = {
      short: 0, // durationSlots === 1
      long: 0, // durationSlots === 2
    };
    
    // Environment mix
    const environmentMix = {
      indoor: 0,
      outdoor: 0,
      mixed: 0,
    };
    
    // Constraints mix
    const constraintsMix = {
      requiresDaylight: 0,
      weatherDependent: 0,
      noConstraints: 0,
    };
    
    activities.forEach(activity => {
      // Count timing occurrences
      activity.bestTime.forEach(time => {
        if (time in timingMix) {
          timingMix[time as keyof typeof timingMix]++;
        }
      });
      
      // Count timing sensitivity
      if (activity.timingSensitivity in timingSensitivityMix) {
        timingSensitivityMix[activity.timingSensitivity]++;
      }
      
      // Count crowd level
      if (activity.crowdLevel in crowdLevelMix) {
        crowdLevelMix[activity.crowdLevel]++;
      }
      
      // Count physical effort
      if (activity.physicalEffort in physicalEffortMix) {
        physicalEffortMix[activity.physicalEffort]++;
      }
      
      // Count duration
      if (activity.durationSlots === 1) {
        durationMix.short++;
      } else if (activity.durationSlots === 2) {
        durationMix.long++;
      }
      
      // Count environment
      if (activity.environment in environmentMix) {
        environmentMix[activity.environment]++;
      }
      
      // Count constraints
      if (activity.constraints?.requiresDaylight === true) {
        constraintsMix.requiresDaylight++;
      } else if (activity.constraints?.weatherDependent === true) {
        constraintsMix.weatherDependent++;
      } else {
        constraintsMix.noConstraints++;
      }
    });
    
    return {
      totalActivities,
      timingMix,
      timingSensitivityMix,
      crowdLevelMix,
      physicalEffortMix,
      durationMix,
      environmentMix,
      constraintsMix,
    };
  };

  // Generate activity recommendation explanation (template-based, no AI)
  const generateActivityRecommendationExplanation = (
    priority: 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity',
    activity: GeneratedActivity,
    slotName: string
  ): { explanation: string; acceptedTradeoff: string } => {
    const slotLabel = slotName.charAt(0).toUpperCase() + slotName.slice(1);
    
    if (priority === 'timingFit') {
      const isFlexible = activity.timingSensitivity === 'low' || activity.timingReason === 'flexible';
      if (isFlexible) {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity fits naturally into your schedule with flexible timing.`,
          acceptedTradeoff: 'May have more crowds or require more energy',
        };
      } else {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity fits well into your schedule timing.`,
          acceptedTradeoff: 'May require specific timing or have less flexibility',
        };
      }
    } else if (priority === 'crowdDensity') {
      if (activity.crowdLevel === 'low') {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity has lower crowds for a more relaxed experience.`,
          acceptedTradeoff: 'May have less flexible timing or require more planning',
        };
      } else {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity offers the best crowd experience among your options.`,
          acceptedTradeoff: 'May be more popular or require advance booking',
        };
      }
    } else if (priority === 'energyDemand') {
      const pace = tripState?.preferences?.pace || tripState?.pace || 'moderate';
      const targetEffort = pace === 'relaxed' ? 'low' : pace === 'packed' ? 'high' : 'medium';
      
      if (activity.physicalEffort === targetEffort) {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity matches your energy level for the day.`,
          acceptedTradeoff: 'May have different timing or crowd levels',
        };
      } else {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity best matches your preferred pace.`,
          acceptedTradeoff: 'May require adjusting your energy expectations',
        };
      }
    } else if (priority === 'rigidity') {
      const isFlexible = activity.timingSensitivity === 'low' && 
                        !activity.constraints?.requiresDaylight && 
                        !activity.constraints?.weatherDependent;
      if (isFlexible) {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity offers flexible timing to fit your schedule.`,
          acceptedTradeoff: 'May have more crowds or less optimal experience timing',
        };
      } else {
        return {
          explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}. This activity offers the best balance of flexibility among your options.`,
          acceptedTradeoff: 'May require specific timing or weather conditions',
        };
      }
    }
    
    return {
      explanation: `For this ${slotLabel.toLowerCase()} slot, pick: ${activity.name}.`,
      acceptedTradeoff: 'Consider your other priorities as well',
    };
  };

  // Fetch activity priority guidance when activities are loaded
  useEffect(() => {
    if (!availableActivities || availableActivities.length === 0 || !tripState || !city) {
      setActivityPriorityGuidance(null);
      setAgentResolvedActivity(null);
      setResolvedActivitiesByPriority(new Map());
      return;
    }

    try {
      // Compute meaningful differences using filtered activities
      const meaningfulDifferences = computeActivityMeaningfulDifferences(availableActivities);
      
      // Only proceed if 2+ dimensions differ
      if (!shouldProceedWithAI(meaningfulDifferences)) {
        setActivityPriorityGuidance(null);
        setAgentResolvedActivity(null);
        setResolvedActivitiesByPriority(new Map());
        return;
      }
      
      // Aggregate activity facts using filtered activities
      const aggregatedFacts = aggregateActivityFacts(availableActivities);
      
      // Derive travel signals using filtered activities
      const travelSignals = aggregateActivityTravelSignals(availableActivities);
      
      // Get trip context
      const pace = tripState.preferences?.pace || tripState.pace || 'moderate';
      const tripContext = {
        pace: tripState.pace,
        interests: tripState.styles || (tripState as any).interests || [],
        travelers: {
          adults: tripState.adults || 1,
          kids: tripState.kids || 0,
        },
        tripDurationDays: tripState.structuralRoute?.derived?.totalTripDays,
      };
      
      const payload = {
        city,
        pace: pace as 'relaxed' | 'moderate' | 'packed',
        tripContext,
        aggregatedFacts,
        meaningfulDifferences,
        travelSignals,
      };
      
      fetch('/api/agent/activity-priority-guidance', {
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
            // Pre-resolve activities for all priorities to ensure distinct recommendations
            const pace = tripState?.preferences?.pace || tripState?.pace || 'moderate';
            const resolvedMap = new Map<string, { activityId: string; priorityUsed: string }>();
            const excludeIds: string[] = [];

            // Build context for slot- and day-aware resolution
            let dayActivitiesForContext: { day?: { id: string; name: string }; night?: { id: string; name: string } } = {};
            let existingActivityDetails: GeneratedActivity[] = [];

            try {
              // Get current day's activities from sessionStorage
              if (typeof window !== 'undefined' && day) {
                const stored = sessionStorage.getItem('dayActivities');
                if (stored) {
                  const dayActivities: { [date: string]: { day?: { id: string; name: string }; night?: { id: string; name: string } } } = JSON.parse(stored);
                  dayActivitiesForContext = dayActivities[day] || {};

                  // Get full activity details for the OTHER slot's activity (for energy balancing)
                  // We only need to balance with the other slot, not the same slot
                  const otherSlot = slotTime === 'day' ? 'night' : 'day';
                  const otherSlotActivityId = otherSlot === 'day' 
                    ? dayActivitiesForContext.day?.id 
                    : dayActivitiesForContext.night?.id;

                  if (otherSlotActivityId) {
                    // Match ID to full activity object from availableActivities or all activities
                    const allActivities: GeneratedActivity[] = availableActivities.length > 0 
                      ? availableActivities 
                      : ((tripState?.generatedActivitiesByCity?.[city.toLowerCase().trim()] || []) as GeneratedActivity[]);
                    
                    const otherSlotActivity = allActivities.find((a: GeneratedActivity) => a.id === otherSlotActivityId);
                    if (otherSlotActivity) {
                      existingActivityDetails = [otherSlotActivity];
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('[ActivitySelect] Failed to load dayActivities for context:', e);
            }

            const resolutionContext = {
              slot: slotTime,
              date: day,
              dayActivities: dayActivitiesForContext,
              existingActivityDetails,
            };

            // Resolve each priority, excluding previously resolved activities
            for (const priority of data.priorities) {
              const priorityId = priority.id as 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity';
              const resolved = resolveActivityByPriority(
                priorityId,
                availableActivities,
                pace as 'relaxed' | 'moderate' | 'packed',
                excludeIds,
                resolutionContext
              );

              if (resolved) {
                resolvedMap.set(priorityId, resolved);
                excludeIds.push(resolved.activityId); // Exclude this activity from subsequent resolutions
              }
            }

            // Validation: Check for duplicates and count distinct activities
            const resolvedActivityIds = Array.from(resolvedMap.values()).map(r => r.activityId);
            const distinctActivityIds = new Set(resolvedActivityIds);
            const hasDuplicates = resolvedActivityIds.length !== distinctActivityIds.size;
            const distinctCount = distinctActivityIds.size;

            // Collapse to brief-only if fewer than 2 distinct activities or duplicates detected
            if (hasDuplicates || distinctCount < 2) {
              setActivityPriorityGuidance({
                brief: data.brief,
                priorities: [], // Collapse to brief-only
              });
              setResolvedActivitiesByPriority(new Map());
            } else {
              setActivityPriorityGuidance(data);
              setResolvedActivitiesByPriority(resolvedMap);
            }
          } else {
            setActivityPriorityGuidance(null);
            setResolvedActivitiesByPriority(new Map());
          }
        })
        .catch((err) => {
          console.error('[ActivityPriorityGuidance] Failed to fetch guidance', err);
          setActivityPriorityGuidance(null);
          setResolvedActivitiesByPriority(new Map());
        });
    } catch (err) {
      console.error('[ActivityPriorityGuidance] Failed to prepare guidance payload', err);
      setActivityPriorityGuidance(null);
      setAgentResolvedActivity(null);
      setResolvedActivitiesByPriority(new Map());
    }
  }, [availableActivities, tripState, city]);

  // Resolve activity when priority is selected (use pre-resolved activities)
  useEffect(() => {
    if (selectedActivityPriority && resolvedActivitiesByPriority.has(selectedActivityPriority)) {
      const resolved = resolvedActivitiesByPriority.get(selectedActivityPriority);
      if (resolved) {
        setAgentResolvedActivity({
          activityId: resolved.activityId,
          priorityUsed: resolved.priorityUsed as 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity',
        });
      } else {
        setAgentResolvedActivity(null);
      }
    } else if (!selectedActivityPriority) {
      setAgentResolvedActivity(null);
    }
  }, [selectedActivityPriority, resolvedActivitiesByPriority]);

  if (loading) {
    return (
      <>
        <StepHeader title="Select Activity" currentStep={9} totalSteps={10} onBack={handleBack} />
        <div className="flex items-center justify-center min-h-[100dvh]">
          <div className="text-center">
            <div className="text-gray-500 mb-2">Loading activities...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StepHeader title={`Activities in ${city}`} currentStep={9} totalSteps={10} onBack={handleBack} />
      <div className="max-w-md mx-auto pb-32 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 min-h-[100dvh]">
        <div className="px-4 py-6 pt-[120px]">
          <div className="mb-4 relative">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Choose an activity</h2>
            <p className="text-sm text-gray-600">
              Select an activity to add to your {slotName} slot
            </p>

            {/* Main Compass Icon - Top Right */}
            {activityPriorityGuidance && (
              <div className="absolute top-0 right-0 relative">
                <motion.button
                  type="button"
                  onClick={() => setShowPriorityGuidance(!showPriorityGuidance)}
                  className="flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  aria-label="Get activity guidance"
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

          {/* Activity Priority Guidance */}
          {activityPriorityGuidance && showPriorityGuidance && (
            <section className="mb-6 p-4 rounded-xl bg-gradient-to-br from-[#FFF5F4] via-white to-[#FFF5F4] border border-[#FED7D2] shadow-sm">
              <p className={`text-sm text-[#4B5563] ${activityPriorityGuidance.priorities.length > 0 ? 'mb-3' : ''}`}>
                {activityPriorityGuidance.brief}
              </p>
              {/* Watchful message after 4+ successes (once per session) */}
              {shouldShowWatchfulMsg && (
                <p className="text-xs text-[#6B7280] italic mt-3 pt-3 border-t border-orange-200">
                  {getWatchfulMessage()}
                </p>
              )}
              {/* Only render priorities if array is not empty AND we have distinct resolved activities */}
              {(() => {
                // Validation guard: Check for duplicates and distinct count
                const resolvedActivityIds = Array.from(resolvedActivitiesByPriority.values()).map(r => r.activityId);
                const distinctActivityIds = new Set(resolvedActivityIds);
                const hasDuplicates = resolvedActivityIds.length !== distinctActivityIds.size;
                const distinctCount = distinctActivityIds.size;
                const shouldShowPriorities = 
                  activityPriorityGuidance.priorities.length > 0 && 
                  !hasDuplicates && 
                  distinctCount >= 2;

                return shouldShowPriorities ? (
                <div className="flex flex-col gap-2">
                  {activityPriorityGuidance.priorities.map((priority) => {
                    const isSelected = selectedActivityPriority === priority.id;
                    return (
                      <button
                        key={priority.id}
                        type="button"
                        onClick={() =>
                          setSelectedActivityPriority(
                            selectedActivityPriority === priority.id ? null : priority.id as 'timingFit' | 'crowdDensity' | 'energyDemand' | 'rigidity'
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
                ) : null;
              })()}

              {/* Agent Pick Section - Shows after priority is selected */}
              {selectedActivityPriority && agentResolvedActivity && (() => {
                const resolvedActivity = availableActivities.find(a => a.id === agentResolvedActivity.activityId);
                
                if (!resolvedActivity) {
                  return null;
                }

                const { explanation, acceptedTradeoff } = generateActivityRecommendationExplanation(
                  agentResolvedActivity.priorityUsed,
                  resolvedActivity,
                  slotName
                );

                return (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Compass className="w-5 h-5 text-orange-500" />
                      <h3 className="text-sm font-semibold text-[#1F2937]">WanderWise Agent Pick</h3>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-orange-200 mb-3">
                      <p className="text-sm text-[#4B5563] mb-2 leading-relaxed">
                        {explanation}
                      </p>
                      <p className="text-xs text-[#6B7280] italic">
                        Accepted tradeoff: {acceptedTradeoff}
                      </p>
                    </div>
                    <button
                      onClick={() => handleActivitySelect(resolvedActivity)}
                      className="w-full px-4 py-2 bg-[#FE4C40] text-white font-medium rounded-lg hover:bg-[#E63C30] transition-colors"
                    >
                      Add this activity
                    </button>
                  </div>
                );
              })()}
            </section>
          )}

          {/* Activity List */}
          <div className="space-y-3 mb-6">
            {rankedActivities.map((activity) => (
              <div
                key={activity.id}
                className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#FE4C40] transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 flex-1">
                        {activity.name}
                      </h4>
                      {activity.label && (
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getLabelBadgeClasses(activity.label)}`}>
                          {getLabelText(activity.label)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-2">
                      {activity.description}
                    </p>
                    {(activity.tags.bestTime.length > 0 || activity.physicalEffort) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.tags.bestTime.map((time, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                          >
                            {time.replace('_', ' ')}
                          </span>
                        ))}
                        {activity.physicalEffort && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full capitalize">
                            {activity.physicalEffort} effort
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="w-full py-2 px-3 bg-[#FE4C40] hover:bg-[#E63C30] text-white text-xs font-semibold rounded-lg transition-colors"
                  onClick={() => handleActivitySelect(activity)}
                >
                  Select activity
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Activity Decision Modal */}
      <ActivityDecisionModal
        isOpen={showDecisionModal}
        onClose={handleModalClose}
        onSelectOption={handleOptionSelect}
        decision={activeDecision}
        explanation={activeExplanation}
        activityName={selectedActivity?.name}
        isApplying={isApplying}
      />
    </>
  );
}

export default function ActivitySelectPage() {
  return (
    <Suspense fallback={
      <>
        <StepHeader title="Select Activity" currentStep={9} totalSteps={10} onBack={() => {}} />
        <div className="flex items-center justify-center min-h-[100dvh]">
          <div className="text-center">
            <div className="text-gray-500 mb-2">Loading...</div>
          </div>
        </div>
      </>
    }>
      <ActivitySelectPageContent />
    </Suspense>
  );
}

