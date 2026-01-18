import { useState, useEffect, useCallback } from 'react';
import { Plus, X, ChevronRight } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';
import { getTripState, saveTripState } from '@/lib/tripState';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { destinationSuggestions } from '@/lib/destinationSuggestions';
import { normalizeKey, classifyFreeformDestination } from '@/lib/classifyDestination';

interface LocationsSelectionScreenProps {
  destination: string;
  onContinue: () => void;
  onBack?: () => void;
}

interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  image?: string;
  reason?: string;
}

interface MapLocation {
  name: string;
  reason: string;
}

// Helper to get city data from name (for static suggestions)
// This will be populated from the cities API data
let cityDataCache: Map<string, City> = new Map();

export function LocationsSelectionScreen({ destination, onContinue, onBack }: LocationsSelectionScreenProps) {
  const [planningMode, setPlanningMode] = useState<'auto' | 'manual' | 'map'>('auto');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [tripDuration, setTripDuration] = useState<number>(0);
  const [suggestedCityNames, setSuggestedCityNames] = useState<string[]>([]);
  const [cityObjects, setCityObjects] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isFreeTextDestination, setIsFreeTextDestination] = useState(false);
  const [hasLocationSuggestions, setHasLocationSuggestions] = useState(false);
  const [classifiedDestination, setClassifiedDestination] = useState<string | null>(null);
  
  // Map upload state
  const [uploadedMapImage, setUploadedMapImage] = useState<File | null>(null);
  const [mapImagePreview, setMapImagePreview] = useState<string | null>(null);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [isAnalyzingMap, setIsAnalyzingMap] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Load state and fetch static location suggestions
  useEffect(() => {
    const tripState = getTripState();
    
    // Check if destination is a free-text entry
    const isFreeText = tripState.destination?.isFreeform === true;
    setIsFreeTextDestination(isFreeText);
    
    // Calculate trip duration from dateRange
    let duration = 0;
    if (tripState.dateRange?.from && tripState.dateRange?.to) {
      const from = tripState.dateRange.from instanceof Date 
        ? tripState.dateRange.from 
        : new Date(tripState.dateRange.from);
      const to = tripState.dateRange.to instanceof Date 
        ? tripState.dateRange.to 
        : new Date(tripState.dateRange.to);
      duration = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      setTripDuration(duration);
    }
    
    // Determine the destination key for lookup
    let destinationKey: string | null = null;
    
    if (isFreeText) {
      // For free-text, try to classify to a known destination
      destinationKey = classifyFreeformDestination(destination);
      setClassifiedDestination(destinationKey);
      
      if (!destinationKey) {
        // Unknown free-form destination - default to auto mode
        setPlanningMode('auto');
        setHasLocationSuggestions(false);
        setIsLoadingCities(false);
        setIsHydrated(true);
        return;
      }
    } else {
      // For curated destinations, use the destination value as-is
      destinationKey = destination;
    }
    
    // Normalize destination key for lookup
    const normalizedKey = normalizeKey(destinationKey);
    
    // Look up suggestions from static mapping
    let suggestions: string[] = [];
    for (const [key, rule] of Object.entries(destinationSuggestions)) {
      if (normalizeKey(key) === normalizedKey) {
        suggestions = rule.suggestions || [];
        break;
      }
    }
    
    if (suggestions.length > 0) {
      // Exclude the destination itself from suggestions
      const destinationName = destinationKey;
      suggestions = suggestions.filter(name => normalizeKey(name) !== normalizeKey(destinationName));
      
      setSuggestedCityNames(suggestions);
      setHasLocationSuggestions(true);
      
      // If classification succeeded and we have location suggestions,
      // treat it as a valid destination (enable manual selection)
      // This overrides the original isFreeform flag
      if (isFreeText && destinationKey) {
        setIsFreeTextDestination(false);
      }
      
      // Fetch full city data for these city names
      fetchCityDataForNames(suggestions).then(cities => {
        setCityObjects(cities);
        setIsLoadingCities(false);
        
        // After city objects are loaded, restore selected cities from tripState
        // Convert city names (from tripState) back to IDs (for UI state)
        if (tripState.userSelectedCities && tripState.userSelectedCities.length > 0) {
          const restoredIds = tripState.userSelectedCities
            .map(cityName => {
              // Find city object by name (normalized comparison)
              const city = cities.find(c => 
                normalizeKey(c.name) === normalizeKey(cityName)
              );
              return city?.id;
            })
            .filter(Boolean) as string[];
          setSelectedCities(restoredIds);
        }
      });
      
      // Restore planning mode
      if (tripState.planningMode) {
        setPlanningMode(tripState.planningMode);
      }
    } else {
      // No suggestions found - default to auto mode
      setHasLocationSuggestions(false);
      setPlanningMode('auto');
      setIsLoadingCities(false);
    }
    
    setIsHydrated(true);
  }, [destination]);
  
  // Fetch city data from API for given city names
  const fetchCityDataForNames = async (cityNames: string[]): Promise<City[]> => {
    try {
      // Fetch all cities from API to build a lookup map
      const response = await fetch('/api/cities?q=');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      const allCities: City[] = data.cities || [];
      
      // Build a map for quick lookup
      const cityMap = new Map<string, City>();
      allCities.forEach(city => {
        cityMap.set(normalizeKey(city.name), city);
      });
      
      // Match city names to full city objects
      const matchedCities: City[] = [];
      for (const cityName of cityNames) {
        const normalizedName = normalizeKey(cityName);
        const city = cityMap.get(normalizedName);
        if (city) {
          matchedCities.push({
            ...city,
            reason: 'Suggested for your trip',
          });
        } else {
          // Fallback: create a minimal city object if not found
          matchedCities.push({
            id: `city-${cityName.toLowerCase().replace(/\s+/g, '-')}`,
            name: cityName,
            country: '',
            countryCode: '',
            reason: 'Suggested for your trip',
          });
        }
      }
      
      return matchedCities;
    } catch (error) {
      console.error('Failed to fetch city data:', error);
      // Return minimal city objects
      return cityNames.map(name => ({
        id: `city-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        country: '',
        countryCode: '',
        reason: 'Suggested for your trip',
      }));
    }
  };

  // MVP: Maximum 2 cities for manual selection
  const maxCities = 2;

  // Use all suggested cities (static, no AI ranking needed)
  const suggestedCities = cityObjects;

  const toggleCity = (cityId: string) => {
    if (selectedCities.includes(cityId)) {
      setSelectedCities(prev => prev.filter(id => id !== cityId));
    } else {
      if (selectedCities.length < maxCities) {
        setSelectedCities(prev => [...prev, cityId]);
      }
    }
  };

  const removeCity = (cityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCities(prev => prev.filter(id => id !== cityId));
  };

  // Helper to convert city IDs to city names for tripState
  const getCityNamesFromIds = useCallback((cityIds: string[]): string[] => {
    return cityIds
      .map(id => {
        const city = cityObjects.find(c => c.id === id);
        return city?.name;
      })
      .filter(Boolean) as string[];
  }, [cityObjects]);

  const handleModeChange = (mode: 'auto' | 'manual' | 'map') => {
    // Prevent switching to manual mode if no location suggestions available
    if (mode === 'manual' && (!hasLocationSuggestions || isFreeTextDestination)) {
      return;
    }
    setPlanningMode(mode);
    if (mode === 'auto') {
      setSelectedCities([]);
      saveTripState({ planningMode: 'auto', userSelectedCities: undefined });
    } else if (mode === 'map') {
      setSelectedCities([]);
      setMapLocations([]);
      setUploadedMapImage(null);
      setMapImagePreview(null);
      setMapError(null);
      saveTripState({ planningMode: 'map' });
    } else {
      saveTripState({ planningMode: 'manual' });
    }
  };

  // Handle map image upload
  const handleMapImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMapError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setMapError('Image file size must be less than 10MB');
      return;
    }

    setUploadedMapImage(file);
    setMapError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMapImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Analyze map image
  const handleAnalyzeMap = async () => {
    if (!uploadedMapImage) return;

    setIsAnalyzingMap(true);
    setMapError(null);

    try {
      const formData = new FormData();
      formData.append('image', uploadedMapImage);
      if (destination) {
        formData.append('destination', destination);
      }

      const response = await fetch('/api/locations/extract-from-map', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to analyze map' }));
        throw new Error(errorData.error || 'Failed to analyze map');
      }

      const data = await response.json();
      setMapLocations(data.locations || []);
    } catch (error: any) {
      console.error('[MapAnalysis] Error:', error);
      setMapError(error.message || 'Failed to analyze map. Please try again.');
    } finally {
      setIsAnalyzingMap(false);
    }
  };

  // Convert map locations to City objects for consistent UI
  const mapLocationToCity = (loc: MapLocation, index: number): City => ({
    id: `map-loc-${index}`,
    name: loc.name,
    country: '', // Map locations don't have country info
    countryCode: '',
    reason: loc.reason,
  });

  const handleContinue = () => {
    if (planningMode === 'auto') {
      saveTripState({ 
        planningMode: 'auto', 
        userSelectedCities: undefined 
      });
    } else if (planningMode === 'map') {
      // For map mode, selectedCities contains IDs like "map-loc-0", "map-loc-1"
      // Convert back to location names
      const selectedLocationNames = selectedCities
        .map(id => {
          const index = parseInt(id.replace('map-loc-', ''));
          return mapLocations[index]?.name;
        })
        .filter(Boolean) as string[];
      
      saveTripState({ 
        planningMode: 'map', 
        userSelectedCities: selectedLocationNames 
      });
    } else {
      // Convert IDs to names before saving
      const cityNames = getCityNamesFromIds(selectedCities);
      saveTripState({ 
        planningMode: 'manual', 
        userSelectedCities: cityNames 
      });
    }
    onContinue();
  };

  const handleSkip = () => {
    saveTripState({ 
      planningMode: 'auto', 
      userSelectedCities: undefined 
    });
    onContinue();
  };

  const isCitySelected = (cityId: string) => selectedCities.includes(cityId);
  const isLimitReached = selectedCities.length >= maxCities;
  const selectedCityObjects = selectedCities.map(id => {
    if (planningMode === 'map' && id.startsWith('map-loc-')) {
      const index = parseInt(id.replace('map-loc-', ''));
      return mapLocations[index] ? mapLocationToCity(mapLocations[index], index) : null;
    }
    const city = cityObjects.find(c => c.id === id);
    return city;
  }).filter(Boolean) as City[];

  // Get cities to display (either manual suggestions or map locations)
  const displayCities = planningMode === 'map' 
    ? mapLocations.map((loc, index) => mapLocationToCity(loc, index))
    : cityObjects;

  // Auto-save when cities change (convert IDs to names)
  useEffect(() => {
    if (!isHydrated || planningMode !== 'manual') return;
    const cityNames = getCityNamesFromIds(selectedCities);
    saveTripState({ userSelectedCities: cityNames });
  }, [selectedCities, planningMode, isHydrated, getCityNamesFromIds]);

  // Auto-save when map locations are selected
  useEffect(() => {
    if (!isHydrated || planningMode !== 'map' || mapLocations.length === 0) return;
    const selectedLocationNames = selectedCities
      .map(id => {
        const index = parseInt(id.replace('map-loc-', ''));
        return mapLocations[index]?.name;
      })
      .filter(Boolean) as string[];
    
    if (selectedLocationNames.length > 0) {
      saveTripState({ userSelectedCities: selectedLocationNames });
    }
  }, [selectedCities, planningMode, isHydrated, mapLocations]);

  return (
    <div className="min-h-[100dvh] pb-24 flex flex-col overflow-y-auto">
      <StepHeader
        title="Choose Places to Include"
        currentStep={5}
        totalSteps={10}
        onBack={onBack}
      />
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-6 pt-[120px] pb-[95px] bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none flex flex-col">
        {/* Page Title */}
        <div className="text-center mb-14">
          <h1 className="text-lg md:text-xl font-medium text-gray-900 mb-2">
            Choose places to include
          </h1>
          <p className="text-sm text-gray-600">
            We&apos;ll build your trip around these locations.
          </p>
        </div>

        {/* Planning Mode Selector */}
        <div className={`space-y-3 ${planningMode === 'auto' && !hasLocationSuggestions ? 'mb-4' : 'mb-6'}`}>
          {/* Option 1: Auto */}
          <button
            onClick={() => handleModeChange('auto')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              planningMode === 'auto'
                ? 'border-[#FE4C40] bg-white shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                planningMode === 'auto'
                  ? 'border-[#FE4C40] bg-[#FE4C40]'
                  : 'border-gray-300'
              }`}>
                {planningMode === 'auto' && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-medium mb-1">Let us plan it for you</h3>
                <p className="text-sm text-gray-600">We&apos;ll suggest complete itineraries you can review and tweak.</p>
              </div>
            </div>
          </button>

          {/* Option 2: Manual */}
          <button
            onClick={() => handleModeChange('manual')}
            disabled={!hasLocationSuggestions || isFreeTextDestination}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              !hasLocationSuggestions || isFreeTextDestination
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                : planningMode === 'manual'
                ? 'border-[#FE4C40] bg-white shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                planningMode === 'manual'
                  ? 'border-[#FE4C40] bg-[#FE4C40]'
                  : 'border-gray-300'
              }`}>
                {planningMode === 'manual' && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-medium mb-1">I&apos;ll choose the places</h3>
                <p className="text-sm text-gray-600">
                  {!hasLocationSuggestions || isFreeTextDestination
                    ? 'Manual city selection is only available for destinations from our curated list.'
                    : "Pick the cities you want, and we&apos;ll build the trip around them."}
                </p>
              </div>
            </div>
          </button>

          {/* Option 3: Map Upload */}
          <button
            onClick={() => handleModeChange('map')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              planningMode === 'map'
                ? 'border-[#FE4C40] bg-white shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                planningMode === 'map'
                  ? 'border-[#FE4C40] bg-[#FE4C40]'
                  : 'border-gray-300'
              }`}>
                {planningMode === 'map' && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-medium mb-1">Upload a map</h3>
                <p className="text-sm text-gray-600">
                  Upload a map image and we&apos;ll identify the best locations to visit.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Auto-plan message for unknown destinations */}
        {planningMode === 'auto' && !hasLocationSuggestions && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-4">
            <p className="text-sm text-gray-600 text-center">
                  We&apos;ll plan the best route for you based on your idea.
            </p>
          </div>
        )}

        {/* Map Upload UI (only for map mode) */}
        {planningMode === 'map' && (
          <div className="space-y-4">
            {/* File Upload */}
            {!mapLocations.length && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-900 mb-2 block">
                      Upload a map image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMapImageSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FE4C40] file:text-white hover:file:bg-[#E63C30] cursor-pointer"
                    />
                  </label>
                  
                  {mapImagePreview && (
                    <div className="mt-4">
                      <img
                        src={mapImagePreview}
                        alt="Map preview"
                        className="w-full rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={handleAnalyzeMap}
                        disabled={isAnalyzingMap}
                        className="w-full mt-4 py-3 px-4 bg-[#FE4C40] text-white font-semibold rounded-lg hover:bg-[#E63C30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzingMap ? 'Analyzing map...' : 'Analyze Map'}
                      </button>
                    </div>
                  )}

                  {mapError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{mapError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Locations Display */}
            {mapLocations.length > 0 && (
              <>
                <p className="text-sm text-gray-600 text-center">
                  Select up to {maxCities} locations to include in your trip.
                </p>

                {/* Selected Locations Summary */}
                {selectedCities.length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Selected ({selectedCities.length} / {maxCities})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCityObjects.map((city) => (
                        <div
                          key={city.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FE4C40]/10 text-[#FE4C40] rounded-full text-sm"
                        >
                          <span>{city.name}</span>
                          <button
                            onClick={(e) => removeCity(city.id, e)}
                            className="hover:bg-[#FE4C40]/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Locations List */}
                <div className="space-y-3">
                  {displayCities.map((city) => {
                    const isSelected = isCitySelected(city.id);
                    const isDisabled = !isSelected && isLimitReached;
                    return (
                      <button
                        key={city.id}
                        onClick={() => !isDisabled && toggleCity(city.id)}
                        disabled={isDisabled}
                        className={`w-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all text-left bg-white ${
                          isSelected
                            ? 'ring-2 ring-[#FE4C40]'
                            : isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:ring-1 hover:ring-[#FE4C40]/30'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Thumbnail on the left */}
                          <div className="w-24 h-24 bg-gray-200 relative flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-lg">📍</span>
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#FE4C40]/80 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-white text-[#FE4C40] flex items-center justify-center font-bold text-sm">
                                  ✓
                                </div>
                              </div>
                            )}
                            {!isSelected && !isDisabled && (
                              <div className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 transition-colors">
                                <Plus className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          {/* Text content on the right */}
                          <div className="flex-1 py-3 pr-3 flex flex-col justify-center min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                              {city.name}
                            </h4>
                            {city.reason && (
                              <p className="text-xs text-gray-600 leading-relaxed">{city.reason}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* City Selection UI (only for manual mode) */}
        {planningMode === 'manual' && hasLocationSuggestions && (
          <div className="space-y-4">
            {/* Guidance Text */}
            <p className="text-sm text-gray-600 text-center">
              Select up to {maxCities} cities to include in your trip.
            </p>

            {/* Selected Cities Summary */}
            {selectedCities.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    Selected ({selectedCities.length} / {maxCities})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCityObjects.map((city) => (
                    <div
                      key={city.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FE4C40]/10 text-[#FE4C40] rounded-full text-sm"
                    >
                      <span>{city.name}</span>
                      <button
                        onClick={(e) => removeCity(city.id, e)}
                        className="hover:bg-[#FE4C40]/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Limit Reached Helper */}
            {isLimitReached && (
              <p className="text-xs text-amber-600 text-center font-medium">
                Maximum {maxCities} cities selected. Remove one to add another.
              </p>
            )}
            
            {/* Selection Progress Helper */}
            {selectedCities.length > 0 && !isLimitReached && (
              <p className="text-xs text-gray-500 text-center">
                {selectedCities.length} of {maxCities} cities selected
              </p>
            )}

            {/* Loading state */}
            {isLoadingCities && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-600">Finding the best cities for your trip...</p>
              </div>
            )}

            {/* Suggested for your trip */}
            {!isLoadingCities && (
              <div>
                {suggestedCities.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Suggested for your trip</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {suggestedCities.map((city) => {
                        const isSelected = isCitySelected(city.id);
                        const isDisabled = !isSelected && isLimitReached;
                        return (
                          <button
                            key={city.id}
                            onClick={() => !isDisabled && toggleCity(city.id)}
                            disabled={isDisabled}
                            className={`relative rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all text-left ${
                              isSelected
                                ? 'ring-2 ring-[#FE4C40]'
                                : isDisabled
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:ring-1 hover:ring-[#FE4C40]/30'
                            }`}
                          >
                            <div className="aspect-video bg-gray-200 relative">
                              <ImageWithFallback
                                src={`/city-images/${city.countryCode.toLowerCase()}/${city.name.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                                alt={city.name}
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-[#FE4C40]/80 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-white text-[#FE4C40] flex items-center justify-center font-bold">
                                    ✓
                                  </div>
                                </div>
                              )}
                              {!isSelected && !isDisabled && (
                                <div className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors">
                                  <Plus className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="p-2 bg-white">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {city.name}{city.country && `, ${city.country}`}
                              </h4>
                              {city.reason && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-1">{city.reason}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-auto space-y-3">
          <button
            onClick={handleContinue}
            className="w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md bg-[#FE4C40] text-white hover:bg-[#E63C30] hover:shadow-lg"
          >
            {planningMode === 'auto' ? 'Generate a draft plan' : 'Generate a draft plan'}
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {planningMode === 'manual' && selectedCities.length === 0 && (
            <button
              onClick={handleSkip}
              className="w-full py-3 text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              Skip — suggest for me
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

