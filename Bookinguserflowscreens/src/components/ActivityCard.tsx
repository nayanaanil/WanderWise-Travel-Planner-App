import { Clock, Users, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ActivityCardProps {
  name: string;
  image: string;
  duration: string;
  category: string;
  location: string;
  price: number;
  groupSize: string;
  onSelect: () => void;
}

export function ActivityCard({
  name,
  image,
  duration,
  category,
  location,
  price,
  groupSize,
  onSelect
}: ActivityCardProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB]">
      <div className="relative h-48">
        <ImageWithFallback 
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-[#FF6B6B] text-white px-3 py-1 rounded-full">
            {category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[#1F2937] mb-3">{name}</h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Clock className="w-4 h-4" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Users className="w-4 h-4" />
            <span>{groupSize}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[#1F2937]">${price}</span>
            <span className="text-[#6B7280]"> per person</span>
          </div>
        </div>

        <Button 
          onClick={onSelect}
          className="w-full bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
        >
          Add to Trip
        </Button>
      </div>
    </div>
  );
}
