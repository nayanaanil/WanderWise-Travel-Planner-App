import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronRight, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { StepHeader } from '@/components/StepHeader';
import { AutocompleteInput, City } from '@/components/AutocompleteInput';
import { getTripState, saveTripState, clearAIDerivedFields } from '@/lib/tripState';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/ui/tooltip';

export interface DestinationData {
  type: 'city' | 'searchPhrase';
  value: string;
  label?: string; // Display label (same as value if not specified)
  isFreeform?: boolean; // True if user entered free text, not from autocomplete
  city?: City;
  seasonalityAnchor?: {
    type: 'city' | 'country' | 'region';
    key: string; // Canonical key for seasonality data lookup
  };
}

interface DestinationSelectionScreenProps {
  onDestinationSelected: (destination: string | DestinationData) => void;
  onBack?: () => void;
}

/**
 * Determine the seasonality anchor for a destination
 * Priority: city → country → region
 * Special handling for cluster destinations (Bali, Maldives, Goa) which should anchor to country
 */
function getSeasonalityAnchor(city: City | null, destinationName?: string): { type: 'city' | 'country' | 'region'; key: string } | undefined {
  if (!city && !destinationName) return undefined;

  // Cluster destinations that should use country-level seasonality
  const clusterDestinations = ['Bali', 'Maldives', 'Goa'];
  
  // If we have a city object
  if (city) {
    // For cluster destinations, use country instead of city
    if (clusterDestinations.includes(city.name)) {
      if (city.country) {
        return { type: 'country', key: city.country };
      }
    }
    
    // For regions, use region name
    if (city.type === 'region') {
      return { type: 'region', key: city.name };
    }
    
    // For countries, use country name
    if (city.type === 'country') {
      return { type: 'country', key: city.name };
    }
    
    // For cities, prefer city name, but fall back to country if city is not in seasonality
    if (city.type === 'city') {
      if (clusterDestinations.includes(city.name)) {
        // Cluster destinations should use country
        if (city.country) {
          return { type: 'country', key: city.country };
        }
      }
      // Regular cities use city name
      return { type: 'city', key: city.name };
    }
  }
  
  // If no city object, try to infer from destination name
  if (destinationName) {
    // Check if it's a cluster destination
    const nameParts = destinationName.split(',').map(s => s.trim());
    const firstPart = nameParts[0];
    
    if (clusterDestinations.includes(firstPart)) {
      // Try to extract country from destination name (e.g., "Bali, Indonesia" -> "Indonesia")
      if (nameParts.length > 1) {
        return { type: 'country', key: nameParts[nameParts.length - 1] };
      }
      // If no country in name, try common mappings
      if (firstPart === 'Bali') return { type: 'country', key: 'Indonesia' };
      if (firstPart === 'Maldives') return { type: 'country', key: 'Maldives' };
      if (firstPart === 'Goa') return { type: 'country', key: 'India' };
    }
    
    // For other destinations, try to extract country if present
    if (nameParts.length > 1) {
      return { type: 'country', key: nameParts[nameParts.length - 1] };
    }
    
    // Otherwise, use the first part as city
    return { type: 'city', key: firstPart };
  }
  
  return undefined;
}

export function DestinationSelectionScreen({ onDestinationSelected, onBack }: DestinationSelectionScreenProps) {
  // Initialize state from sessionStorage synchronously to prevent flicker
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return {
        searchQuery: '',
        fromLocation: '',
        selectedDestinationCity: null as City | null,
        selectedFromCity: null as City | null,
      };
    }
    
    const tripState = getTripState();
    return {
      searchQuery: tripState.destination?.value || '',
      fromLocation: tripState.fromLocation?.value || '',
      selectedDestinationCity: tripState.destination?.city || null,
      selectedFromCity: tripState.fromLocation?.city || null,
    };
  };

  const initialState = getInitialState();
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [fromLocation, setFromLocation] = useState(initialState.fromLocation);
  const [selectedDestinationCity, setSelectedDestinationCity] = useState<City | null>(initialState.selectedDestinationCity);
  const [selectedFromCity, setSelectedFromCity] = useState<City | null>(initialState.selectedFromCity);
  const [isHydrated, setIsHydrated] = useState(true); // Set to true since we initialize synchronously
  const [validationError, setValidationError] = useState<string>('');
  const [selectedDestinationCard, setSelectedDestinationCard] = useState<string | null>(null);
  const [hasHovered, setHasHovered] = useState(false);
  const [jiggleKey, setJiggleKey] = useState(1); // Start at 1 to trigger initial animation

  // Ensure state is synced with sessionStorage on mount (for edge cases)
  useEffect(() => {
    const tripState = getTripState();
    
    // Only update if sessionStorage has different values (e.g., from another tab)
    if (tripState.destination && tripState.destination.value !== searchQuery) {
      setSearchQuery(tripState.destination.value);
      if (tripState.destination.city) {
        setSelectedDestinationCity(tripState.destination.city);
      }
    }
    
    if (tripState.fromLocation && tripState.fromLocation.value !== fromLocation) {
      setFromLocation(tripState.fromLocation.value);
      if (tripState.fromLocation.city) {
        setSelectedFromCity(tripState.fromLocation.city);
      }
    }
  }, []);

  // Set up repeating jiggle animation every 10 seconds if user hasn't hovered
  useEffect(() => {
    if (hasHovered) return; // Stop repeating if user has hovered

    // Set up interval to jiggle every 10 seconds (first jiggle happens immediately via initial key=1)
    const interval = setInterval(() => {
      setJiggleKey(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [hasHovered]);

  const popularDestinations = [
    { name: 'Bali, Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800', tag: 'Beach & Culture' },
    { name: 'Paris, France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800', tag: 'Romance & Art' },
    { name: 'Tokyo, Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800', tag: 'Urban & Culture' },
    { name: 'Maldives', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800', tag: 'Luxury Beach' },
    { name: 'Dubai, UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800', tag: 'Luxury & Modern' },
    { name: 'Goa, India', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800', tag: 'Beach & Party' },
  ];


  const handleDestinationCardClick = (destination: { name: string; tag?: string }) => {
    // Set the destination in the input field
    setSearchQuery(destination.name);
    setSelectedDestinationCard(destination.name);
    // Clear selected city since this is a freeform entry from card
    setSelectedDestinationCity(null);
    // Clear validation error if present
    if (validationError) {
      setValidationError('');
    }
    
    // Determine seasonality anchor from destination name
    // For "Bali, Indonesia", this will extract "Indonesia" as country anchor  
    // For "Bali" alone, it will infer "Indonesia" from cluster destination mapping
    const seasonalityAnchor = getSeasonalityAnchor(null, destination.name);
    
    // Save as destination with seasonality anchor
    const destinationData: DestinationData = {
      type: 'searchPhrase',
      value: destination.name,
      label: destination.name,
      isFreeform: true,
      seasonalityAnchor,
    };
    console.log('[DESTINATION_SELECTED]', destinationData);
    saveTripState({
      destination: destinationData,
    });
  };

  const handleDestinationSelect = (city: City | null) => {
    setSelectedDestinationCity(city);
    // Clear validation error when user selects a city or country
    if (validationError && city) {
      setValidationError('');
    }
    // Clear AI-derived fields when destination changes
    clearAIDerivedFields();
    // Save to sessionStorage immediately
    // Handle cities, countries, and regions
    if (isHydrated && city) {
      // Countries and regions are stored as searchPhrase, cities as city type
      const destinationType = (city.type === 'country' || city.type === 'region') ? 'searchPhrase' : 'city';
      
      // Determine seasonality anchor
      const seasonalityAnchor = getSeasonalityAnchor(city);
      
      saveTripState({
        destination: {
          type: destinationType,
          value: city.name,
          label: city.name,
          isFreeform: false, // Selected from autocomplete
          city: city, // Always save the full city object (includes countryCode for countries)
          seasonalityAnchor,
        },
      });
    }
  };

  const handleDestinationFreeText = (phrase: string) => {
    // Clear AI-derived fields when destination changes
    clearAIDerivedFields();
    // Determine seasonality anchor from free-text phrase
    const seasonalityAnchor = getSeasonalityAnchor(null, phrase);
    // User typed a free-form phrase
    const destinationData: DestinationData = {
      type: 'searchPhrase',
      value: phrase,
      seasonalityAnchor,
    };
    onDestinationSelected(destinationData);
  };

  const handleDestinationChange = (value: string) => {
    setSearchQuery(value);
    // Clear selected card when user types manually
    if (value !== selectedDestinationCard) {
      setSelectedDestinationCard(null);
    }
    if (!value.trim()) {
      setSelectedDestinationCity(null);
      // Clear AI-derived fields when destination is cleared
      clearAIDerivedFields();
    }
    // Clear validation error when user starts typing
    if (validationError && value.trim()) {
      setValidationError('');
    }
    // Save to sessionStorage immediately
    // Only save if user has selected an autocomplete option, otherwise wait for Continue
    if (isHydrated && selectedDestinationCity && value.trim()) {
      // Clear AI-derived fields when destination changes
      clearAIDerivedFields();
      const destinationType = (selectedDestinationCity.type === 'country' || selectedDestinationCity.type === 'region') ? 'searchPhrase' : 'city';
      const seasonalityAnchor = getSeasonalityAnchor(selectedDestinationCity);
      saveTripState({
        destination: {
          type: destinationType,
          value: selectedDestinationCity.name,
          label: selectedDestinationCity.name,
          isFreeform: false,
          city: selectedDestinationCity, // Always save the full city object, even for countries/regions
          seasonalityAnchor,
        },
      });
    }
  };

  const handleFromLocationSelect = (city: City | null) => {
    setSelectedFromCity(city);
    // Clear validation error when user selects a city
    if (validationError && city) {
      setValidationError('');
    }
    // Save to sessionStorage immediately
    if (isHydrated && city) {
      saveTripState({
        fromLocation: {
          type: 'city',
          value: city.name,
          city: city,
        },
      });
    }
  };

  const handleFromLocationChange = (value: string) => {
    setFromLocation(value);
    if (!value.trim()) {
      setSelectedFromCity(null);
    }
    // Clear validation error when user starts typing
    if (validationError && value.trim()) {
      setValidationError('');
    }
    // Save to sessionStorage immediately
    if (isHydrated) {
      saveTripState({
        fromLocation: value.trim() ? {
          type: selectedFromCity ? 'city' : 'searchPhrase',
          value: value.trim(),
          city: selectedFromCity || undefined,
        } : undefined,
      });
    }
  };

  const validateAndContinue = (destinationData: DestinationData) => {
    // Validate that both source and destination are filled (only check non-empty)
    const hasSource = fromLocation.trim() || selectedFromCity;
    
    if (!hasSource) {
      setValidationError('Please enter your starting location');
      return false; // Stop navigation
    }

    // Clear AI-derived fields when destination changes
    clearAIDerivedFields();

    // Ensure destination data has label and isFreeform
    const finalDestinationData: DestinationData = {
      ...destinationData,
      label: destinationData.label || destinationData.value,
      isFreeform: destinationData.isFreeform !== undefined ? destinationData.isFreeform : !destinationData.city,
    };

    // Save final state to sessionStorage
    const finalState: any = {
      fromLocation: selectedFromCity 
        ? { type: 'city' as const, value: selectedFromCity.name, city: selectedFromCity }
        : { type: 'searchPhrase' as const, value: fromLocation.trim() },
      destination: finalDestinationData,
    };
    
    saveTripState(finalState);
    console.log('[DESTINATION_SELECTED]', finalDestinationData);
    onDestinationSelected(finalDestinationData);
    return true;
  };

  const handleContinue = () => {
    // Clear any previous validation errors
    setValidationError('');

    // Validate that both source and destination are filled (only check non-empty)
    const hasSource = fromLocation.trim() || selectedFromCity;
    const hasDestination = searchQuery.trim() || selectedDestinationCity;

    if (!hasSource) {
      setValidationError('Please enter your starting location');
      return; // Stop navigation
    }

    if (!hasDestination) {
      setValidationError('Please enter a destination');
      return; // Stop navigation
    }

    // Create destination data and continue
    // If user selected an autocomplete option
    const destinationData: DestinationData = selectedDestinationCity
      ? {
          type: (selectedDestinationCity.type === 'country' || selectedDestinationCity.type === 'region') ? 'searchPhrase' : 'city',
          value: selectedDestinationCity.name,
          label: selectedDestinationCity.name,
          isFreeform: false, // Selected from autocomplete
          city: selectedDestinationCity.type === 'city' ? selectedDestinationCity : undefined,
        }
      : {
          // User typed free text (not from autocomplete)
          type: 'searchPhrase',
          value: searchQuery.trim(),
          label: searchQuery.trim(),
          isFreeform: true, // Free text entry
        };

    validateAndContinue(destinationData);
  };


  return (
    <div className="min-h-[100dvh] pb-24 flex flex-col overflow-y-auto">
      <StepHeader
        title="Where to?"
        currentStep={1}
        totalSteps={10}
        onBack={onBack}
      />
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-6 pt-[120px] pb-[15px] bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none relative">
        {/* Compass Icon - Floating in top-right */}
        <div className="absolute top-20 right-6 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                key={jiggleKey}
                onMouseEnter={() => setHasHovered(true)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-lg shadow-orange-300/40 cursor-pointer"
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
                }}
              >
                <Compass className="w-6 h-6 text-white" />
              </motion.div>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              sideOffset={8}
              className="max-w-[200px] bg-gray-800 text-white text-sm"
            >
              <p className="break-words whitespace-normal">
                Look for me in the app to give you suggestions to make your trip the best one for you.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Header - Premium */}
        <div className="text-center mb-14">
          <h1 className="text-lg md:text-xl font-medium text-gray-900">
            Where would you like to go?
          </h1>
        </div>

        {/* From Location Search */}
        <div className="mb-4">
          <AutocompleteInput
              value={fromLocation}
            onChange={handleFromLocationChange}
            onSelect={handleFromLocationSelect}
              placeholder="Your starting location..."
            icon="mapPin"
            inputType="origin"
            className={validationError && !fromLocation.trim() && !selectedFromCity ? 'error' : ''}
          />
          {validationError && !fromLocation.trim() && !selectedFromCity && (
            <p className="text-red-500 text-sm mt-1 ml-1">{validationError}</p>
          )}
        </div>

        {/* To Destination Search */}
        <div className="mb-20">
          <AutocompleteInput
              value={searchQuery}
            onChange={handleDestinationChange}
            onSelect={handleDestinationSelect}
            onFreeText={handleDestinationFreeText}
            onEnter={handleContinue}
            placeholder="Search destinations or Type phrase"
            icon="search"
            className={validationError && !searchQuery.trim() && !selectedDestinationCity ? 'error' : ''}
          />
          {validationError && !searchQuery.trim() && !selectedDestinationCity && validationError.includes('destination') && (
            <p className="text-red-500 text-sm mt-1 ml-1">{validationError}</p>
          )}
        </div>

        {/* Popular Destinations Carousel */}
        <div className="mb-0 -mx-2 mt-10">
          {/* Subtle helper text */}
          <p className="text-center text-xs text-gray-500 mb-6">Not sure where to go? Start here.</p>
          
          {/* Carousel Container */}
          <HorizontalCarousel preventManualScroll={true} gap={16} horizontalPadding="px-20 md:px-24" initialIndex={2}>
            {popularDestinations.map((destination) => {
              const isSelected = selectedDestinationCard === destination.name;
              
              return (
                <button
                  key={destination.name}
                  onClick={() => handleDestinationCardClick(destination)}
                  className={`flex-shrink-0 w-[280px] bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group snap-center ${
                    isSelected ? 'ring-2 ring-[#FE4C40] ring-offset-2' : ''
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-full h-80 overflow-hidden">
                    <ImageWithFallback
                      src={destination.image}
                      alt={destination.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    {/* Content overlay on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                      <h3 className="text-white font-bold text-xl mb-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                        {destination.name}
                      </h3>
                      {destination.tag && (
                        <p className="text-white/90 text-sm font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                          {destination.tag}
                        </p>
                      )}
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-7 h-7 bg-[#FE4C40] rounded-full flex items-center justify-center shadow-lg">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </HorizontalCarousel>
        </div>

        {/* Continue Button - Always visible */}
        <div className="mt-10">
          <button
            onClick={handleContinue}
            disabled={!searchQuery.trim() && !selectedDestinationCity}
            className="w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-[#FE4C40] text-white hover:bg-[#E63C30] hover:shadow-lg disabled:hover:bg-[#FE4C40] disabled:hover:shadow-md"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}