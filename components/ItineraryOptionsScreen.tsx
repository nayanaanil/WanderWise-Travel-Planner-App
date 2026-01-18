"use client";

import { ImageWithFallback } from '@/components/ImageWithFallback';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/navigation';
import { Sparkles, Coffee, Zap, Compass, ChevronDown, ChevronUp, MapPin, Clock, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';
import { getTripState, saveTripState, setSelectedDraftItinerary, DraftItinerary } from '@/lib/tripState';
import { getItineraryImagePaths, getItineraryImagePath } from '@/lib/itineraryImages';

interface TripParams {
  destination: string;
  dateRange?: { from: Date; to: Date };
  adults?: number;
  kids?: number;
  budget?: string;
  pace?: string;
  styles?: string[];
  mustSeeItems?: string[];
}

interface ItineraryOptionsScreenProps {
  tripParams?: TripParams;
  onBack?: () => void;
}

/**
 * Local Image Carousel Component
 * Displays 3 itinerary images resolved via the shared itinerary image map.
 */
function LocalImageCarousel({ itinerary }: { itinerary: DraftItinerary }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get image paths using the shared utility
  const imagePaths = getItineraryImagePaths({
    themeSlug: (itinerary as any).themeSlug,
    theme: (itinerary as any).theme,
    imageFolder: itinerary.imageFolder,
    primaryCountryCode: itinerary.primaryCountryCode,
  }, 3);

  const defaultImagePath = getItineraryImagePath(
    {
      themeSlug: (itinerary as any).themeSlug,
      theme: (itinerary as any).theme,
      imageFolder: itinerary.imageFolder,
      primaryCountryCode: itinerary.primaryCountryCode,
    },
    1
  );

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const imageWidth = container.offsetWidth;
    
    const newIndex = direction === 'left' 
      ? Math.max(0, currentImageIndex - 1)
      : Math.min(imagePaths.length - 1, currentImageIndex + 1);
    
    setCurrentImageIndex(newIndex);
    
    container.scrollTo({
      left: newIndex * imageWidth,
      behavior: 'smooth',
    });
  };

  const canScrollLeft = currentImageIndex > 0;
  const canScrollRight = currentImageIndex < imagePaths.length - 1;

  return (
    <div className="relative w-full h-48 bg-gray-100 rounded-t-2xl overflow-hidden">
      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        onClick={(e) => e.stopPropagation()}
        className="flex gap-0 overflow-x-auto h-full snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {imagePaths.map((imagePath, index) => (
          <div
            key={`${imagePath}-${index}`}
            className="flex-shrink-0 relative w-full h-full snap-start"
          >
            <ImageWithFallback
              src={imagePath}
              alt={`${itinerary.title} - Image ${index + 1}`}
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
                target.src = defaultImagePath;
              }}
            />
          </div>
        ))}
      </div>

      {/* Left Arrow Button */}
      {canScrollLeft && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            scroll('left');
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Right Arrow Button */}
      {canScrollRight && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            scroll('right');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 z-10 transition-all"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </div>
  );
}

export function ItineraryOptionsScreen({ tripParams, onBack }: ItineraryOptionsScreenProps) {
  const router = useRouter();

  // Calculate number of days from trip params
  const calculateDays = () => {
    if (tripParams?.dateRange?.from && tripParams?.dateRange?.to) {
      const diffTime = Math.abs(tripParams.dateRange.to.getTime() - tripParams.dateRange.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 2; // Default to 2 days if no date range
  };

  // Load UI state from sessionStorage ONCE on mount
  const tripState = useMemo(() => getTripState(), []);
  const [expandedCard, setExpandedCard] = useState<string | null>(null); // Always start collapsed
  const [selectedItinerary, setSelectedItinerary] = useState<string | null>(() => {
    // Initialize from state ONCE, not on every render
    return tripState.selectedDraftItineraryId || tripState.ui?.selectedItinerary || null;
  });
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isNavigatingRef = useRef(false); // Track if we're navigating to prevent guardrail interference
  const firstLoadRef = useRef(true); // Track if this is the first load

  // Load master itineraries from state (should already be loaded by the loading page)
  // CRITICAL: Only run once on mount, not on every render or router change
  useEffect(() => {
    // Only run guardrails on first load, not on subsequent renders or state changes
    if (!firstLoadRef.current) {
      return;
    }
    firstLoadRef.current = false;

    // Skip if we're already navigating (prevents guardrail from interfering with navigation)
    if (isNavigatingRef.current) {
      return;
    }

    const currentState = getTripState();
    
    // CRITICAL: Only read from current draft state - never fall back to old data
    // If draft itineraries don't exist or are empty, redirect back to loading page
    // BUT only on initial mount, not after user interactions or selections
    if (!currentState.draftItineraries || currentState.draftItineraries.length === 0) {
      console.warn('No draft itineraries found in current state, redirecting to loading page');
      router.push(routes.plan.processing);
      return;
    }
    
    // REMOVED: Don't clear selectedItineraryId here - it causes state resets during navigation
    // The guardrail for stale data should only run on initial mount, not on every render
  }, []); // Empty dependency array - only run once on mount

  // Get draft itineraries from state (no loading spinner, no API calls)
  const draftItineraries = tripState.draftItineraries || [];
  
  draftItineraries.forEach((itinerary: DraftItinerary) => {
    console.log('[DRAFT_ITINERARY_RECEIVED]', {
      destination: itinerary.title,
      imageFolder: itinerary.imageFolder,
      primaryCountryCode: itinerary.primaryCountryCode,
    });
  });
  
  const itineraries = draftItineraries;

  // Scroll selected card into view when it changes
  useEffect(() => {
    if (selectedItinerary && cardRefs.current[selectedItinerary]) {
      setTimeout(() => {
        cardRefs.current[selectedItinerary]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 100);
    }
  }, [selectedItinerary]);

  // Save UI state when it changes - but debounce to prevent excessive saves
  // CRITICAL: Don't save if we're navigating (prevents state resets during navigation)
  // Also skip saving on initial mount
  useEffect(() => {
    if (isNavigatingRef.current) {
      return; // Skip saving during navigation
    }

    // Skip saving on initial mount (firstLoadRef is still true)
    if (firstLoadRef.current) {
      return;
    }

    // Only save if values actually changed (not on initial mount)
    const timeoutId = setTimeout(() => {
      // Double-check we're still not navigating
      if (!isNavigatingRef.current) {
        saveTripState({
          ui: {
            expandedCard,
            selectedItinerary,
          },
        });
      }
    }, 100); // Small debounce to prevent rapid saves
    
    return () => clearTimeout(timeoutId);
  }, [expandedCard, selectedItinerary]);

  const handleCardToggle = (e: React.MouseEvent, optionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedCard(expandedCard === optionId ? null : optionId);
  };

  const handleSelectItinerary = (e: React.MouseEvent | React.KeyboardEvent, optionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    // Only allow one selection at a time
    setSelectedItinerary(selectedItinerary === optionId ? null : optionId);
  };

  const handleCardBodyClick = (e: React.MouseEvent, optionId: string) => {
    // Card body click selects the itinerary (not expands)
    handleSelectItinerary(e, optionId);
  };

  const handleContinue = useCallback(() => {
    if (!selectedItinerary) {
      return;
    }

    // Mark that we're navigating to prevent guardrails from interfering
    isNavigatingRef.current = true;

    console.log('Selecting itinerary and navigating to details', selectedItinerary);
    
    // CRITICAL: Save selected itinerary ID synchronously BEFORE navigation
    // This ensures the detailed page can read it immediately
    setSelectedDraftItinerary(selectedItinerary);
    
    // Also save UI state synchronously
    saveTripState({
      ui: {
        expandedCard,
        selectedItinerary,
      },
    });
    
    // Verify state was saved before navigating
    const verifyState = getTripState();
    if (!verifyState.selectedDraftItineraryId || verifyState.selectedDraftItineraryId !== selectedItinerary) {
      console.error('Failed to save selectedDraftItineraryId, retrying...');
      // Retry saving
      setSelectedDraftItinerary(selectedItinerary);
    }
    
    // Navigate IMMEDIATELY after state is confirmed saved
    // Use push() not replace() to allow back navigation
    // Phase 1: Navigate to flight loader (which will load options)
    router.push(routes.bookings.flights.index);
  }, [selectedItinerary, expandedCard, router]);

  // Map icon based on style title (fallback icons)
  const getIconForStyle = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('relax') || lowerTitle.includes('wellness') || lowerTitle.includes('peaceful')) {
      return Coffee;
    } else if (lowerTitle.includes('premium') || lowerTitle.includes('luxury') || lowerTitle.includes('exclusive')) {
      return Zap;
    } else if (lowerTitle.includes('explor') || lowerTitle.includes('adventur') || lowerTitle.includes('off-beat')) {
      return Compass;
    }
    return Sparkles; // Default icon
  };

  // Get placeholder image based on style
  const getPlaceholderImage = (index: number) => {
    const images = [
      'https://images.unsplash.com/photo-1642287040066-2bd340523289?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwYXJjaGl0ZWN0dXJlJTIwbmlnaHR8ZW58MXx8fHwxNzYzMTQwNTMyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1735151055127-73c610ae901f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMHplbiUyMGdhcmRlbnxlbnwxfHx8fDE3NjMwODI1NjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5YWNodCUyMHRvdXJ8ZW58MXx8fHwxNzYzMTQwNTMzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      'https://images.unsplash.com/photo-1603741614953-4187ed84cc50?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGhpa2luZyUyMGFkdmVudHVyZXxlbnwxfHx8fDE3NjMxMTMwMzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    ];
    return images[index % images.length];
  };

  // Get selected itinerary details for bottom summary
  const selectedOption = selectedItinerary ? draftItineraries.find(it => it.id === selectedItinerary) : null;

  // Helper to get cities from draft itinerary
  const getCities = (itinerary: DraftItinerary): string[] => {
    return itinerary.cities && itinerary.cities.length > 0 
      ? itinerary.cities.map(city => city.name)
      : [tripParams?.destination || 'Your Destination'];
  };

  // Helper to format cities with countries as a string
  const formatCities = (cities: string[]): string => {
    if (cities.length === 0) return '';
    
    return cities.map(city => {
      const country = getCountry(city);
      return country ? `${city}, ${country}` : city;
    }).join(' - ');
  };

  // Helper to extract country from city name (simple heuristic)
  const getCountry = (city: string): string | undefined => {
    // Common country mappings (in a real app, this would come from API)
    const countryMap: { [key: string]: string } = {
      'rome': 'Italy',
      'florence': 'Italy',
      'venice': 'Italy',
      'milan': 'Italy',
      'naples': 'Italy',
      'turin': 'Italy',
      'bologna': 'Italy',
      'paris': 'France',
      'lyon': 'France',
      'marseille': 'France',
      'nice': 'France',
      'bordeaux': 'France',
      'tokyo': 'Japan',
      'kyoto': 'Japan',
      'osaka': 'Japan',
      'yokohama': 'Japan',
      'london': 'United Kingdom',
      'edinburgh': 'United Kingdom',
      'manchester': 'United Kingdom',
      'amsterdam': 'Netherlands',
      'rotterdam': 'Netherlands',
      'utrecht': 'Netherlands',
      'barcelona': 'Spain',
      'madrid': 'Spain',
      'seville': 'Spain',
      'valencia': 'Spain',
      'berlin': 'Germany',
      'munich': 'Germany',
      'hamburg': 'Germany',
      'frankfurt': 'Germany',
      'vienna': 'Austria',
      'salzburg': 'Austria',
      'prague': 'Czech Republic',
      'brno': 'Czech Republic',
      'athens': 'Greece',
      'thessaloniki': 'Greece',
      'dubai': 'UAE',
      'abu dhabi': 'UAE',
      'singapore': 'Singapore',
      'bangkok': 'Thailand',
      'chiang mai': 'Thailand',
      'phuket': 'Thailand',
      'sydney': 'Australia',
      'melbourne': 'Australia',
      'brisbane': 'Australia',
      'new york': 'United States',
      'los angeles': 'United States',
      'san francisco': 'United States',
      'chicago': 'United States',
      'miami': 'United States',
      'interlaken': 'Switzerland',
      'zurich': 'Switzerland',
      'lucerne': 'Switzerland',
      'geneva': 'Switzerland',
      'bruges': 'Belgium',
      'brussels': 'Belgium',
      'antwerp': 'Belgium',
    };
    
    const cityLower = city.toLowerCase();
    return countryMap[cityLower] || undefined;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5F4]/30 via-white to-[#FFF5F4]/20 pb-24">
      <StepHeader
        title="Choose Your Itinerary"
        currentStep={5}
        totalSteps={9}
        onBack={onBack}
      />
      <div className="max-w-md mx-auto px-6 py-6 pt-32">
        {/* Header */}
        <div className="mb-6">
          <p className="text-base text-gray-900 leading-relaxed">
            We&apos;ve generated a few itineraries for your trip. Pick the one that fits you best.
          </p>
        </div>

            {/* Itinerary Options */}
            {itineraries.length > 0 && (
          <div className="space-y-4 mb-6" role="radiogroup" aria-label="Itinerary options">
            {itineraries.map((itinerary, index) => {
              console.log('Rendering explore card', itinerary.id);
              const IconComponent = getIconForStyle(itinerary.title);
              const isExpanded = expandedCard === itinerary.id;
              const isSelected = selectedItinerary === itinerary.id;
              const cardId = `itinerary-${itinerary.id}`;
              const contentId = `content-${itinerary.id}`;
              
              return (
                <div
                  key={itinerary.id}
                  ref={(el) => { cardRefs.current[itinerary.id] = el; }}
                  role="radio"
                  aria-checked={isSelected}
                  className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white ${
                    isSelected 
                      ? 'ring-2 ring-[#FE4C40] ring-offset-2 shadow-xl' 
                      : ''
                  }`}
                >
                  {/* Card Body - Clickable for selection */}
                  <div
                    onClick={(e) => handleCardBodyClick(e, itinerary.id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#FFF5F4]/20' : ''}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectItinerary(e, itinerary.id);
                      }
                    }}
                    aria-label={`Select ${itinerary.title} itinerary`}
                  >
                    {/* Image Reel - Local images from /public/itinerary-images/ */}
                    <LocalImageCarousel itinerary={itinerary} />
                    
                    {/* Collapsed Card Content - Below Images */}
                    <div className="bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* A. Title */}
                          <h3 id={`${cardId}-title`} className="text-lg font-semibold text-gray-900 mb-2">
                            {itinerary.title}
                          </h3>
                          
                          {/* B. Cities Overview - Always show */}
                          {getCities(itinerary).length > 0 && (
                            <div className="mb-2">
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-[#FE4C40] flex-shrink-0" />
                                <span className="truncate">{formatCities(getCities(itinerary))}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* C. City count badge */}
                          {itinerary.cities && itinerary.cities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className="px-2 py-0.5 bg-[#FFF5F4] text-[#FE4C40] rounded-full text-xs font-medium">
                                {itinerary.cities.length} {itinerary.cities.length === 1 ? 'City' : 'Cities'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* D. Chevron Icon */}
                        <button
                          onClick={(e) => handleCardToggle(e, itinerary.id)}
                          aria-expanded={isExpanded}
                          aria-controls={contentId}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                          aria-label={isExpanded ? `Collapse ${itinerary.title} details` : `Expand ${itinerary.title} details`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Content - Brief Overview + Bulleted Activities */}
                  <div
                    id={contentId}
                    role="region"
                    aria-labelledby={`${cardId}-title`}
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded 
                        ? 'max-h-[2000px] opacity-100' 
                        : 'max-h-0 opacity-0'
                    }`}
                    style={{
                      transition: 'max-height 300ms ease-in-out, opacity 300ms ease-in-out',
                    }}
                  >
                    <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-4">
                      {/* A. Short Overview Summary */}
                      {itinerary.summary && (
                        <div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {itinerary.summary}
                          </p>
                        </div>
                      )}
                      
                      {/* B. Cities with Activities */}
                      {itinerary.cities && itinerary.cities.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 mb-2.5 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-[#FE4C40]" />
                            Cities & Activities
                          </h4>
                          <div className="space-y-3">
                            {itinerary.cities.map((city, cityIdx) => (
                              <div key={cityIdx} className="space-y-1.5">
                                <div className="font-medium text-sm text-gray-900">
                                  {city.name} ({city.nights} {city.nights === 1 ? 'night' : 'nights'})
                                </div>
                                {city.activities && city.activities.length > 0 && (
                                  <div className="space-y-1">
                                    {city.activities.slice(0, 4).map((activity, actIdx) => (
                                      <div key={actIdx} className="flex items-start gap-2 text-sm text-gray-700">
                                        <span className="text-[#FE4C40] mt-0.5 flex-shrink-0">•</span>
                                        <span className="flex-1">{activity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selection Summary + CTA - Scrollable Content */}
        {selectedOption && (
          <div className="mt-8 mb-6 p-4 bg-white rounded-2xl border-2 border-[#FE4C40] shadow-lg">
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Your selection</p>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedOption.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{selectedOption.summary}</p>
              
              {/* Cities */}
              {selectedOption.cities && selectedOption.cities.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedOption.cities.slice(0, 3).map((city, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-[#FFF5F4] text-[#FE4C40] rounded-lg text-xs font-medium"
                    >
                      {city.name}
                    </span>
                  ))}
                  {selectedOption.cities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                      +{selectedOption.cities.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            
              {/* CTA Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleContinue();
                }}
                disabled={!selectedItinerary}
                className="w-full py-3 rounded-xl transition-all font-semibold text-sm bg-[#FE4C40] text-white hover:bg-[#E63C30] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FE4C40]"
              >
                Choose Flights
              </button>
          </div>
        )}
      </div>
    </div>
  );
}
