"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { getTripState, saveTripState } from '@/lib/tripState';
import { routes } from '@/lib/navigation';
import { Building2, AlertCircle, CheckCircle, Info, Calendar, MapPin, ArrowRight, AlertTriangle } from 'lucide-react';
import { RouteReader, type RouteStep } from '@/lib/phase2/RouteReader';
import { Phase2StructuralRoute } from '@/lib/phase2/types';
import { ImpactCard } from '@/lib/route-optimizer/routeDiff';
import { useProcessing } from '@/lib/ProcessingContext';

/**
 * Phase 3 Hotel Impact Review Page
 * 
 * This page:
 * - Displays hotel impact analysis
 * - Shows before/after snapshot
 * - Allows approval or cancellation
 * 
 * This page does NOT:
 * - Auto-approve changes
 * - Silently mutate routes
 */
export default function HotelImpactPage() {
  const router = useRouter();
  const { startProcessing, stopProcessing } = useProcessing();
  const [hotelImpactResult, setHotelImpactResult] = useState<any>(null);
  const [baselineRoute, setBaselineRoute] = useState<any>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null); // Hotel data with availability
  const [hotelSearchResults, setHotelSearchResults] = useState<any>(null); // For getting hotel name
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const tripState = getTripState();

    // Guard: Check for hotelImpactResult
    if (!tripState.hotelImpactResult) {
      console.warn('[HotelImpact] No hotelImpactResult found, redirecting to hotel options');
      router.push(routes.bookings.hotels.options);
      return;
    }

    // Check for structuralRoute (baseline)
    if (!tripState.structuralRoute) {
      console.warn('[HotelImpact] No structuralRoute found, redirecting to logistics');
      router.push(routes.plan.logistics);
      return;
    }

    setHotelImpactResult(tripState.hotelImpactResult);
    setBaselineRoute(tripState.structuralRoute);
    
    // Store hotel search results for later use
    if (tripState.hotelSearchResults) {
      setHotelSearchResults(tripState.hotelSearchResults);
    }
    
    // Look up the selected hotel from search results to get availability data
    if (tripState.hotelSearchResults && tripState.hotelImpactResult) {
      const hotelId = tripState.hotelImpactResult.hotel.hotelId;
      const hotelCity = tripState.hotelImpactResult.hotel.city;
      
      // Find the hotel in search results
      for (const cityData of tripState.hotelSearchResults.hotelsByCity || []) {
        if (cityData.city.toLowerCase().trim() === hotelCity.toLowerCase().trim()) {
          const hotel = cityData.hotels.find((h: any) => h.id === hotelId);
          if (hotel) {
            setSelectedHotel(hotel);
            break;
          }
        }
      }
    }
    
    setIsHydrated(true);
  }, [router]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getSeverityStyle = (severity: ImpactCard['severity']) => {
    switch (severity) {
      case 'BLOCKING':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: AlertCircle,
        };
      case 3:
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: AlertCircle,
        };
      case 2:
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: AlertCircle,
        };
      case 1:
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: Info,
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: Info,
        };
    }
  };

  const findCityStay = (route: any, city: string) => {
    try {
      const phase2Route: Phase2StructuralRoute = {
        ...route,
        derived: route.derived || {
          arrivalDates: {},
          departureDates: {},
          totalTripDays: 0,
          inboundSlackDays: 0,
          draftStayCities: [],
        },
      };
      const reader = new RouteReader(phase2Route);
      const steps = Array.from(reader.steps());
      const normalizedCity = city.toLowerCase().trim();
      
      // Find STAY step matching the city
      for (const step of steps) {
        if (step.kind === 'STAY') {
          // Type assertion after kind check
          const stayStep = step as Extract<RouteStep, { kind: 'STAY' }>;
          if (stayStep.city.toLowerCase().trim() === normalizedCity) {
            return stayStep;
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const handleApprove = async () => {
    if (!hotelImpactResult || !baselineRoute) return;

    // Get the first candidate (usually the best fit)
    const candidate = hotelImpactResult.candidates?.[0];
    if (!candidate || !candidate.route) {
      alert('No valid candidate route found');
      return;
    }

    // Check for blocking errors
    const hasBlocking = candidate.impactCards?.some(
      (card: ImpactCard) => card.severity === 'BLOCKING'
    );

    if (hasBlocking) {
      alert('Cannot approve: This hotel has blocking issues. Please choose a different hotel.');
      return;
    }

    try {
      // Attempt to book the hotel
      const tripState = getTripState();
      // Generate tripId from baselineRoute ID or use a default
      const tripId = baselineRoute?.id || 'trip-' + Date.now();
      
      const bookingResponse = await fetch('/api/phase3/hotels/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          hotel: hotelImpactResult.hotel,
        }),
      });

      if (!bookingResponse.ok) {
        throw new Error('Booking request failed');
      }

      const bookingResult = await bookingResponse.json();

      if (bookingResult.status === 'failed') {
        // Selection could not be applied - redirect to options page with failure context
        const hotelName = selectedHotel?.name || `${hotelImpactResult.hotel.city} Hotel`;
        
        saveTripState({
          hotelBookingFailure: {
            hotelId: hotelImpactResult.hotel.hotelId,
            hotelName,
            city: hotelImpactResult.hotel.city,
            reason: bookingResult.reason || 'sold_out',
            alternatives: bookingResult.alternatives,
          },
          hotelImpactResult: undefined, // Clear impact result
        });

        // Navigate back to options page with failure context
        router.push('/bookings/hotels/options');
        return;
      }

      // Selection validated successfully - proceed with route update
      // Replace structuralRoute with candidate.route
      // Use derived fields from candidate (they've been regenerated with all hotel constraints)
      const updatedRoute = candidate.route;

      // Get existing locked hotel stays
      const existingLockedStays = tripState.lockedHotelStays || [];
      
      // Upsert the new hotel into lockedHotelStays (replace if same city)
      const normalizeCity = (city: string) => city.toLowerCase().trim();
      const updatedLockedStays = existingLockedStays.filter(
        stay => normalizeCity(stay.city) !== normalizeCity(hotelImpactResult.hotel.city)
      );
      
      // Add the new hotel
      updatedLockedStays.push({
        city: hotelImpactResult.hotel.city,
        hotelId: hotelImpactResult.hotel.hotelId,
        checkIn: hotelImpactResult.hotel.checkIn,
        checkOut: hotelImpactResult.hotel.checkOut,
      });

      // Save selected hotel data for display in logistics timeline
      const city = hotelImpactResult.hotel.city;
      const existingHotels = tripState.selectedHotels || {};
      const hotelData = {
        hotelId: selectedHotel?.id || hotelImpactResult.hotel.hotelId,
        name: selectedHotel?.name || `${city} Hotel`,
        image: selectedHotel?.image,
        rating: selectedHotel?.rating,
        pricePerNight: selectedHotel?.pricePerNight,
        // Persist availability context from selection time
        availabilityStatus: selectedHotel?.availabilityStatus,
        availabilityConfidence: selectedHotel?.availabilityConfidence,
        availabilityReason: selectedHotel?.availabilityReason,
        restrictions: selectedHotel?.restrictions,
      };

      // Save updated route, locked hotel stays, selected hotel, clear impact result and any booking failure
      saveTripState({
        structuralRoute: updatedRoute,
        lockedHotelStays: updatedLockedStays,
        selectedHotels: {
          ...existingHotels,
          [city]: hotelData,
        },
        hotelImpactResult: undefined,
        hotelBookingFailure: undefined, // Clear any previous failures
      });

      // Set flag for post-action feedback on logistics page
      sessionStorage.setItem('recentlyAppliedHotel', JSON.stringify({
        city,
        hotelId: hotelData.hotelId,
      }));

      stopProcessing();

      // Navigate to logistics page
      router.push(routes.plan.logistics);
    } catch (error) {
      stopProcessing();
      console.error('[HotelImpact] Booking error:', error);
      alert('An error occurred while applying your hotel selection. Please try again.');
    }
  };

  const handleChooseDifferent = () => {
    // Clear impact result and navigate back
    saveTripState({
      hotelImpactResult: undefined,
    });
    router.push(routes.bookings.hotels.options);
  };

  if (!isHydrated || !hotelImpactResult || !baselineRoute) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading impact analysis...</p>
        </div>
      </div>
    );
  }

  // Get the first candidate (usually best fit)
  const candidate = hotelImpactResult.candidates?.[0];
  const impactCards = candidate?.impactCards || [];
  const maxSeverity = impactCards.length > 0 ? impactCards[0].severity : 1;
  const isBlocking = maxSeverity === 'BLOCKING';

  // Find stay dates for the affected city
  const affectedCity = hotelImpactResult.hotel.city;
  const baselineStay = findCityStay(baselineRoute, affectedCity);
  const candidateStay = candidate?.route ? findCityStay(candidate.route, affectedCity) : null;

  return (
    <>
      <Header />
      <main className="flex flex-col min-h-[100dvh] bg-white">
        <StepHeader
          title="Hotel Impact Review"
          currentStep={8}
          totalSteps={10}
          onBack={handleChooseDifferent}
        />

        <div className="flex-1 overflow-y-auto pt-[120px] pb-40">
          <div className="max-w-md mx-auto px-4">
            {/* Selected Hotel Summary */}
            <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <Building2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    {selectedHotel?.name || `${hotelImpactResult.hotel.city} Hotel`}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {hotelImpactResult.hotel.city}
                  </p>
                </div>
              </div>
              
              {/* Availability Warning for Low Confidence */}
              {selectedHotel?.availabilityConfidence === 'low' && selectedHotel?.availabilityReason && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-orange-900 mb-1">
                        Availability risk
                      </div>
                      <p className="text-xs text-orange-800 leading-relaxed mb-2">
                        {selectedHotel.availabilityReason}
                      </p>
                      {selectedHotel.restrictions && selectedHotel.restrictions.length > 0 && (
                        <p className="text-xs text-orange-700 italic">
                          Recommendation: {selectedHotel.restrictions[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{hotelImpactResult.hotel.city}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>
                    {formatDate(hotelImpactResult.hotel.checkIn)} → {formatDate(hotelImpactResult.hotel.checkOut)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-blue-600 font-medium">{hotelImpactResult.hotel.nights}</span>
                  <span>night{hotelImpactResult.hotel.nights !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Before / After Snapshot */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Before
                </h3>
                {baselineStay ? (
                  <div className="space-y-2 text-xs">
                    <div className="text-gray-600">
                      <div className="font-medium">{baselineStay.city}</div>
                      <div>{formatDate(baselineStay.arrival)}</div>
                      <div>→ {formatDate(baselineStay.departure)}</div>
                      <div className="text-gray-500 mt-1">{baselineStay.nights} nights</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No stay in {affectedCity}</div>
                )}
              </div>

              <div className="border border-[#FE4C40] rounded-lg p-4 bg-[#FFF5F4]">
                <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#FE4C40] rounded-full"></span>
                  After
                </h3>
                {candidateStay ? (
                  <div className="space-y-2 text-xs">
                    <div className="text-gray-700">
                      <div className="font-medium">{candidateStay.city}</div>
                      <div>{formatDate(candidateStay.arrival)}</div>
                      <div>→ {formatDate(candidateStay.departure)}</div>
                      <div className="text-gray-600 mt-1">{candidateStay.nights} nights</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600">No stay in {affectedCity}</div>
                )}
              </div>
            </div>

            {/* Impact Cards */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Impact Summary</h3>
              
              {impactCards.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-green-900 mb-1">No Impact</div>
                      <p className="text-sm text-green-800">
                        This hotel fits your itinerary without any changes.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {impactCards.map((card: ImpactCard, index: number) => {
                    const style = getSeverityStyle(card.severity);
                    const Icon = style.icon;

                    return (
                      <div
                        key={index}
                        className={`${style.bgColor} ${style.borderColor} border rounded-lg p-4`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 ${style.color} flex-shrink-0 mt-0.5`} />
                          <div className="flex-1">
                            <div className={`font-medium ${style.color} mb-1 text-sm`}>
                              {card.type.replace(/_/g, ' ')}
                            </div>
                            <p className="text-sm text-gray-700">{card.summary}</p>
                            {card.affectedCities && card.affectedCities.length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                <span className="font-medium">Affected cities: </span>
                                {card.affectedCities.join(', ')}
                              </div>
                            )}
                            {card.affectedDates && card.affectedDates.length > 0 && (
                              <div className="mt-1 text-xs text-gray-600">
                                <span className="font-medium">Affected dates: </span>
                                {card.affectedDates.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleApprove}
                disabled={isBlocking}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
                  isBlocking
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#FE4C40] to-[#FF6B5A] text-white hover:shadow-lg'
                }`}
              >
                Approve & Update Itinerary
              </button>

              <button
                onClick={handleChooseDifferent}
                className="w-full py-4 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Choose Different Hotel
              </button>

              {isBlocking && (
                <p className="text-sm text-red-600 text-center">
                  Cannot approve: This selection has blocking issues. Please choose a different hotel.
                </p>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}

