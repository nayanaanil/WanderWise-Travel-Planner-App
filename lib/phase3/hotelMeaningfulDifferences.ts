/**
 * Phase 3: Hotel Meaningful Differences Gate
 * 
 * Deterministic gate to decide if AI guidance should be called for hotel selection.
 * Only proceeds with AI if 2+ dimensions show meaningful differences.
 * 
 * Scope: Per city only
 * 
 * Dimensions:
 * - fit: Whether hotels differ in how well they fit the itinerary (exactMatch, impactCards)
 * - comfort: Whether hotels differ in comfort/room type options (availableRoomTypes)
 * - availability: Whether hotels differ in availability risk (availabilityStatus, availabilityConfidence)
 */

import { HotelSearchResponse } from './types';
import { ImpactCard } from '@/lib/route-optimizer/routeDiff';

/**
 * Hotel option with optional impact information
 */
export type HotelOptionWithImpact = {
  id: string;
  exactMatch?: boolean;
  availableRoomTypes?: string[];
  availabilityStatus: 'available' | 'limited' | 'unavailable';
  availabilityConfidence: 'high' | 'medium' | 'low';
  // Optional impact cards from impact evaluation
  impactCards?: ImpactCard[];
  // Optional hotel tags for preference-based selection
  tags?: import('./types').HotelTags;
};

/**
 * Compute meaningful differences across hotel options for a city
 * 
 * @param hotels Array of hotel options for a city
 * @param impactResults Optional map of hotel ID to impact results (for impact cards)
 * @returns Object indicating which dimensions differ meaningfully
 */
export function computeHotelMeaningfulDifferences(
  hotels: HotelOptionWithImpact[],
  impactResults?: Map<string, { impactCards: ImpactCard[] }>
): {
  fit: boolean;
  comfort: boolean;
  availability: boolean;
} {
  if (hotels.length === 0) {
    return { fit: false, comfort: false, availability: false };
  }

  // 1. FIT DIFFERENCE CHECK
  // Check if hotels differ in how well they fit the itinerary
  // - exactMatch: false indicates date adjustment needed
  // - impactCards: non-empty indicates route impact
  let fitDiffers = false;

  // Check exactMatch variation
  const exactMatchValues = hotels.map(h => h.exactMatch !== false); // Default to true if not specified
  const hasExactMatch = exactMatchValues.some(v => v === true);
  const hasNonExactMatch = exactMatchValues.some(v => v === false);
  
  // Check impact cards if provided
  let hasImpactCards = false;
  if (impactResults) {
    for (const hotel of hotels) {
      const impact = impactResults.get(hotel.id);
      if (impact && impact.impactCards && impact.impactCards.length > 0) {
        hasImpactCards = true;
        break;
      }
    }
  }

  // Meaningful difference: mix of exactMatch and non-exactMatch, OR any impact cards
  fitDiffers = (hasExactMatch && hasNonExactMatch) || hasImpactCards;

  // 2. COMFORT DIFFERENCE CHECK
  // Check if hotels differ in available room types (comfort/options)
  let comfortDiffers = false;

  // Separate hotels with and without room types
  const hotelsWithRoomTypes = hotels.filter(
    h => h.availableRoomTypes && h.availableRoomTypes.length > 0
  );
  const hotelsWithoutRoomTypes = hotels.length - hotelsWithRoomTypes.length;

  // Check if some hotels have room types while others don't
  if (hotelsWithRoomTypes.length > 0 && hotelsWithoutRoomTypes > 0) {
    comfortDiffers = true;
  } else if (hotelsWithRoomTypes.length >= 2) {
    // Check if hotels have different room type sets or counts
    const roomTypeCounts = hotelsWithRoomTypes.map(h => h.availableRoomTypes!.length);
    const minCount = Math.min(...roomTypeCounts);
    const maxCount = Math.max(...roomTypeCounts);
    
    // Different counts = meaningful difference
    if (minCount !== maxCount) {
      comfortDiffers = true;
    } else {
      // Same count, but check if room type sets differ
      // Convert each hotel's room types to a sorted string for comparison
      const roomTypeSignatures = hotelsWithRoomTypes.map(h => {
        const types = [...(h.availableRoomTypes || [])].sort().join(',');
        return types;
      });
      
      // Check if all signatures are the same
      const firstSignature = roomTypeSignatures[0];
      const allSame = roomTypeSignatures.every(sig => sig === firstSignature);
      
      // Meaningful difference if room type sets differ
      comfortDiffers = !allSame;
    }
  }

  // 3. AVAILABILITY DIFFERENCE CHECK
  // Check if hotels differ in availability risk (status and confidence)
  let availabilityDiffers = false;

  // Collect availability statuses
  const statuses = new Set<string>();
  const confidences = new Set<string>();
  
  for (const hotel of hotels) {
    statuses.add(hotel.availabilityStatus);
    confidences.add(hotel.availabilityConfidence);
  }

  // Meaningful difference: hotels span multiple availability statuses OR confidence levels
  // Status levels: available, limited, unavailable (3 levels)
  // Confidence levels: high, medium, low (3 levels)
  const statusVariation = statuses.size >= 2; // At least 2 different statuses
  const confidenceVariation = confidences.size >= 2; // At least 2 different confidence levels
  
  // Also check for high-risk vs low-risk mix
  const hasHighRisk = Array.from(statuses).some(s => s === 'unavailable' || s === 'limited');
  const hasLowRisk = Array.from(statuses).some(s => s === 'available');
  const hasHighConfidence = Array.from(confidences).some(c => c === 'high');
  const hasLowConfidence = Array.from(confidences).some(c => c === 'low' || c === 'medium');
  
  availabilityDiffers = 
    statusVariation || // Different statuses
    confidenceVariation || // Different confidence levels
    (hasHighRisk && hasLowRisk) || // Mix of high and low risk
    (hasHighConfidence && hasLowConfidence); // Mix of high and low confidence

  return {
    fit: fitDiffers,
    comfort: comfortDiffers,
    availability: availabilityDiffers,
  };
}

/**
 * Compute meaningful differences for hotels in a city from HotelSearchResponse
 * 
 * Convenience function that extracts hotels for a specific city and computes differences
 * 
 * @param searchResponse Hotel search response
 * @param city City name to check
 * @param impactResults Optional map of hotel ID to impact results
 * @returns Object indicating which dimensions differ meaningfully
 */
export function computeHotelMeaningfulDifferencesForCity(
  searchResponse: HotelSearchResponse,
  city: string,
  impactResults?: Map<string, { impactCards: ImpactCard[] }>
): {
  fit: boolean;
  comfort: boolean;
  availability: boolean;
} {
  const cityData = searchResponse.hotelsByCity.find(
    c => c.city.toLowerCase().trim() === city.toLowerCase().trim()
  );

  if (!cityData || !cityData.hotels || cityData.hotels.length === 0) {
    return { fit: false, comfort: false, availability: false };
  }

  // Convert hotel search results to HotelOptionWithImpact format
  const hotels: HotelOptionWithImpact[] = cityData.hotels.map(hotel => ({
    id: hotel.id,
    exactMatch: hotel.exactMatch,
    availableRoomTypes: hotel.availableRoomTypes,
    availabilityStatus: hotel.availabilityStatus,
    availabilityConfidence: hotel.availabilityConfidence,
    // Impact cards will be added from impactResults if provided
  }));

  return computeHotelMeaningfulDifferences(hotels, impactResults);
}

/**
 * Check if AI guidance should proceed based on meaningful differences
 * 
 * Only proceeds if 2+ dimensions show meaningful differences
 * 
 * @param differences Result from computeHotelMeaningfulDifferences
 * @returns true if AI should proceed (2+ dimensions differ)
 */
export function shouldProceedWithAI(
  differences: { fit: boolean; comfort: boolean; availability: boolean }
): boolean {
  const count = [differences.fit, differences.comfort, differences.availability].filter(Boolean).length;
  return count >= 2;
}

/**
 * Derive disruption risk from impact cards
 * 
 * @param impactCards Array of impact cards (can be empty)
 * @returns Risk level based on impact severity
 */
function deriveDisruptionRisk(impactCards: ImpactCard[]): 'low' | 'medium' | 'high' {
  if (!impactCards || impactCards.length === 0) {
    return 'low';
  }

  // Check for BLOCKING severity (highest risk)
  const hasBlocking = impactCards.some(card => card.severity === 'BLOCKING');
  if (hasBlocking) {
    return 'high';
  }

  // Check for severity 3 (high impact)
  const hasSeverity3 = impactCards.some(card => card.severity === 3);
  if (hasSeverity3) {
    return 'medium';
  }

  // Severity 1-2 = low disruption
  return 'low';
}

/**
 * Derive sell-out risk from availability confidence
 * 
 * @param availabilityConfidence Confidence level
 * @returns Risk level (inverse of confidence)
 */
function deriveSellOutRisk(
  availabilityConfidence: 'high' | 'medium' | 'low'
): 'low' | 'medium' | 'high' {
  // Inverse relationship: low confidence = high risk
  switch (availabilityConfidence) {
    case 'low':
      return 'high';
    case 'medium':
      return 'medium';
    case 'high':
      return 'low';
  }
}

/**
 * Derive room compromise risk from room type availability vs group size
 * 
 * @param availableRoomTypes Array of available room types (can be empty)
 * @param groupSize Group size (adults + kids)
 * @returns Risk level based on room suitability
 */
function deriveRoomCompromiseRisk(
  availableRoomTypes: string[] | undefined,
  groupSize: number
): 'low' | 'medium' | 'high' {
  // If no room types available, high risk
  if (!availableRoomTypes || availableRoomTypes.length === 0) {
    return 'high';
  }

  // Check if room types suggest capacity
  // Common room type patterns:
  // - "Standard Room" typically 1-2 people
  // - "Deluxe Room" typically 2-3 people
  // - "Suite" typically 2-4+ people
  // - "Family Room" typically 4+ people
  
  const hasSuite = availableRoomTypes.some(rt => 
    rt.toLowerCase().includes('suite') || 
    rt.toLowerCase().includes('family') ||
    rt.toLowerCase().includes('apartment')
  );
  
  const hasDeluxe = availableRoomTypes.some(rt => 
    rt.toLowerCase().includes('deluxe') || 
    rt.toLowerCase().includes('superior')
  );
  
  const hasStandard = availableRoomTypes.some(rt => 
    rt.toLowerCase().includes('standard') || 
    rt.toLowerCase().includes('double')
  );

  // Large groups (4+) need suite/family rooms
  if (groupSize >= 4) {
    if (hasSuite) {
      return 'low';
    } else if (hasDeluxe) {
      return 'medium'; // May need multiple rooms
    } else {
      return 'high'; // Standard rooms won't fit
    }
  }

  // Medium groups (2-3) can use deluxe or suite
  if (groupSize >= 2) {
    if (hasSuite || hasDeluxe) {
      return 'low';
    } else if (hasStandard) {
      return 'medium'; // May be tight
    } else {
      return 'high';
    }
  }

  // Solo travelers (1) - any room type works
  return 'low';
}

/**
 * Hotel travel signals type
 */
export type HotelTravelSignals = {
  disruptionRisk: 'low' | 'medium' | 'high';
  sellOutRisk: 'low' | 'medium' | 'high';
  roomCompromiseRisk: 'low' | 'medium' | 'high';
};

/**
 * Aggregate human travel signals across all hotels for a city
 * Returns the most common (mode) or most severe signal
 * 
 * @param hotels Array of hotel options with impact information
 * @param groupSize Total group size (adults + kids)
 * @param impactResults Optional map of hotel ID to impact results (for impact cards)
 * @returns Aggregated travel signals
 */
export function aggregateHotelTravelSignals(
  hotels: HotelOptionWithImpact[],
  groupSize: number,
  impactResults?: Map<string, { impactCards: ImpactCard[] }>
): HotelTravelSignals {
  if (hotels.length === 0) {
    return {
      disruptionRisk: 'low',
      sellOutRisk: 'low',
      roomCompromiseRisk: 'low',
    };
  }

  const disruptionRiskSignals: Array<'low' | 'medium' | 'high'> = [];
  const sellOutRiskSignals: Array<'low' | 'medium' | 'high'> = [];
  const roomCompromiseRiskSignals: Array<'low' | 'medium' | 'high'> = [];

  for (const hotel of hotels) {
    // Disruption risk from impact cards
    let impactCards: ImpactCard[] = [];
    if (impactResults) {
      const impact = impactResults.get(hotel.id);
      if (impact && impact.impactCards) {
        impactCards = impact.impactCards;
      }
    }
    // Also check hotel's own impactCards if present
    if (hotel.impactCards && hotel.impactCards.length > 0) {
      impactCards = hotel.impactCards;
    }
    disruptionRiskSignals.push(deriveDisruptionRisk(impactCards));

    // Sell-out risk from availability confidence
    sellOutRiskSignals.push(deriveSellOutRisk(hotel.availabilityConfidence));

    // Room compromise risk from room types vs group size
    roomCompromiseRiskSignals.push(
      deriveRoomCompromiseRisk(hotel.availableRoomTypes, groupSize)
    );
  }

  // Aggregate: Use mode (most common) for each signal
  // For severity-ordered signals, prefer the more severe if tied
  const getMode = <T extends string>(signals: T[], severityOrder?: T[]): T => {
    const counts = new Map<T, number>();
    for (const signal of signals) {
      counts.set(signal, (counts.get(signal) || 0) + 1);
    }
    
    let maxCount = 0;
    let mode: T = signals[0];
    
    for (const [signal, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mode = signal;
      } else if (count === maxCount && severityOrder) {
        // If tied, prefer more severe
        const currentIdx = severityOrder.indexOf(mode);
        const candidateIdx = severityOrder.indexOf(signal);
        if (candidateIdx > currentIdx) {
          mode = signal;
        }
      }
    }
    
    return mode;
  };

  return {
    disruptionRisk: getMode(disruptionRiskSignals, ['low', 'medium', 'high']),
    sellOutRisk: getMode(sellOutRiskSignals, ['low', 'medium', 'high']),
    roomCompromiseRisk: getMode(roomCompromiseRiskSignals, ['low', 'medium', 'high']),
  };
}

/**
 * Resolve hotel selection based on priority
 * 
 * Deterministically selects exactly one hotel per city based on priority:
 * - fit: Minimal impact / exactMatch (prefer exactMatch: true, no impact cards)
 * - comfort: Best room type for group (room types that accommodate group size)
 * - availability: Highest confidence, available (prefer high confidence + available status)
 * 
 * @param priority Selected priority
 * @param hotels Array of hotel options for a city
 * @param groupSize Total group size (adults + kids)
 * @param impactResults Optional map of hotel ID to impact results (for impact cards)
 * @returns Selected hotel ID or null if no suitable hotel found
 */
export function resolveHotelSelectionByPriority(
  priority: 'fit' | 'comfort' | 'availability',
  hotels: HotelOptionWithImpact[],
  groupSize: number,
  impactResults?: Map<string, { impactCards: ImpactCard[] }>,
  originalPoleId?: string
): {
  hotelId: string;
  priorityUsed: 'fit' | 'comfort' | 'availability';
} | null {
  if (hotels.length === 0) {
    return null;
  }

  if (priority === 'fit') {
    // Prefer hotels with exactMatch: true and no impact cards
    // If originalPoleId is provided, use tags for location-based selection
    let bestHotel: HotelOptionWithImpact | null = null;
    let bestScore = Number.MAX_SAFE_INTEGER;

    for (const hotel of hotels) {
      let score = 0;

      // Tag-based selection for location dimension
      if (originalPoleId && hotel.tags) {
        if (originalPoleId === 'central') {
          // Prefer central location
          if (hotel.tags.locationVibe === 'central') {
            score -= 50; // Bonus for central location
          } else if (hotel.tags.locationVibe === 'quiet-residential') {
            score += 50; // Penalty for quiet (not central)
          }
        } else if (originalPoleId === 'quiet') {
          // Prefer quiet-residential location
          if (hotel.tags.locationVibe === 'quiet-residential') {
            score -= 50; // Bonus for quiet location
          } else if (hotel.tags.locationVibe === 'central') {
            score += 50; // Penalty for central (not quiet)
          }
        }
      }

      // Check exactMatch (false = requires adjustment, higher score = worse)
      if (hotel.exactMatch === false) {
        score += 100; // Penalty for requiring date adjustment
      }

      // Check impact cards
      let impactCards: ImpactCard[] = [];
      if (impactResults) {
        const impact = impactResults.get(hotel.id);
        if (impact && impact.impactCards) {
          impactCards = impact.impactCards;
        }
      }
      if (hotel.impactCards && hotel.impactCards.length > 0) {
        impactCards = hotel.impactCards;
      }

      // Penalty for impact cards (more severe = higher penalty)
      for (const card of impactCards) {
        if (card.severity === 'BLOCKING') {
          score += 1000; // Heavy penalty for blocking
        } else if (card.severity === 3) {
          score += 100; // High impact
        } else if (card.severity === 2) {
          score += 50; // Medium impact
        } else {
          score += 10; // Low impact
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestHotel = hotel;
      }
    }

    if (bestHotel) {
      return {
        hotelId: bestHotel.id,
        priorityUsed: 'fit',
      };
    }
  } else if (priority === 'comfort') {
    // Prefer hotels with room types that best accommodate the group
    // If originalPoleId is provided, use tags for differentiated comfort selection
    let bestHotel: HotelOptionWithImpact | null = null;
    let bestScore = -1; // Higher score = better

    for (const hotel of hotels) {
      if (!hotel.availableRoomTypes || hotel.availableRoomTypes.length === 0) {
        continue; // Skip hotels without room types
      }

      let score = 0;

      // Tag-based selection for comfort dimension
      if (originalPoleId && hotel.tags) {
        if (originalPoleId === 'together') {
          // Prefer hotels with family/small-group fit AND suites
          const hasSuite = hotel.availableRoomTypes.some(rt =>
            rt.toLowerCase().includes('suite') ||
            rt.toLowerCase().includes('family') ||
            rt.toLowerCase().includes('apartment')
          );
          const hasGroupFit = hotel.tags.groupFit.includes('family') || hotel.tags.groupFit.includes('small-group');
          
          if (hasGroupFit && hasSuite) {
            score += 100; // Perfect match
          } else if (hasGroupFit || hasSuite) {
            score += 50; // Partial match
          }
        } else if (originalPoleId === 'separate') {
          // Prefer budget hotels (cheaper for multiple rooms)
          if (hotel.tags.priceCategory === 'budget') {
            score += 100; // Budget preferred
          } else if (hotel.tags.priceCategory === 'moderate') {
            score += 50; // Moderate acceptable
          } else {
            score += 0; // Premium/luxury less ideal
          }
        } else if (originalPoleId === 'authentic') {
          // Prefer premium hotels with fewer amenities (boutique feel)
          if (hotel.tags.priceCategory === 'premium') {
            score += 100; // Premium boutique
          } else if (hotel.tags.priceCategory === 'moderate') {
            score += 30; // Moderate acceptable
          }
          // Penalize hotels with too many amenities (less authentic)
          const amenityCount = hotel.availableRoomTypes?.length || 0;
          if (amenityCount > 3) {
            score -= 20; // Too many amenities = less authentic
          }
        } else if (originalPoleId === 'reliable') {
          // Prefer luxury/premium with most amenities
          if (hotel.tags.priceCategory === 'luxury') {
            score += 100; // Luxury preferred
          } else if (hotel.tags.priceCategory === 'premium') {
            score += 80; // Premium good
          } else {
            score += 20; // Lower tiers less ideal
          }
          // Bonus for more amenities (full-service)
          const amenityCount = hotel.availableRoomTypes?.length || 0;
          score += amenityCount * 10; // More amenities = more reliable
        }
      }

      // Fallback to existing room type logic if tags are missing or no match
      if (!originalPoleId || !hotel.tags || score === 0) {
        // Check room type suitability for group size
        const hasSuite = hotel.availableRoomTypes.some(rt =>
          rt.toLowerCase().includes('suite') ||
          rt.toLowerCase().includes('family') ||
          rt.toLowerCase().includes('apartment')
        );
        const hasDeluxe = hotel.availableRoomTypes.some(rt =>
          rt.toLowerCase().includes('deluxe') ||
          rt.toLowerCase().includes('superior')
        );
        const hasStandard = hotel.availableRoomTypes.some(rt =>
          rt.toLowerCase().includes('standard') ||
          rt.toLowerCase().includes('double')
        );

        // Score based on group size fit
        if (groupSize >= 4) {
          // Large groups need suites/family rooms
          if (hasSuite) {
            score = 100; // Perfect fit
          } else if (hasDeluxe) {
            score = 50; // May need multiple rooms
          } else {
            score = 0; // Won't fit well
          }
        } else if (groupSize >= 2) {
          // Medium groups work with deluxe or suite
          if (hasSuite) {
            score = 100; // Excellent
          } else if (hasDeluxe) {
            score = 80; // Good
          } else if (hasStandard) {
            score = 40; // May be tight
          }
        } else {
          // Solo travelers - any room type works
          score = 100;
        }

        // Bonus for more room type options (more flexibility)
        score += hotel.availableRoomTypes.length * 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestHotel = hotel;
      }
    }

    // Fallback: if no hotel with room types, pick first available
    if (!bestHotel && hotels.length > 0) {
      bestHotel = hotels[0];
    }

    if (bestHotel) {
      return {
        hotelId: bestHotel.id,
        priorityUsed: 'comfort',
      };
    }
  } else if (priority === 'availability') {
    // Prefer hotels with highest confidence and available status
    // If originalPoleId is provided, use tags for price-based selection
    let bestHotel: HotelOptionWithImpact | null = null;
    let bestScore = -1; // Higher score = better

    for (const hotel of hotels) {
      // Skip unavailable hotels
      if (hotel.availabilityStatus === 'unavailable') {
        continue;
      }

      let score = 0;

      // Tag-based selection for price dimension
      if (originalPoleId && hotel.tags) {
        if (originalPoleId === 'save') {
          // Prefer budget hotels
          if (hotel.tags.priceCategory === 'budget') {
            score += 100; // Budget preferred
          } else if (hotel.tags.priceCategory === 'moderate') {
            score += 50; // Moderate acceptable
          } else {
            score += 0; // Premium/luxury less ideal
          }
        } else if (originalPoleId === 'spend') {
          // Prefer premium/luxury hotels
          if (hotel.tags.priceCategory === 'luxury') {
            score += 100; // Luxury preferred
          } else if (hotel.tags.priceCategory === 'premium') {
            score += 80; // Premium good
          } else if (hotel.tags.priceCategory === 'moderate') {
            score += 30; // Moderate acceptable
          } else {
            score += 0; // Budget less ideal
          }
        }
      }

      // Fallback to existing availability confidence logic if tags are missing
      if (!originalPoleId || !hotel.tags || score === 0) {
        // Confidence score (high = 30, medium = 20, low = 10)
        if (hotel.availabilityConfidence === 'high') {
          score = 30;
        } else if (hotel.availabilityConfidence === 'medium') {
          score = 20;
        } else {
          score = 10;
        }

        // Status score (available = 10, limited = 5)
        if (hotel.availabilityStatus === 'available') {
          score += 10;
        } else if (hotel.availabilityStatus === 'limited') {
          score += 5;
        }
      } else {
        // If using tags, still factor in availability confidence
        if (hotel.availabilityConfidence === 'high') {
          score += 30;
        } else if (hotel.availabilityConfidence === 'medium') {
          score += 20;
        } else {
          score += 10;
        }

        // Status score (available = 10, limited = 5)
        if (hotel.availabilityStatus === 'available') {
          score += 10;
        } else if (hotel.availabilityStatus === 'limited') {
          score += 5;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestHotel = hotel;
      }
    }

    // Fallback: if no available hotels, pick first one
    if (!bestHotel && hotels.length > 0) {
      bestHotel = hotels[0];
    }

    if (bestHotel) {
      return {
        hotelId: bestHotel.id,
        priorityUsed: 'availability',
      };
    }
  }

  return null;
}

