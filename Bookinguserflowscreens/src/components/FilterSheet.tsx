import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'flights' | 'accommodations' | 'activities';
}

export function FilterSheet({ isOpen, onClose, type }: FilterSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
          <h2 className="text-[#1F2937]">Filters</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#E5E7EB] rounded-full transition-colors">
            <X className="w-6 h-6 text-[#1F2937]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Price Range */}
          <div>
            <Label className="text-[#1F2937] mb-3 block">Price Range</Label>
            <Slider defaultValue={[0, 1000]} max={2000} step={50} className="mb-2" />
            <div className="flex justify-between text-[#6B7280]">
              <span>$0</span>
              <span>$2000+</span>
            </div>
          </div>

          {type === 'flights' && (
            <>
              {/* Stops */}
              <div>
                <Label className="text-[#1F2937] mb-3 block">Stops</Label>
                <div className="space-y-2">
                  {['Non-stop', '1 stop', '2+ stops'].map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox id={option} />
                      <Label htmlFor={option} className="text-[#1F2937]">{option}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Airlines */}
              <div>
                <Label className="text-[#1F2937] mb-3 block">Airlines</Label>
                <div className="space-y-2">
                  {['United Airlines', 'Delta', 'American Airlines', 'Southwest'].map((airline) => (
                    <div key={airline} className="flex items-center gap-2">
                      <Checkbox id={airline} />
                      <Label htmlFor={airline} className="text-[#1F2937]">{airline}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'accommodations' && (
            <>
              {/* Rating */}
              <div>
                <Label className="text-[#1F2937] mb-3 block">Minimum Rating</Label>
                <div className="space-y-2">
                  {['4.5+', '4.0+', '3.5+', '3.0+'].map((rating) => (
                    <div key={rating} className="flex items-center gap-2">
                      <Checkbox id={rating} />
                      <Label htmlFor={rating} className="text-[#1F2937]">{rating} stars</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <Label className="text-[#1F2937] mb-3 block">Amenities</Label>
                <div className="space-y-2">
                  {['WiFi', 'Breakfast', 'Pool', 'Parking', 'Gym', 'Pet-friendly'].map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2">
                      <Checkbox id={amenity} />
                      <Label htmlFor={amenity} className="text-[#1F2937]">{amenity}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'activities' && (
            <>
              {/* Category */}
              <div>
                <Label className="text-[#1F2937] mb-3 block">Category</Label>
                <div className="space-y-2">
                  {['Adventure', 'Culture', 'Food & Drink', 'Relaxation', 'Sightseeing'].map((category) => (
                    <div key={category} className="flex items-center gap-2">
                      <Checkbox id={category} />
                      <Label htmlFor={category} className="text-[#1F2937]">{category}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label className="text-[#1F2937] mb-3 block">Duration</Label>
                <div className="space-y-2">
                  {['Under 2 hours', '2-4 hours', '4-8 hours', 'Full day'].map((duration) => (
                    <div key={duration} className="flex items-center gap-2">
                      <Checkbox id={duration} />
                      <Label htmlFor={duration} className="text-[#1F2937]">{duration}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] p-6 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 border-[#4AA3F2] text-[#4AA3F2]"
            onClick={onClose}
          >
            Reset
          </Button>
          <Button 
            className="flex-1 bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
            onClick={onClose}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
