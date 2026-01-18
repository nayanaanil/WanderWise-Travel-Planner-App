import { useState, useRef } from 'react';
import { GripVertical, X, Plus, Plane, PiggyBank, Backpack, Clock, Info, Minus } from 'lucide-react';
import { Button } from '@/ui/button';
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group';
import { Label } from '@/ui/label';
import { BottomNav } from '@/components/BottomNav';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { StepHeader } from '@/components/StepHeader';

interface ItineraryCustomizationScreenProps {
  onBack?: () => void;
  onPlanTransport?: () => void;
}

interface CityStop {
  id: string;
  name: string;
  flag: string;
  days: number;
  minNights: number;
}

interface SuggestedCity {
  id: string;
  name: string;
  flag: string;
  suggestedDays: number;
  distance: string;
  fromCity: string;
  heroImage: string;
  minNights: number;
}

export function ItineraryCustomizationScreen({ 
  onBack,
  onPlanTransport 
}: ItineraryCustomizationScreenProps) {
  const [cities, setCities] = useState<CityStop[]>([
    {
      id: '1',
      name: 'Prague',
      flag: '🇨🇿',
      days: 3,
      minNights: 2
    },
    {
      id: '2',
      name: 'Vienna',
      flag: '🇦🇹',
      days: 3,
      minNights: 1
    },
    {
      id: '3',
      name: 'Munich',
      flag: '🇩🇪',
      days: 2,
      minNights: 1
    }
  ]);

  const [suggestedCities, setSuggestedCities] = useState<SuggestedCity[]>([
    {
      id: '4',
      name: 'Salzburg',
      flag: '🇦🇹',
      suggestedDays: 1,
      distance: '2h',
      fromCity: 'Munich',
      heroImage: 'https://images.unsplash.com/photo-1742160492576-abd2940e826f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTYWx6YnVyZyUyMENocmlzdG1hcyUyMG1hcmtldHxlbnwxfHx8fDE3NjIzODM0ODB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      minNights: 1
    },
    {
      id: '5',
      name: 'Innsbruck',
      flag: '🇦🇹',
      suggestedDays: 1,
      distance: '3h',
      fromCity: 'Vienna',
      heroImage: 'https://images.unsplash.com/photo-1594988905401-96dc956bcfff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJbm5zYnJ1Y2slMjBBdXN0cmlhfGVufDF8fHx8MTc2MjU5MzQ0M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      minNights: 1
    }
  ]);

  const [travelStyle, setTravelStyle] = useState<string>('comfort');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddCityDialog, setShowAddCityDialog] = useState(false);

  const heroImage = 'https://images.unsplash.com/photo-1733991354048-26f6b5eb7e81?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWaWVubmElMjBDaHJpc3RtYXMlMjBtYXJrZXR8ZW58MXx8fHwxNzYyMzgzNDc5fDA&ixlib=rb-4.1.0&q=80&w=1080';

  const handleIncrementDays = (cityId: string) => {
    setCities(cities.map(city => 
      city.id === cityId && city.days < 7 ? { ...city, days: city.days + 1 } : city
    ));
  };

  const handleDecrementDays = (cityId: string) => {
    setCities(cities.map(city => {
      if (city.id === cityId && city.days > city.minNights) {
        return { ...city, days: city.days - 1 };
      }
      return city;
    }));
  };

  const handleRemoveCity = (cityId: string) => {
    if (cities.length > 2) {
      setCities(cities.filter(city => city.id !== cityId));
    }
  };

  const handleAddSuggestedCity = (suggestion: SuggestedCity) => {
    const newCity: CityStop = {
      id: suggestion.id,
      name: suggestion.name,
      flag: suggestion.flag,
      days: suggestion.suggestedDays,
      minNights: suggestion.minNights
    };
    setCities([...cities, newCity]);
    setSuggestedCities(suggestedCities.filter(s => s.id !== suggestion.id));
  };

  const handleAddCustomCity = () => {
    // For demo purposes, adding a generic new city
    const newCity: CityStop = {
      id: `city-${Date.now()}`,
      name: 'New City',
      flag: '🏙️',
      days: 2,
      minNights: 1
    };
    setCities([...cities, newCity]);
    setShowAddCityDialog(false);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newCities = [...cities];
      const draggedCity = newCities[draggedIndex];
      newCities.splice(draggedIndex, 1);
      newCities.splice(dragOverIndex, 0, draggedCity);
      setCities(newCities);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const totalDays = cities.reduce((sum, city) => sum + city.days, 0);
  const totalTravelTime = cities.length * 3; // Mock calculation
  const baseCost = 2600;
  const currentCost = Math.round(baseCost + (totalDays - 8) * 100);
  const costDifference = currentCost - baseCost;

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] pb-24">
      <StepHeader
        title="Build Your Route"
        currentStep={5}
        totalSteps={9}
        onBack={onBack}
        rightAction={{
          label: 'Save Draft',
          onClick: () => {} // TODO: Implement save draft functionality
        }}
      />

      {/* Main Content */}
      <div className="pt-32 px-4 max-w-md mx-auto pb-6">
        {/* Hero Image with Overlapping Summary Card */}
        <div className="relative -mx-4 mb-20">
          {/* Hero Image */}
          <div className="relative h-48">
            <ImageWithFallback
              src={heroImage}
              alt="Trip destination"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>

          {/* Overlapping Summary Card */}
          <div className="absolute -bottom-16 left-4 right-4 bg-white rounded-xl p-4 shadow-lg border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[#1F2937]">Balanced Route</h3>
              <span className="text-[#6B7280]">{totalDays} days</span>
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {cities.map((city, index) => (
                <div key={city.id} className="flex items-center gap-2">
                  <span className="text-[#6B7280]">{city.name}</span>
                  {index < cities.length - 1 && (
                    <span className="text-[#6B7280]">→</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[#1F2937]">€{currentCost.toLocaleString()} per person</p>
          </div>
        </div>

        {/* Route Builder Section */}
        <div className="mb-6">
          <h2 className="text-[#1F2937] mb-3">Customize Your Journey</h2>
          
          <div className="space-y-2">
            {cities.map((city, index) => (
              <div 
                key={city.id} 
                className="relative"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
              >
                {/* City Card */}
                <div 
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                    draggedIndex === index 
                      ? 'border-[#4AA3F2] shadow-lg opacity-50' 
                      : dragOverIndex === index
                      ? 'border-[#4AA3F2] border-dashed'
                      : 'border-[#E5E7EB]'
                  }`}
                >
                  {/* Remove Button */}
                  {cities.length > 2 && (
                    <button 
                      onClick={() => handleRemoveCity(city.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[#EF4444] text-white rounded-full hover:bg-[#DC2626] transition-colors flex items-center justify-center z-10 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Drag Handle */}
                      <div className="cursor-move p-1 hover:bg-[#F3F4F6] rounded select-none">
                        <GripVertical className="w-5 h-5 text-[#9CA3AF]" />
                      </div>

                      {/* City Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{city.flag}</span>
                          <h3 className="text-[#1F2937]">{city.name}</h3>
                        </div>
                        <p className="text-[#9CA3AF]">
                          Min. {city.minNights} {city.minNights === 1 ? 'night' : 'nights'}
                        </p>
                      </div>

                      {/* Duration Controls - Compact */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecrementDays(city.id)}
                          disabled={city.days <= city.minNights}
                          className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] flex items-center justify-center hover:border-[#4AA3F2] hover:bg-[#EFF6FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4 text-[#6B7280]" />
                        </button>
                        <span className="text-[#1F2937] min-w-[50px] text-center">
                          {city.days} {city.days === 1 ? 'day' : 'days'}
                        </span>
                        <button
                          onClick={() => handleIncrementDays(city.id)}
                          disabled={city.days >= 7}
                          className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] flex items-center justify-center hover:border-[#4AA3F2] hover:bg-[#EFF6FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 text-[#6B7280]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connection Line */}
                {index < cities.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-4 bg-[#E5E7EB]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add Destination Section */}
        <div className="mb-6">
          <button 
            onClick={handleAddCustomCity}
            className="w-full border-2 border-dashed border-[#E5E7EB] rounded-xl p-4 hover:border-[#4AA3F2] hover:bg-[#EFF6FF] transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="w-5 h-5 text-[#4AA3F2]" />
            <span className="text-[#4AA3F2]">Add City</span>
          </button>

          {/* Smart Suggestions */}
          {suggestedCities.length > 0 && (
            <div className="space-y-3">
              <p className="text-[#6B7280]">Smart suggestions:</p>
              {suggestedCities.map((suggestion) => (
                <div 
                  key={suggestion.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-[#E5E7EB]"
                >
                  {/* Hero Image */}
                  <div className="relative h-32">
                    <ImageWithFallback
                      src={suggestion.heroImage}
                      alt={suggestion.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* City Name Overlay */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{suggestion.flag}</span>
                        <h4 className="text-white">{suggestion.name}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Info Below Image */}
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[#6B7280]">
                        {suggestion.distance} from {suggestion.fromCity}
                      </p>
                      <p className="text-[#1F2937]">
                        {suggestion.suggestedDays} {suggestion.suggestedDays === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleAddSuggestedCity(suggestion)}
                      className="px-4 py-2 bg-[#4AA3F2] text-white rounded-lg hover:bg-[#1A73E8] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Travel Style Preferences */}
        <div className="mb-6">
          <h2 className="text-[#1F2937] mb-4">How do you like to travel?</h2>
          
          <RadioGroup value={travelStyle} onValueChange={setTravelStyle}>
            <div className="grid grid-cols-2 gap-3">
              {/* Comfort First */}
              <div className="relative">
                <RadioGroupItem value="comfort" id="comfort" className="peer sr-only" />
                <Label
                  htmlFor="comfort"
                  className="flex flex-col items-start p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-[#4AA3F2] peer-data-[state=checked]:bg-[#EFF6FF] border-[#E5E7EB] hover:border-[#4AA3F2]/50"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
                    <Plane className="w-5 h-5 text-[#4AA3F2]" />
                  </div>
                  <span className="text-[#1F2937] mb-1">Comfort First</span>
                  <span className="text-[#6B7280]">Flights, taxis, hotels near stations</span>
                </Label>
              </div>

              {/* Budget Conscious */}
              <div className="relative">
                <RadioGroupItem value="budget" id="budget" className="peer sr-only" />
                <Label
                  htmlFor="budget"
                  className="flex flex-col items-start p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-[#4AA3F2] peer-data-[state=checked]:bg-[#EFF6FF] border-[#E5E7EB] hover:border-[#4AA3F2]/50"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
                    <PiggyBank className="w-5 h-5 text-[#4AA3F2]" />
                  </div>
                  <span className="text-[#1F2937] mb-1">Budget Conscious</span>
                  <span className="text-[#6B7280]">Buses, trains, walk more</span>
                </Label>
              </div>

              {/* Authentic Local */}
              <div className="relative">
                <RadioGroupItem value="authentic" id="authentic" className="peer sr-only" />
                <Label
                  htmlFor="authentic"
                  className="flex flex-col items-start p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-[#4AA3F2] peer-data-[state=checked]:bg-[#EFF6FF] border-[#E5E7EB] hover:border-[#4AA3F2]/50"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
                    <Backpack className="w-5 h-5 text-[#4AA3F2]" />
                  </div>
                  <span className="text-[#1F2937] mb-1">Authentic Local</span>
                  <span className="text-[#6B7280]">Public transport, local neighborhoods</span>
                </Label>
              </div>

              {/* Time Efficient */}
              <div className="relative">
                <RadioGroupItem value="efficient" id="efficient" className="peer sr-only" />
                <Label
                  htmlFor="efficient"
                  className="flex flex-col items-start p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-[#4AA3F2] peer-data-[state=checked]:bg-[#EFF6FF] border-[#E5E7EB] hover:border-[#4AA3F2]/50"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-[#4AA3F2]" />
                  </div>
                  <span className="text-[#1F2937] mb-1">Time Efficient</span>
                  <span className="text-[#6B7280]">Fastest routes, minimal transfers</span>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Smart Constraints Panel */}
        <div className="bg-[#EFF6FF] rounded-xl p-4 shadow-sm border border-[#4AA3F2]/30 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-6 h-6 rounded-full bg-[#4AA3F2] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#1F2937] mb-2">Route Analysis</h3>
              <ul className="space-y-1 text-[#6B7280]">
                <li>• Current route requires {totalTravelTime} hours total travel time</li>
                <li>• Adding Salzburg: +4 hours travel, +€300 budget</li>
                <li>• Vienna 1-day minimum for Christmas market experience</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Impact Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E5E7EB] mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6B7280]">Updated totals</span>
            <span className="text-[#1F2937]">
              {totalDays} days • €{currentCost.toLocaleString()} per person
            </span>
          </div>
          {costDifference !== 0 && (
            <p className="text-[#6B7280]">
              {costDifference > 0 ? '↑' : '↓'}
              {Math.abs(totalDays - 8)} day
              {Math.abs(totalDays - 8) !== 1 ? 's' : ''}, {costDifference > 0 ? '↑' : '↓'}€
              {Math.abs(costDifference)} from selected plan
            </p>
          )}
        </div>

        {/* Bottom CTAs */}
        <div className="space-y-3">
          <Button 
            onClick={onPlanTransport}
            className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] py-6 rounded-xl shadow-lg"
          >
            Plan Transportation
          </Button>
          <Button 
            onClick={onBack}
            variant="outline"
            className="w-full border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] py-6 rounded-xl"
          >
            Back to Options
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="trips" />
    </div>
  );
}
