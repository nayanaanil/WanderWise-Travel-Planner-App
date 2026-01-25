"use client";

import { useState, useEffect, useMemo } from 'react';
import { Plane, ChevronDown, ChevronUp, Check, MapPin, Clock, DollarSign, Info, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { StepHeader } from '@/components/StepHeader';
import { Button } from '@/ui/button';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/navigation';
import { getTripState, saveTripState, setSelectedFlight } from '@/lib/tripState';
import { GatewayOption, FlightOption as Phase1FlightOption } from '@/lib/phase1/types';
import { derivePreferenceLens } from '@/lib/derivePreferenceLens';
import { getEncouragementMessage, trackAgentDecisionSuccess, getAgentDecisionSuccessCount, getWatchfulMessage, shouldShowWatchfulMessage, markWatchfulMessageAsShown } from '@/lib/agentEncouragement';
import { AgentEncouragementMessage } from '@/components/AgentEncouragementMessage';

/**
 * Helper function to format price in INR
 * Converts USD to INR and formats with ₹ symbol
 */
function formatPriceInINR(priceUSD: number | undefined | null): string {
  if (!priceUSD || priceUSD <= 0) {
    return 'N/A';
  }
  
  // Fixed conversion rate: 1 USD = 83 INR (approximate)
  const USD_TO_INR = 83;
  const priceINR = Math.round(priceUSD * USD_TO_INR);
  
  // Format with Indian number system (lakhs, crores separators)
  // Using standard toLocaleString for now
  return `₹${priceINR.toLocaleString('en-IN')}`;
}

/**
 * Helper function to format date in user-friendly format (e.g., "Jan 10, 2026")
 */
function formatFlightDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats layover duration in minutes to a human-readable string
 */
function formatLayoverDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Extracts and formats stopover information from flight legs
 * Returns stop details when available, or null if no stopover data exists
 */
function getStopoverDetails(flight: Phase1FlightOption): string | null {
  if (!flight.legs || flight.legs.length === 0) {
    return null; // No leg data available
  }
  
  // Extract layovers from the legs array
  const layovers: Array<{ airport: string; minutes: number }> = [];
  
  for (const leg of flight.legs) {
    // Check if this is a layover (has layoverMinutes property)
    if ('layoverMinutes' in leg && leg.layoverMinutes > 0 && leg.airport) {
      layovers.push({
        airport: leg.airport,
        minutes: leg.layoverMinutes,
      });
    }
  }
  
  // If we have layover data, format it
  if (layovers.length > 0) {
    const formattedLayovers = layovers.map(l => {
      const duration = formatLayoverDuration(l.minutes);
      return `${l.airport} (${duration})`;
    });
    
    if (formattedLayovers.length === 1) {
      return formattedLayovers[0];
    } else {
      // Multiple layovers: join them
      return formattedLayovers.join(', ');
    }
  }
  
  return null; // No layover data found
}

/**
 * Formats stop information for display
 * Shows stop count and details if available
 */
function formatStopInfo(flight: Phase1FlightOption): string {
  const stops = flight.stops ?? 0;
  
  if (stops === 0) {
    return 'Direct';
  }
  
  // Try to get stopover details from legs array
  const stopoverDetails = getStopoverDetails(flight);
  
  if (stopoverDetails) {
    // We have detailed stopover information
    return `${stops} stop${stops > 1 ? 's' : ''} in ${stopoverDetails}`;
  }
  
  // Fallback: show stop count only with neutral message
  return `${stops} stop${stops > 1 ? 's' : ''} (details unavailable)`;
}

/**
 * Flight time formatting and calculation helpers
 * These functions handle timezone-aware date parsing, duration calculation,
 * and day offset indicators for flight times.
 */

interface FlightTimeInfo {
  formattedDeparture: string;
  formattedArrival: string;
  formattedDuration: string;
  dayOffset: number; // 0 for same day, 1 for +1 day, etc.
  dayOffsetText: string; // "+1 day", "+2 days", or empty string
}

interface FlightPriorityGuidance {
  brief: string;
  priorities: Array<{
    id: 'price' | 'arrival' | 'layover';
    label: string;
    helper: string;
  }>;
}

/**
 * Parses duration string (e.g., "12h 30m") into total minutes
 */
function parseDurationToMinutes(durationStr: string | undefined): number {
  if (!durationStr) return 0;
  
  const hoursMatch = durationStr.match(/(\d+)h/);
  const minutesMatch = durationStr.match(/(\d+)m/);
  
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  
  return hours * 60 + minutes;
}

/**
 * Calculates the day offset between departure and arrival dates using absolute timestamps.
 * Returns 0 for same day, 1 for +1 day, 2 for +2 days, etc.
 * 
 * Prioritizes absolute timestamps (accurate) over heuristics (fallback).
 */
function calculateDayOffsetFromTimestamps(
  departureTimestamp: string | undefined,
  arrivalTimestamp: string | undefined
): number | null {
  // If we have absolute timestamps, use them for accurate calculation
  if (departureTimestamp && arrivalTimestamp) {
    try {
      const depDate = new Date(departureTimestamp);
      const arrDate = new Date(arrivalTimestamp);
      
      if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
        return null;
      }
      
      // Extract local date strings (YYYY-MM-DD) from timestamps
      const depDateStr = depDate.toISOString().split('T')[0];
      const arrDateStr = arrDate.toISOString().split('T')[0];
      
      // Calculate day difference
      const depDateOnly = new Date(depDateStr + 'T00:00:00Z');
      const arrDateOnly = new Date(arrDateStr + 'T00:00:00Z');
      const dayDiff = Math.floor((arrDateOnly.getTime() - depDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      
      return Math.max(0, dayDiff);
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Calculates the day offset using heuristics (fallback when timestamps unavailable).
 * Uses duration and clock time comparison.
 */
function calculateDayOffsetHeuristic(
  departureDate: string,
  departureTime: string | undefined,
  arrivalDate: string,
  arrivalTime: string | undefined,
  durationStr: string | undefined
): number {
  if (!departureTime || !arrivalTime) return 0;
  
  // Parse clock times
  const [depHours, depMinutes] = departureTime.split(':').map(Number);
  const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number);
  
  if (isNaN(depHours) || isNaN(depMinutes) || isNaN(arrHours) || isNaN(arrMinutes)) {
    return 0;
  }
  
  // Calculate day difference from gateway dates (if different)
  const depDateOnly = new Date(departureDate + 'T00:00:00Z');
  const arrDateOnly = new Date(arrivalDate + 'T00:00:00Z');
  const dayDiffFromDates = Math.floor((arrDateOnly.getTime() - depDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  
  // If dates are explicitly different, use that
  if (dayDiffFromDates > 0) {
    return dayDiffFromDates;
  }
  
  // If dates are the same, check if arrival crosses midnight based on duration
  const durationMinutes = parseDurationToMinutes(durationStr);
  const depMinutesOfDay = depHours * 60 + depMinutes;
  const arrMinutesOfDay = arrHours * 60 + arrMinutes;
  
  // If we have duration, use it to determine day offset
  if (durationMinutes > 0) {
    const calculatedArrivalMinutes = depMinutesOfDay + durationMinutes;
    const minutesInDay = 24 * 60;
    
    // If calculated arrival exceeds 24 hours, there's a day rollover
    if (calculatedArrivalMinutes >= minutesInDay) {
      const dayOffset = Math.floor(calculatedArrivalMinutes / minutesInDay);
      return dayOffset;
    }
  }
  
  // Fallback: If arrival time is significantly earlier than departure (more than 12 hours difference),
  // it's likely next day (e.g., departs 23:30, arrives 01:20)
  if (arrMinutesOfDay < depMinutesOfDay - 12 * 60) {
    return 1;
  }
  
  // If arrival time is slightly earlier but duration suggests long flight, check duration
  if (arrMinutesOfDay < depMinutesOfDay && durationMinutes > 6 * 60) {
    // Long flight (6+ hours) with arrival earlier than departure suggests next day
    return 1;
  }
  
  return 0;
}

/**
 * Calculates accurate duration in minutes from absolute timestamps.
 */
function calculateDurationFromTimestamps(
  departureTimestamp: string | undefined,
  arrivalTimestamp: string | undefined
): number | null {
  if (departureTimestamp && arrivalTimestamp) {
    try {
      const depDate = new Date(departureTimestamp);
      const arrDate = new Date(arrivalTimestamp);
      
      if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
        return null;
      }
      
      const diffMs = arrDate.getTime() - depDate.getTime();
      return Math.round(diffMs / (1000 * 60)); // Convert to minutes
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Formats flight time display with day offset indicator.
 * Uses absolute timestamps when available for accurate calculations.
 */
function formatFlightTimeDisplay(
  flight: Phase1FlightOption,
  gatewayDate: string
): FlightTimeInfo {
  const departureTime = flight.departureTime || '';
  const arrivalTime = flight.arrivalTime || '';
  
  // Prefer absolute timestamps for accurate calculations
  let dayOffset: number;
  let formattedDuration: string = flight.duration || 'N/A';
  
  // Try to calculate day offset from absolute timestamps first (most accurate)
  const dayOffsetFromTimestamps = calculateDayOffsetFromTimestamps(
    flight.departureTimestamp,
    flight.arrivalTimestamp
  );
  
  if (dayOffsetFromTimestamps !== null) {
    // Use timestamp-based calculation (accurate)
    dayOffset = dayOffsetFromTimestamps;
    
    // Also calculate duration from timestamps to verify consistency
    const durationFromTimestamps = calculateDurationFromTimestamps(
      flight.departureTimestamp,
      flight.arrivalTimestamp
    );
    
    // Format duration from timestamps if available and valid
    if (durationFromTimestamps !== null && durationFromTimestamps > 0) {
      const hours = Math.floor(durationFromTimestamps / 60);
      const minutes = durationFromTimestamps % 60;
      if (hours > 0 && minutes > 0) {
        formattedDuration = `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        formattedDuration = `${hours}h`;
      } else {
        formattedDuration = `${minutes}m`;
      }
    }
  } else {
    // Fallback to heuristic calculation when timestamps unavailable
    dayOffset = calculateDayOffsetHeuristic(
      gatewayDate,
      departureTime,
      gatewayDate,
      arrivalTime,
      flight.duration
    );
  }
  
  const dayOffsetText = dayOffset > 0 ? ` (+${dayOffset} day${dayOffset > 1 ? 's' : ''})` : '';
  
  return {
    formattedDeparture: departureTime,
    formattedArrival: arrivalTime + dayOffsetText,
    formattedDuration,
    dayOffset,
    dayOffsetText,
  };
}

/**
 * Resolves the best gateway + flights based on user-selected priority.
 * Uses existing ranked data only - no new scoring formulas.
 * 
 * @param excludeCombinations Optional array of flight combinations to exclude (for ensuring distinct recommendations)
 */
function resolveSelectionByPriority(
  priority: 'price' | 'arrival' | 'layover',
  gatewayOptions: GatewayOption[],
  excludeCombinations: Array<{
    gatewayId: string;
    outboundFlightId: string;
    inboundFlightId: string;
  }> = []
): {
  gatewayId: string;
  outboundFlightId: string;
  inboundFlightId: string;
  priorityUsed: 'price' | 'arrival' | 'layover';
} | null {
  if (gatewayOptions.length === 0) {
    return null;
  }

  // Helper function to check if a combination is excluded
  const isExcluded = (
    gatewayId: string,
    outboundFlightId: string,
    inboundFlightId: string
  ): boolean => {
    return excludeCombinations.some(
      (excluded) =>
        excluded.gatewayId === gatewayId &&
        excluded.outboundFlightId === outboundFlightId &&
        excluded.inboundFlightId === inboundFlightId
    );
  };

  if (priority === 'price') {
    // Choose gateway with lowest total price (cheapest outbound + cheapest inbound)
    let bestGateway: GatewayOption | null = null;
    let bestTotalPrice = Number.MAX_SAFE_INTEGER;

    for (const gateway of gatewayOptions) {
      const cheapestOutbound = gateway.outbound.flights.reduce(
        (min, f) => (!min || (f.price || 0) < min.price ? f : min),
        null as Phase1FlightOption | null
      );
      const cheapestInbound = gateway.inbound.flights.reduce(
        (min, f) => (!min || (f.price || 0) < min.price ? f : min),
        null as Phase1FlightOption | null
      );

      if (cheapestOutbound && cheapestInbound) {
        const totalPrice = (cheapestOutbound.price || 0) + (cheapestInbound.price || 0);
        if (totalPrice < bestTotalPrice) {
          bestTotalPrice = totalPrice;
          bestGateway = gateway;
        }
      }
    }

    if (bestGateway) {
      const cheapestOutbound = bestGateway.outbound.flights.reduce(
        (min, f) => (!min || (f.price || 0) < min.price ? f : min),
        null as Phase1FlightOption | null
      );
      const cheapestInbound = bestGateway.inbound.flights.reduce(
        (min, f) => (!min || (f.price || 0) < min.price ? f : min),
        null as Phase1FlightOption | null
      );

      if (cheapestOutbound && cheapestInbound) {
        // Check if this combination is excluded
        if (!isExcluded(bestGateway.id, cheapestOutbound.id, cheapestInbound.id)) {
        return {
          gatewayId: bestGateway.id,
          outboundFlightId: cheapestOutbound.id,
          inboundFlightId: cheapestInbound.id,
            priorityUsed: 'price',
          };
        }
      }
    }
    
    // If best combination was excluded, try next best
    // Sort all gateways by total price and find first non-excluded
    const gatewaysWithPrices = gatewayOptions
      .map((gateway) => {
        const cheapestOutbound = gateway.outbound.flights.reduce(
          (min, f) => (!min || (f.price || 0) < min.price ? f : min),
          null as Phase1FlightOption | null
        );
        const cheapestInbound = gateway.inbound.flights.reduce(
          (min, f) => (!min || (f.price || 0) < min.price ? f : min),
          null as Phase1FlightOption | null
        );
        return {
          gateway,
          cheapestOutbound,
          cheapestInbound,
          totalPrice: cheapestOutbound && cheapestInbound 
            ? (cheapestOutbound.price || 0) + (cheapestInbound.price || 0)
            : Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((item) => item.cheapestOutbound && item.cheapestInbound)
      .sort((a, b) => a.totalPrice - b.totalPrice);
    
    for (const item of gatewaysWithPrices) {
      if (
        item.cheapestOutbound &&
        item.cheapestInbound &&
        !isExcluded(item.gateway.id, item.cheapestOutbound.id, item.cheapestInbound.id)
      ) {
        return {
          gatewayId: item.gateway.id,
          outboundFlightId: item.cheapestOutbound.id,
          inboundFlightId: item.cheapestInbound.id,
          priorityUsed: 'price',
        };
      }
    }
  } else if (priority === 'arrival') {
    // Choose gateway whose inbound flight arrives earliest (best arrival freshness)
    let bestGateway: GatewayOption | null = null;
    let bestArrivalHour = 24; // Start with latest possible hour

    for (const gateway of gatewayOptions) {
      // Find earliest arriving inbound flight
      const earliestInbound = gateway.inbound.flights.reduce(
        (earliest, f) => {
          if (!earliest) return f;
          const earliestTime = earliest.arrivalTime;
          const fTime = f.arrivalTime;
          if (!earliestTime || !fTime) return earliest;

          const [earliestHourStr] = earliestTime.split(':');
          const [fHourStr] = fTime.split(':');
          const earliestHour = parseInt(earliestHourStr, 10);
          const fHour = parseInt(fHourStr, 10);

          if (isNaN(earliestHour) || isNaN(fHour)) return earliest;

          // Compare hours (earlier is better)
          // Handle day rollover: if arrival is very early (0-4), treat as next day priority
          const earliestHourAdjusted = earliestHour < 5 ? earliestHour + 24 : earliestHour;
          const fHourAdjusted = fHour < 5 ? fHour + 24 : fHour;

          return fHourAdjusted < earliestHourAdjusted ? f : earliest;
        },
        null as Phase1FlightOption | null
      );

      if (earliestInbound && earliestInbound.arrivalTime) {
        const [hourStr] = earliestInbound.arrivalTime.split(':');
        const hour = parseInt(hourStr, 10);
        if (!isNaN(hour)) {
          const hourAdjusted = hour < 5 ? hour + 24 : hour;
          if (hourAdjusted < bestArrivalHour) {
            bestArrivalHour = hourAdjusted;
            bestGateway = gateway;
          }
        }
      }
    }

    if (bestGateway) {
      // For arrival priority, choose flights that optimize arrival freshness
      // Use earliest inbound, and for outbound choose one that doesn't delay arrival
      const earliestInbound = bestGateway.inbound.flights.reduce(
        (earliest, f) => {
          if (!earliest) return f;
          const earliestTime = earliest.arrivalTime;
          const fTime = f.arrivalTime;
          if (!earliestTime || !fTime) return earliest;

          const [earliestHourStr] = earliestTime.split(':');
          const [fHourStr] = fTime.split(':');
          const earliestHour = parseInt(earliestHourStr, 10);
          const fHour = parseInt(fHourStr, 10);

          if (isNaN(earliestHour) || isNaN(fHour)) return earliest;

          const earliestHourAdjusted = earliestHour < 5 ? earliestHour + 24 : earliestHour;
          const fHourAdjusted = fHour < 5 ? fHour + 24 : fHour;

          return fHourAdjusted < earliestHourAdjusted ? f : earliest;
        },
        null as Phase1FlightOption | null
      );

      // For outbound, prefer recommended or fastest (optimizes overall journey)
      const bestOutbound =
        bestGateway.outbound.flights.find((f) => f.recommended) ||
        bestGateway.outbound.flights.find((f) => f.fastest) ||
        bestGateway.outbound.flights[0];

      if (earliestInbound && bestOutbound) {
        // Check if this combination is excluded
        if (!isExcluded(bestGateway.id, bestOutbound.id, earliestInbound.id)) {
        return {
          gatewayId: bestGateway.id,
          outboundFlightId: bestOutbound.id,
          inboundFlightId: earliestInbound.id,
          priorityUsed: 'arrival',
        };
        }
      }
    }
    
    // If best combination was excluded, try next best gateway
    const gatewaysWithArrivals = gatewayOptions
      .map((gateway) => {
        const earliestInbound = gateway.inbound.flights.reduce(
          (earliest, f) => {
            if (!earliest) return f;
            const earliestTime = earliest.arrivalTime;
            const fTime = f.arrivalTime;
            if (!earliestTime || !fTime) return earliest;

            const [earliestHourStr] = earliestTime.split(':');
            const [fHourStr] = fTime.split(':');
            const earliestHour = parseInt(earliestHourStr, 10);
            const fHour = parseInt(fHourStr, 10);

            if (isNaN(earliestHour) || isNaN(fHour)) return earliest;

            const earliestHourAdjusted = earliestHour < 5 ? earliestHour + 24 : earliestHour;
            const fHourAdjusted = fHour < 5 ? fHour + 24 : fHour;

            return fHourAdjusted < earliestHourAdjusted ? f : earliest;
          },
          null as Phase1FlightOption | null
        );
        return {
          gateway,
          earliestInbound,
          arrivalHour: earliestInbound?.arrivalTime
            ? (() => {
                const [hourStr] = earliestInbound.arrivalTime!.split(':');
                const hour = parseInt(hourStr, 10);
                return isNaN(hour) ? 24 : hour < 5 ? hour + 24 : hour;
              })()
            : 24,
        };
      })
      .filter((item) => item.earliestInbound)
      .sort((a, b) => a.arrivalHour - b.arrivalHour);
    
    for (const item of gatewaysWithArrivals) {
      if (item.earliestInbound) {
        const bestOutbound =
          item.gateway.outbound.flights.find((f) => f.recommended) ||
          item.gateway.outbound.flights.find((f) => f.fastest) ||
          item.gateway.outbound.flights[0];
        
        if (
          bestOutbound &&
          !isExcluded(item.gateway.id, bestOutbound.id, item.earliestInbound.id)
        ) {
          return {
            gatewayId: item.gateway.id,
            outboundFlightId: bestOutbound.id,
            inboundFlightId: item.earliestInbound.id,
            priorityUsed: 'arrival',
          };
        }
      }
    }
  } else if (priority === 'layover') {
    // Choose gateway with lowest layover burden (fewest stops, shortest layovers, non-overnight)
    let bestGateway: GatewayOption | null = null;
    let bestLayoverScore = Number.MAX_SAFE_INTEGER;

    for (const gateway of gatewayOptions) {
      // Calculate layover burden for this gateway
      // Lower score = better (fewer stops, shorter layovers)
      let gatewayLayoverScore = 0;

      // Check outbound flights
      for (const flight of gateway.outbound.flights) {
        const stops = flight.stops ?? 0;
        gatewayLayoverScore += stops * 100; // Each stop adds 100 points

        // Check for long layovers
        if (flight.legs && flight.legs.length > 0) {
          for (const leg of flight.legs as any[]) {
            if ('layoverMinutes' in leg && typeof leg.layoverMinutes === 'number') {
              const layoverMins = leg.layoverMinutes;
              gatewayLayoverScore += layoverMins; // Add layover minutes to score
              // Penalty for overnight layovers (>= 8 hours)
              if (layoverMins >= 8 * 60) {
                gatewayLayoverScore += 500; // Heavy penalty for overnight
              }
            }
          }
        }
      }

      // Check inbound flights
      for (const flight of gateway.inbound.flights) {
        const stops = flight.stops ?? 0;
        gatewayLayoverScore += stops * 100;

        if (flight.legs && flight.legs.length > 0) {
          for (const leg of flight.legs as any[]) {
            if ('layoverMinutes' in leg && typeof leg.layoverMinutes === 'number') {
              const layoverMins = leg.layoverMinutes;
              gatewayLayoverScore += layoverMins;
              if (layoverMins >= 8 * 60) {
                gatewayLayoverScore += 500;
              }
            }
          }
        }
      }

      // Use average score per flight for comparison
      const avgScore = gatewayLayoverScore / (gateway.outbound.flights.length + gateway.inbound.flights.length);
      if (avgScore < bestLayoverScore) {
        bestLayoverScore = avgScore;
        bestGateway = gateway;
      }
    }

    if (bestGateway) {
      // For layover priority, choose flights with minimal layover pain
      // Prefer direct flights, then flights with fewest stops
      const bestOutbound = bestGateway.outbound.flights.reduce(
        (best, f) => {
          if (!best) return f;
          const bestStops = best.stops ?? 0;
          const fStops = f.stops ?? 0;
          if (fStops < bestStops) return f;
          if (fStops > bestStops) return best;
          // If same stops, prefer recommended
          if (f.recommended && !best.recommended) return f;
          return best;
        },
        null as Phase1FlightOption | null
      );

      const bestInbound = bestGateway.inbound.flights.reduce(
        (best, f) => {
          if (!best) return f;
          const bestStops = best.stops ?? 0;
          const fStops = f.stops ?? 0;
          if (fStops < bestStops) return f;
          if (fStops > bestStops) return best;
          if (f.recommended && !best.recommended) return f;
          return best;
        },
        null as Phase1FlightOption | null
      );

      if (bestOutbound && bestInbound) {
        // Check if this combination is excluded
        if (!isExcluded(bestGateway.id, bestOutbound.id, bestInbound.id)) {
        return {
          gatewayId: bestGateway.id,
          outboundFlightId: bestOutbound.id,
          inboundFlightId: bestInbound.id,
            priorityUsed: 'layover',
          };
        }
      }
    }
    
    // If best combination was excluded, try next best gateway
    const gatewaysWithScores = gatewayOptions
      .map((gateway) => {
        let gatewayLayoverScore = 0;
        for (const flight of gateway.outbound.flights) {
          const stops = flight.stops ?? 0;
          gatewayLayoverScore += stops * 100;
          if (flight.legs && flight.legs.length > 0) {
            for (const leg of flight.legs as any[]) {
              if ('layoverMinutes' in leg && typeof leg.layoverMinutes === 'number') {
                const layoverMins = leg.layoverMinutes;
                gatewayLayoverScore += layoverMins;
                if (layoverMins >= 8 * 60) {
                  gatewayLayoverScore += 500;
                }
              }
            }
          }
        }
        for (const flight of gateway.inbound.flights) {
          const stops = flight.stops ?? 0;
          gatewayLayoverScore += stops * 100;
          if (flight.legs && flight.legs.length > 0) {
            for (const leg of flight.legs as any[]) {
              if ('layoverMinutes' in leg && typeof leg.layoverMinutes === 'number') {
                const layoverMins = leg.layoverMinutes;
                gatewayLayoverScore += layoverMins;
                if (layoverMins >= 8 * 60) {
                  gatewayLayoverScore += 500;
                }
              }
            }
          }
        }
        const avgScore = gatewayLayoverScore / (gateway.outbound.flights.length + gateway.inbound.flights.length);
        
        const bestOutbound = gateway.outbound.flights.reduce(
          (best, f) => {
            if (!best) return f;
            const bestStops = best.stops ?? 0;
            const fStops = f.stops ?? 0;
            if (fStops < bestStops) return f;
            if (fStops > bestStops) return best;
            if (f.recommended && !best.recommended) return f;
            return best;
          },
          null as Phase1FlightOption | null
        );
        
        const bestInbound = gateway.inbound.flights.reduce(
          (best, f) => {
            if (!best) return f;
            const bestStops = best.stops ?? 0;
            const fStops = f.stops ?? 0;
            if (fStops < bestStops) return f;
            if (fStops > bestStops) return best;
            if (f.recommended && !best.recommended) return f;
            return best;
          },
          null as Phase1FlightOption | null
        );
        
        return {
          gateway,
          avgScore,
          bestOutbound,
          bestInbound,
        };
      })
      .filter((item) => item.bestOutbound && item.bestInbound)
      .sort((a, b) => a.avgScore - b.avgScore);
    
    for (const item of gatewaysWithScores) {
      if (
        item.bestOutbound &&
        item.bestInbound &&
        !isExcluded(item.gateway.id, item.bestOutbound.id, item.bestInbound.id)
      ) {
        return {
          gatewayId: item.gateway.id,
          outboundFlightId: item.bestOutbound.id,
          inboundFlightId: item.bestInbound.id,
          priorityUsed: 'layover',
        };
      }
    }
  }

  return null;
}

/**
 * Generates confirmation copy for the resolved selection.
 * Simple template-based, no AI call.
 */
function generateConfirmationCopy(
  priority: 'price' | 'arrival' | 'layover',
  gateway: GatewayOption,
  outboundFlight: Phase1FlightOption,
  inboundFlight: Phase1FlightOption
): string {
  if (priority === 'price') {
    const hasStops = (outboundFlight.stops ?? 0) > 0 || (inboundFlight.stops ?? 0) > 0;
    if (hasStops) {
      return "Picked for you because you wanted the best price — this saves money, with a few stops along the way.";
    }
    return "Picked for you because you wanted the best price — this gets you the lowest total cost.";
  } else if (priority === 'arrival') {
    const arrivalTime = inboundFlight.arrivalTime;
    if (arrivalTime) {
      const [hourStr] = arrivalTime.split(':');
      const hour = parseInt(hourStr, 10);
      if (!isNaN(hour) && hour < 14) {
        return "Picked for you because you wanted to arrive fresh — this gets you in early, so you can make the most of your first day.";
      }
    }
    return "Picked for you because you wanted to arrive fresh — this gets you in at the best time, with a longer layover along the way.";
  } else if (priority === 'layover') {
    const outboundStops = outboundFlight.stops ?? 0;
    const inboundStops = inboundFlight.stops ?? 0;
    if (outboundStops === 0 && inboundStops === 0) {
      return "Picked for you because you wanted fewer layovers — this gives you direct flights with no connections.";
    }
    return "Picked for you because you wanted fewer layovers — this minimizes connections and keeps layovers short.";
  }
  return "Picked for you based on your priority.";
}

/**
 * Generates recommendation explanation copy for the agent pick section.
 * Template-based, no AI call.
 */
function generateRecommendationExplanation(
  priority: 'price' | 'arrival' | 'layover',
  outboundFlight: Phase1FlightOption,
  inboundFlight: Phase1FlightOption
): { mainBenefit: string; acceptedTradeoff: string } {
  if (priority === 'price') {
    const hasStops = (outboundFlight.stops ?? 0) > 0 || (inboundFlight.stops ?? 0) > 0;
    return {
      mainBenefit: 'the lowest total price',
      acceptedTradeoff: hasStops ? 'a few stops along the way' : 'potentially longer travel time',
    };
  } else if (priority === 'arrival') {
    const arrivalTime = inboundFlight.arrivalTime;
    let benefit = 'the best arrival time';
    if (arrivalTime) {
      const [hourStr] = arrivalTime.split(':');
      const hour = parseInt(hourStr, 10);
      if (!isNaN(hour) && hour < 14) {
        benefit = 'an early arrival so you can make the most of your first day';
      }
    }
    const hasLongLayovers = (outboundFlight.stops ?? 0) > 0 || (inboundFlight.stops ?? 0) > 0;
    return {
      mainBenefit: benefit,
      acceptedTradeoff: hasLongLayovers ? 'longer layovers' : 'potentially higher cost',
    };
  } else if (priority === 'layover') {
    const outboundStops = outboundFlight.stops ?? 0;
    const inboundStops = inboundFlight.stops ?? 0;
    if (outboundStops === 0 && inboundStops === 0) {
      return {
        mainBenefit: 'direct flights with no connections',
        acceptedTradeoff: 'potentially higher cost or less ideal timing',
      };
    }
    return {
      mainBenefit: 'minimal connections and short layovers',
      acceptedTradeoff: 'potentially higher cost or less ideal arrival times',
    };
  }
  return {
    mainBenefit: 'the best option for your priority',
    acceptedTradeoff: 'some tradeoffs',
  };
}

interface FlightOptionsResultsScreenProps {
  onBack?: () => void;
  onSelectFlight?: () => void;
  onBackToPreferences?: () => void;
}

/**
 * Detects if AI explanation references preferenceLens elements.
 * Simple keyword-based detection for priority and tolerance themes.
 * 
 * Returns true if explanation contains keywords/phrases tied to:
 * - priority: "time", "saving time", "shorter", "faster"
 * - priority: "cost", "save", "budget", "cheaper"
 * - priority: "comfort", "fewer stops", "less tiring", "more reliable"
 * - tolerance: stops-related terms when tolerance is relevant
 * 
 * This is deterministic and safe - does not need to be perfect.
 */
function doesExplanationReferencePreferenceLens(
  explanation: string | null | undefined,
  preferenceLens: { priority: string; tolerance: { stops: string; longJourneys: string } }
): boolean {
  if (!explanation) return false;

  const explanationLower = explanation.toLowerCase();

  // Priority: "time" keywords
  const timeKeywords = ['time', 'shorter', 'faster', 'quick', 'speed', 'hours', 'duration', 'efficient'];
  const hasTimeReference = timeKeywords.some(keyword => explanationLower.includes(keyword));

  // Priority: "cost" keywords
  const costKeywords = ['save', 'saves', 'saving', 'budget', 'cheaper', 'cheap', 'affordable', 'price', 'cost', '$'];
  const hasCostReference = costKeywords.some(keyword => explanationLower.includes(keyword));

  // Priority: "comfort" keywords
  const comfortKeywords = ['fewer stops', 'less tiring', 'more reliable', 'reliable', 'smooth', 'comfortable', 'direct', 'connection'];
  const hasComfortReference = comfortKeywords.some(keyword => explanationLower.includes(keyword));

  // Check if explanation aligns with priority
  const alignsWithPriority = 
    (preferenceLens.priority === 'time' && hasTimeReference) ||
    (preferenceLens.priority === 'cost' && hasCostReference) ||
    (preferenceLens.priority === 'comfort' && hasComfortReference);

  // Check tolerance references (stops-related)
  const stopsKeywords = ['stop', 'stops', 'connection', 'connections', 'direct', 'layover'];
  const hasStopsReference = stopsKeywords.some(keyword => explanationLower.includes(keyword));

  // Show compass if explanation references priority OR tolerance
  return alignsWithPriority || hasStopsReference;
}

/**
 * Derives firstDayUsability signal from flight characteristics.
 * 
 * "Good" = Arrive early enough to have a productive first day
 * "Mixed" = Arrive mid-day, some first-day usability
 * "Poor" = Arrive late, first day mostly lost
 */
function deriveFirstDayUsability(
  arrivalTime: string | undefined,
  totalDurationMinutes: number
): 'good' | 'mixed' | 'poor' {
  if (!arrivalTime || typeof arrivalTime !== 'string' || arrivalTime.length < 2) {
    return 'mixed'; // Default if time unavailable
  }

  const [hourStr] = arrivalTime.split(':');
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) {
    return 'mixed';
  }

  // Good: Arrive before 2 PM (14:00) - full day available
  if (hour < 14) {
    return 'good';
  }

  // Poor: Arrive after 8 PM (20:00) - first day mostly lost
  if (hour >= 20) {
    return 'poor';
  }

  // Also consider total duration: Very long flights (>12h) arriving mid-day are still poor
  if (totalDurationMinutes > 12 * 60 && hour >= 14) {
    return 'poor';
  }

  // Mixed: Arrive between 2 PM and 8 PM
  return 'mixed';
}

/**
 * Derives connectionAnxiety signal from layover and connection characteristics.
 * 
 * "Low" = Direct flights or comfortable layovers
 * "Medium" = Short layovers or one connection
 * "High" = Multiple connections, tight layovers, or long layovers
 */
function deriveConnectionAnxiety(
  stops: number,
  layoverMinutes: number | null,
  totalDurationMinutes: number
): 'low' | 'medium' | 'high' {
  // Low: Direct flights (no connections)
  if (stops === 0) {
    return 'low';
  }

  // High: Multiple connections (2+ stops)
  if (stops >= 2) {
    return 'high';
  }

  // For single connection, check layover duration
  if (layoverMinutes !== null) {
    // High: Very short layovers (< 1 hour) - tight connection risk
    if (layoverMinutes < 60) {
      return 'high';
    }

    // High: Very long layovers (> 8 hours) - connection fatigue
    if (layoverMinutes > 8 * 60) {
      return 'high';
    }

    // Medium: Comfortable layovers (1-8 hours)
    return 'medium';
  }

  // If layover data unavailable but we have stops, default to medium
  return 'medium';
}

/**
 * Derives sleepDisruptionRisk signal from departure/arrival times and duration.
 * 
 * "Low" = Depart/arrive at reasonable hours, short duration
 * "Medium" = Some disruption (overnight flight, late arrival, or early departure)
 * "High" = Significant disruption (red-eye, very late arrival, or very early departure)
 */
function deriveSleepDisruptionRisk(
  departureTime: string | undefined,
  arrivalTime: string | undefined,
  totalDurationMinutes: number
): 'low' | 'medium' | 'high' {
  if (!departureTime || !arrivalTime) {
    return 'medium'; // Default if times unavailable
  }

  const [depHourStr] = departureTime.split(':');
  const [arrHourStr] = arrivalTime.split(':');
  const depHour = parseInt(depHourStr, 10);
  const arrHour = parseInt(arrHourStr, 10);

  if (isNaN(depHour) || isNaN(arrHour)) {
    return 'medium';
  }

  // High: Red-eye flights (depart 22:00-04:00)
  const isRedEye = depHour >= 22 || depHour < 4;
  
  // High: Very late arrivals (after 23:00 or before 5:00)
  const isVeryLateArrival = arrHour >= 23 || arrHour < 5;
  
  // High: Very early departures (before 6:00)
  const isVeryEarlyDeparture = depHour < 6;
  
  // High: Very long flights (> 14 hours) that cross many time zones
  const isVeryLongFlight = totalDurationMinutes > 14 * 60;

  if (isRedEye || isVeryLateArrival || (isVeryEarlyDeparture && isVeryLongFlight)) {
    return 'high';
  }

  // Medium: Overnight flights (depart evening, arrive morning) or late arrivals
  const isOvernight = (depHour >= 18 && arrHour < 12) || (depHour >= 20 && arrHour < 14);
  const isLateArrival = arrHour >= 21 || arrHour < 8;
  const isEarlyDeparture = depHour < 8;
  const isLongFlight = totalDurationMinutes > 10 * 60;

  if (isOvernight || isLateArrival || (isEarlyDeparture && isLongFlight)) {
    return 'medium';
  }

  // Low: Reasonable departure/arrival times, moderate duration
  return 'low';
}

/**
 * Aggregates human travel signals across all flights.
 * Returns the most common (mode) or most severe signal.
 */
function aggregateTravelSignals(
  allFlights: Phase1FlightOption[]
): {
  firstDayUsability: 'good' | 'mixed' | 'poor';
  connectionAnxiety: 'low' | 'medium' | 'high';
  sleepDisruptionRisk: 'low' | 'medium' | 'high';
} {
  if (allFlights.length === 0) {
    return {
      firstDayUsability: 'mixed',
      connectionAnxiety: 'low',
      sleepDisruptionRisk: 'low',
    };
  }

  const firstDayUsabilitySignals: Array<'good' | 'mixed' | 'poor'> = [];
  const connectionAnxietySignals: Array<'low' | 'medium' | 'high'> = [];
  const sleepDisruptionRiskSignals: Array<'low' | 'medium' | 'high'> = [];

  for (const flight of allFlights) {
    const durationMinutes = parseDurationToMinutes(flight.duration);
    
    // First day usability
    firstDayUsabilitySignals.push(
      deriveFirstDayUsability(flight.arrivalTime, durationMinutes)
    );

    // Connection anxiety
    let maxLayoverMinutes: number | null = null;
    if (flight.legs && flight.legs.length > 0) {
      for (const leg of flight.legs as any[]) {
        if ('layoverMinutes' in leg && typeof leg.layoverMinutes === 'number') {
          maxLayoverMinutes = Math.max(maxLayoverMinutes || 0, leg.layoverMinutes);
        }
      }
    }
    connectionAnxietySignals.push(
      deriveConnectionAnxiety(flight.stops ?? 0, maxLayoverMinutes, durationMinutes)
    );

    // Sleep disruption risk
    sleepDisruptionRiskSignals.push(
      deriveSleepDisruptionRisk(flight.departureTime, flight.arrivalTime, durationMinutes)
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
    firstDayUsability: getMode(firstDayUsabilitySignals, ['good', 'mixed', 'poor']),
    connectionAnxiety: getMode(connectionAnxietySignals, ['low', 'medium', 'high']),
    sleepDisruptionRisk: getMode(sleepDisruptionRiskSignals, ['low', 'medium', 'high']),
  };
}

/**
 * Determines whether meaningful differences exist across gateway + flight options
 * in three dimensions: price, arrival, and layover.
 * 
 * This is a deterministic gate to decide if the Page-Level Flight Guidance AI
 * should be called. The AI should only ask clarifying questions if 2+ dimensions
 * show meaningful differences.
 * 
 * @param gatewayOptions Array of gateway options with outbound/inbound flights
 * @returns Object indicating which dimensions differ meaningfully
 */
function computeMeaningfulDifferences(
  gatewayOptions: GatewayOption[]
): {
  price: boolean;
  arrival: boolean;
  layover: boolean;
} {
  // Collect all flights across all gateways
  const allFlights: Phase1FlightOption[] = gatewayOptions.flatMap((g) => [
    ...g.outbound.flights,
    ...g.inbound.flights,
  ]);

  if (allFlights.length === 0) {
    return { price: false, arrival: false, layover: false };
  }

  // 1. PRICE DIFFERENCE CHECK
  // Calculate total price per gateway (cheapest outbound + cheapest inbound)
  const gatewayTotalPrices: number[] = gatewayOptions
    .map((gateway) => {
      const cheapestOutbound = gateway.outbound.flights.reduce(
        (min, f) => (!min || (f.price || 0) < min.price ? f : min),
        null as Phase1FlightOption | null
      );
      const cheapestInbound = gateway.inbound.flights.reduce(
        (min, f) => (!min || (f.price || 0) < min.price ? f : min),
        null as Phase1FlightOption | null
      );
      
      if (!cheapestOutbound || !cheapestInbound) return null;
      return (cheapestOutbound.price || 0) + (cheapestInbound.price || 0);
    })
    .filter((p): p is number => p !== null && p > 0);

  let priceDiffers = false;
  if (gatewayTotalPrices.length >= 2) {
    const minPrice = Math.min(...gatewayTotalPrices);
    const maxPrice = Math.max(...gatewayTotalPrices);
    const priceDiff = maxPrice - minPrice;
    // Meaningful difference: >20% relative difference OR >$100 absolute difference
    const relativeThreshold = minPrice * 0.2;
    const absoluteThreshold = 100;
    priceDiffers = priceDiff > Math.max(relativeThreshold, absoluteThreshold);
  }

  // 2. ARRIVAL TIME DIFFERENCE CHECK
  // Categorize arrivals into buckets: morning (5-12), afternoon (12-21), late night (21-5)
  const arrivalBuckets = {
    morning: 0,
    afternoon: 0,
    lateNight: 0,
  };

  for (const flight of allFlights) {
    const timeStr = flight.arrivalTime as string | undefined;
    if (!timeStr || typeof timeStr !== 'string' || timeStr.length < 2) continue;
    
    const [hourStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    if (isNaN(hour)) continue;

    if (hour >= 5 && hour < 12) {
      arrivalBuckets.morning += 1;
    } else if (hour >= 12 && hour < 21) {
      arrivalBuckets.afternoon += 1;
    } else {
      // 21:00-04:59
      arrivalBuckets.lateNight += 1;
    }
  }

  // Meaningful difference: arrivals span 2+ different time buckets
  const bucketsWithFlights = [
    arrivalBuckets.morning > 0,
    arrivalBuckets.afternoon > 0,
    arrivalBuckets.lateNight > 0,
  ].filter(Boolean).length;
  
  const arrivalDiffers = bucketsWithFlights >= 2;

  // 3. LAYOVER DIFFERENCE CHECK
  // Find longest layover across all flights
  let longestLayoverMinutes = 0;
  let hasOvernightLayover = false;

  for (const flight of allFlights) {
    if (!flight.legs || flight.legs.length === 0) continue;
    
    for (const leg of flight.legs as any[]) {
      if ('layoverMinutes' in leg && typeof leg.layoverMinutes === 'number') {
        const layoverMins = leg.layoverMinutes;
        longestLayoverMinutes = Math.max(longestLayoverMinutes, layoverMins);
        
        // Overnight layover: >= 8 hours (480 minutes)
        if (layoverMins >= 480) {
          hasOvernightLayover = true;
        }
      }
    }
  }

  // Also check if we have flights with no layovers (direct) vs flights with layovers
  const directFlights = allFlights.filter((f) => (f.stops ?? 0) === 0).length;
  const flightsWithLayovers = allFlights.length - directFlights;

  // Meaningful difference if:
  // - Longest layover is "long" (>= 5h) AND we have some direct/short-layover options
  // - OR we have overnight layovers mixed with shorter options
  // - OR we have mix of direct flights and flights with layovers
  const hasLongLayovers = longestLayoverMinutes >= 5 * 60; // 5 hours
  const hasShortLayovers = longestLayoverMinutes > 0 && longestLayoverMinutes < 2 * 60; // < 2 hours
  
  const layoverDiffers =
    (hasLongLayovers && (directFlights > 0 || hasShortLayovers)) ||
    hasOvernightLayover ||
    (directFlights > 0 && flightsWithLayovers > 0);

  return {
    price: priceDiffers,
    arrival: arrivalDiffers,
    layover: layoverDiffers,
  };
}

/**
 * Phase 1 Flight Options Screen
 * 
 * Displays gateway options from Phase 1 API and allows selection of:
 * - One gateway option
 * - One outbound flight from that gateway's options
 * - One inbound flight from that gateway's options
 * 
 * Does NOT:
 * - Build routes
 * - Auto-confirm flights
 * - Show timeline or map
 */
export function FlightOptionsResultsScreen({
  onBack,
  onSelectFlight,
  onBackToPreferences
}: FlightOptionsResultsScreenProps) {
  const router = useRouter();
  const [gatewayOptions, setGatewayOptions] = useState<GatewayOption[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [selectedOutboundFlightId, setSelectedOutboundFlightId] = useState<string | null>(null);
  const [selectedInboundFlightId, setSelectedInboundFlightId] = useState<string | null>(null);
  const [expandedGatewayId, setExpandedGatewayId] = useState<string | null>(null);
  const [expandedFlightIds, setExpandedFlightIds] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<'best' | 'cheapest' | 'fastest'>('best');
  // Gateway and flight explanations removed - no longer used
  const [preferenceLens, setPreferenceLens] = useState<{ priority: string; tolerance: { stops: string; longJourneys: string } } | null>(null);
  const [flightPriorityGuidance, setFlightPriorityGuidance] = useState<FlightPriorityGuidance | null>(null);
  const [selectedFlightPriority, setSelectedFlightPriority] = useState<'price' | 'arrival' | 'layover' | null>(null);
  const [showPriorityGuidance, setShowPriorityGuidance] = useState(false);
  // Store pre-resolved flights for all priorities to ensure distinct recommendations
  const [resolvedFlightsByPriority, setResolvedFlightsByPriority] = useState<Map<string, {
    gatewayId: string;
    outboundFlightId: string;
    inboundFlightId: string;
    priorityUsed: 'price' | 'arrival' | 'layover';
  }>>(new Map());
  
  // Auto-show guidance when it's first loaded
  useEffect(() => {
    if (flightPriorityGuidance) {
      setShowPriorityGuidance(true);
    }
  }, [flightPriorityGuidance]);
  const [agentResolvedSelection, setAgentResolvedSelection] = useState<{
    gatewayId: string;
    outboundFlightId: string;
    inboundFlightId: string;
    priorityUsed: 'price' | 'arrival' | 'layover';
  } | null>(null);
  const [aiExplanation, setAiExplanation] = useState<{
    explanation: string;
    acceptedTradeoff: string;
  } | null>(null);
  const [encouragementMessage, setEncouragementMessage] = useState<string | null>(null);
  const [agentSuccessCount, setAgentSuccessCount] = useState(0);
  const [shouldShowWatchfulMsg, setShouldShowWatchfulMsg] = useState(false);
  // Store original payload for explanation API call
  const [originalPayload, setOriginalPayload] = useState<any>(null);

  // Load agent success count on mount and check if watchful message should be shown
  useEffect(() => {
    const count = getAgentDecisionSuccessCount();
    setAgentSuccessCount(count);
    setShouldShowWatchfulMsg(shouldShowWatchfulMessage(count));
    if (shouldShowWatchfulMessage(count)) {
      markWatchfulMessageAsShown();
    }
  }, []);

  // Guard: Check for gatewayOptions on mount and pre-fetch gateway explanations
  useEffect(() => {
    const tripState = getTripState();
    
    if (!tripState.gatewayOptions || tripState.gatewayOptions.length === 0) {
      console.warn('[Phase1] No gatewayOptions found, redirecting to loader');
      router.push(routes.bookings.flights.index);
      return;
    }

    setGatewayOptions(tripState.gatewayOptions);
    
    // Gateway explanations removed - no longer fetching AI explanations for individual gateways
    
    // Page-level Flight Priority Clarification Agent (runs once per page load)
    try {
      const budget = tripState.budget === 'budget' ? 'low' : tripState.budget === 'luxury' ? 'high' : 'medium';
      const pace = tripState.pace || 'moderate';
      const adults = tripState.adults || tripState.tripInput?.adults || 1;
      const kids = tripState.kids || tripState.tripInput?.kids || 0;
      const interests = tripState.styles || tripState.tripInput?.styles || [];

      let tripDurationDays: number | undefined;
      const dateRange = tripState.dateRange || tripState.tripInput?.dateRange;
      if (dateRange?.from && dateRange?.to) {
        const from = new Date(dateRange.from);
        const to = new Date(dateRange.to);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          tripDurationDays = Math.max(
            1,
            Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
          );
        }
      }

      const allFlights: Phase1FlightOption[] = tripState.gatewayOptions.flatMap((g: any) => [
        ...g.outbound.flights,
        ...g.inbound.flights,
      ]);

      const prices = allFlights
        .map(f => f.price)
        .filter((p: number | undefined) => typeof p === 'number' && p > 0) as number[];

      const durations = allFlights
        .map(f => parseDurationToMinutes(f.duration))
        .filter(d => d > 0);

      let priceRange: { min: number; max: number } | null = null;
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        priceRange = { min, max };
      }

      let totalTravelTimeRangeMinutes: { min: number; max: number } | null = null;
      if (durations.length > 0) {
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        totalTravelTimeRangeMinutes = { min, max };
      }

      const stopsArray = allFlights.map(f => f.stops ?? 0);
      const averageStops =
        stopsArray.length > 0
          ? stopsArray.reduce((sum, s) => sum + s, 0) / stopsArray.length
          : 0;

      const gatewaysWithAlternatives = tripState.gatewayOptions.filter((g: any) => {
        const outboundCount = g.outbound?.flights?.length || 0;
        const inboundCount = g.inbound?.flights?.length || 0;
        return outboundCount + inboundCount > 1;
      }).length;

      const layoverPatterns = (() => {
        const longLayoverThresholdMinutes = 5 * 60; // 5 hours+
        let hasLongLayovers = false;

        for (const flight of allFlights) {
          if (!flight.legs || flight.legs.length === 0) continue;
          for (const leg of flight.legs as any[]) {
            if ('layoverMinutes' in leg && typeof leg.layoverMinutes === 'number') {
              if (leg.layoverMinutes >= longLayoverThresholdMinutes) {
                hasLongLayovers = true;
                break;
              }
            }
          }
          if (hasLongLayovers) break;
        }

        const stopCounts = stopsArray;
        let typicalStops: 'nonstop' | 'one-stop' | 'multi-stop' | 'mixed' = 'mixed';
        if (stopCounts.length > 0) {
          if (stopCounts.every(s => s === 0)) {
            typicalStops = 'nonstop';
          } else if (stopCounts.every(s => s === 1)) {
            typicalStops = 'one-stop';
          } else if (stopCounts.every(s => s >= 2)) {
            typicalStops = 'multi-stop';
          }
        }

        return {
          hasLongLayovers,
          typicalStops,
        };
      })();

      const arrivalPatterns = (() => {
        let morning = 0;
        let lateNight = 0;

        for (const flight of allFlights) {
          const timeStr = flight.arrivalTime as string | undefined;
          if (!timeStr || typeof timeStr !== 'string' || timeStr.length < 2) continue;
          const [hourStr] = timeStr.split(':');
          const hour = parseInt(hourStr, 10);
          if (isNaN(hour)) continue;

          if (hour >= 5 && hour < 12) {
            morning += 1;
          } else if (hour >= 21 || hour < 2) {
            lateNight += 1;
          }
        }

        const total = allFlights.length || 1;
        const mostlyMorning = morning / total > 0.6;
        const mostlyLateNight = lateNight / total > 0.6;
        const mixed = !mostlyMorning && !mostlyLateNight;

        return {
          mostlyMorning,
          mostlyLateNight,
          mixed,
        };
      })();

      const reliability = {
        totalOptions: allFlights.length,
        gatewaysWithAlternatives,
        averageStops,
      };

      // Deterministic gate: Check if meaningful differences exist
      // Flight Decision Support Agent loop:
      // - IF ≥2 differences: AI brief + priority question shown
      // - IF <2 differences (but ≥1): AI brief only (no question, empty priorities)
      // - IF 0 differences: Skip AI call (no guidance needed)
      const meaningfulDifferences = computeMeaningfulDifferences(tripState.gatewayOptions);
      const dimensionsThatDiffer = [
        meaningfulDifferences.price,
        meaningfulDifferences.arrival,
        meaningfulDifferences.layover,
      ].filter(Boolean).length;

      // Skip AI call only if NO dimensions differ meaningfully (0 differences)
      if (dimensionsThatDiffer === 0) {
        // No meaningful differences at all - skip guidance entirely
        return;
      }

      // Continue with AI call for ≥1 differences
      // AI will return empty priorities if only 1 dimension differs

      // Derive human travel signals from flight characteristics
      const travelSignals = aggregateTravelSignals(allFlights);

      const payload = {
        tripContext: {
          pace,
          interests,
          budget: tripState.budgetType?.toLowerCase() || 'moderate',
          travelers: {
            adults,
            kids,
          },
          tripDurationDays,
        },
        aggregatedFacts: {
          priceRange,
          totalTravelTimeRangeMinutes,
          layoverPatterns,
          arrivalPatterns,
          reliability,
        },
        differentiators: meaningfulDifferences,
        travelSignals: {
          firstDayUsability: travelSignals.firstDayUsability,
          connectionAnxiety: travelSignals.connectionAnxiety,
          sleepDisruptionRisk: travelSignals.sleepDisruptionRisk,
        },
      };

      // Store payload for later use in explanation API call
      setOriginalPayload(payload);

      fetch('/api/agent/flight-priority-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as FlightPriorityGuidance;
        })
        .then((data) => {
          // Accept guidance with brief and valid priorities array (can be empty)
          if (data && data.brief && typeof data.brief === 'string' && Array.isArray(data.priorities)) {
            // Use tripState.gatewayOptions directly (already set in state above)
            const currentGatewayOptions = tripState.gatewayOptions || [];
            
            // Pre-resolve all priorities to ensure distinct recommendations
            const resolvedMap = new Map<string, {
              gatewayId: string;
              outboundFlightId: string;
              inboundFlightId: string;
              priorityUsed: 'price' | 'arrival' | 'layover';
            }>();
            const excludeCombinations: Array<{
              gatewayId: string;
              outboundFlightId: string;
              inboundFlightId: string;
            }> = [];

            // Only pre-resolve if we have gateway options
            if (currentGatewayOptions.length > 0) {
              // Resolve each priority, excluding previously resolved combinations
              for (const priority of data.priorities) {
                const priorityId = priority.id as 'price' | 'arrival' | 'layover';
                const resolved = resolveSelectionByPriority(
                  priorityId,
                  currentGatewayOptions,
                  excludeCombinations
                );

                if (resolved) {
                  resolvedMap.set(priorityId, resolved);
                  excludeCombinations.push({
                    gatewayId: resolved.gatewayId,
                    outboundFlightId: resolved.outboundFlightId,
                    inboundFlightId: resolved.inboundFlightId,
                  });
                }
              }
            }

            // Validation: Check for duplicates and count distinct combinations
            const resolvedCombinations = Array.from(resolvedMap.values()).map((r) => 
              `${r.gatewayId}-${r.outboundFlightId}-${r.inboundFlightId}`
            );
            const distinctCombinations = new Set(resolvedCombinations);
            const hasDuplicates = resolvedCombinations.length !== distinctCombinations.size;
            const distinctCount = distinctCombinations.size;

            // Store pre-resolved selections
            setResolvedFlightsByPriority(resolvedMap);

            // Collapse to brief-only if fewer than 2 distinct combinations or duplicates detected
            if (hasDuplicates || distinctCount < 2) {
              setFlightPriorityGuidance({
                brief: data.brief,
                priorities: [], // Hide pills if duplicates
              });
            } else {
              // All distinct, show full guidance
            setFlightPriorityGuidance(data);
            }
          }
        })
        .catch((err) => {
          console.error('[FlightPriorityGuidance] Failed to fetch guidance', err);
        });
    } catch (err) {
      console.error('[FlightPriorityGuidance] Failed to prepare guidance payload', err);
    }
    
    // If user already has a selection, restore it
    if (tripState.selectedFlights) {
      // Try to find which gateway option matches the selected flights
      // For MVP, we'll just show all options and let user reselect
    }
  }, [router]);

  // Flight explanations removed - no longer fetching AI explanations for individual flights

  // Resolve selection when user selects a priority
  useEffect(() => {
    if (!selectedFlightPriority || gatewayOptions.length === 0) {
      setAgentResolvedSelection(null);
      setAiExplanation(null);
      return;
    }

    // Use pre-resolved selection if available, otherwise resolve on demand
    const preResolved = resolvedFlightsByPriority.get(selectedFlightPriority);
    let resolved: {
      gatewayId: string;
      outboundFlightId: string;
      inboundFlightId: string;
      priorityUsed: 'price' | 'arrival' | 'layover';
    } | null;
    
    if (preResolved) {
      resolved = preResolved;
      setAgentResolvedSelection(preResolved);
      // Auto-expand the resolved gateway so user can see the flights
      setExpandedGatewayId(preResolved.gatewayId);
    } else {
      // Fallback: resolve on demand (shouldn't happen if pre-resolution worked)
      resolved = resolveSelectionByPriority(selectedFlightPriority, gatewayOptions);
      setAgentResolvedSelection(resolved);
      if (resolved) {
        setExpandedGatewayId(resolved.gatewayId);
      }
    }

    // Make second API call for explanation if we have a resolved selection and original payload
    if (resolved && originalPayload) {
      const resolvedGateway = gatewayOptions.find(g => g.id === resolved.gatewayId);
      const resolvedOutbound = resolvedGateway?.outbound.flights.find(f => f.id === resolved.outboundFlightId);
      const resolvedInbound = resolvedGateway?.inbound.flights.find(f => f.id === resolved.inboundFlightId);

      if (resolvedGateway && resolvedOutbound && resolvedInbound) {
        // Use outbound flight for explanation (or could combine both)
        const selectedFlight = resolvedOutbound;
        
        fetch('/api/agent/flight-priority-guidance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...originalPayload,
            selectedPriority: {
              priorityId: selectedFlightPriority,
              selectedFlight: {
                airline: selectedFlight.airline || selectedFlight.airlineName || 'Multiple Airlines',
                price: selectedFlight.price || 0,
                departureTime: selectedFlight.departureTime || '',
                arrivalTime: selectedFlight.arrivalTime || '',
                stops: selectedFlight.stops || 0,
                totalDuration: selectedFlight.duration || '',
              },
            },
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              console.error('[FlightExplanation] Failed to fetch explanation', res.status);
              return null;
            }
            return await res.json();
          })
          .then((data) => {
            if (data && data.explanation && data.acceptedTradeoff) {
              setAiExplanation({
                explanation: data.explanation,
                acceptedTradeoff: data.acceptedTradeoff,
              });
            } else {
              // Fallback to template-based explanation
              setAiExplanation(null);
            }
          })
          .catch((err) => {
            console.error('[FlightExplanation] Failed to fetch explanation', err);
            // Fallback to template-based explanation
            setAiExplanation(null);
          });
      }
    }
  }, [selectedFlightPriority, gatewayOptions, resolvedFlightsByPriority, originalPayload]);

  const handleGatewaySelect = (gatewayId: string) => {
    if (selectedGatewayId === gatewayId) {
      // Toggle expansion
      setExpandedGatewayId(expandedGatewayId === gatewayId ? null : gatewayId);
    } else {
      // Select new gateway
      setSelectedGatewayId(gatewayId);
      setExpandedGatewayId(gatewayId);
      // Clear previous flight selections
      setSelectedOutboundFlightId(null);
      setSelectedInboundFlightId(null);
    }
    // Note: Gateway explanation state is independent - clicking gateway card does NOT affect it
  };

  const handleOutboundFlightSelect = (flightId: string) => {
    setSelectedOutboundFlightId(flightId);
  };

  const handleInboundFlightSelect = (flightId: string) => {
    setSelectedInboundFlightId(flightId);
  };

  // Scroll to flight card and optionally highlight it
  const scrollToFlightCard = (flightId: string, isOutbound: boolean) => {
    // Create a unique ID for the flight card element
    const elementId = `flight-${isOutbound ? 'outbound' : 'inbound'}-${flightId}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporarily add a highlight class
      element.classList.add('ring-2', 'ring-orange-400', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-orange-400', 'ring-offset-2');
      }, 2000);
    }
  };

  // Auto-select resolved flights
  const handleSelectResolvedFlights = () => {
    if (!agentResolvedSelection) return;
    
    // Set gateway selection
    setSelectedGatewayId(agentResolvedSelection.gatewayId);
    setExpandedGatewayId(agentResolvedSelection.gatewayId);
    
    // Set flight selections
    setSelectedOutboundFlightId(agentResolvedSelection.outboundFlightId);
    setSelectedInboundFlightId(agentResolvedSelection.inboundFlightId);
  };

  const toggleFlightExpansion = (flightId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFlightIds(prev => {
      const next = new Set(prev);
      if (next.has(flightId)) {
        next.delete(flightId);
      } else {
        next.add(flightId);
      }
      return next;
    });
  };

  // Sort flights based on selected option
  const sortFlights = (flights: Phase1FlightOption[]): Phase1FlightOption[] => {
    const sorted = [...flights];
    switch (sortOption) {
      case 'cheapest':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'fastest':
        return sorted.sort((a, b) => {
          const aMinutes = parseDurationToMinutes(a.duration);
          const bMinutes = parseDurationToMinutes(b.duration);
          return aMinutes - bMinutes;
        });
      case 'best':
      default:
        // Best = recommended first, then by price
        return sorted.sort((a, b) => {
          if (a.recommended && !b.recommended) return -1;
          if (!a.recommended && b.recommended) return 1;
          return (a.price || 0) - (b.price || 0);
        });
    }
  };

  const handleContinue = async () => {
    if (!selectedGatewayId || !selectedOutboundFlightId || !selectedInboundFlightId) {
      return;
    }
    
    const selectedGateway = gatewayOptions.find(g => g.id === selectedGatewayId);
    if (!selectedGateway) {
      return;
    }
    
    const outboundFlight = selectedGateway.outbound.flights.find(f => f.id === selectedOutboundFlightId);
    const inboundFlight = selectedGateway.inbound.flights.find(f => f.id === selectedInboundFlightId);

    if (!outboundFlight || !inboundFlight) {
      return;
    }
    
    // Check if user accepted agent pick
    const isAgentPick = agentResolvedSelection && 
      agentResolvedSelection.gatewayId === selectedGatewayId &&
      agentResolvedSelection.outboundFlightId === selectedOutboundFlightId &&
      agentResolvedSelection.inboundFlightId === selectedInboundFlightId;
    
    if (isAgentPick && agentResolvedSelection) {
      // Track success and show encouragement
      const newCount = trackAgentDecisionSuccess();
      setAgentSuccessCount(newCount);
      const message = getEncouragementMessage('flight', agentResolvedSelection.priorityUsed, newCount);
      if (message) {
        setEncouragementMessage(message);
      }
    }
    
    // Store selected flights
    setSelectedFlight('outbound', {
      ...outboundFlight,
      gatewayOption: selectedGatewayId,
      originCity: selectedGateway.outbound.originCity,
      gatewayCity: selectedGateway.outbound.gatewayCity,
      date: selectedGateway.outbound.date,
    });
    console.log('[FLIGHT_SAVED]', {
      type: 'outbound',
      savedValue: {
        ...outboundFlight,
        gatewayOption: selectedGatewayId,
        originCity: selectedGateway.outbound.originCity,
        gatewayCity: selectedGateway.outbound.gatewayCity,
        date: selectedGateway.outbound.date,
      },
      tripStateSnapshot: getTripState(),
    });

    setSelectedFlight('return', {
      ...inboundFlight,
      gatewayOption: selectedGatewayId,
      gatewayCity: selectedGateway.inbound.gatewayCity,
      destinationCity: selectedGateway.inbound.destinationCity,
      date: selectedGateway.inbound.date,
    });
    console.log('[FLIGHT_SAVED]', {
      type: 'return',
      savedValue: {
        ...inboundFlight,
        gatewayOption: selectedGatewayId,
        gatewayCity: selectedGateway.inbound.gatewayCity,
        destinationCity: selectedGateway.inbound.destinationCity,
        date: selectedGateway.inbound.date,
      },
      tripStateSnapshot: getTripState(),
    });

    try {
      // Extract flight anchors from selected flights (same logic as review page)
      const lockedFlightAnchors = {
        outboundFlight: {
          fromCity: selectedGateway.outbound.originCity,
          toCity: selectedGateway.outbound.gatewayCity,
          date: selectedGateway.outbound.date,
        },
        inboundFlight: {
          fromCity: selectedGateway.inbound.gatewayCity,
          toCity: selectedGateway.inbound.destinationCity,
          date: selectedGateway.inbound.date,
        },
      };

      // Validate locked anchors have all required fields
      if (!lockedFlightAnchors.outboundFlight.fromCity ||
          !lockedFlightAnchors.outboundFlight.toCity ||
          !lockedFlightAnchors.outboundFlight.date ||
          !lockedFlightAnchors.inboundFlight.fromCity ||
          !lockedFlightAnchors.inboundFlight.toCity ||
          !lockedFlightAnchors.inboundFlight.date) {
        console.error('[Phase1] Invalid flight anchors:', lockedFlightAnchors);
        alert('Error: Missing flight information. Please try selecting flights again.');
        return;
      }

      // Persist flight anchors and update phase (these help build the route, but are reversible)
      // NOTE: selectedFlights are preserved here - they will be merged into structuralRoute later
      saveTripState({
        lockedFlightAnchors,
        phase: 'FLIGHTS_SELECTED',
      });

      console.debug('[Phase1] Flight anchors saved for route building', lockedFlightAnchors);

      // Navigate directly to route building
      router.push(routes.plan.building);
    } catch (error) {
      console.error('[Phase1] Error saving flight selection:', error);
      alert('Error saving flight selection. Please try again.');
    }
  };

  const selectedGateway = selectedGatewayId 
    ? gatewayOptions.find(g => g.id === selectedGatewayId)
    : null;

  const canContinue = selectedGatewayId && selectedOutboundFlightId && selectedInboundFlightId;

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(routes.bookings.flights.index);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-y-auto">
      <StepHeader
        title="Review flight options"
        currentStep={7}
        totalSteps={10}
        onBack={handleBackClick}
      />
      
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-6 pt-[120px] pb-24 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none">
        {/* Page Title */}
        <div className="text-center mb-8 relative">
          <h1 className="text-lg md:text-xl font-medium text-gray-900 mb-2">
            Review flight options
          </h1>
          <p className="text-sm text-gray-600 mb-2">
            These flights help us plan your trip. You&apos;re not booking yet, and you can change this later.
          </p>
          <p className="text-sm text-gray-600">
            Choose a city to fly into and out of to continue.
          </p>
          
          {/* Main Compass Icon - Top Right */}
          {flightPriorityGuidance && (
            <div className="absolute top-0 right-0 relative">
              <motion.button
                type="button"
                onClick={() => setShowPriorityGuidance(!showPriorityGuidance)}
                className="flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                aria-label="Get flight guidance"
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

        {/* Page-level Flight Priority Guidance */}
        {flightPriorityGuidance && showPriorityGuidance && (
          <section className="mb-8 p-4 rounded-xl bg-gradient-to-br from-[#FFF5F4] via-white to-[#FFF5F4] border border-[#FED7D2] shadow-sm">
            <p className={`text-sm text-[#4B5563] ${flightPriorityGuidance.priorities.length > 0 ? 'mb-3' : ''}`}>
              {flightPriorityGuidance.brief}
            </p>
            {/* Watchful message after 4+ successes (once per session) */}
            {shouldShowWatchfulMsg && (
              <p className="text-xs text-[#6B7280] italic mt-3 pt-3 border-t border-orange-200">
                {getWatchfulMessage()}
              </p>
            )}
            {/* Only render priorities if array is not empty */}
            {flightPriorityGuidance.priorities.length > 0 && (
              <div className="flex flex-col gap-2">
                {flightPriorityGuidance.priorities.map((priority) => {
                  const isSelected = selectedFlightPriority === priority.id;
                  return (
                    <button
                      key={priority.id}
                      type="button"
                      onClick={() => {
                        const newPriority = selectedFlightPriority === priority.id ? null : priority.id;
                        setSelectedFlightPriority(newPriority);
                        setAiExplanation(null); // Clear previous explanation while new one loads
                      }}
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
            {selectedFlightPriority && agentResolvedSelection && (() => {
              const resolvedGateway = gatewayOptions.find(g => g.id === agentResolvedSelection.gatewayId);
              const resolvedOutbound = resolvedGateway?.outbound.flights.find(f => f.id === agentResolvedSelection.outboundFlightId);
              const resolvedInbound = resolvedGateway?.inbound.flights.find(f => f.id === agentResolvedSelection.inboundFlightId);
              
              if (!resolvedGateway || !resolvedOutbound || !resolvedInbound) {
                return null;
              }

              const outboundTimeInfo = formatFlightTimeDisplay(resolvedOutbound, resolvedGateway.outbound.date);
              const inboundTimeInfo = formatFlightTimeDisplay(resolvedInbound, resolvedGateway.inbound.date);
              
              // Show loading state when explanation is being fetched
              const isLoadingExplanation = !aiExplanation;
              
              // Use AI-generated explanation if available, otherwise fallback to template
              const templateExplanation = generateRecommendationExplanation(
                agentResolvedSelection.priorityUsed,
                resolvedOutbound,
                resolvedInbound
              );
              
              const explanationText = aiExplanation?.explanation || templateExplanation.mainBenefit;
              const tradeoffText = aiExplanation?.acceptedTradeoff || templateExplanation.acceptedTradeoff;

              const priorityLabel = flightPriorityGuidance?.priorities.find(p => p.id === agentResolvedSelection.priorityUsed)?.label || agentResolvedSelection.priorityUsed;

              return (
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Compass className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm font-semibold text-[#1F2937]">WanderWise Agent Pick</h3>
                  </div>
                  
                  <div className="space-y-2 text-xs text-[#4B5563] mb-3">
                    <button
                      type="button"
                      onClick={() => scrollToFlightCard(resolvedOutbound.id, true)}
                      className="w-full text-left hover:text-orange-600 transition-colors"
                    >
                      <span className="font-medium">Outbound:</span>{' '}
                      <span className="text-[#1F2937]">{resolvedGateway.outbound.gatewayCity}</span>
                      {' | '}
                      <span className="text-[#1F2937]">{resolvedOutbound.airline || resolvedOutbound.airlineName || 'Multiple Airlines'}</span>
                      {' · '}
                      <span className="text-[#1F2937]">{outboundTimeInfo.formattedDeparture}</span>
                      {' → '}
                      <span className="text-[#1F2937]">{outboundTimeInfo.formattedArrival}</span>
                      {' · '}
                      <span className="text-[#1F2937]">{formatStopInfo(resolvedOutbound)}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => scrollToFlightCard(resolvedInbound.id, false)}
                      className="w-full text-left hover:text-orange-600 transition-colors"
                    >
                      <span className="font-medium">Inbound:</span>{' '}
                      <span className="text-[#1F2937]">{resolvedGateway.inbound.gatewayCity}</span>
                      {' | '}
                      <span className="text-[#1F2937]">{resolvedInbound.airline || resolvedInbound.airlineName || 'Multiple Airlines'}</span>
                      {' · '}
                      <span className="text-[#1F2937]">{inboundTimeInfo.formattedDeparture}</span>
                      {' → '}
                      <span className="text-[#1F2937]">{inboundTimeInfo.formattedArrival}</span>
                      {' · '}
                      <span className="text-[#1F2937]">{formatStopInfo(resolvedInbound)}</span>
                    </button>
                  </div>

                  {isLoadingExplanation ? (
                    <div className="flex items-center gap-2 py-2 mb-3">
                      <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-[#6B7280] italic">Thinking...</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B7280] italic mb-3">
                      {aiExplanation ? (
                        <>
                          {aiExplanation.explanation}
                          <br />
                          <span className="mt-1 block">Accepted tradeoff: {aiExplanation.acceptedTradeoff}</span>
                        </>
                      ) : (
                        <>
                          Chosen because you prioritized <span className="font-medium text-[#1F2937]">{priorityLabel.toLowerCase()}</span>. 
                          This gives you {explanationText}, with {tradeoffText}.
                        </>
                      )}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSelectResolvedFlights}
                    className="w-full px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Select these flights
                  </button>
                </div>
              );
            })()}
          </section>
        )}

        {/* Gateway Options */}
        <div className="space-y-4 mb-6">
          {gatewayOptions.map((gateway) => {
            const isSelected = selectedGatewayId === gateway.id;
            const isExpanded = expandedGatewayId === gateway.id;
            const isResolved = agentResolvedSelection?.gatewayId === gateway.id;

            return (
              <div
                key={gateway.id}
                className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                  isResolved
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-200'
                    : isSelected 
                    ? 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-[#FE4C40] shadow-sm hover:shadow-md'
                }`}
              >
                {/* Gateway Card Header */}
                <div
                  onClick={() => handleGatewaySelect(gateway.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-[#FE4C40]" />
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-lg font-semibold text-[#1F2937]">
                            {gateway.outbound.gatewayCity}
                          </h3>
                          <div className="group relative">
                            <Info className="w-4 h-4 text-[#9CA3AF] cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                              <div className="bg-[#1F2937] text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                Main arrival airport for your trip
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F2937]"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#FE4C40] text-white flex items-center justify-center text-sm flex-shrink-0">
                            ✓
                          </div>
                        )}
                        {/* Agent Resolved Indicator */}
                        {isResolved && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-lg shadow-orange-300/40">
                              <Compass className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Agent Resolved Confirmation Copy */}
                      {isResolved && agentResolvedSelection && (() => {
                        const resolvedGateway = gatewayOptions.find(g => g.id === agentResolvedSelection.gatewayId);
                        const resolvedOutbound = resolvedGateway?.outbound.flights.find(f => f.id === agentResolvedSelection.outboundFlightId);
                        const resolvedInbound = resolvedGateway?.inbound.flights.find(f => f.id === agentResolvedSelection.inboundFlightId);
                        if (resolvedGateway && resolvedOutbound && resolvedInbound) {
                          const confirmationCopy = generateConfirmationCopy(
                            agentResolvedSelection.priorityUsed,
                            resolvedGateway,
                            resolvedOutbound,
                            resolvedInbound
                          );
                          return (
                            <div className="mt-2 pl-2 text-xs text-orange-700 italic border-l-2 border-orange-300">
                              {confirmationCopy}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Gateway Summary */}
                      <div className="space-y-1 text-sm text-[#6B7280]">
                        {gateway.score.totalPrice && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>From {formatPriceInINR(gateway.score.totalPrice)}</span>
                          </div>
                        )}
                        {gateway.score.totalTravelTimeMinutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{Math.round(gateway.score.totalTravelTimeMinutes / 60)}h {gateway.score.totalTravelTimeMinutes % 60}m total</span>
                          </div>
                        )}
                      </div>

                      {/* Original Gateway Explanation */}
                      {gateway.explanation && gateway.explanation.length > 0 && (
                        <div className="mt-2 text-xs text-[#6B7280]">
                          {gateway.explanation[0]}
                        </div>
                      )}
                    </div>
                    
                    {/* Right side: Expand/Collapse button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGatewaySelect(gateway.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                        )}
                      </button>
                    </div>
                  </div>
                  </div>

                {/* Expanded Flight Lists */}
                {isExpanded && isSelected && (
                  <div className="border-t border-gray-200 p-4 space-y-6">
                    {/* Curation Banner */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-900 leading-relaxed">
                          We filtered out flights with poor connections and excessive travel time
                        </p>
                      </div>
                    </div>


                    {/* Sort Control */}
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-[#6B7280]">Sort flights by:</label>
                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value as 'best' | 'cheapest' | 'fastest')}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#FE4C40] focus:border-transparent"
                        >
                          <option value="best">Best overall</option>
                          <option value="cheapest">Cheapest</option>
                          <option value="fastest">Fastest</option>
                        </select>
                      </div>
                    </div>

                    {/* Outbound Flights */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#1F2937] mb-3">
                        Outbound Flights ({gateway.outbound.originCity} → {gateway.outbound.gatewayCity})
                        {gateway.outbound.date && (
                          <span className="text-gray-600 font-normal"> · {formatFlightDate(gateway.outbound.date)}</span>
                        )}
                      </h4>
                      <div className="space-y-3">
                        {sortFlights(gateway.outbound.flights).map((flight) => {
                          const isFlightSelected = selectedOutboundFlightId === flight.id;
                          const isExpanded = expandedFlightIds.has(flight.id);
                          const isResolved = agentResolvedSelection?.gatewayId === gateway.id && 
                                           agentResolvedSelection?.outboundFlightId === flight.id;
                          const timeInfo = formatFlightTimeDisplay(flight, gateway.outbound.date);
                          return (
                            <div
                              id={`flight-outbound-${flight.id}`}
                              key={flight.id}
                              className={`rounded-xl border-2 transition-all ${
                                isResolved
                                  ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-200'
                                  : isFlightSelected
                                  ? 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-lg'
                                  : 'border-gray-200 bg-white hover:border-[#FE4C40]'
                              }`}
                            >
                              <div
                                onClick={() => handleOutboundFlightSelect(flight.id)}
                                className="p-4 cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-medium text-[#6B7280]">
                                        {flight.airline || flight.airlineName || 'Multiple Airlines'}
                                      </span>
                                      {isFlightSelected && (
                                        <div className="w-5 h-5 rounded-full bg-[#FE4C40] text-white flex items-center justify-center text-xs flex-shrink-0">
                                          ✓
                                        </div>
                                      )}
                                      {isResolved && (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-lg shadow-orange-300/40">
                                          <Compass className="w-3.5 h-3.5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      {timeInfo.formattedDeparture && timeInfo.formattedArrival && (
                                        <div className="text-xs text-[#9CA3AF]">
                                          {timeInfo.formattedDeparture} → {timeInfo.formattedArrival}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-3 text-sm">
                                        <span className="text-[#6B7280]">{timeInfo.formattedDuration}</span>
                                        <span className="text-[#9CA3AF]">·</span>
                                        <span className="text-[#6B7280]">{formatStopInfo(flight)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <div className="text-xl font-bold text-[#1F2937]">
                                      {formatPriceInINR(flight.price)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {!flight.recommended && flight.cheapest && (
                                        <div className="text-xs text-[#10B981]">Cheapest</div>
                                      )}
                                      {!flight.recommended && !flight.cheapest && flight.fastest && (
                                        <div className="text-xs text-[#3B82F6]">Fastest</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Expandable Section */}
                              <div className="border-t border-gray-100">
                                <button
                                  onClick={(e) => toggleFlightExpansion(flight.id, e)}
                                  className="w-full px-4 py-2 text-xs text-[#6B7280] hover:bg-gray-50 flex items-center justify-between transition-colors"
                                >
                                  <span>{isExpanded ? 'Less details' : 'More details'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                {isExpanded && (
                                  <div className="px-4 pb-4 space-y-2 text-sm text-[#6B7280]">
                                    <div className="flex items-center justify-between">
                                      <span>Baggage</span>
                                      <span className="font-medium text-[#1F2937]">1 checked bag included</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Aircraft</span>
                                      <span className="font-medium text-[#1F2937]">Wide-body aircraft</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Refunds</span>
                                      <span className="font-medium text-[#1F2937]">Refundable with airline fees</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inbound Flights */}
                        <div>
                      <h4 className="text-sm font-semibold text-[#1F2937] mb-3">
                        Inbound Flights ({gateway.inbound.gatewayCity} → {gateway.inbound.destinationCity})
                        {gateway.inbound.date && (
                          <span className="text-gray-600 font-normal"> · {formatFlightDate(gateway.inbound.date)}</span>
                        )}
                      </h4>
                      <div className="space-y-3">
                        {sortFlights(gateway.inbound.flights).map((flight) => {
                          const isFlightSelected = selectedInboundFlightId === flight.id;
                          const isExpanded = expandedFlightIds.has(flight.id);
                          const isResolved = agentResolvedSelection?.gatewayId === gateway.id && 
                                           agentResolvedSelection?.inboundFlightId === flight.id;
                          const timeInfo = formatFlightTimeDisplay(flight, gateway.inbound.date);
                          return (
                            <div
                              id={`flight-inbound-${flight.id}`}
                              key={flight.id}
                              className={`rounded-xl border-2 transition-all ${
                                isResolved
                                  ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-200'
                                  : isFlightSelected
                                  ? 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-lg'
                                  : 'border-gray-200 bg-white hover:border-[#FE4C40]'
                              }`}
                            >
                              <div
                                onClick={() => handleInboundFlightSelect(flight.id)}
                                className="p-4 cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-medium text-[#6B7280]">
                                        {flight.airline || flight.airlineName || 'Multiple Airlines'}
                                      </span>
                                      {isFlightSelected && (
                                        <div className="w-5 h-5 rounded-full bg-[#FE4C40] text-white flex items-center justify-center text-xs flex-shrink-0">
                                          ✓
                                        </div>
                                      )}
                                      {isResolved && (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center shadow-lg shadow-orange-300/40">
                                          <Compass className="w-3.5 h-3.5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      {timeInfo.formattedDeparture && timeInfo.formattedArrival && (
                                        <div className="text-xs text-[#9CA3AF]">
                                          {timeInfo.formattedDeparture} → {timeInfo.formattedArrival}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-3 text-sm">
                                        <span className="text-[#6B7280]">{timeInfo.formattedDuration}</span>
                                        <span className="text-[#9CA3AF]">·</span>
                                        <span className="text-[#6B7280]">{formatStopInfo(flight)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <div className="text-xl font-bold text-[#1F2937]">
                                      {formatPriceInINR(flight.price)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {!flight.recommended && flight.cheapest && (
                                        <div className="text-xs text-[#10B981]">Cheapest</div>
                                      )}
                                      {!flight.recommended && !flight.cheapest && flight.fastest && (
                                        <div className="text-xs text-[#3B82F6]">Fastest</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Expandable Section */}
                              <div className="border-t border-gray-100">
                                <button
                                  onClick={(e) => toggleFlightExpansion(flight.id, e)}
                                  className="w-full px-4 py-2 text-xs text-[#6B7280] hover:bg-gray-50 flex items-center justify-between transition-colors"
                                >
                                  <span>{isExpanded ? 'Less details' : 'More details'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                {isExpanded && (
                                  <div className="px-4 pb-4 space-y-2 text-sm text-[#6B7280]">
                                    <div className="flex items-center justify-between">
                                      <span>Baggage</span>
                                      <span className="font-medium text-[#1F2937]">1 checked bag included</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Aircraft</span>
                                      <span className="font-medium text-[#1F2937]">Wide-body aircraft</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Refunds</span>
                                      <span className="font-medium text-[#1F2937]">Refundable with airline fees</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                          </div>
                        </div>
                      )}
                      </div>
            );
          })}
                </div>

        {/* Continue Button */}
        {canContinue && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 mb-4">
            <p className="text-xs text-[#6B7280] text-center mb-2">
              You won&apos;t be charged yet
            </p>
            <Button 
              onClick={handleContinue}
              className="w-full bg-[#FE4C40] text-white hover:bg-[#E63C30] py-3 text-base font-semibold"
            >
              Reserve these flights
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
