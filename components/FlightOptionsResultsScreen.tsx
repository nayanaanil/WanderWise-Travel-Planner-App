"use client";

import { useState, useEffect, useMemo } from 'react';
import { Plane, ChevronDown, ChevronUp, Check, MapPin, Clock, DollarSign, Info } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';
import { Button } from '@/ui/button';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/navigation';
import { getTripState, saveTripState, setSelectedFlight } from '@/lib/tripState';
import { GatewayOption, FlightOption as Phase1FlightOption } from '@/lib/phase1/types';

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

interface FlightOptionsResultsScreenProps {
  onBack?: () => void;
  onSelectFlight?: () => void;
  onBackToPreferences?: () => void;
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
  const [aiExplanation, setAiExplanation] = useState<{ summary: string } | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  // Guard: Check for gatewayOptions on mount
  useEffect(() => {
    const tripState = getTripState();
    
    if (!tripState.gatewayOptions || tripState.gatewayOptions.length === 0) {
      console.warn('[Phase1] No gatewayOptions found, redirecting to loader');
      router.push(routes.bookings.flights.index);
      return;
    }

    setGatewayOptions(tripState.gatewayOptions);
    
    // If user already has a selection, restore it
    if (tripState.selectedFlights) {
      // Try to find which gateway option matches the selected flights
      // For MVP, we'll just show all options and let user reselect
    }
  }, [router]);

  // Fetch AI explanation when gateway is selected and expanded
  useEffect(() => {
    if (!selectedGatewayId || !expandedGatewayId || selectedGatewayId !== expandedGatewayId) {
      setAiExplanation(null);
      return;
    }

    const selectedGateway = gatewayOptions.find(g => g.id === selectedGatewayId);
    if (!selectedGateway) {
      setAiExplanation(null);
      return;
    }

    // Get user preferences from tripState
    const tripState = getTripState();
    const budget = tripState.budget === 'budget' ? 'low' : tripState.budget === 'luxury' ? 'high' : 'medium';
    const pace = tripState.pace || 'moderate';
    const groupSize = (tripState.adults || 1) + (tripState.kids || 0);

    // Get sorted outbound flights
    const sortedOutbound = sortFlights(selectedGateway.outbound.flights);
    
    if (sortedOutbound.length === 0) {
      setAiExplanation(null);
      return;
    }

    // Find the recommended flight (should be marked by the ranking system)
    const recommendedFlight = sortedOutbound.find(f => f.recommended) || sortedOutbound[0];

    // Build recommended flight data
    const recommended = {
      airline: recommendedFlight.airline || recommendedFlight.airlineName || 'Unknown',
      price: recommendedFlight.price || 0,
      durationMinutes: parseDurationToMinutes(recommendedFlight.duration),
      stops: recommendedFlight.stops ?? 0,
    };

    // Determine comparison flight based on user preferences
    let comparison: { type: 'cheapest' | 'fastest'; airline: string; priceDifference: number; timeDifferenceMinutes: number } | undefined;

    if (budget === 'low') {
      // Find cheapest flight that's different from recommended
      const cheapestFlight = sortedOutbound.find(f => f.id !== recommendedFlight.id && (f.price || 0) < recommended.price);
      if (cheapestFlight && cheapestFlight.price) {
        comparison = {
          type: 'cheapest',
          airline: cheapestFlight.airline || cheapestFlight.airlineName || 'Unknown',
          priceDifference: recommended.price - cheapestFlight.price,
          timeDifferenceMinutes: parseDurationToMinutes(cheapestFlight.duration) - recommended.durationMinutes,
        };
      }
    } else if (pace === 'packed') {
      // Find fastest flight that's different from recommended
      const fastestFlight = sortedOutbound
        .filter(f => f.id !== recommendedFlight.id)
        .sort((a, b) => parseDurationToMinutes(a.duration) - parseDurationToMinutes(b.duration))[0];
      
      if (fastestFlight) {
        const fastestDuration = parseDurationToMinutes(fastestFlight.duration);
        if (fastestDuration < recommended.durationMinutes) {
          comparison = {
            type: 'fastest',
            airline: fastestFlight.airline || fastestFlight.airlineName || 'Unknown',
            priceDifference: (fastestFlight.price || 0) - recommended.price,
            timeDifferenceMinutes: recommended.durationMinutes - fastestDuration,
          };
        }
      }
    }

    // Fetch AI explanation with new schema
    setIsLoadingExplanation(true);
    fetch('/api/agent/explain-flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommended,
        comparison,
        userPreferences: {
          budget,
          pace: pace as 'relaxed' | 'moderate' | 'packed',
          groupSize,
        },
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.summary) {
          setAiExplanation({ summary: data.summary });
        } else {
          setAiExplanation(null);
        }
        setIsLoadingExplanation(false);
      })
      .catch(err => {
        console.error('[FlightOptions] Failed to fetch AI explanation:', err);
        setIsLoadingExplanation(false);
        setAiExplanation(null);
      });
  }, [selectedGatewayId, expandedGatewayId, gatewayOptions, sortOption]);

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
  };

  const handleOutboundFlightSelect = (flightId: string) => {
    setSelectedOutboundFlightId(flightId);
  };

  const handleInboundFlightSelect = (flightId: string) => {
    setSelectedInboundFlightId(flightId);
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
    <div className="min-h-screen flex flex-col">
      <StepHeader
        title="Review flight options"
        currentStep={7}
        totalSteps={10}
        onBack={handleBackClick}
      />
      
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-6 pt-[120px] pb-20 bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none">
        {/* Page Title */}
        <div className="text-center mb-14">
          <h1 className="text-lg md:text-xl font-medium text-gray-900 mb-2">
            Review flight options
          </h1>
          <p className="text-sm text-gray-600 mb-2">
            These flights help us plan your trip. You&apos;re not booking yet, and you can change this later.
          </p>
          <p className="text-sm text-gray-600">
            Choose a city to fly into and out of to continue.
          </p>
        </div>

        {/* Gateway Options */}
        <div className="space-y-4 mb-6">
          {gatewayOptions.map((gateway) => {
            const isSelected = selectedGatewayId === gateway.id;
            const isExpanded = expandedGatewayId === gateway.id;

            return (
              <div
                key={gateway.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  isSelected 
                    ? 'border-[#FE4C40]/50 shadow-md bg-[#FFF5F4]/30' 
                    : 'border-gray-200 shadow-sm hover:shadow-md'
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
                          <Check className="w-5 h-5 text-[#FE4C40]" />
                  )}
                    </div>

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

                      {/* Explanation */}
                      {gateway.explanation && gateway.explanation.length > 0 && (
                        <div className="mt-2 text-xs text-[#6B7280]">
                          {gateway.explanation[0]}
                      </div>
                      )}
                    </div>
                    
                    <button
                    onClick={(e) => {
                      e.stopPropagation();
                        handleGatewaySelect(gateway.id);
                      }}
                      className="ml-2 p-1 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                      )}
                    </button>
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

                    {/* AI Explanation */}
                    {isLoadingExplanation && (
                      <div className="p-4 bg-gradient-to-br from-orange-100 to-pink-100 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                          <p className="text-sm text-orange-900">Getting personalized insights...</p>
                        </div>
                      </div>
                    )}

                    {!isLoadingExplanation && aiExplanation && (
                      <div className="p-4 bg-gradient-to-br from-orange-100 to-pink-100 border border-orange-200 rounded-lg">
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {aiExplanation.summary}
                        </p>
                      </div>
                    )}

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
                          const timeInfo = formatFlightTimeDisplay(flight, gateway.outbound.date);
                          return (
                            <div
                              key={flight.id}
                              className={`rounded-xl border transition-all ${
                                isFlightSelected
                                  ? 'border-[#FE4C40]/50 bg-[#FFF5F4]/50 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
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
                                        <Check className="w-4 h-4 text-[#FE4C40] flex-shrink-0" />
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
                                    <div className="flex flex-col items-end gap-0.5">
                                      {flight.recommended && (
                                        <div className="text-xs font-medium text-[#FE4C40]">Recommended</div>
                                      )}
                                      {!flight.recommended && flight.cheapest && (
                                        <div className="text-xs text-[#10B981]">Cheapest</div>
                                      )}
                                      {!flight.recommended && !flight.cheapest && flight.fastest && (
                                        <div className="text-xs text-[#3B82F6]">Fastest</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {flight.recommended && flight.explanation && (
                                  <div className="mt-2 text-xs text-[#6B7280] italic">
                                    {flight.explanation}
                                  </div>
                                )}
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
                          const timeInfo = formatFlightTimeDisplay(flight, gateway.inbound.date);
                          return (
                            <div
                              key={flight.id}
                              className={`rounded-xl border transition-all ${
                                isFlightSelected
                                  ? 'border-[#FE4C40]/50 bg-[#FFF5F4]/50 shadow-sm'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
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
                                        <Check className="w-4 h-4 text-[#FE4C40] flex-shrink-0" />
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
                                    <div className="flex flex-col items-end gap-0.5">
                                      {flight.recommended && (
                                        <div className="text-xs font-medium text-[#FE4C40]">Recommended</div>
                                      )}
                                      {!flight.recommended && flight.cheapest && (
                                        <div className="text-xs text-[#10B981]">Cheapest</div>
                                      )}
                                      {!flight.recommended && !flight.cheapest && flight.fastest && (
                                        <div className="text-xs text-[#3B82F6]">Fastest</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {flight.recommended && flight.explanation && (
                                  <div className="mt-2 text-xs text-[#6B7280] italic">
                                    {flight.explanation}
                                  </div>
                                )}
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
