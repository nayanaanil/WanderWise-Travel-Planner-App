import { useState } from 'react';
import { Search, MapPin, TrendingUp, ChevronLeft } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface DestinationSelectionScreenProps {
  onDestinationSelected: (destination: string) => void;
  onBack?: () => void;
}

export function DestinationSelectionScreen({ onDestinationSelected, onBack }: DestinationSelectionScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);

  const popularDestinations = [
    { name: 'Bali, Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800', tag: 'Beach & Culture' },
    { name: 'Paris, France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800', tag: 'Romance & Art' },
    { name: 'Tokyo, Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800', tag: 'Urban & Culture' },
    { name: 'Maldives', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800', tag: 'Luxury Beach' },
    { name: 'Dubai, UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800', tag: 'Luxury & Modern' },
    { name: 'Goa, India', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800', tag: 'Beach & Party' },
  ];

  const trendingDestinations = [
    'Santorini, Greece',
    'New York, USA',
    'Iceland',
    'Switzerland',
  ];

  // All available destinations for autocomplete
  const allDestinations = [
    ...popularDestinations.map(d => d.name),
    ...trendingDestinations,
    'Mumbai, India',
    'Delhi, India',
    'Jaipur, India',
    'Kerala, India',
    'Udaipur, India',
    'Varanasi, India',
    'Rishikesh, India',
    'Agra, India',
    'London, UK',
    'Rome, Italy',
    'Barcelona, Spain',
    'Amsterdam, Netherlands',
    'Singapore',
    'Bangkok, Thailand',
    'Phuket, Thailand',
    'Kyoto, Japan',
    'Seoul, South Korea',
    'Hong Kong',
    'Sydney, Australia',
    'New Zealand',
    'Los Angeles, USA',
    'Las Vegas, USA',
    'Hawaii, USA',
    'Mauritius',
    'Seychelles',
    'Bora Bora',
    'Fiji',
    'Vienna, Austria',
    'Prague, Czech Republic',
    'Budapest, Hungary',
  ];

  const filteredSuggestions = searchQuery.trim()
    ? allDestinations.filter(dest =>
        dest.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const filteredFromSuggestions = fromLocation.trim()
    ? allDestinations.filter(dest =>
        dest.toLowerCase().includes(fromLocation.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="min-h-screen pt-16 pb-20 bg-gradient-to-br from-[#FFF5F4]/30 via-white to-[#FFF5F4]/20">
      <div className="max-w-md mx-auto px-6 py-6">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#FE4C40] mb-4 transition-colors"
            style={{ fontSize: '14px' }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

        {/* Progress Indicator - Premium */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#FE4C40] text-white flex items-center justify-center shadow-md" style={{ fontSize: '16px', fontWeight: 600 }}>1</div>
          <div className="w-16 h-1 bg-gray-200 rounded-full"></div>
          <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center" style={{ fontSize: '16px', fontWeight: 600 }}>2</div>
          <div className="w-16 h-1 bg-gray-200 rounded-full"></div>
          <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center" style={{ fontSize: '16px', fontWeight: 600 }}>3</div>
        </div>

        {/* Header - Premium */}
        <div className="text-center mb-8">
          <h1 className="text-gray-900 mb-3" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Where to?
          </h1>
          <p className="text-gray-600" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            Choose your dream destination
          </p>
        </div>

        {/* From Location Search */}
        <div className="mb-4 relative">
          <label className="block text-sm text-gray-600 mb-2 ml-1">From</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            <input
              type="text"
              value={fromLocation}
              onChange={(e) => {
                setFromLocation(e.target.value);
                setShowFromSuggestions(true);
              }}
              onFocus={() => setShowFromSuggestions(true)}
              placeholder="Your starting location..."
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-[#FE4C40] focus:outline-none transition-colors text-gray-900 placeholder:text-gray-500 shadow-sm"
            />
          </div>

          {/* From Location Autocomplete Suggestions */}
          {showFromSuggestions && filteredFromSuggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {filteredFromSuggestions.map((dest) => (
                <button
                  key={dest}
                  onClick={() => {
                    setFromLocation(dest);
                    setShowFromSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-[#FFF5F4] hover:to-white transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#FE4C40]" />
                    <span className="text-gray-900">{dest}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* To Destination Search */}
        <div className="mb-8 relative">
          <label className="block text-sm text-gray-600 mb-2 ml-1">To</label>
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
              placeholder="Search destinations..."
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-[#FE4C40] focus:outline-none transition-colors text-gray-900 placeholder:text-gray-500 shadow-sm"
            />
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {filteredSuggestions.map((dest) => (
                <button
                  key={dest}
                  onClick={() => {
                    onDestinationSelected(dest);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-[#FFF5F4] hover:to-white transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#FE4C40]" />
                    <span className="text-gray-900">{dest}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trending Destinations */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#FE4C40]" />
            <h2 className="text-gray-900">Trending Now</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingDestinations.map((dest) => (
              <button
                key={dest}
                onClick={() => onDestinationSelected(dest)}
                className="px-4 py-2 bg-white border-2 border-gray-200 rounded-full text-sm text-gray-700 hover:border-[#FE4C40] hover:text-[#FE4C40] transition-colors"
              >
                {dest}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Destinations */}
        <div>
          <h2 className="text-gray-900 mb-4">Popular Destinations</h2>
          <div className="space-y-3">
            {popularDestinations.map((destination) => (
              <button
                key={destination.name}
                onClick={() => onDestinationSelected(destination.name)}
                className="w-full bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-4 p-3">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={destination.image}
                      alt={destination.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-gray-900 mb-1">{destination.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{destination.tag}</span>
                    </div>
                  </div>
                  <MapPin className="w-5 h-5 text-[#FE4C40] flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}