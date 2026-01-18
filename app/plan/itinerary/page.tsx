"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { routes } from '@/lib/navigation';
import { getTripState, setSelectedDraftItinerary, DraftItinerary } from '@/lib/tripState';
import { getItineraryImagePath } from '@/lib/itineraryImages';
import { MapPin, ChevronRight, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Helper function to decode HTML entities and escape sequences in text
 */
function decodeHtmlEntities(text: string): string {
  // First, decode standard HTML entities using the browser's built-in decoder
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  let decoded = textarea.value;
  
  // Handle numeric HTML entities that might appear as plain numbers (e.g., 27 for ', 2d for -)
  // Replace patterns like "word27s" with "word's" and "2d2d" with "--"
  // IMPORTANT: Replace longer patterns first to avoid breaking them
  decoded = decoded.replace(/2d2d/g, "--"); // Handle double dashes first
  decoded = decoded.replace(/(\w+)27(\w)/g, "$1'$2"); // Handle apostrophes like "Australia27s" -> "Australia's"
  // Handle remaining single 2d patterns (after 2d2d has been replaced)
  decoded = decoded.replace(/2d/g, "-");
  
  // Also handle standard HTML entity patterns if they exist
  decoded = decoded.replace(/&#27;/g, "'");
  decoded = decoded.replace(/&#x27;/g, "'");
  decoded = decoded.replace(/&#39;/g, "'");
  decoded = decoded.replace(/&apos;/g, "'");
  decoded = decoded.replace(/&quot;/g, '"');
  decoded = decoded.replace(/&amp;/g, "&");
  decoded = decoded.replace(/&lt;/g, "<");
  decoded = decoded.replace(/&gt;/g, ">");
  
  return decoded;
}

/**
 * Helper function to format travel style IDs into readable interest names
 */
function formatTravelInterests(styleIds: string[] | undefined): string | null {
  if (!styleIds || styleIds.length === 0) {
    return null;
  }

  const styleNameMap: Record<string, string> = {
    'adventure': 'Adventure',
    'cultural': 'Culture',
    'shopping': 'Shopping',
    'foodie': 'Food',
    'photography': 'Photography',
    'relaxation': 'Relaxation',
  };

  const interestNames = styleIds
    .map(id => styleNameMap[id.toLowerCase()] || id)
    .filter(Boolean);

  if (interestNames.length === 0) {
    return null;
  }

  if (interestNames.length === 1) {
    return interestNames[0].toLowerCase();
  }

  if (interestNames.length === 2) {
    return `${interestNames[0].toLowerCase()} and ${interestNames[1].toLowerCase()}`;
  }

  // 3+ interests: "X, Y, and Z"
  const lastInterest = interestNames[interestNames.length - 1].toLowerCase();
  const otherInterests = interestNames.slice(0, -1).map(n => n.toLowerCase()).join(', ');
  return `${otherInterests}, and ${lastInterest}`;
}

export default function ItineraryPage() {
  const router = useRouter();
  const [draftItineraries, setDraftItineraries] = useState<DraftItinerary[]>([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [userInterests, setUserInterests] = useState<string | null>(null);
  const [evaluationSummary, setEvaluationSummary] = useState<string | null>(null);
  const [hasAssumptions, setHasAssumptions] = useState(false);
  const [showEvaluationSummary, setShowEvaluationSummary] = useState(false);
  
  // Auto-show evaluation summary when it's first loaded
  useEffect(() => {
    if (evaluationSummary) {
      setShowEvaluationSummary(true);
    }
  }, [evaluationSummary]);

  useEffect(() => {
    const tripState = getTripState();
    
    // Check if we have draft itineraries
    if (!tripState.draftItineraries || tripState.draftItineraries.length === 0) {
      // Redirect to processing if no draft itineraries
      router.push(routes.plan.processing);
      return;
    }

    setDraftItineraries(tripState.draftItineraries);
    setSelectedItineraryId(tripState.selectedDraftItineraryId || null);
    setEvaluationSummary(tripState.evaluationSummary || null);
    
    // Format user interests for explanation text
    const interests = formatTravelInterests(tripState.styles);
    setUserInterests(interests);
    
    // Check if any assumptions were made (Fast Path)
    const hasAssumedValues = tripState.assumed && (
      tripState.assumed.pace ||
      tripState.assumed.styles ||
      tripState.assumed.adults ||
      tripState.assumed.kids ||
      tripState.assumed.budget ||
      tripState.assumed.budgetType
    );
    setHasAssumptions(!!hasAssumedValues);
    
    // Keep all cards collapsed by default
    setExpandedCards(new Set());
    
    setIsHydrated(true);
  }, [router]);

  const handleBack = () => {
    router.push(routes.plan.processing);
  };

  const handleSelectItinerary = (itineraryId: string) => {
    // Only select, do NOT navigate
    setSelectedItineraryId(itineraryId);
  };

  const handleContinue = () => {
    // Save selection and navigate
    if (!selectedItineraryId) return;
    setSelectedDraftItinerary(selectedItineraryId);
    // Phase 1: Navigate to flight loader (which will load options)
    router.push(routes.bookings.flights.index);
  };

  const toggleCard = (itineraryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card selection when clicking expand/collapse
    }
    setExpandedCards(prev => {
      // If this card is already expanded, collapse it
      if (prev.has(itineraryId)) {
        return new Set();
      }
      // Otherwise, collapse all others and expand only this card
      return new Set([itineraryId]);
    });
  };

  const isCardExpanded = (itineraryId: string): boolean => {
    return expandedCards.has(itineraryId);
  };

  if (!isHydrated || draftItineraries.length === 0) {
    return (
      <div className="min-h-screen pb-0">
        <StepHeader
          title="Choose Your Itinerary"
          currentStep={7}
          totalSteps={10}
          onBack={handleBack}
        />
        <div className="max-w-md mx-auto px-6 py-6 pt-32 pb-20 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading itineraries...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-0">
        <StepHeader
          title="Choose Your Itinerary"
          currentStep={7}
          totalSteps={10}
          onBack={handleBack}
        />

        <div className="max-w-md mx-auto px-6 py-6 pt-[60px] pb-20 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none overflow-y-auto">
          {/* Page Title */}
          <div className="text-center mb-8 mt-4">
            <h1 className="text-lg md:text-xl font-medium text-gray-900 mb-2">
              Choose your travel style
            </h1>
            <p className="text-sm text-gray-600">
              We&apos;ve created a few ways to experience this trip. Pick one to start with.
            </p>
          </div>

          {/* Fast Path Assumptions Banner */}
          {hasAssumptions && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-900">
                This plan is based on a few assumptions. You can refine it anytime.
              </p>
            </div>
          )}

          {/* Itinerary Cards */}
          <div className="space-y-3 mb-6">
            {draftItineraries.map((itinerary, itineraryIndex) => {
              const isRecommended = itineraryIndex === 0;
              const isSelected = selectedItineraryId === itinerary.id;
              const isExpanded = isCardExpanded(itinerary.id);
              // 1-based image index (1, 2, or 3)
              const imageIndex = itineraryIndex + 1;
              
              const handleCardClick = () => {
                // Select and expand/collapse on card click
                handleSelectItinerary(itinerary.id);
                toggleCard(itinerary.id);
              };
              
              const imagePath = getItineraryImagePath({
                themeSlug: (itinerary as any).themeSlug,
                theme: (itinerary as any).theme,
                imageFolder: itinerary.imageFolder,
                primaryCountryCode: itinerary.primaryCountryCode,
              }, imageIndex);
              
              return (
                <div key={itinerary.id}>
                  <div
                    onClick={handleCardClick}
                    className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white cursor-pointer ${
                      isSelected 
                        ? 'ring-2 ring-[#FE4C40] ring-offset-2 shadow-xl' 
                        : ''
                    }`}
                  >
                  {/* Image Header */}
                  <div className="relative w-full h-40 bg-gray-200 overflow-hidden">
                    <img
                      src={imagePath}
                      alt={itinerary.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        // Prevent infinite loops: if we've already tried a fallback, stop here
                        if (target.dataset.hasTriedFallback === 'true') {
                          console.error('[IMAGE_LOAD_ERROR] Fallback also failed, stopping retry loop', target.src);
                          return;
                        }
                        console.error('[IMAGE_LOAD_ERROR]', target.src);
                        // Mark that we're trying a fallback BEFORE changing src
                        target.dataset.hasTriedFallback = 'true';
                        // Fallback to the shared default itinerary image (Blob-backed).
                        target.src = getItineraryImagePath({}, 1);
                      }}
                    />
                    {/* Subtle gradient overlay for text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>

                  {/* Card Body */}
                  <div className={`p-4 transition-colors relative ${isSelected ? 'bg-[#FFF5F4]/20' : ''}`}>
                    {/* Compass Icon - Only for best match itinerary */}
                    {(itinerary as any).isBestMatch && evaluationSummary && (
                      <div className="absolute top-4 right-4 z-10">
                        <motion.button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEvaluationSummary(!showEvaluationSummary);
                          }}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-lg shadow-orange-300/40 cursor-pointer"
                          initial={{ x: 0, y: 0, rotate: 0 }}
                          animate={{
                            x: [0, -2, 2, -2, 2, -1, 1, 0],
                            y: [0, -1, 1, -1, 1, 0],
                            rotate: [0, -3, 3, -3, 3, 0],
                          }}
                          transition={{
                            duration: 2,
                            times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
                            ease: "easeInOut",
                            repeat: Infinity,
                            repeatDelay: 1,
                          }}
                        >
                          <Compass className="w-5 h-5 text-white" />
                        </motion.button>
                      </div>
                    )}
                    
                    {/* Evaluation Summary Text Box - Auto-shows and toggles on compass click */}
                    {(itinerary as any).isBestMatch && evaluationSummary && showEvaluationSummary && (
                      <div className="absolute top-16 right-4 z-10 max-w-[280px] bg-gray-800 text-white text-sm rounded-lg p-3 shadow-xl">
                        <p className="break-words whitespace-normal">
                          {typeof window !== 'undefined' ? decodeHtmlEntities(evaluationSummary) : evaluationSummary}
                        </p>
                      </div>
                    )}

                    {/* Header Row - Always visible */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Title and Recommended Badge */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-semibold text-gray-900">
                            {itinerary.title}
                          </h3>
                        </div>
                        {/* Best For Tags - Collapsed state */}
                        {!isExpanded && itinerary.bestFor && itinerary.bestFor.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {itinerary.bestFor.map((tag, tagIndex) => (
                              <span 
                                key={tagIndex}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Expand/Collapse Icon */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    {/* Recommended Explanation - Only show when there are multiple itineraries (fallback for old data) */}
                    {isRecommended && draftItineraries.length > 1 && !itinerary.bestFor && (
                      <p className="text-xs text-gray-600 italic mb-2">
                        {userInterests 
                          ? `Best fit for ${userInterests} interests`
                          : 'This is a good starting point for this trip'
                        }
                      </p>
                    )}

                    {/* Compact Cities Summary - Always visible */}
                    {itinerary.cities && itinerary.cities.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {itinerary.cities.map((city, cityIndex) => (
                          <div key={cityIndex} className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-md text-xs">
                            <MapPin className="w-3 h-3 text-[#FE4C40] flex-shrink-0" />
                            <span className="text-gray-900 font-medium">{city.name}</span>
                            <span className="text-gray-500">
                              {city.nights}n
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expanded Content - Why This Trip and Example Experiences */}
                    <div className={`overflow-hidden transition-all duration-200 ${
                      isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      {/* Why Choose This Version */}
                      {itinerary.whyThisTrip && itinerary.whyThisTrip.length > 0 && (
                        <div className="mb-4 mt-2">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2">
                            Why choose this version
                          </h4>
                          <ul className="space-y-1.5">
                            {itinerary.whyThisTrip.map((reason, reasonIndex) => (
                              <li key={reasonIndex} className="flex items-start gap-2 text-xs text-gray-700">
                                <span className="text-[#FE4C40] mt-0.5 flex-shrink-0">•</span>
                                <span className="flex-1 leading-relaxed">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Experience Style - Expanded state */}
                      {isExpanded && itinerary.experienceStyle && (
                        <p className="text-xs text-gray-600 mb-3 italic">
                          {itinerary.experienceStyle}
                        </p>
                      )}

                      {/* Best For Tags - Expanded state */}
                      {isExpanded && itinerary.bestFor && itinerary.bestFor.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          {itinerary.bestFor.map((tag, tagIndex) => (
                            <span 
                              key={tagIndex}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Summary/Description - De-emphasized */}
                      {itinerary.summary && (
                        <p className="text-xs text-gray-500 leading-snug mb-3 italic">
                          {itinerary.summary}
                        </p>
                      )}

                      {/* Example Experiences by City */}
                      {itinerary.cities && itinerary.cities.length > 0 && (
                        <div className="space-y-3 mt-3">
                          {/* Helper text */}
                          <p className="text-xs text-gray-500 italic mb-2">
                            These are examples to give you a feel for the trip. You can change them later.
                          </p>
                          {itinerary.cities.map((city, cityIndex) => {
                            const hasActivities = city.activities && city.activities.length > 0;
                            if (!hasActivities) return null;

                            return (
                              <div key={cityIndex} className="border-l-2 border-[#FE4C40] pl-3">
                                {/* City Header */}
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-3.5 h-3.5 text-[#FE4C40] flex-shrink-0" />
                                  <h4 className="text-xs font-semibold text-gray-900">
                                    {city.name}
                                  </h4>
                                  <span className="text-xs text-gray-500">
                                    ({city.nights} {city.nights === 1 ? 'night' : 'nights'})
                                  </span>
                                </div>

                                {/* Example Experiences - Simple bullet points */}
                                <div className="space-y-1 ml-5">
                                  {city.activities.map((activity, actIndex) => (
                                    <div key={actIndex} className="flex items-start gap-2 text-xs text-gray-700">
                                      <span className="text-[#FE4C40] mt-0.5 flex-shrink-0">•</span>
                                      <span className="flex-1 leading-relaxed">{activity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="mt-2 flex items-center gap-1.5 text-[#FE4C40]">
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-xs font-medium">Selected</span>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reassurance Line */}
          {selectedItineraryId && (
            <div className="mt-6 mb-4">
              <p className="text-xs text-gray-500 text-center">
                You can switch to a different version later — nothing is locked yet.
              </p>
            </div>
          )}

          {/* Continue Button (if selection made) */}
          {selectedItineraryId && (
            <div className="mb-6">
              <button
                onClick={handleContinue}
                className="w-full py-4 px-6 bg-[#FE4C40] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-[#E63C30] transition-all flex items-center justify-center gap-2"
              >
                <span>Use this as my base plan</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
