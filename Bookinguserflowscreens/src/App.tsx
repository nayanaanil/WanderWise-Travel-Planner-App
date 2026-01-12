import { useState } from 'react';
import { BookingOptimizationDashboard } from './components/BookingOptimizationDashboard';
import { FlightPreferencesScreen } from './components/FlightPreferencesScreen';
import { FlightOptionsResultsScreen } from './components/FlightOptionsResultsScreen';
import { FlightConfirmationScreen } from './components/FlightConfirmationScreen';
import { BookingFlowV2 } from './components/BookingFlowV2';
import { ItineraryCustomizationScreen } from './components/ItineraryCustomizationScreen';
import { TransportationOptimizationScreen } from './components/TransportationOptimizationScreen';
import { AccommodationSelectionScreenV2 } from './components/AccommodationSelectionScreenV2';
import { TripSummaryOverviewScreen } from './components/TripSummaryOverviewScreen';
import { TripCostAndBookingScreen } from './components/TripCostAndBookingScreen';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';

type Screen = 'dashboard' | 'flight-preferences' | 'flight-options' | 'flight-confirmation' | 'booking-flow-v2' | 'itinerary-customization' | 'transportation-optimization' | 'accommodation-selection' | 'trip-summary-overview' | 'trip-cost-booking';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('itinerary-customization');

  return (
    <>
      {currentScreen === 'dashboard' && (
        <BookingOptimizationDashboard 
          onOptimizeFlights={() => setCurrentScreen('flight-preferences')}
          onOptimizeHotels={() => toast.info('Optimizing accommodations...')}
          onReviewTransport={() => toast.info('Reviewing transport options...')}
          onAutoOptimize={() => toast.success('Auto-optimization started!')}
          onManualStepByStep={() => toast.info('Starting manual optimization...')}
          onBookCurrent={() => toast.info('Proceeding with current plan...')}
        />
      )}

      {currentScreen === 'flight-preferences' && (
        <FlightPreferencesScreen 
          onBack={() => setCurrentScreen('dashboard')}
          onFindFlights={() => setCurrentScreen('flight-options')}
          onSaveAndSkip={() => {
            toast.success('Preferences saved!');
            setCurrentScreen('dashboard');
          }}
        />
      )}

      {currentScreen === 'flight-options' && (
        <FlightOptionsResultsScreen 
          onBack={() => setCurrentScreen('flight-preferences')}
          onSelectFlight={() => setCurrentScreen('flight-confirmation')}
          onBackToPreferences={() => setCurrentScreen('flight-preferences')}
        />
      )}

      {currentScreen === 'flight-confirmation' && (
        <FlightConfirmationScreen 
          onConfirmBooking={() => toast.success('Flight booking confirmed! Moving to accommodations...')}
          onBackToOptions={() => setCurrentScreen('flight-options')}
        />
      )}

      {currentScreen === 'booking-flow-v2' && (
        <BookingFlowV2 
          onBack={() => setCurrentScreen('dashboard')}
          onCustomizeTrip={() => setCurrentScreen('itinerary-customization')}
        />
      )}

      {currentScreen === 'itinerary-customization' && (
        <ItineraryCustomizationScreen 
          onBack={() => setCurrentScreen('booking-flow-v2')}
          onPlanTransport={() => setCurrentScreen('transportation-optimization')}
        />
      )}

      {currentScreen === 'transportation-optimization' && (
        <TransportationOptimizationScreen 
          onBack={() => setCurrentScreen('itinerary-customization')}
          onLockChoices={() => setCurrentScreen('accommodation-selection')}
        />
      )}

      {currentScreen === 'accommodation-selection' && (
        <AccommodationSelectionScreenV2 
          onBack={() => setCurrentScreen('transportation-optimization')}
          onContinue={() => setCurrentScreen('trip-summary-overview')}
        />
      )}
      
      {currentScreen === 'trip-summary-overview' && (
        <TripSummaryOverviewScreen 
          onBack={() => setCurrentScreen('accommodation-selection')}
          onContinue={() => setCurrentScreen('trip-cost-booking')}
          onEditFlights={() => setCurrentScreen('flight-preferences')}
          onEditTransport={() => setCurrentScreen('transportation-optimization')}
          onEditAccommodation={() => setCurrentScreen('accommodation-selection')}
        />
      )}
      
      {currentScreen === 'trip-cost-booking' && (
        <TripCostAndBookingScreen 
          onBack={() => setCurrentScreen('trip-summary-overview')}
          onComplete={() => toast.success('Trip confirmed! Your adventure awaits!')}
        />
      )}
      
      <Toaster />
    </>
  );
}