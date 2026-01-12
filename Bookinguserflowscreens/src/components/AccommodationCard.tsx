import { Star, MapPin, Wifi, UtensilsCrossed, Waves, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface AccommodationCardProps {
  name: string;
  image: string;
  rating: number;
  reviews: number;
  location: string;
  pricePerNight: number;
  amenities: string[];
  isAlternative?: boolean;
  dateChange?: string;
  onSelect: () => void;
}

const amenityIcons: Record<string, any> = {
  'WiFi': Wifi,
  'Breakfast': UtensilsCrossed,
  'Pool': Waves,
};

export function AccommodationCard({
  name,
  image,
  rating,
  reviews,
  location,
  pricePerNight,
  amenities,
  isAlternative = false,
  dateChange,
  onSelect
}: AccommodationCardProps) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${isAlternative ? 'border-[#FF6B6B]' : 'border-[#E5E7EB]'}`}>
      {isAlternative && dateChange && (
        <div className="flex items-center gap-2 mx-4 mt-4 p-2 bg-[#FFF5F5] rounded-lg">
          <AlertCircle className="w-4 h-4 text-[#FF6B6B]" />
          <span className="text-[#FF6B6B]">{dateChange}</span>
        </div>
      )}
      
      <div className="relative h-48">
        <ImageWithFallback 
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-[#1F2937] mb-1">{name}</h3>
            <div className="flex items-center gap-1 text-[#6B7280] mb-2">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#4AA3F2] text-white px-2 py-1 rounded-lg ml-2">
            <Star className="w-4 h-4" fill="white" />
            <span>{rating}</span>
          </div>
        </div>

        <div className="text-[#6B7280] mb-3">
          {reviews} reviews
        </div>

        <div className="flex gap-4 mb-4">
          {amenities.slice(0, 3).map((amenity) => {
            const Icon = amenityIcons[amenity];
            return (
              <div key={amenity} className="flex items-center gap-1 text-[#6B7280]">
                {Icon && <Icon className="w-4 h-4" />}
                <span>{amenity}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[#1F2937]">${pricePerNight}</span>
            <span className="text-[#6B7280]"> / night</span>
          </div>
        </div>

        <Button 
          onClick={onSelect}
          className="w-full bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
        >
          Select Accommodation
        </Button>
      </div>
    </div>
  );
}
