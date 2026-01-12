import { useState } from 'react';
import { SlidersHorizontal, Calendar } from 'lucide-react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { FlightCard } from './FlightCard';
import { FilterSheet } from './FilterSheet';
import { Button } from './ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface FlightSelectionScreenProps {
  onBack: () => void;
  onContinue: () => void;
}

export function FlightSelectionScreen({ onBack, onContinue }: FlightSelectionScreenProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [showItineraryChange, setShowItineraryChange] = useState(false);

  const flights = [
    {
      id: '1',
      airline: 'United Airlines',
      flightNumber: 'UA 1234',
      departureTime: '10:30 AM',
      arrivalTime: '2:45 PM',
      departureAirport: 'SFO',
      arrivalAirport: 'MRY',
      duration: '4h 15m',
      stops: 0,
      price: 289,
      isAlternative: false,
    },
    {
      id: '2',
      airline: 'Delta',
      flightNumber: 'DL 5678',
      departureTime: '2:15 PM',
      arrivalTime: '6:50 PM',
      departureAirport: 'SFO',
      arrivalAirport: 'MRY',
      duration: '4h 35m',
      stops: 1,
      price: 245,
      isAlternative: false,
    },
    {
      id: '3',
      airline: 'Southwest',
      flightNumber: 'SW 9012',
      departureTime: '8:00 AM',
      arrivalTime: '12:20 PM',
      departureAirport: 'SFO',
      arrivalAirport: 'MRY',
      duration: '4h 20m',
      stops: 0,
      price: 310,
      isAlternative: true,
      dateChange: 'Departs Jan 12 (1 day earlier) - Better pricing',
    },
  ];

  const handleFlightSelect = (flightId: string, isAlternative: boolean) => {
    setSelectedFlight(flightId);
    if (isAlternative) {
      setShowItineraryChange(true);
    } else {
      onContinue();
    }
  };

  const handleConfirmChange = () => {
    setShowItineraryChange(false);
    onContinue();
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      <Header onBack={onBack} />
      
      <div className="pt-16 px-4 max-w-md mx-auto">
        {/* Trip Info */}
        <div className="mt-6 mb-6">
          <h1 className="text-[#1F2937] mb-2">Select Your Flight</h1>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Calendar className="w-4 h-4" />
            <span>San Francisco → Carmel-by-the-Sea</span>
          </div>
          <div className="text-[#6B7280] mt-1">
            Jan 13-14, 2025 • 1 traveler
          </div>
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(true)}
          className="w-full mb-6 border-[#E5E7EB] text-[#1F2937] flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
        </Button>

        {/* Alternative Dates Info */}
        <div className="bg-[#FFF5F5] border border-[#FF6B6B] rounded-2xl p-4 mb-6">
          <h3 className="text-[#1F2937] mb-2">Alternative Dates Available</h3>
          <p className="text-[#6B7280]">
            We found better options on nearby dates. Your itinerary can be adjusted automatically.
          </p>
        </div>

        {/* Flights List */}
        <div className="space-y-4 mb-6">
          {flights.map((flight) => (
            <FlightCard
              key={flight.id}
              {...flight}
              onSelect={() => handleFlightSelect(flight.id, flight.isAlternative)}
            />
          ))}
        </div>
      </div>

      <BottomNav activeTab="trips" />
      <FilterSheet 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        type="flights"
      />

      {/* Itinerary Change Dialog */}
      <AlertDialog open={showItineraryChange} onOpenChange={setShowItineraryChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Itinerary?</AlertDialogTitle>
            <AlertDialogDescription>
              This flight departs on Jan 12 instead of Jan 13. Your itinerary will be updated to accommodate this change. All activities will be rescheduled accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmChange}
              className="bg-[#4AA3F2] hover:bg-[#1A73E8]"
            >
              Confirm & Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
