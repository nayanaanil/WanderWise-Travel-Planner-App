import { useState } from 'react';
import { SlidersHorizontal, Calendar } from 'lucide-react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AccommodationCard } from './AccommodationCard';
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

interface AccommodationSelectionScreenProps {
  onBack: () => void;
  onContinue: () => void;
}

export function AccommodationSelectionScreen({ onBack, onContinue }: AccommodationSelectionScreenProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState<string | null>(null);
  const [showItineraryChange, setShowItineraryChange] = useState(false);

  const accommodations = [
    {
      id: '1',
      name: 'The Cypress Inn',
      image: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMGxvYmJ5fGVufDF8fHx8MTc2MjEwNTQxN3ww&ixlib=rb-4.1.0&q=80&w=1080',
      rating: 4.8,
      reviews: 342,
      location: 'Downtown Carmel',
      pricePerNight: 285,
      amenities: ['WiFi', 'Breakfast', 'Pool'],
      isAlternative: false,
    },
    {
      id: '2',
      name: 'Ocean View Resort',
      image: 'https://images.unsplash.com/photo-1655292912612-bb5b1bda9355?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3RlbCUyMGJlZHJvb20lMjBtb2Rlcm58ZW58MXx8fHwxNzYyMTU2MTEyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      rating: 4.6,
      reviews: 218,
      location: 'Beachfront',
      pricePerNight: 325,
      amenities: ['WiFi', 'Pool', 'Breakfast'],
      isAlternative: false,
    },
    {
      id: '3',
      name: 'Seaside Paradise Hotel',
      image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMHJlc29ydHxlbnwxfHx8fDE3NjIxNTUwMzF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      rating: 4.9,
      reviews: 456,
      location: 'Scenic Point',
      pricePerNight: 395,
      amenities: ['WiFi', 'Breakfast', 'Pool'],
      isAlternative: true,
      dateChange: 'Check-out extended to Jan 15 - Premium ocean view',
    },
  ];

  const handleAccommodationSelect = (accommodationId: string, isAlternative: boolean) => {
    setSelectedAccommodation(accommodationId);
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
          <h1 className="text-[#1F2937] mb-2">Select Accommodation</h1>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Calendar className="w-4 h-4" />
            <span>Carmel-by-the-Sea</span>
          </div>
          <div className="text-[#6B7280] mt-1">
            Jan 13-14, 2025 • 1 guest
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

        {/* Flight Summary */}
        <div className="bg-white rounded-2xl p-4 mb-6 border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[#6B7280] mb-1">Selected Flight</div>
              <div className="text-[#1F2937]">United Airlines UA 1234</div>
              <div className="text-[#6B7280]">Jan 13 • 10:30 AM - 2:45 PM</div>
            </div>
            <div className="text-[#4AA3F2]">✓</div>
          </div>
        </div>

        {/* Alternative Dates Info */}
        <div className="bg-[#FFF5F5] border border-[#FF6B6B] rounded-2xl p-4 mb-6">
          <h3 className="text-[#1F2937] mb-2">Extended Stay Options</h3>
          <p className="text-[#6B7280]">
            Premium accommodations available with extended check-out. Itinerary can be adjusted for better deals.
          </p>
        </div>

        {/* Accommodations List */}
        <div className="space-y-4 mb-6">
          {accommodations.map((accommodation) => (
            <AccommodationCard
              key={accommodation.id}
              {...accommodation}
              onSelect={() => handleAccommodationSelect(accommodation.id, accommodation.isAlternative)}
            />
          ))}
        </div>
      </div>

      <BottomNav activeTab="trips" />
      <FilterSheet 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        type="accommodations"
      />

      {/* Itinerary Change Dialog */}
      <AlertDialog open={showItineraryChange} onOpenChange={setShowItineraryChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extend Your Stay?</AlertDialogTitle>
            <AlertDialogDescription>
              This accommodation offers check-out on Jan 15 (1 day later). Your itinerary will be extended to include an extra day in Carmel. Return flight will be rescheduled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmChange}
              className="bg-[#4AA3F2] hover:bg-[#1A73E8]"
            >
              Confirm & Extend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
