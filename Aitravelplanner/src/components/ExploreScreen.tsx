import { ImageWithFallback } from './figma/ImageWithFallback';
import { Search, Star, Plus, ChevronLeft } from 'lucide-react';
import { useState } from 'react';

interface ExploreScreenProps {
  onAddToTrip?: (item: any) => void;
  onBack?: () => void;
}

export function ExploreScreen({ onAddToTrip, onBack }: ExploreScreenProps) {
  const [activeCategory, setActiveCategory] = useState('attractions');
  
  const categories = [
    { id: 'airlines', label: '✈️ Airlines/Trains' },
    { id: 'stays', label: '🏨 Stays/Hotels' },
    { id: 'food', label: '🍴 Food' },
    { id: 'activities', label: '🎭 Activities' },
    { id: 'attractions', label: '🌆 Attractions' },
    { id: 'travellers', label: '🧭 Travellers\' Choice' },
  ];
  
  const destinations = [
    {
      id: 1,
      name: 'Eiffel Tower',
      location: 'Paris, France',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1570097703229-b195d6dd291f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlaWZmZWwlMjB0b3dlciUyMHBhcmlzfGVufDF8fHx8MTc2MDUxNDYwNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      type: 'Iconic landmark'
    },
    {
      id: 2,
      name: 'The Colosseum',
      location: 'Rome, Italy',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvc3NldW0lMjByb21lfGVufDF8fHx8MTc2MDU4MzY0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      type: 'Ancient ruins'
    },
    {
      id: 3,
      name: 'Coorg Hills',
      location: 'Karnataka, India',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1654851619289-535101d20c22?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMGhpbGxzJTIwbmF0dXJlfGVufDF8fHx8MTc2MDYwOTE1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      type: 'Hill station'
    },
    {
      id: 4,
      name: 'Machu Picchu',
      location: 'Cusco, Peru',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1580619305218-8423a7ef79b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWNodSUyMHBpY2NodSUyMHBlcnV8ZW58MXx8fHwxNzYwNTk0MzAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      type: 'UNESCO World Heritage'
    },
  ];

  const stays = [
    {
      id: 1,
      name: 'Luxury Beach Resort',
      location: 'Maldives',
      rating: 4.9,
      price: '₹15,000/night',
      image: 'https://images.unsplash.com/photo-1610527520425-adf766276e1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJlc29ydHxlbnwxfHx8fDE3NjA1MTI0MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      type: '5-star resort'
    },
  ];

  const foodSpots = [
    {
      id: 1,
      name: 'Local Food Market',
      location: 'Bangkok, Thailand',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1544997872-62aabbe63823?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb2NhbCUyMGZvb2QlMjByZXN0YXVyYW50fGVufDF8fHx8MTc2MDYwOTE1Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      type: 'Street food'
    },
  ];

  const activities = [
    {
      id: 1,
      name: 'Mountain Trekking',
      location: 'Nepal',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1711313532019-091463e14327?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZHZlbnR1cmUlMjBhY3Rpdml0aWVzJTIwb3V0ZG9vcnxlbnwxfHx8fDE3NjA2MDkxNTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      type: 'Adventure activity'
    },
  ];

  const getActiveItems = () => {
    switch (activeCategory) {
      case 'stays':
        return stays;
      case 'food':
        return foodSpots;
      case 'activities':
        return activities;
      default:
        return destinations;
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-20 bg-white">
      <div className="max-w-md mx-auto">
        {/* Hero Section */}
        <div className="px-8 py-8 bg-gradient-to-br from-[#e8f4f5]/20 to-white">
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-[#FE4C40] mb-6 transition-colors"
              style={{ fontSize: '14px' }}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          )}

          <h1 className="text-center text-gray-900 mb-3" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Explore destinations, experiences, and stays — all in one place.
          </h1>
        </div>
        
        {/* Search Bar */}
        <div className="px-6 py-4 bg-white sticky top-16 z-30 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search cities, hotels, or activities..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4C40] focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="px-6 py-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-gradient-to-r from-[#FE4C40] to-[#E63C30] text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Grid View */}
        <div className="px-6 pb-8">
          <div className="grid grid-cols-2 gap-4">
            {getActiveItems().map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-40">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#FE4C40] fill-current" />
                    <span className="text-xs">{item.rating}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-gray-900 text-sm mb-1 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{item.location}</p>
                  <button
                    onClick={() => onAddToTrip?.(item)}
                    className="w-full py-2 bg-gradient-to-r from-[#FE4C40] to-[#E63C30] text-white rounded-lg text-xs hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add to Trip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Popular Collections */}
        <div className="px-6 pb-8">
          <h2 className="text-xl text-gray-900 mb-4">Popular Collections</h2>
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-[#e8f4f5] to-white p-4 rounded-2xl border border-gray-100">
              <h3 className="text-gray-900 mb-1">🏖️ Beach Destinations</h3>
              <p className="text-sm text-gray-600">12 destinations • Perfect for relaxation</p>
            </div>
            <div className="bg-gradient-to-r from-[#fff5ed] to-white p-4 rounded-2xl border border-gray-100">
              <h3 className="text-gray-900 mb-1">🏔️ Mountain Escapes</h3>
              <p className="text-sm text-gray-600">8 destinations • Adventure awaits</p>
            </div>
            <div className="bg-gradient-to-r from-[#e8f4f5] to-white p-4 rounded-2xl border border-gray-100">
              <h3 className="text-gray-900 mb-1">🏛️ Cultural Heritage</h3>
              <p className="text-sm text-gray-600">15 destinations • Rich history</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}