"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { routes } from '@/lib/navigation';
import { getTripState, getSelectedDraftItinerary, DraftItinerary, getSelectedTransport, getSelectedHotels, getSelectedFlights, saveTripState } from '@/lib/tripState';
import { MapPin, Calendar, Train, Building2, Plane, ArrowRight, CheckCircle } from 'lucide-react';

export default function ReviewPage() {
  const router = useRouter();
  const [selectedItinerary, setSelectedItinerary] = useState<DraftItinerary | null>(null);
  const [tripState, setTripState] = useState(getTripState());
  const [selectedTransport, setSelectedTransport] = useState<{ [segmentId: string]: any }>({});
  const [selectedHotels, setSelectedHotels] = useState<{ [cityName: string]: any }>({});
  const [selectedFlights, setSelectedFlights] = useState<{ outbound?: any; return?: any }>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const state = getTripState();
    const itinerary = getSelectedDraftItinerary();
    
    if (!itinerary) {
      router.push(routes.plan.itinerary);
      return;
    }

    setSelectedItinerary(itinerary);
    setTripState(state);
    setSelectedTransport(getSelectedTransport());
    setSelectedHotels(getSelectedHotels());
    setSelectedFlights(getSelectedFlights());
    setIsHydrated(true);
  }, [router]);

  const handleBack = () => {
    router.push(routes.bookings.dashboard);
  };

  const handleConfirmTrip = async () => {
    if (!selectedItinerary) return;

    setIsConfirming(true);

    try {
      // Build final trip object
      const finalTrip = {
        draftItinerary: selectedItinerary,
        selectedTransport,
        selectedHotels,
        selectedFlights,
        dateRange: tripState.dateRange,
        destination: tripState.destination,
        fromLocation: tripState.fromLocation,
        finalizedAt: new Date().toISOString(),
      };

      // Persist to tripState
      saveTripState({
        finalItinerary: finalTrip,
      });

      // Navigate to summary page
      router.push(routes.bookings.summary);
    } catch (error) {
      console.error('Error confirming trip:', error);
      alert('Failed to confirm trip. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Check if flights are needed (same logic as bookings page)
  const checkFlightsNeeded = (): boolean => {
    if (!tripState.fromLocation?.value || !selectedItinerary || selectedItinerary.cities.length === 0) {
      return false;
    }
    return true; // Stub: always show flights if fromLocation exists
  };

  const flightsNeeded = checkFlightsNeeded();

  // Calculate total nights
  const totalNights = selectedItinerary?.cities.reduce((sum, city) => sum + city.nights, 0) || 0;

  // Format date range
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDateRange = () => {
    if (!tripState.dateRange?.from || !tripState.dateRange?.to) return null;
    
    const from = tripState.dateRange.from instanceof Date 
      ? tripState.dateRange.from 
      : new Date(tripState.dateRange.from);
    const to = tripState.dateRange.to instanceof Date 
      ? tripState.dateRange.to 
      : new Date(tripState.dateRange.to);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
    
    return { from, to };
  };

  const dateRange = getDateRange();
  const dateRangeText = dateRange
    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    : 'Dates not set';

  // Generate transport segments (same logic as bookings page)
  const generateTransportSegments = (): Array<{ id: string; from: string; to: string }> => {
    if (!selectedItinerary) return [];
    
    const segments: Array<{ id: string; from: string; to: string }> = [];
    
    // Generate segments for consecutive city pairs
    for (let i = 0; i < selectedItinerary.cities.length - 1; i++) {
      const cityA = selectedItinerary.cities[i].name;
      const cityB = selectedItinerary.cities[i + 1].name;
      segments.push({
        id: `${cityA}->${cityB}`,
        from: cityA,
        to: cityB,
      });
    }
    
    // Add return segment if fromLocation exists and is different from last city
    if (tripState.fromLocation?.value && selectedItinerary.cities.length > 0) {
      const lastCity = selectedItinerary.cities[selectedItinerary.cities.length - 1].name;
      const originCity = tripState.fromLocation.value;
      
      if (originCity.toLowerCase() !== lastCity.toLowerCase()) {
        segments.push({
          id: `${lastCity}->${originCity}`,
          from: lastCity,
          to: originCity,
        });
      }
    }
    
    return segments;
  };

  const transportSegments = generateTransportSegments();

  if (!isHydrated || !selectedItinerary) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading review...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex flex-col min-h-[100dvh] bg-white">
        <StepHeader
          title="Review Your Trip"
          currentStep={9}
          totalSteps={10}
          onBack={handleBack}
        />

        <div className="flex-1 overflow-y-auto pb-32 pt-[120px] px-4 max-w-md mx-auto">
          {/* Trip Summary Section */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-[#FE4C40] to-[#FF6B5A] rounded-2xl p-6 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Trip Summary</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm opacity-90">Destination</p>
                    <p className="font-semibold">{tripState.destination?.label || tripState.destination?.value || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm opacity-90">Travel Dates</p>
                    <p className="font-semibold">{dateRangeText}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm opacity-90">Total Nights</p>
                    <p className="font-semibold">{totalNights} night{totalNights !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm opacity-90 mb-1">City Route</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedItinerary.cities.map((city, index) => (
                        <span key={index} className="flex items-center gap-1">
                          <span className="font-semibold">{city.name}</span>
                          {index < selectedItinerary.cities.length - 1 && (
                            <ArrowRight className="w-4 h-4 opacity-75" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transport Summary Section */}
          <div className="mb-6">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Train className="w-5 h-5 text-[#FE4C40]" />
                <h3 className="text-lg font-semibold text-gray-900">Transport Between Cities</h3>
              </div>
              
              <div className="space-y-3">
                {transportSegments.length === 0 ? (
                  <p className="text-sm text-gray-500">No transport segments</p>
                ) : (
                  transportSegments.map((segment) => {
                    const transport = selectedTransport[segment.id];
                    
                    return (
                      <div key={segment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {segment.from} <ArrowRight className="w-3 h-3 inline mx-1" /> {segment.to}
                          </span>
                          {transport && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        {transport ? (
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">
                              {transport.type ? transport.type.charAt(0).toUpperCase() + transport.type.slice(1) : 'Transport'}
                              {transport.provider && ` • ${transport.provider}`}
                            </p>
                            {transport.price && (
                              <p className="text-gray-600">${transport.price} per person</p>
                            )}
                            {transport.duration && (
                              <p className="text-gray-600">{transport.duration}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No transport selected</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Accommodation Summary Section */}
          <div className="mb-6">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-[#FE4C40]" />
                <h3 className="text-lg font-semibold text-gray-900">Accommodation</h3>
              </div>
              
              <div className="space-y-3">
                {selectedItinerary.cities.length === 0 ? (
                  <p className="text-sm text-gray-500">No cities in itinerary</p>
                ) : (
                  selectedItinerary.cities.map((city, index) => {
                    const hotel = selectedHotels[city.name];
                    
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{city.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({city.nights} night{city.nights !== 1 ? 's' : ''})
                            </span>
                          </div>
                          {hotel && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        {hotel ? (
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">{hotel.name}</p>
                            {hotel.pricePerNight && (
                              <p className="text-gray-600">${hotel.pricePerNight} per night</p>
                            )}
                            {hotel.rating && (
                              <p className="text-gray-600">⭐ {hotel.rating} rating</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No hotel selected</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Flights Summary Section (conditional) */}
          {flightsNeeded && (
            <div className="mb-6">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Plane className="w-5 h-5 text-[#FE4C40]" />
                  <h3 className="text-lg font-semibold text-gray-900">Flights</h3>
                </div>
                
                <div className="space-y-3">
                  {/* Outbound Flight */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Outbound Flight</span>
                      {selectedFlights.outbound && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    {selectedFlights.outbound ? (
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">
                          {selectedFlights.outbound.airline || selectedFlights.outbound.airlineName || 'Airline'}
                        </p>
                        {selectedFlights.outbound.departureTime && selectedFlights.outbound.arrivalTime && (
                          <p className="text-gray-600">
                            {selectedFlights.outbound.departureTime} → {selectedFlights.outbound.arrivalTime}
                          </p>
                        )}
                        {selectedFlights.outbound.price && (
                          <p className="text-gray-600">${selectedFlights.outbound.price} per person</p>
                        )}
                        {selectedFlights.outbound.stops !== undefined && (
                          <p className="text-gray-600">
                            {selectedFlights.outbound.stops === 0 ? 'Non-stop' : `${selectedFlights.outbound.stops} stop${selectedFlights.outbound.stops > 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No flight selected</p>
                    )}
                  </div>

                  {/* Return Flight */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Return Flight</span>
                      {selectedFlights.return && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    {selectedFlights.return ? (
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">
                          {selectedFlights.return.airline || selectedFlights.return.airlineName || 'Airline'}
                        </p>
                        {selectedFlights.return.departureTime && selectedFlights.return.arrivalTime && (
                          <p className="text-gray-600">
                            {selectedFlights.return.departureTime} → {selectedFlights.return.arrivalTime}
                          </p>
                        )}
                        {selectedFlights.return.price && (
                          <p className="text-gray-600">${selectedFlights.return.price} per person</p>
                        )}
                        {selectedFlights.return.stops !== undefined && (
                          <p className="text-gray-600">
                            {selectedFlights.return.stops === 0 ? 'Non-stop' : `${selectedFlights.return.stops} stop${selectedFlights.return.stops > 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No flight selected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 max-w-md mx-auto">
          <div className="px-4 py-4">
            <button
              onClick={handleConfirmTrip}
              disabled={isConfirming}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#FE4C40] to-[#FF6B5A] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isConfirming ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirm My Trip</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}






