import { useState, useRef, useEffect } from 'react';
import { Map, List, SlidersHorizontal, Star, Wifi, Coffee, MapPin, Clock, TrendingUp, ChevronDown, ChevronUp, Users, Calendar } from 'lucide-react';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { BottomNav } from '@/components/BottomNav';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Slider } from '@/ui/slider';
import { StepHeader } from '@/components/StepHeader';

interface AccommodationSelectionScreenV2Props {
  onBack: () => void;
  onContinue: () => void;
}

interface Hotel {
  id: string;
  name: string;
  image: string;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  distance: string;
  walkingTime: string;
  amenities: string[];
  roomsLeft?: number;
  recommended?: boolean;
  badge?: string;
  groupFriendly?: boolean;
}

export function AccommodationSelectionScreenV2({ onBack, onContinue }: AccommodationSelectionScreenV2Props) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedFilter, setSelectedFilter] = useState('near-stations');
  const [showFlexibleDates, setShowFlexibleDates] = useState(false);
  const [showSmartInsights, setShowSmartInsights] = useState(true);
  const [selectedPrague, setSelectedPrague] = useState<string | null>(null);
  const [selectedVienna, setSelectedVienna] = useState<string | null>(null);
  const [selectedMunich, setSelectedMunich] = useState<string | null>(null);
  const [dateShift, setDateShift] = useState([0]);
  const [pragueExpanded, setPragueExpanded] = useState(false);
  const [viennaExpanded, setViennaExpanded] = useState(false);
  const [munichExpanded, setMunichExpanded] = useState(false);
  
  const summaryRef = useRef<HTMLDivElement>(null);

  const filterOptions = [
    { id: 'near-stations', label: 'Near stations' },
    { id: 'historic', label: 'Historic areas' },
    { id: 'budget', label: 'Budget-friendly' },
    { id: 'group', label: 'Group rooms' },
    { id: 'breakfast', label: 'Breakfast included' },
    { id: 'parking', label: 'Parking' },
  ];

  const pragueHotels: Hotel[] = [
    {
      id: 'prague-1',
      name: 'Hotel Golden Well',
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
      pricePerNight: 180,
      rating: 4.8,
      reviewCount: 342,
      distance: '5 min walk to Old Town Square Market',
      walkingTime: '5 min',
      amenities: ['WiFi', 'Breakfast', 'Parking'],
      roomsLeft: 2,
      recommended: true,
      groupFriendly: true,
    },
    {
      id: 'prague-2',
      name: 'Charles Bridge Palace',
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      pricePerNight: 165,
      rating: 4.7,
      reviewCount: 289,
      distance: '3 min walk to Charles Bridge',
      walkingTime: '3 min',
      amenities: ['WiFi', 'Breakfast'],
      roomsLeft: 5,
      badge: 'Best value',
      groupFriendly: true,
    },
    {
      id: 'prague-3',
      name: 'Residence Karolina',
      image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
      pricePerNight: 145,
      rating: 4.6,
      reviewCount: 198,
      distance: '10 min walk to Wenceslas Square',
      walkingTime: '10 min',
      amenities: ['WiFi', 'Parking'],
      roomsLeft: 8,
      groupFriendly: true,
    },
  ];

  const viennaHotels: Hotel[] = [
    {
      id: 'vienna-1',
      name: 'Hotel Sacher Wien',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      pricePerNight: 195,
      rating: 4.9,
      reviewCount: 524,
      distance: 'Christmas market walking distance',
      walkingTime: '2 min',
      amenities: ['WiFi', 'Breakfast', 'Parking'],
      roomsLeft: 3,
      recommended: true,
      badge: 'Christmas market nearby',
      groupFriendly: true,
    },
    {
      id: 'vienna-2',
      name: 'Boutique Hotel Am Stephansplatz',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      pricePerNight: 175,
      rating: 4.7,
      reviewCount: 412,
      distance: '5 min to St. Stephen\'s Cathedral',
      walkingTime: '5 min',
      amenities: ['WiFi', 'Breakfast'],
      roomsLeft: 4,
      groupFriendly: true,
    },
    {
      id: 'vienna-3',
      name: 'Imperial Riding School',
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
      pricePerNight: 160,
      rating: 4.6,
      reviewCount: 298,
      distance: '7 min to Hofburg Palace',
      walkingTime: '7 min',
      amenities: ['WiFi', 'Parking'],
      roomsLeft: 6,
      groupFriendly: true,
    },
  ];

  const munichHotels: Hotel[] = [
    {
      id: 'munich-1',
      name: 'Airport Hotel Regent',
      image: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800',
      pricePerNight: 140,
      rating: 4.5,
      reviewCount: 267,
      distance: '15 min to Munich Airport',
      walkingTime: '15 min',
      amenities: ['WiFi', 'Breakfast', 'Parking'],
      roomsLeft: 7,
      recommended: true,
      badge: 'Near airport',
      groupFriendly: true,
    },
    {
      id: 'munich-2',
      name: 'Marienplatz Suites',
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
      pricePerNight: 155,
      rating: 4.7,
      reviewCount: 389,
      distance: 'City center location',
      walkingTime: '5 min',
      amenities: ['WiFi', 'Breakfast'],
      roomsLeft: 4,
      groupFriendly: true,
    },
  ];

  // Calculate total cost
  const calculateTotal = () => {
    let total = 0;
    const pragueHotel = pragueHotels.find(h => h.id === selectedPrague);
    const viennaHotel = viennaHotels.find(h => h.id === selectedVienna);
    const munichHotel = munichHotels.find(h => h.id === selectedMunich);

    if (pragueHotel) total += pragueHotel.pricePerNight * 3; // 3 nights
    if (viennaHotel) total += viennaHotel.pricePerNight * 3; // 3 nights
    if (munichHotel) total += munichHotel.pricePerNight * 1; // 1 night

    return total;
  };

  const totalCost = calculateTotal();
  const allSelected = selectedPrague && selectedVienna && selectedMunich;

  // Auto-scroll to summary when all selected
  useEffect(() => {
    if (allSelected && summaryRef.current) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [allSelected]);

  const HotelCard = ({ hotel, onSelect, isSelected, city }: { hotel: Hotel; onSelect: () => void; isSelected: boolean; city: string }) => (
    <div
      onClick={onSelect}
      className={`bg-white rounded-xl overflow-hidden shadow-sm border-2 transition-all cursor-pointer ${
        isSelected ? 'border-[#4AA3F2]' : 'border-[#E5E7EB]'
      }`}
    >
      <div className="relative">
        <ImageWithFallback
          src={hotel.image}
          alt={hotel.name}
          className="w-full h-48 object-cover"
        />
        {hotel.recommended && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-[#10B981] text-white border-0">
              Recommended
            </Badge>
          </div>
        )}
        {hotel.badge && !hotel.recommended && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-[#F59E0B] text-white border-0">
              {hotel.badge}
            </Badge>
          </div>
        )}
        {isSelected && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 bg-[#4AA3F2] rounded-full flex items-center justify-center">
              <span className="text-white">✓</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-[#1F2937] mb-1">{hotel.name}</h3>
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
              <span className="text-[#1F2937]">{hotel.rating}</span>
              <span className="text-[#6B7280]">({hotel.reviewCount} reviews)</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[#1F2937] text-xl">€{hotel.pricePerNight}</p>
            <p className="text-[#6B7280] text-sm">/night</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#6B7280] mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{hotel.distance}</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          {hotel.amenities.includes('WiFi') && (
            <div className="flex items-center gap-1 text-[#6B7280]">
              <Wifi className="w-4 h-4" />
            </div>
          )}
          {hotel.amenities.includes('Breakfast') && (
            <div className="flex items-center gap-1 text-[#6B7280]">
              <Coffee className="w-4 h-4" />
            </div>
          )}
          {hotel.amenities.includes('Parking') && (
            <div className="flex items-center gap-1 text-[#6B7280]">
              <span className="text-sm">🅿️</span>
            </div>
          )}
        </div>

        {hotel.groupFriendly && (
          <div className="mb-2">
            <Badge className="bg-[#EFF6FF] text-[#4AA3F2] border-[#4AA3F2]/20">
              <Users className="w-3 h-3 mr-1" />
              Perfect for 3 adults
            </Badge>
          </div>
        )}

        {hotel.roomsLeft && hotel.roomsLeft <= 5 && (
          <div className="text-sm text-[#FF6B6B]">
            Only {hotel.roomsLeft} rooms left
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] flex flex-col max-w-md mx-auto">
      <StepHeader
        title="Where to Stay"
        currentStep={7}
        totalSteps={9}
        onBack={onBack}
        rightAction={{
          label: viewMode === 'map' ? 'List' : 'Map',
          onClick: () => setViewMode(viewMode === 'map' ? 'list' : 'map')
        }}
      />
      <div className="fixed top-[120px] left-0 right-0 bg-white border-b border-[#E5E7EB] z-30 max-w-md mx-auto">
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg ${
                viewMode === 'map' ? 'bg-[#4AA3F2] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}
            >
              <Map className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list' ? 'bg-[#4AA3F2] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 flex-nowrap">
            {filterOptions.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${
                  selectedFilter === filter.id
                    ? 'bg-[#4AA3F2] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#4AA3F2]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button className="ml-2 p-2 bg-white border border-[#E5E7EB] rounded-lg flex-shrink-0">
            <SlidersHorizontal className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-48 pb-72 px-4 overflow-y-auto">
        {/* Smart Insights */}
        {showSmartInsights && (
          <div className="mb-6 space-y-3">
            <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-xl p-4 border border-[#F59E0B]/30">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[#92400E]">
                    <span className="text-[#78350F]">Booking now vs later:</span> Prices likely to increase 15%
                  </p>
                </div>
                <button onClick={() => setShowSmartInsights(false)} className="text-[#92400E]">
                  ×
                </button>
              </div>
            </div>

            <div className="bg-[#EFF6FF] rounded-xl p-4 border border-[#4AA3F2]/30">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-[#4AA3F2] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[#1E40AF]">
                    <span className="text-[#1E3A8A]">Group booking tip:</span> Call hotel directly for better rates
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prague Section */}
        <div className="mb-4">
          <button
            onClick={() => setPragueExpanded(!pragueExpanded)}
            className="w-full bg-white rounded-xl p-4 border border-[#E5E7EB] flex items-center justify-between hover:border-[#4AA3F2] transition-colors"
          >
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[#1F2937]">Hotels in Prague</h2>
                {selectedPrague && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                      Selected
                    </Badge>
                    <div className="w-6 h-6 bg-[#4AA3F2] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[#6B7280]">Dec 15-18 (3 nights)</p>
              {selectedPrague && (
                <div className="mt-2">
                  <p className="text-[#4AA3F2]">
                    {pragueHotels.find(h => h.id === selectedPrague)?.name}
                  </p>
                  <p className="text-[#6B7280] text-sm">
                    €{pragueHotels.find(h => h.id === selectedPrague)?.pricePerNight}/night
                  </p>
                </div>
              )}
            </div>
            {pragueExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280] ml-3 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280] ml-3 flex-shrink-0" />
            )}
          </button>

          {pragueExpanded && (
            <div className="mt-4 space-y-4">
              {pragueHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onSelect={() => setSelectedPrague(hotel.id)}
                  isSelected={selectedPrague === hotel.id}
                  city="Prague"
                />
              ))}
            </div>
          )}
        </div>

        {/* Vienna Section */}
        <div className="mb-4">
          <button
            onClick={() => setViennaExpanded(!viennaExpanded)}
            className="w-full bg-white rounded-xl p-4 border border-[#E5E7EB] flex items-center justify-between hover:border-[#4AA3F2] transition-colors"
          >
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[#1F2937]">Hotels in Vienna</h2>
                {selectedVienna && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                      Selected
                    </Badge>
                    <div className="w-6 h-6 bg-[#4AA3F2] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[#6B7280]">Dec 18-21 (3 nights)</p>
              {selectedVienna && (
                <div className="mt-2">
                  <p className="text-[#4AA3F2]">
                    {viennaHotels.find(h => h.id === selectedVienna)?.name}
                  </p>
                  <p className="text-[#6B7280] text-sm">
                    €{viennaHotels.find(h => h.id === selectedVienna)?.pricePerNight}/night
                  </p>
                </div>
              )}
            </div>
            {viennaExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280] ml-3 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280] ml-3 flex-shrink-0" />
            )}
          </button>

          {viennaExpanded && (
            <div className="mt-4 space-y-4">
              {viennaHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onSelect={() => setSelectedVienna(hotel.id)}
                  isSelected={selectedVienna === hotel.id}
                  city="Vienna"
                />
              ))}
            </div>
          )}
        </div>

        {/* Munich Section */}
        <div className="mb-8">
          <button
            onClick={() => setMunichExpanded(!munichExpanded)}
            className="w-full bg-white rounded-xl p-4 border border-[#E5E7EB] flex items-center justify-between hover:border-[#4AA3F2] transition-colors"
          >
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[#1F2937]">Hotels in Munich</h2>
                {selectedMunich && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                      Selected
                    </Badge>
                    <div className="w-6 h-6 bg-[#4AA3F2] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[#6B7280]">Dec 21-22 (1 night)</p>
              {selectedMunich && (
                <div className="mt-2">
                  <p className="text-[#4AA3F2]">
                    {munichHotels.find(h => h.id === selectedMunich)?.name}
                  </p>
                  <p className="text-[#6B7280] text-sm">
                    €{munichHotels.find(h => h.id === selectedMunich)?.pricePerNight}/night
                  </p>
                </div>
              )}
            </div>
            {munichExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280] ml-3 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280] ml-3 flex-shrink-0" />
            )}
          </button>

          {munichExpanded && (
            <div className="mt-4 space-y-4">
              {munichHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onSelect={() => setSelectedMunich(hotel.id)}
                  isSelected={selectedMunich === hotel.id}
                  city="Munich"
                />
              ))}
            </div>
          )}
        </div>

        {/* Flexible Dates Tool */}
        <div className="mb-6">
          <button
            onClick={() => setShowFlexibleDates(!showFlexibleDates)}
            className="w-full bg-white rounded-xl p-4 border border-[#E5E7EB] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#4AA3F2]" />
              <span className="text-[#1F2937]">Flexible with dates?</span>
            </div>
            {showFlexibleDates ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280]" />
            )}
          </button>

          {showFlexibleDates && (
            <div className="mt-3 bg-white rounded-xl p-4 border border-[#E5E7EB]">
              <p className="text-[#6B7280] mb-4">Shift your dates to see more options</p>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#1F2937]">Shift by {dateShift[0]} day{dateShift[0] !== 1 ? 's' : ''}</span>
                  {dateShift[0] > 0 && (
                    <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                      +{5 * dateShift[0]} hotels
                    </Badge>
                  )}
                </div>
                <Slider
                  value={dateShift}
                  onValueChange={setDateShift}
                  max={3}
                  step={1}
                  className="w-full"
                />
              </div>

              {dateShift[0] === 1 && (
                <div className="bg-[#EFF6FF] rounded-lg p-3">
                  <p className="text-[#1F2937] mb-1">Shift Vienna by 1 day</p>
                  <p className="text-[#6B7280] text-sm">5 more hotels available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary */}
      <div ref={summaryRef} className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 pt-4 pb-20 max-w-md mx-auto">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#6B7280]">Total accommodation</span>
            <span className="text-[#1F2937] text-xl">€{totalCost}</span>
          </div>
          <p className="text-[#6B7280] text-sm">€{Math.round(totalCost / 3)} per person (3 adults)</p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={onContinue}
            className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] py-6 rounded-xl shadow-lg"
          >
            Continue to optimization
          </Button>
          <Button
            variant="outline"
            className="w-full border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] py-6 rounded-xl"
          >
            Save selections
          </Button>
        </div>
      </div>

      <BottomNav activeTab="trips" />
    </div>
  );
}