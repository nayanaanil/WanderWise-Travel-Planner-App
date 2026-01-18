"use client";

import { useState, useEffect } from 'react';
import { ChevronRight, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { StepHeader } from '@/components/StepHeader';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/ui/tooltip';
import { getTripState, saveTripState } from '@/lib/tripState';
import { CITY_SEASONALITY } from '../public/data/seasonality/cities';
import { COUNTRY_SEASONALITY } from '../public/data/seasonality/countries';
import { REGION_SEASONALITY } from '../public/data/seasonality/regions';
import type { Seasonality, Month, MonthData } from '../public/data/seasonality/types';

interface TripTimingScreenProps {
  onContinue: (params: { preferredMonth?: string }) => void;
  onBack?: () => void;
}

const MONTH_NAMES: { [K in Month]: string } = {
  Jan: 'January',
  Feb: 'February',
  Mar: 'March',
  Apr: 'April',
  May: 'May',
  Jun: 'June',
  Jul: 'July',
  Aug: 'August',
  Sep: 'September',
  Oct: 'October',
  Nov: 'November',
  Dec: 'December',
};

const ALL_MONTHS: Month[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function TripTimingScreen({ onContinue, onBack }: TripTimingScreenProps) {
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [seasonalityData, setSeasonalityData] = useState<Seasonality | null>(null);

  // Get seasonality data for the destination (client-side only)
  // Uses seasonalityAnchor when available, with intelligent fallback including AI selection
  const getSeasonalityData = async (tripState: ReturnType<typeof getTripState>): Promise<Seasonality | null> => {
    const destination = tripState.destination?.value;
    const seasonalityAnchor = tripState.destination?.seasonalityAnchor;
    const city = tripState.destination?.city;

    if (!destination) return null;

    // STEP 1: Use seasonalityAnchor if available (primary path)
    if (seasonalityAnchor) {
      const { type, key } = seasonalityAnchor;
      
      if (type === 'city' && CITY_SEASONALITY[key]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: key, source: 'direct' });
        return CITY_SEASONALITY[key] as Seasonality;
      }
      
      if (type === 'country' && COUNTRY_SEASONALITY[key]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: key, source: 'direct' });
        return COUNTRY_SEASONALITY[key];
      }
      
      if (type === 'region' && REGION_SEASONALITY[key]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: key, source: 'direct' });
        return REGION_SEASONALITY[key];
      }
    }

    // STEP 2: Fallback for destinations without seasonalityAnchor (backward compatibility)
    // Try to infer from existing data structures
    
    // Priority 1: Try city name from city object
    if (city?.name) {
      const cityName = city.name.split(',')[0].trim();
      if (CITY_SEASONALITY[cityName]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: cityName, source: 'direct' });
        return CITY_SEASONALITY[cityName] as Seasonality;
      }
    }

    // Priority 2: Try region/theme matching
    if (tripState.inferredRegion || tripState.travelTheme?.inferredRegion) {
      const region = tripState.inferredRegion || tripState.travelTheme?.inferredRegion;
      if (region && REGION_SEASONALITY[region]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: region, source: 'direct' });
        return REGION_SEASONALITY[region];
      }
    }

    // Priority 3: Try country from city object
    if (city?.country) {
      const countryName = city.country;
      if (COUNTRY_SEASONALITY[countryName]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: countryName, source: 'direct' });
        return COUNTRY_SEASONALITY[countryName];
      }
    }

    // Priority 4: Try extracting country from destination string (best-effort inference)
    const destinationParts = destination.split(',').map(s => s.trim());
    for (const part of destinationParts) {
      // Try country first
      if (COUNTRY_SEASONALITY[part]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: part, source: 'direct' });
        return COUNTRY_SEASONALITY[part];
      }
      // Try region
      if (REGION_SEASONALITY[part]) {
        console.log('[SeasonalityFallback]', { destination, selectedKey: part, source: 'direct' });
        return REGION_SEASONALITY[part];
      }
    }
    
    // Try city from first part of destination
    if (destinationParts.length > 0 && CITY_SEASONALITY[destinationParts[0]]) {
      console.log('[SeasonalityFallback]', { destination, selectedKey: destinationParts[0], source: 'direct' });
      return CITY_SEASONALITY[destinationParts[0]] as Seasonality;
    }

    // STEP 3: AI Fallback - call backend API to select best matching seasonality key
    try {
      const response = await fetch('/api/seasonality/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destination }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.selectedKey) {
          // Try to find the selected key in our seasonality data
          if (CITY_SEASONALITY[data.selectedKey]) {
            console.log('[SeasonalityFallback]', { destination, selectedKey: data.selectedKey, source: 'ai' });
            return CITY_SEASONALITY[data.selectedKey] as Seasonality;
          }
          if (COUNTRY_SEASONALITY[data.selectedKey]) {
            console.log('[SeasonalityFallback]', { destination, selectedKey: data.selectedKey, source: 'ai' });
            return COUNTRY_SEASONALITY[data.selectedKey];
          }
          if (REGION_SEASONALITY[data.selectedKey]) {
            console.log('[SeasonalityFallback]', { destination, selectedKey: data.selectedKey, source: 'ai' });
            return REGION_SEASONALITY[data.selectedKey];
          }
        }
      }
    } catch (error) {
      console.error('[SeasonalityFallback] Error calling AI fallback:', error);
      // Continue to final fallback
    }

    // STEP 4: Final fallback - return null (will show all months with default "second_best" label)
    console.log('[SeasonalityFallback]', { destination, selectedKey: null, source: 'fallback' });
    return null;
  };

  // Load state from sessionStorage (client-side only)
  useEffect(() => {
    const loadSeasonalityData = async () => {
      const tripState = getTripState();
      if (tripState.preferredMonth) {
        setSelectedMonth(tripState.preferredMonth as Month);
      }
      // Load seasonality data (now async due to AI fallback)
      const seasonality = await getSeasonalityData(tripState);
      setSeasonalityData(seasonality);
      setIsHydrated(true);
    };
    
    loadSeasonalityData();
  }, []);

  // Get months with data from seasonality, ordered chronologically from current month
  // If no seasonality data, returns all months with default data to prevent partial rendering
  const getAvailableMonths = (): Array<{ month: Month; data: MonthData }> => {
    // Only calculate date-based ordering after hydration to prevent mismatch
    if (!isHydrated) {
      return [];
    }
    
    // Get current month index (0-11)
    const currentMonthIndex = new Date().getMonth();
    
    // Map month abbreviations to indices
    const monthToIndex: { [K in Month]: number } = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    
    // Create array starting from current month, wrapping around
    const orderedMonths: Month[] = [];
    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonthIndex + i) % 12;
      orderedMonths.push(ALL_MONTHS[monthIndex]);
    }
    
    // If we have seasonality data, filter and map to months with data
    if (seasonalityData) {
      return orderedMonths
        .filter(month => seasonalityData[month])
        .map(month => ({
          month,
          data: seasonalityData[month]!,
        }));
    }
    
    // Fallback: if no seasonality data, return all months with default data
    // This ensures we never render only 1-2 months due to missing data
    return orderedMonths.map(month => ({
      month,
      data: {
        label: 'second_best',
      } as MonthData,
    }));
  };

  const availableMonths = getAvailableMonths();

  const handleMonthSelect = (month: Month) => {
    const newSelectedMonth = selectedMonth === month ? null : month;
    setSelectedMonth(newSelectedMonth);
    // Save preferred month to tripState
    saveTripState({
      preferredMonth: newSelectedMonth || undefined,
    });
  };

  const handleContinue = () => {
    onContinue({
      preferredMonth: selectedMonth || undefined,
    });
  };

  const getLabelDisplay = (label: string): string => {
    switch (label) {
      case 'our_pick':
        return 'Recommended';
      case 'second_best':
        return 'Good option';
      case 'off_season':
        return 'Off season';
      default:
        return label;
    }
  };

  const getTileStyles = (label: string, isSelected: boolean) => {
    const baseStyles = 'p-4 rounded-lg border-2 text-left transition-all min-h-[140px] flex flex-col justify-start';
    
    // Consistent container styling for all tiles
    const containerStyles = `${baseStyles} ${
      isSelected
        ? 'border-[#FE4C40] bg-orange-50/80 shadow-md ring-2 ring-[#FE4C40] ring-offset-2'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
    }`;
    
    // Different badge styles based on label - Reduced visual dominance, more subtle
    let badgeStyles = '';
    switch (label) {
      case 'our_pick':
        badgeStyles = 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider bg-[#FE4C40]/85 text-white/95';
        break;
      case 'second_best':
        badgeStyles = 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-normal uppercase tracking-wider bg-orange-50/80 text-orange-700/85 border border-orange-200/70';
        break;
      case 'off_season':
        badgeStyles = 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-normal uppercase tracking-wider bg-gray-50/80 text-gray-600/80 border border-gray-200/60';
        break;
      default:
        badgeStyles = 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-normal uppercase tracking-wider bg-gray-50/80 text-gray-600/80 border border-gray-200/60';
    }
    
    return {
      container: containerStyles,
      badge: badgeStyles,
    };
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-y-auto">
      <StepHeader
        title="Plan your trip timing"
        currentStep={2}
        totalSteps={10}
        onBack={onBack}
      />
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-4 pt-[120px] pb-24 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none">
        {/* Page Title */}
        <div className="text-center mb-14">
          <h1 className="text-lg md:text-xl font-medium text-gray-900">
            When would you like to travel?
          </h1>
        </div>

        {/* Best Months to Travel */}
        {isHydrated && availableMonths.length > 0 && (
          <div className="mb-3">
            <div className="grid grid-cols-3 gap-2">
              {availableMonths.map(({ month, data }) => {
                const isSelected = selectedMonth === month;
                const styles = getTileStyles(data.label, isSelected);
                return (
                  <button
                    key={month}
                    onClick={() => handleMonthSelect(month)}
                    className={styles.container}
                  >
                    <div className="flex flex-col h-full">
                      {/* Month name - Primary hierarchy */}
                      <div className="font-semibold text-gray-900 text-sm leading-snug tracking-wide mb-2.5">
                        {MONTH_NAMES[month]}
                      </div>
                      
                      {/* Badge - Supporting, subtle */}
                      <div className="mb-2">
                        <span className={styles.badge}>
                          {getLabelDisplay(data.label)}
                        </span>
                      </div>
                      
                      {/* Temperature and Info Icon */}
                      <div className="flex items-center justify-between gap-1 mb-2.5">
                        {data.tempC && (
                          <div className="text-[11px] text-slate-500 font-normal leading-normal">
                            {data.tempC}
                          </div>
                        )}
                        {data.note && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.span
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center cursor-pointer"
                                aria-label="Climate information"
                                role="button"
                                tabIndex={0}
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
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-sm">
                                  <Compass className="w-2.5 h-2.5 text-white" />
                                </div>
                              </motion.span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={4}
                              className="max-w-[140px] bg-gray-800 text-white text-xs"
                              align="end"
                            >
                              <p className="break-words whitespace-normal">{data.note}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-10">
          <button
            onClick={handleContinue}
            className="w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md bg-[#FE4C40] text-white hover:bg-[#E63C30] hover:shadow-lg"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

