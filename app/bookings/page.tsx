"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Footer } from '@/components/Footer';
import { StepHeader } from '@/components/StepHeader';
import { routes } from '@/lib/navigation';
import { getTripState, getSelectedDraftItinerary, DraftItinerary, getSelectedHotels, getSelectedTransport, getOptimizedRoute } from '@/lib/tripState';
import { Plane, Building2, Train, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { formatINR } from '@/lib/formatCurrency';
import { motion, AnimatePresence } from 'framer-motion';

export default function BookingsPage() {
  const router = useRouter();
  const [selectedItinerary, setSelectedItinerary] = useState<DraftItinerary | null>(null);
  const [tripState, setTripState] = useState(getTripState());
  const [isHydrated, setIsHydrated] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  console.log('[BOOKINGS_PAGE_INITIAL_STATE]', getTripState());

  useEffect(() => {
    const state = getTripState();
    console.log('[BOOKINGS_PAGE_USEFFECT_STATE]', state);
    const itinerary = getSelectedDraftItinerary();
    
    if (!itinerary) {
      router.push(routes.plan.itinerary);
      return;
    }

    setSelectedItinerary(itinerary);
    setTripState(state);
    setIsHydrated(true);
  }, [router]);

  const selectedHotels = getSelectedHotels();
  const selectedTransport = getSelectedTransport();
  const optimizedRoute = getOptimizedRoute();
  
  // Read flights from structuralRoute (single source of truth)
  const structuralRoute = tripState.structuralRoute;
  const outboundFlight = structuralRoute?.outboundFlight;
  const inboundFlight = structuralRoute?.inboundFlight;

  // Determine which cities need hotels (from itinerary cities)
  const requiredHotelCities = useMemo(() => {
    if (!selectedItinerary) return [];
    return selectedItinerary.cities.map(city => city.name);
  }, [selectedItinerary]);

  // Check if all required bookings are present
  const allRequiredBookingsPresent = useMemo(() => {
    // Check flights (required if fromLocation exists)
    const hasFlights = tripState.fromLocation?.value 
      ? (outboundFlight && inboundFlight)
      : true; // No flights needed if no origin
    
    // Check hotels (required for all cities)
    const hasAllHotels = requiredHotelCities.every(city => selectedHotels[city]);

    return hasFlights && hasAllHotels;
  }, [outboundFlight, inboundFlight, selectedHotels, requiredHotelCities, tripState.fromLocation]);

  // Calculate total price from confirmed reservations only
  const totalPrice = useMemo(() => {
    let total = 0;

    // Get number of travelers (adults + kids)
    const numTravelers = (tripState.adults || 0) + (tripState.kids || 0) || 1;

    // Add flight prices (from structuralRoute) multiplied by number of travelers
    if (outboundFlight && typeof outboundFlight === 'object' && 'price' in outboundFlight) {
      total += ((outboundFlight.price as number) || 0) * numTravelers;
    }
    if (inboundFlight && typeof inboundFlight === 'object' && 'price' in inboundFlight) {
      total += ((inboundFlight.price as number) || 0) * numTravelers;
    }

    // Add hotel prices (pricePerNight * nights)
    if (selectedItinerary) {
      selectedItinerary.cities.forEach(city => {
        const hotel = selectedHotels[city.name];
        if (hotel?.pricePerNight) {
          total += hotel.pricePerNight * city.nights;
        }
      });
    }

    // Add transport prices (optional, but include if present)
    Object.values(selectedTransport).forEach(transport => {
      if (transport?.price) {
        total += transport.price;
      }
    });

    return total;
  }, [outboundFlight, inboundFlight, selectedHotels, selectedTransport, selectedItinerary, tripState.adults, tripState.kids]);

  const handleBack = () => {
    router.push(routes.plan.logistics);
  };

  const handleGoToLogistics = () => {
    router.push(routes.plan.logistics);
  };

  const handleConfirmBookings = () => {
    if (!allRequiredBookingsPresent) return;
    
    setShowConfirmation(true);
    
    // Auto-dismiss after 6 seconds
      setTimeout(() => {
      setShowConfirmation(false);
    }, 6000);
  };

  if (!isHydrated || !selectedItinerary) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 flex items-center justify-center pb-28">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#FE4C40] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Helper to format flight route
  const formatFlightRoute = (flight: any, isReturn: boolean = false) => {
    if (!flight) return null;
    
    // Use structuralRoute flight data (single source of truth)
    if (structuralRoute && !isReturn) {
      // Outbound: origin → first gateway city
      const origin = tripState.fromLocation?.value || '';
      const destination = structuralRoute.outboundFlight.toCity || '';
      return `${origin} → ${destination}`;
    } else if (structuralRoute && isReturn) {
      // Return: last gateway city → origin
      const origin = structuralRoute.inboundFlight.fromCity || '';
      const destination = tripState.fromLocation?.value || '';
      return `${origin} → ${destination}`;
    }
    
    // Fallback to flight data if available
    if (typeof flight === 'object') {
      if ('departureAirport' in flight && 'arrivalAirport' in flight) {
        return `${flight.departureAirport} → ${flight.arrivalAirport}`;
      }
      if ('fromCity' in flight && 'toCity' in flight) {
        return `${flight.fromCity} → ${flight.toCity}`;
      }
    }
    
    return null;
  };

  // Helper to format flight date
  const formatFlightDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  };

  // Render Flight Card
  const renderFlightCard = (type: 'inbound' | 'outbound', flight: any) => {
    // Debug logging
    if (flight) {
      console.log(`[BOOKINGS_RENDER_FLIGHT_${type.toUpperCase()}]`, {
        hasFlight: !!flight,
        isObject: typeof flight === 'object',
        hasPrice: 'price' in flight,
        price: flight.price,
        flightKeys: Object.keys(flight),
      });
    }
    
    const isReserved = !!flight;
    const route = formatFlightRoute(flight, type === 'outbound');
    const flightDate = type === 'inbound' 
      ? (structuralRoute?.outboundFlight.date ? formatFlightDate(structuralRoute.outboundFlight.date) : null)
      : (structuralRoute?.inboundFlight.date ? formatFlightDate(structuralRoute.inboundFlight.date) : null);
    
    // Get number of travelers for price calculation
    const numTravelers = (tripState.adults || 0) + (tripState.kids || 0) || 1;

    if (!isReserved) {
    return (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
          <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-2">Not booked yet</p>
      <button
            onClick={handleGoToLogistics}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FE4C40] text-white text-sm font-medium rounded-lg hover:bg-[#E6443A] transition-colors"
          >
            Go to Logistics
            <ArrowRight className="w-4 h-4" />
          </button>
            </div>
      );
    }

    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF5F4] rounded-lg flex items-center justify-center">
              <Plane className="w-5 h-5 text-[#FE4C40]" />
          </div>
          <div>
              <h3 className="font-semibold text-gray-900">
                {type === 'inbound' ? 'Inbound Flight' : 'Outbound Flight'}
              </h3>
              {route && (
                <p className="text-sm text-gray-600">{route}</p>
            )}
          </div>
        </div>
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          </div>

        <div className="space-y-2 mb-4">
          {typeof flight === 'object' && 'airline' in flight && flight.airline && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Airline</span>
              <span className="text-gray-900 font-medium">{flight.airline || (flight as any).airlineName}</span>
                      </div>
          )}
          {flightDate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Date</span>
              <span className="text-gray-900 font-medium">{flightDate}</span>
                    </div>
          )}
          {typeof flight === 'object' && 'departureTime' in flight && flight.departureTime && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Departure</span>
              <span className="text-gray-900 font-medium">{flight.departureTime}</span>
                      </div>
                    )}
          {typeof flight === 'object' && 'arrivalTime' in flight && flight.arrivalTime && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Arrival</span>
              <span className="text-gray-900 font-medium">{flight.arrivalTime}</span>
                      </div>
                    )}
          {typeof flight === 'object' && 'stops' in flight && flight.stops !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Stops</span>
              <span className="text-gray-900 font-medium">
                {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                          </span>
                      </div>
                    )}
                          </div>

        {typeof flight === 'object' && 'price' in flight && flight.price && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Price {numTravelers > 1 ? `(${numTravelers} travelers)` : ''}</span>
              <span className="text-lg font-bold text-gray-900">{formatINR((flight.price as number) * numTravelers)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
  };

  // Render Hotel Card
  const renderHotelCard = (cityName: string, nights: number) => {
    const hotel = selectedHotels[cityName];
    const isReserved = !!hotel;

    if (!isReserved) {
      return (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
          <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">{cityName}</p>
          <p className="text-sm text-gray-500 mb-3">Not booked yet</p>
                      <button
            onClick={handleGoToLogistics}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FE4C40] text-white text-sm font-medium rounded-lg hover:bg-[#E6443A] transition-colors"
                      >
            Go to Logistics
            <ArrowRight className="w-4 h-4" />
                      </button>
                          </div>
                        );
                      }

    const totalPrice = hotel.pricePerNight ? hotel.pricePerNight * nights : null;

                      return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF5F4] rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#FE4C40]" />
                              </div>
                            <div>
              <h3 className="font-semibold text-gray-900">{cityName}</h3>
              <p className="text-sm text-gray-600">{hotel.name}</p>
                              </div>
                            </div>
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Nights</span>
            <span className="text-gray-900 font-medium">{nights}</span>
                </div>
          {hotel.rating && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rating</span>
              <span className="text-gray-900 font-medium">{hotel.rating}/5</span>
            </div>
          )}
          {hotel.pricePerNight && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price per night</span>
              <span className="text-gray-900 font-medium">{formatINR(hotel.pricePerNight)}</span>
              </div>
                      )}
                    </div>

        {totalPrice && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatINR(totalPrice)}</span>
                          </div>
                        </div>
        )}
                          </div>
    );
  };

  // Render Transport Card (optional, keep existing behavior)
  const renderTransportCard = (segmentId: string, transport: any) => {
    if (!transport) return null;
                              
                              return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFF5F4] rounded-lg flex items-center justify-center">
              <Train className="w-5 h-5 text-[#FE4C40]" />
                                        </div>
                                    <div>
              <h3 className="font-semibold text-gray-900">{segmentId.replace('->', ' → ')}</h3>
              <p className="text-sm text-gray-600">{transport.type || 'Transport'}</p>
                                    </div>
                                    </div>
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                  </div>

        {transport.price && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Price</span>
              <span className="text-lg font-bold text-gray-900">{formatINR(transport.price)}</span>
                                          </div>
                          </div>
                        )}
                      </div>
                    );
  };

  const needsFlights = !!tripState.fromLocation?.value;

  return (
    <>
      <main className="flex flex-col min-h-screen pb-20">
        <StepHeader
          title="Review Your Bookings"
          currentStep={10}
          totalSteps={10}
          onBack={handleBack}
        />

        <div className="flex-1 overflow-y-auto pt-[120px] px-6 py-6 max-w-md mx-auto w-full bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Your Trip Reservations
            </h2>
            <p className="text-base text-gray-600">
              Review all your confirmed bookings below. All bookings are finalized on the Logistics page.
                    </p>
                  </div>

          {/* Flights Section */}
          {needsFlights && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Flights</h3>
              <div className="space-y-4">
                {renderFlightCard('inbound', outboundFlight)}
                {renderFlightCard('outbound', inboundFlight)}
                          </div>
                        </div>
          )}

          {/* Hotels Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotels</h3>
            <div className="space-y-4">
              {requiredHotelCities.map(cityName => {
                const city = selectedItinerary?.cities.find(c => c.name === cityName);
                const nights = city?.nights || 0;
                              return (
                  <div key={cityName}>
                    {renderHotelCard(cityName, nights)}
                                    </div>
                              );
                            })}
                          </div>
                      </div>

          {/* Transport Section (Optional) */}
          {Object.keys(selectedTransport).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transport Between Cities</h3>
              <div className="space-y-4">
                {Object.entries(selectedTransport).map(([segmentId, transport]) => (
                  <div key={segmentId}>
                    {renderTransportCard(segmentId, transport)}
              </div>
                ))}
            </div>
          </div>
                        )}

          {/* Price Summary and CTA */}
          <div className="mb-6 pb-6">
            {/* Price Summary */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-medium text-gray-700">Total price</span>
              <span className="text-2xl font-bold text-gray-900">{formatINR(totalPrice)}</span>
            </div>

            {/* Confirm Bookings Button */}
          <button
              onClick={handleConfirmBookings}
              disabled={!allRequiredBookingsPresent}
              className={`w-full py-4 px-6 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                allRequiredBookingsPresent
                ? 'bg-gradient-to-r from-[#FE4C40] to-[#FF6B5A] text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
              <span>Confirm Bookings</span>
            <ArrowRight className="w-5 h-5" />
          </button>
            {!allRequiredBookingsPresent && (
            <p className="text-xs text-gray-500 text-center mt-2">
                Complete all required bookings to continue
            </p>
          )}
          </div>
        </div>
      </main>

      {/* Confirmation Overlay */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirmation(false)}
            className="fixed inset-0 bg-[#FF7F50]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>
              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-gray-900 mb-2"
              >
                Bookings confirmed.
              </motion.h2>
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-gray-600"
              >
                It&apos;s time to Wander, O Wise One!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
