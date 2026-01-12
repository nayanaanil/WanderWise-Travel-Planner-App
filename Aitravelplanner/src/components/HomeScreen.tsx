import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HomeScreenProps {
  onPlanTrip: () => void;
  onExplore: () => void;
  onChatOpen: () => void;
  onSavedClick?: () => void;
  savedCount?: number;
}

export function HomeScreen({ onPlanTrip, onExplore, onChatOpen, onSavedClick, savedCount = 8 }: HomeScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const heroImages = [
    {
      url: 'https://images.unsplash.com/photo-1721914449276-58e59a98990b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0dXJxdW9pc2UlMjBvY2VhbiUyMHBhcmFkaXNlfGVufDF8fHx8MTc2MzM3NzM1Mnww&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Turquoise ocean paradise',
      tagline: 'Your Journey\nBegins Here!'
    },
    {
      url: 'https://images.unsplash.com/photo-1623770203836-71db5fc396ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMGhvdCUyMGFpciUyMGJhbGxvb25zfGVufDF8fHx8MTc2MzM3NzM1Mnww&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Colorful hot air balloons',
      tagline: 'Rise Above\nThe Ordinary!'
    },
    {
      url: 'https://images.unsplash.com/photo-1617836250803-24873f080562?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVycnklMjBibG9zc29tJTIwc3ByaW5nfGVufDF8fHx8MTc2MzM3NzM1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Cherry blossom spring',
      tagline: 'Discover New\nHorizons!'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  return (
    <div className="min-h-screen pt-16 pb-20 bg-white">
      {/* Hero Section with Premium Gradient */}
      <div className="bg-gradient-to-br from-[#FFF5F4]/50 via-white to-[#FFF5F4]/30 px-6 pt-8 pb-6">
        <div className="max-w-md mx-auto">
          {/* Hero Statement with Premium Typography */}
          <h1 className="text-center text-gray-900 mb-6 leading-tight" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Organize your trip in minutes.
          </h1>
          
          {/* Hero Image Carousel with Soft Shadow */}
          <div className="relative rounded-2xl overflow-hidden mb-6" style={{ boxShadow: '0 10px 30px rgba(254, 76, 64, 0.15)' }}>
            {/* Carousel Container */}
            <div className="relative h-64 overflow-hidden">
              {heroImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
                    index === currentSlide ? 'translate-x-0' : index < currentSlide ? '-translate-x-full' : 'translate-x-full'
                  }`}
                >
                  <ImageWithFallback
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Classy Text Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h2 
                      className="text-white text-center px-6"
                      style={{ 
                        fontSize: '22px', 
                        fontWeight: 700, 
                        letterSpacing: '0.02em',
                        textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)',
                        lineHeight: 1.3
                      }}
                    >
                      {image.tagline}
                    </h2>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-gray-900" />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-white w-6' : 'bg-white/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* CTA Buttons with Premium Styling */}
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={onPlanTrip}
              className="px-6 py-3 bg-[#FE4C40] text-white rounded-xl transition-all duration-300 hover:-translate-y-0.5"
              style={{ 
                boxShadow: '0 4px 12px rgba(254, 76, 64, 0.3)',
                fontSize: '16px',
                fontWeight: 600
              }}
            >
              Plan Trip
            </button>
            <button
              onClick={onExplore}
              className="px-6 py-3 bg-white text-gray-900 rounded-xl border border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40] transition-all duration-300"
              style={{ 
                fontSize: '16px',
                fontWeight: 600
              }}
            >
              Bookings
            </button>
          </div>
        </div>
      </div>
      
      {/* Travel Dashboard Section with Better Spacing */}
      <div className="px-6 py-6 max-w-md mx-auto">
        <h2 className="text-gray-900 mb-4" style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.01em' }}>
          Your Travel Dashboard
        </h2>
        
        {/* Dashboard Grid with 8pt Spacing */}
        <div className="grid grid-cols-2 gap-3">
          {/* Today's Snapshot */}
          <div className="col-span-2">
            <div 
              className="bg-gray-900 rounded-2xl p-5"
              style={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)' }}
            >
              <h3 className="text-white mb-4" style={{ fontSize: '20px', fontWeight: 600 }}>
                Today in Paris
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg">☀️</span>
                  <div>
                    <p className="text-white" style={{ fontSize: '15px' }}>
                      <span style={{ fontWeight: 600 }}>Weather:</span> 8°C, Light rain
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">🎄</span>
                  <div>
                    <p className="text-white" style={{ fontSize: '15px' }}>
                      <span style={{ fontWeight: 600 }}>Event:</span> Christmas Market near Eiffel
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="text-white" style={{ fontSize: '15px' }}>
                      <span style={{ fontWeight: 600 }}>Budget:</span> You're on track (₹7,120 left for today)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smart AI Assistant Button */}
          <div className="col-span-2">
            <button 
              className="w-full backdrop-blur-md border border-[#FE4C40]/30 rounded-2xl p-5 hover:bg-[#FE4C40]/30 transition-all flex items-center justify-center group"
              style={{ height: '70px', boxShadow: '0 8px 32px rgba(254, 76, 64, 0.15)', background: 'rgba(254, 76, 64, 0.1)' }}
              onClick={onChatOpen}
            >
              <div className="flex items-center justify-center">
                <span className="text-gray-900" style={{ fontSize: '17px', fontWeight: 600 }}>
                  Ask AI: What should I do today?
                </span>
              </div>
            </button>
          </div>

          {/* Budget Card - Premium */}
          <div 
            className="bg-white rounded-2xl p-6"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <h3 className="text-gray-600" style={{ fontSize: '14px', fontWeight: 500 }}>Budget</h3>
            </div>
            <p className="text-gray-900 mb-1" style={{ fontSize: '24px', fontWeight: 600 }}>₹1.2L</p>
            <p className="text-gray-500" style={{ fontSize: '12px' }}>This month</p>
          </div>

          {/* Weather Card - Premium */}
          <div 
            className="bg-white rounded-2xl p-6"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] rounded-xl flex items-center justify-center">
                <span className="text-xl">☀️</span>
              </div>
              <h3 className="text-gray-600" style={{ fontSize: '14px', fontWeight: 500 }}>Weather</h3>
            </div>
            <p className="text-gray-900 mb-1" style={{ fontSize: '24px', fontWeight: 600 }}>28°C</p>
            <p className="text-gray-500" style={{ fontSize: '12px' }}>Sunny</p>
          </div>

          {/* Saved Destinations Card - Premium */}
          <button
            onClick={onSavedClick}
            className="bg-white rounded-2xl p-6 text-left hover:scale-105 transition-transform duration-200"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] rounded-xl flex items-center justify-center">
                <span className="text-xl">⭐</span>
              </div>
              <h3 className="text-gray-600" style={{ fontSize: '14px', fontWeight: 500 }}>Saved</h3>
            </div>
            <p className="text-gray-900 mb-1" style={{ fontSize: '24px', fontWeight: 600 }}>{savedCount}</p>
            <p className="text-gray-500" style={{ fontSize: '12px' }}>Wishlist</p>
          </button>

          {/* Travel Days Card - Premium */}
          <div 
            className="bg-white rounded-2xl p-6"
            style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] rounded-xl flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
              <h3 className="text-gray-600" style={{ fontSize: '14px', fontWeight: 500 }}>Days</h3>
            </div>
            <p className="text-gray-900 mb-1" style={{ fontSize: '24px', fontWeight: 600 }}>45</p>
            <p className="text-gray-500" style={{ fontSize: '12px' }}>Traveled</p>
          </div>

          {/* Active Trips Card - Premium */}
          <div 
            className="col-span-2 bg-gradient-to-br from-[#FE4C40] to-[#E63C30] rounded-2xl p-6 text-white"
            style={{ boxShadow: '0 4px 16px rgba(254, 76, 64, 0.3)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Active Trips</h3>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-xl">✈️</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span style={{ fontSize: '40px', fontWeight: 700, lineHeight: 1 }}>3</span>
              <span className="text-white/80" style={{ fontSize: '14px' }}>trips planned</span>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 backdrop-blur-sm">
                <p className="text-white/80 mb-1" style={{ fontSize: '12px' }}>Upcoming</p>
                <p style={{ fontSize: '20px', fontWeight: 600 }}>1</p>
              </div>
              <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 backdrop-blur-sm">
                <p className="text-white/80 mb-1" style={{ fontSize: '12px' }}>Draft</p>
                <p style={{ fontSize: '20px', fontWeight: 600 }}>2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}