import { useState } from 'react';
import { ArrowLeft, Train, Plane, Car, Bus, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { BottomNav } from './BottomNav';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';

interface BookingFlowV2Props {
  onBack?: () => void;
  onCustomizeTrip?: () => void;
}

interface CityImage {
  name: string;
  imageUrl: string;
}

interface ItineraryOption {
  id: string;
  type: string;
  cities: string[];
  days: number;
  highlights: string;
  priceRange: {
    min: number;
    max: number;
  };
  transportation: ('train' | 'plane' | 'car' | 'bus')[];
  isRecommended?: boolean;
  heroImage: string;
  heroCity: string;
  cityThumbnails: CityImage[];
}

export function BookingFlowV2({ onBack, onCustomizeTrip }: BookingFlowV2Props) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('1');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<CityImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>(null);
  
  const tripSummary = {
    occasion: 'Christmas Markets',
    dates: 'Dec 15-22',
    travelers: '3 Adults',
    budget: '€2,500'
  };

  const itineraryOptions: ItineraryOption[] = [
    {
      id: '1',
      type: 'FOCUSED',
      cities: ['Prague', 'Vienna'],
      days: 6,
      highlights: 'Deep cultural immersion, Christmas market expertise',
      priceRange: { min: 2200, max: 2600 },
      transportation: ['train'],
      isRecommended: true,
      heroImage: 'https://images.unsplash.com/photo-1639488013074-dcd13020150b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQcmFndWUlMjBDaHJpc3RtYXMlMjBtYXJrZXQlMjBuaWdodHxlbnwxfHx8fDE3NjIzODM0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080',
      heroCity: 'Prague',
      cityThumbnails: [
        { name: 'Vienna', imageUrl: 'https://images.unsplash.com/photo-1733991354048-26f6b5eb7e81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWaWVubmElMjBDaHJpc3RtYXMlMjBtYXJrZXR8ZW58MXx8fHwxNzYyMzgzNDc5fDA&ixlib=rb-4.1.0&q=80&w=1080' }
      ]
    },
    {
      id: '2',
      type: 'BALANCED',
      cities: ['Prague', 'Vienna', 'Munich'],
      days: 8,
      highlights: 'Perfect mix of must-sees and hidden gems',
      priceRange: { min: 2400, max: 2800 },
      transportation: ['train', 'car'],
      heroImage: 'https://images.unsplash.com/photo-1733991354048-26f6b5eb7e81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWaWVubmElMjBDaHJpc3RtYXMlMjBtYXJrZXR8ZW58MXx8fHwxNzYyMzgzNDc5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      heroCity: 'Vienna',
      cityThumbnails: [
        { name: 'Prague', imageUrl: 'https://images.unsplash.com/photo-1639488013074-dcd13020150b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQcmFndWUlMjBDaHJpc3RtYXMlMjBtYXJrZXQlMjBuaWdodHxlbnwxfHx8fDE3NjIzODM0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080' },
        { name: 'Munich', imageUrl: 'https://images.unsplash.com/photo-1703670852725-94e74d38a4f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNdW5pY2glMjBDaHJpc3RtYXMlMjBtYXJrZXR8ZW58MXx8fHwxNzYyMzgzNDgwfDA&ixlib=rb-4.1.0&q=80&w=1080' }
      ]
    },
    {
      id: '3',
      type: 'EXPLORER',
      cities: ['Prague', 'Vienna', 'Munich', 'Salzburg'],
      days: 10,
      highlights: 'Maximum destinations, faster pace',
      priceRange: { min: 2800, max: 3200 },
      transportation: ['plane', 'train', 'car'],
      heroImage: 'https://images.unsplash.com/photo-1703670852725-94e74d38a4f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNdW5pY2glMjBDaHJpc3RtYXMlMjBtYXJrZXR8ZW58MXx8fHwxNzYyMzgzNDgwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      heroCity: 'Munich',
      cityThumbnails: [
        { name: 'Prague', imageUrl: 'https://images.unsplash.com/photo-1639488013074-dcd13020150b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQcmFndWUlMjBDaHJpc3RtYXMlMjBtYXJrZXQlMjBuaWdodHxlbnwxfHx8fDE3NjIzODM0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080' },
        { name: 'Vienna', imageUrl: 'https://images.unsplash.com/photo-1733991354048-26f6b5eb7e81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWaWVubmElMjBDaHJpc3RtYXMlMjBtYXJrZXR8ZW58MXx8fHwxNzYyMzgzNDc5fDA&ixlib=rb-4.1.0&q=80&w=1080' },
        { name: 'Salzburg', imageUrl: 'https://images.unsplash.com/photo-1742160492576-abd2940e826f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTYWx6YnVyZyUyMENocmlzdG1hcyUyMG1hcmtldHxlbnwxfHx8fDE3NjIzODM0ODB8MA&ixlib=rb-4.1.0&q=80&w=1080' }
      ]
    }
  ];

  const additionalOptions: ItineraryOption[] = [
    {
      id: '4',
      type: 'BUDGET CONSCIOUS',
      cities: ['Prague', 'Vienna', 'Munich'],
      days: 8,
      highlights: 'Hostels + public transport focus',
      priceRange: { min: 1800, max: 2200 },
      transportation: ['bus', 'train'],
      heroImage: 'https://images.unsplash.com/photo-1688504087674-43c79cf49a84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWRnZXQlMjBob3N0ZWx8ZW58MXx8fHwxNzYyMzgzNDgxfDA&ixlib=rb-4.1.0&q=80&w=1080',
      heroCity: 'Prague',
      cityThumbnails: [
        { name: 'Prague', imageUrl: 'https://images.unsplash.com/photo-1639488013074-dcd13020150b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQcmFndWUlMjBDaHJpc3RtYXMlMjBtYXJrZXQlMjBuaWdodHxlbnwxfHx8fDE3NjIzODM0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080' }
      ]
    },
    {
      id: '5',
      type: 'PREMIUM EXPERIENCE',
      cities: ['Vienna', 'Salzburg'],
      days: 6,
      highlights: 'Boutique hotels + private experiences',
      priceRange: { min: 3500, max: 4200 },
      transportation: ['car', 'train'],
      heroImage: 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbHxlbnwxfHx8fDE3NjIzMjU2NDB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      heroCity: 'Vienna',
      cityThumbnails: [
        { name: 'Salzburg', imageUrl: 'https://images.unsplash.com/photo-1742160492576-abd2940e826f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTYWx6YnVyZyUyMENocmlzdG1hcyUyMG1hcmtldHxlbnwxfHx8fDE3NjIzODM0ODB8MA&ixlib=rb-4.1.0&q=80&w=1080' }
      ]
    },
    {
      id: '6',
      type: 'ALTERNATIVE ROUTE',
      cities: ['Munich', 'Nuremberg', 'Prague'],
      days: 7,
      highlights: 'German Christmas market focus',
      priceRange: { min: 2300, max: 2700 },
      transportation: ['car'],
      heroImage: 'https://images.unsplash.com/photo-1544212415-8e3d2a27a944?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxHZXJtYW4lMjBDaHJpc3RtYXMlMjBtYXJrZXR8ZW58MXx8fHwxNzYyMzgzNDgwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      heroCity: 'Munich',
      cityThumbnails: [
        { name: 'Prague', imageUrl: 'https://images.unsplash.com/photo-1639488013074-dcd13020150b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQcmFndWUlMjBDaHJpc3RtYXMlMjBtYXJrZXQlMjBuaWdodHxlbnwxfHx8fDE3NjIzODM0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080' }
      ]
    }
  ];

  const getTransportIcon = (type: 'train' | 'plane' | 'car' | 'bus') => {
    switch (type) {
      case 'train':
        return <Train className="w-4 h-4" />;
      case 'plane':
        return <Plane className="w-4 h-4" />;
      case 'car':
        return <Car className="w-4 h-4" />;
      case 'bus':
        return <Bus className="w-4 h-4" />;
    }
  };

  const openGallery = (option: ItineraryOption, e: React.MouseEvent) => {
    e.stopPropagation();
    const allImages = [
      { name: option.heroCity, imageUrl: option.heroImage },
      ...option.cityThumbnails
    ];
    setGalleryImages(allImages);
    setCurrentImageIndex(0);
    setGalleryOpen(true);
  };

  const ItineraryCard = ({ option }: { option: ItineraryOption }) => {
    const isSelected = selectedOptionId === option.id;

    return (
      <div
        onClick={() => setSelectedOptionId(option.id)}
        className={`rounded-xl overflow-hidden shadow-lg transition-all cursor-pointer ${
          isSelected
            ? 'ring-2 ring-[#2563EB] ring-offset-2'
            : 'hover:shadow-xl'
        }`}
      >
        {/* Hero Image Section */}
        <div className="relative h-48">
          <ImageWithFallback
            src={option.heroImage}
            alt={option.type}
            className="w-full h-full object-cover"
          />
          
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />

          {/* Recommended Badge */}
          {option.isRecommended && (
            <div className="absolute top-3 left-3">
              <span className="bg-[#2563EB] text-white px-3 py-1 rounded-full">
                Recommended
              </span>
            </div>
          )}

          {/* Transportation Icons */}
          <div className="absolute top-3 right-3 flex gap-2">
            {option.transportation.map((type, idx) => (
              <div key={idx} className="p-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                <div className="text-white">
                  {getTransportIcon(type)}
                </div>
              </div>
            ))}
          </div>

          {/* City Thumbnails */}
          {option.cityThumbnails.length > 0 && (
            <div className="absolute bottom-3 right-3 flex gap-2">
              {option.cityThumbnails.map((city, idx) => (
                <button
                  key={idx}
                  onClick={(e) => openGallery(option, e)}
                  className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/50 shadow-lg hover:border-white hover:scale-105 transition-all"
                >
                  <ImageWithFallback
                    src={city.imageUrl}
                    alt={city.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Route Visualization Overlay with City Names */}
          <div className="absolute bottom-16 left-3 right-20 flex items-center gap-1">
            {option.cities.map((city, index) => (
              <div key={city} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white shadow-md" />
                  <span className="text-white text-[10px] whitespace-nowrap drop-shadow-lg">{city}</span>
                </div>
                {index < option.cities.length - 1 && (
                  <div className="w-6 h-0.5 bg-white/60 mb-4" />
                )}
              </div>
            ))}
          </div>

          {/* Text Overlay */}
          <div className="absolute bottom-3 left-3">
            <h3 className="text-white mb-1">{option.type}</h3>
            <p className="text-white/90">
              {option.cities.length} Cities • {option.days} Days
            </p>
          </div>
        </div>

        {/* Card Details Below Image */}
        <div className="bg-white p-4">
          <p className="text-[#6B7280] mb-3">{option.highlights}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-[#1F2937]">
              €{option.priceRange.min.toLocaleString()} - €{option.priceRange.max.toLocaleString()}
            </span>
            <span className="text-[#6B7280]">per person</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#E5E7EB] z-40">
        <div className="flex items-center justify-between px-4 py-4 max-w-md mx-auto">
          <button 
            onClick={onBack}
            className="p-1 hover:bg-[#E5E7EB] rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#1F2937]" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-[#1F2937]">Your Trip Options</h1>
          </div>
          <div className="w-8" /> {/* Spacer for alignment */}
        </div>
        
        {/* Progress Indicator */}
        <div className="px-4 pb-3 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6B7280]">Step 2 of 7</span>
            <span className="text-[#6B7280]">29%</span>
          </div>
          <div className="w-full bg-[#E5E7EB] rounded-full h-2">
            <div className="bg-[#4AA3F2] h-2 rounded-full transition-all duration-300" style={{ width: '29%' }} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-32 px-4 max-w-md mx-auto">
        {/* Trip Summary Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E5E7EB] mb-6">
          <div className="flex flex-wrap items-center gap-2 text-[#1F2937]">
            <span>{tripSummary.occasion}</span>
            <span className="text-[#6B7280]">•</span>
            <span>{tripSummary.dates}</span>
            <span className="text-[#6B7280]">•</span>
            <span>{tripSummary.travelers}</span>
            <span className="text-[#6B7280]">•</span>
            <span>{tripSummary.budget} budget</span>
          </div>
        </div>

        {/* Itinerary Cards */}
        <div className="space-y-4 mb-6">
          {itineraryOptions.map((option) => (
            <ItineraryCard key={option.id} option={option} />
          ))}
          
          {/* Additional Options (Expandable) */}
          <div 
            className={`space-y-4 overflow-hidden transition-all duration-500 ease-in-out ${
              showMoreOptions ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {additionalOptions.map((option) => (
              <ItineraryCard key={option.id} option={option} />
            ))}
          </div>
        </div>

        {/* Show More/Less Options Button */}
        <div className="text-center mb-6">
          <button 
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="inline-flex items-center gap-2 text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
          >
            <span>{showMoreOptions ? 'Show Less' : 'Show More Options'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showMoreOptions ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* CTA Button */}
        <div className="space-y-3 mb-6">
          <Button 
            onClick={onCustomizeTrip}
            className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] py-6 rounded-xl shadow-lg"
          >
            Customize Selected Trip
          </Button>
          <p className="text-[#6B7280] text-center">
            Prices based on current rates + estimates
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="trips" />

      {/* Image Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>City Images Gallery</DialogTitle>
            <DialogDescription>
              Swipe or use arrows to view all destination images for this trip
            </DialogDescription>
          </DialogHeader>
          <div className="relative overflow-hidden">
            {/* Image Counter */}
            <div className="absolute top-4 right-14 z-10 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
              {currentImageIndex + 1} / {galleryImages.length}
            </div>

            {/* Carousel */}
            <Carousel 
              className="w-full overflow-hidden"
              opts={{
                loop: true,
                align: "center"
              }}
              setApi={(api) => {
                setCarouselApi(api);
                api?.on('select', () => {
                  setCurrentImageIndex(api.selectedScrollSnap());
                });
              }}
            >
              <CarouselContent className="-ml-4">
                {galleryImages.map((city, idx) => (
                  <CarouselItem key={idx} className="pl-4">
                    <div className="p-1">
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black">
                        <ImageWithFallback
                          src={city.imageUrl}
                          alt={city.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="p-4 text-center">
                        <h3 className="text-[#1F2937]">{city.name}</h3>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              {/* Navigation Buttons */}
              <CarouselPrevious className="left-2 bg-white/90 hover:bg-white border-none shadow-lg" />
              <CarouselNext className="right-2 bg-white/90 hover:bg-white border-none shadow-lg" />
            </Carousel>

            {/* Thumbnail Strip */}
            <div className="px-6 pb-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-min">
                {galleryImages.map((city, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      carouselApi?.scrollTo(idx);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex
                        ? 'border-[#2563EB] scale-110'
                        : 'border-gray-300 hover:border-[#2563EB]'
                    }`}
                  >
                    <ImageWithFallback
                      src={city.imageUrl}
                      alt={city.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
