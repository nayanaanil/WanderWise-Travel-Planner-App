"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';
import { ActivityDecisionModal } from '@/components/ActivityDecisionModal';
import { evaluateActivityDecision, type ActivityDecisionInput, type TimeSlot } from '@/lib/decisions/activityDecisionEngine';
import { DecisionResult } from '@/lib/decisions/types';
import type { GeneratedActivity } from '@/app/api/agent/generate-activities/route';
import { getTripState, saveTripState } from '@/lib/tripState';
import { routes } from '@/lib/navigation';
import { useProcessing } from '@/lib/ProcessingContext';
import { rankActivities, type RankedActivity, getLabelText, getLabelBadgeClasses } from '@/lib/activities/rankActivities';

export default function ActivitySelectPage() {
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

  // Rank activities at read-time (pure, stateless, recomputed on render)
  const rankedActivities = useMemo(() => {
    if (!activities || activities.length === 0 || !tripState) {
      return [];
    }
    
    // Get user interests from tripState
    const userInterests = (tripState as any).interests || tripState.styles || [];
    
    // Rank activities deterministically
    return rankActivities(activities, userInterests);
  }, [activities, tripState]);

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
    setSelectedActivity(activity);

    // Parse existing activities from URL params
    let existingActivities: Array<{ id: string; name: string; timeSlot: TimeSlot; duration?: number }> = [];
    try {
      existingActivities = JSON.parse(existingActivitiesParam);
    } catch (e) {
      console.error('[ActivitySelect] Failed to parse existing activities:', e);
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

    // PART 1 & 3: Evaluate decision with existing activities and requested slot
    const decisionInput: ActivityDecisionInput = {
      activity: {
        id: activity.id,
        name: activity.name,
        bestTime: bestTimeSlots.length > 0 ? (bestTimeSlots.length === 1 ? bestTimeSlots[0] : bestTimeSlots) : undefined,
        duration: activity.tags.durationSlots === 1 ? 3 : 5,
      },
      day: { date: day, city },
      requestedSlot: slotTime, // PART 1: Pass requested slot for override option
      existingActivities,
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

    // Standard single-activity actions
    let finalSlot = slotTime;
    let finalActivityId = selectedActivity.id;
    let removeActivityId: string | undefined = undefined;

    if (actionType === 'SCHEDULE_ACTIVITY' && payload?.timeSlot) {
      finalSlot = payload.timeSlot;
      finalActivityId = payload.activityId || selectedActivity.id;
    } else if (actionType === 'REPLACE_ACTIVITY' && payload?.addActivityId) {
      finalActivityId = payload.addActivityId;
      finalSlot = payload.timeSlot || slotTime;
      removeActivityId = payload.removeActivityId;
    } else if (actionType === 'MOVE_TO_SLOT' && payload?.timeSlot) {
      finalSlot = payload.timeSlot;
      finalActivityId = payload.activityId || selectedActivity.id;
    } else if (actionType === 'PROCEED_ANYWAY' && payload?.activityId && payload?.timeSlot) {
      finalActivityId = payload.activityId;
      finalSlot = payload.timeSlot;
    }

    // Build URL params
    const params = new URLSearchParams({
      scheduledActivity: finalActivityId,
      scheduledDate: day,
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

  if (loading) {
    return (
      <>
        <StepHeader title="Select Activity" currentStep={9} totalSteps={10} onBack={handleBack} />
        <div className="flex items-center justify-center min-h-screen">
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
      <div className="max-w-md mx-auto pb-32 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 min-h-screen">
        <div className="px-4 py-6 pt-[120px]">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Choose an activity</h2>
            <p className="text-sm text-gray-600">
              Select an activity to add to your day
            </p>
          </div>

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
                    {activity.tags.bestTime.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.tags.bestTime.map((time, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                          >
                            {time.replace('_', ' ')}
                          </span>
                        ))}
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

