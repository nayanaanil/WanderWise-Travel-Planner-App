import { useState, useEffect } from 'react';
import { Star, MapPin, ChevronRight, Search } from 'lucide-react';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { StepHeader } from '@/components/StepHeader';
import { getTripState, saveTripState } from '@/lib/tripState';

interface MustSeeItemsScreenProps {
  destination: string;
  onContinue: (mustSeeItems: string[]) => void;
  onBack?: () => void;
}

export function MustSeeItemsScreen({ destination, onContinue, onBack }: MustSeeItemsScreenProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from sessionStorage on mount
  useEffect(() => {
    const tripState = getTripState();
    
    if (tripState.mustSeeItems && tripState.mustSeeItems.length > 0) {
      setSelectedItems(tripState.mustSeeItems);
    }
    
    setIsHydrated(true);
  }, []);

  // Mock data based on destination
  const mustSeeAttractions = [
    {
      id: '1',
      name: 'Sacred Monkey Forest',
      type: 'Nature & Wildlife',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      rating: 4.5,
    },
    {
      id: '2',
      name: 'Tanah Lot Temple',
      type: 'Cultural Site',
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
      rating: 4.7,
    },
    {
      id: '3',
      name: 'Tegallalang Rice Terraces',
      type: 'Scenic View',
      image: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
      rating: 4.6,
    },
    {
      id: '4',
      name: 'Uluwatu Temple',
      type: 'Cultural Site',
      image: 'https://images.unsplash.com/photo-1555400082-f8b39a68c7c1?w=800',
      rating: 4.8,
    },
    {
      id: '5',
      name: 'Seminyak Beach',
      type: 'Beach',
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
      rating: 4.4,
    },
    {
      id: '6',
      name: 'Ubud Art Market',
      type: 'Shopping',
      image: 'https://images.unsplash.com/photo-1583871369821-4b5499d7f5be?w=800',
      rating: 4.3,
    },
  ];

  // Autocomplete suggestions for attractions
  const allAttractionNames = mustSeeAttractions.map(a => a.name);
  const filteredSuggestions = searchQuery.trim()
    ? allAttractionNames.filter(name =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const updated = prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      // Save to sessionStorage immediately
      if (isHydrated) {
        saveTripState({ mustSeeItems: updated });
      }
      
      return updated;
    });
  };

  const handleContinue = () => {
    // Final save before continuing
    saveTripState({ mustSeeItems: selectedItems });
    onContinue(selectedItems);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FFF5F4]/30 via-white to-[#FFF5F4]/20 pb-24">
      <StepHeader
        title="Must-See Attractions"
        currentStep={4}
        totalSteps={9}
        onBack={onBack}
      />
      <div className="max-w-md mx-auto px-6 py-6 pt-32">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block px-4 py-2 bg-white rounded-full shadow-sm mb-3">
            <p className="text-sm text-[#FE4C40]">✈️ {destination}</p>
          </div>
          <p className="text-gray-600">
            Select places you definitely want to visit
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search attractions..."
              className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#FE4C40] focus:outline-none transition-colors text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {filteredSuggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setSearchQuery(name);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-[#FFF5F4] hover:to-white transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#FE4C40]" />
                    <span className="text-gray-900">{name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Count */}
        {selectedItems.length > 0 && (
          <div className="mb-4 text-center">
            <span className="inline-block px-4 py-2 bg-[#FE4C40] text-white rounded-full text-sm">
              {selectedItems.length} selected
            </span>
          </div>
        )}

        {/* Attractions List */}
        <div className="space-y-3 mb-6">
          {mustSeeAttractions.map((attraction) => {
            const isSelected = selectedItems.includes(attraction.id);
            return (
              <button
                key={attraction.id}
                onClick={() => toggleItem(attraction.id)}
                className={`w-full bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all group ${
                  isSelected ? 'ring-2 ring-[#FE4C40]' : ''
                }`}
              >
                <div className="flex items-center gap-4 p-3">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={attraction.image}
                      alt={attraction.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#FE4C40]/80 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white text-[#FE4C40] flex items-center justify-center">
                          ✓
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-gray-900 mb-1">{attraction.name}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-500">{attraction.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-[#FE4C40] fill-[#FE4C40]" />
                      <span className="text-sm text-gray-700">{attraction.rating}</span>
                    </div>
                  </div>
                  <MapPin className={`w-5 h-5 flex-shrink-0 ${
                    isSelected ? 'text-[#FE4C40]' : 'text-gray-600'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Message */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-600 text-center">
            💡 Don&apos;t worry, you can always modify your itinerary later
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-black text-white rounded-2xl hover:bg-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {selectedItems.length > 0 ? 'Generate My Itinerary' : 'Skip & Generate Itinerary'}
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {selectedItems.length > 0 && (
            <button
              onClick={() => setSelectedItems([])}
              className="w-full py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-2xl hover:border-black transition-colors flex items-center justify-center gap-2"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}