import { useState, useRef, useEffect } from 'react';
import { Train, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Checkbox } from '@/ui/checkbox';
import { Label } from '@/ui/label';
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group';

interface TransportOption {
  id: string;
  type: string;
  provider: string;
  logo: string;
  price: number;
  duration: string;
  departTime: string;
  arriveTime: string;
  details: string;
  recommended?: boolean;
  badge?: string;
  extraInfo?: string;
  fullDetails?: {
    trainNumber: string;
    from: string;
    to: string;
    distance: string;
    speed: string;
    amenities: string[];
    seatOptions: { type: string; price: number }[];
    mealOptions: { type: string; price: number }[];
    cancellationOptions: { type: string; price: number }[];
    stationInfo: {
      departure: string;
      arrival: string;
    };
  };
}

interface CityToCityContentProps {
  showCityTransportTips: boolean;
  setShowCityTransportTips: (show: boolean) => void;
  pragueViennaOptions: TransportOption[];
  viennaMunichOptions: TransportOption[];
  expandedTransportId: string | null;
  selectedPragueViennaId: string | null;
  selectedViennaMunichId: string | null;
  handleExpandTransport: (id: string) => void;
  handleSelectTransport: (segment: 'pv' | 'vm', id: string) => void;
  totalTransportCost: number;
  totalTransportTime: string;
  showLuggageSection: boolean;
  setShowLuggageSection: (show: boolean) => void;
  onLockChoices?: () => void;
}

export function CityToCityContent({
  showCityTransportTips,
  setShowCityTransportTips,
  pragueViennaOptions,
  viennaMunichOptions,
  expandedTransportId,
  selectedPragueViennaId,
  selectedViennaMunichId,
  handleExpandTransport,
  handleSelectTransport,
  totalTransportCost,
  totalTransportTime,
  showLuggageSection,
  setShowLuggageSection,
  onLockChoices
}: CityToCityContentProps) {
  const [selectedSeat, setSelectedSeat] = useState('standard');
  const [selectedMeal, setSelectedMeal] = useState('onboard');
  const [selectedCancellation, setSelectedCancellation] = useState('standard');
  const [visiblePragueVienna, setVisiblePragueVienna] = useState(2);
  const [visibleViennaMunich, setVisibleViennaMunich] = useState(2);
  const [pragueViennaSegmentExpanded, setPragueViennaSegmentExpanded] = useState(false);
  const [viennaMunichSegmentExpanded, setViennaMunichSegmentExpanded] = useState(false);

  const confirmationRef = useRef<HTMLDivElement>(null);
  const selectedPragueVienna = pragueViennaOptions.find(o => o.id === selectedPragueViennaId);
  const selectedViennaMunich = viennaMunichOptions.find(o => o.id === selectedViennaMunichId);

  // Auto-scroll to confirmation when both selections are made
  useEffect(() => {
    if (selectedPragueViennaId && selectedViennaMunichId && confirmationRef.current) {
      setTimeout(() => {
        confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedPragueViennaId, selectedViennaMunichId]);

  return (
    <>
      {/* Smart Transport Tips Overlay */}
      {showCityTransportTips && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-[320px] w-full">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center">
                <Train className="w-8 h-8 text-[#4AA3F2]" />
              </div>
            </div>
            
            <h2 className="text-center text-[#1F2937] mb-3">🚂 City Transport Tips</h2>
            
            <p className="text-[#6B7280] mb-4 text-center">
              We&apos;ll help you get between your destinations efficiently.
            </p>
            
            <div className="space-y-3 mb-4">
              <div className="bg-[#EFF6FF] rounded-lg p-3">
                <p className="text-[#1F2937] mb-2">💡 SMART TIPS:</p>
                <ul className="text-[#6B7280] space-y-1 text-sm">
                  <li>• Book trains early for better prices</li>
                  <li>• Consider scenic routes for memorable journeys</li>
                  <li>• Some routes include meal service</li>
                  <li>• Night trains can save on accommodation</li>
                </ul>
              </div>
              
              <div className="bg-[#FEF3C7] rounded-lg p-3">
                <p className="text-[#1F2937] mb-2">🎯 WE OPTIMIZE FOR:</p>
                <ul className="text-[#78350F] space-y-1 text-sm">
                  <li>• Your selected travel style preferences</li>
                  <li>• Total journey time vs cost</li>
                  <li>• Luggage-friendly options</li>
                </ul>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowCityTransportTips(false)}
              className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] mb-2"
            >
              Show me transport options
            </Button>
            
            <button 
              onClick={() => setShowCityTransportTips(false)}
              className="w-full text-[#6B7280] hover:text-[#1F2937] text-sm"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Route Overview Section */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#4AA3F2] rounded-full"></div>
            <span className="text-[#1F2937]">Prague</span>
          </div>
          <div className="flex-1 mx-2 border-t-2 border-dashed border-[#E5E7EB]"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
            <span className="text-[#1F2937]">Vienna</span>
          </div>
          <div className="flex-1 mx-2 border-t-2 border-dashed border-[#E5E7EB]"></div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FF6B6B] rounded-full"></div>
            <span className="text-[#1F2937]">Munich</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
          <div className="text-[#6B7280]">Prague to Vienna: <span className="text-[#1F2937]">251km</span></div>
          <div className="text-[#6B7280]">Vienna to Munich: <span className="text-[#1F2937]">355km</span></div>
        </div>
        
        <div className="text-sm text-[#6B7280]">
          <span className="text-[#1F2937]">2 segments</span> • 606km total • Est. 8h 25m travel time
        </div>
      </div>

      {/* Segment 1: Prague to Vienna */}
      <div className="mb-6">
        <button
          onClick={() => setPragueViennaSegmentExpanded(!pragueViennaSegmentExpanded)}
          className="w-full flex items-center justify-between mb-3 hover:bg-[#F9FAFB] p-3 -mx-3 rounded-lg transition-colors"
        >
          <div>
            <h3 className="text-[#1F2937] mb-1 text-left">Prague → Vienna • Dec 16 (Day 2)</h3>
            <p className="text-[#6B7280] text-left">Choose your preferred option</p>
          </div>
          {pragueViennaSegmentExpanded ? (
            <ChevronUp className="w-6 h-6 text-[#6B7280] flex-shrink-0" />
          ) : (
            <ChevronDown className="w-6 h-6 text-[#6B7280] flex-shrink-0" />
          )}
        </button>

        {pragueViennaSegmentExpanded && (
          <div className="space-y-3">
            {pragueViennaOptions.slice(0, visiblePragueVienna).map((option) => {
              const isExpanded = expandedTransportId === option.id;
              const isSelected = selectedPragueViennaId === option.id;

              return (
                <div
                  key={option.id}
                  onClick={() => !isExpanded && handleSelectTransport('pv', option.id)}
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'border-[#4AA3F2]'
                      : option.recommended
                      ? 'border-l-4 border-l-[#10B981] border-t border-r border-b border-[#E5E7EB]'
                      : 'border-[#E5E7EB]'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpandTransport(option.id);
                    }}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl">{option.logo}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-[#1F2937]">{option.type}</h4>
                            {option.recommended && (
                              <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                                Recommended
                              </Badge>
                            )}
                            {option.badge && !option.recommended && (
                              <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20">
                                {option.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[#6B7280] mb-1">{option.provider}</p>
                          <p className="text-[#6B7280]">{option.details}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#1F2937] text-2xl">€{option.price}</p>
                        <p className="text-[#6B7280]">per person{option.extraInfo ? ` ${option.extraInfo}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#F3F4F6] text-[#6B7280] rounded-lg text-sm">
                          {option.duration}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded State */}
                  {isExpanded && option.fullDetails && (
                    <div className="border-t border-[#E5E7EB] p-4 space-y-4 animate-in slide-in-from-top duration-300">
                      {/* Journey Details */}
                      <div>
                        <h4 className="text-[#1F2937] mb-2">JOURNEY DETAILS</h4>
                        <div className="bg-[#F9FAFB] rounded-lg p-3 space-y-1">
                          <p className="text-[#1F2937]">
                            {option.fullDetails.trainNumber} • {option.fullDetails.from} → {option.fullDetails.to}
                          </p>
                          <p className="text-[#6B7280]">
                            Departure: {option.departTime} from {option.fullDetails.from}
                          </p>
                          <p className="text-[#6B7280]">
                            Arrival: {option.arriveTime} at {option.fullDetails.to}
                          </p>
                          <p className="text-[#6B7280]">
                            Distance: {option.fullDetails.distance} • Average speed: {option.fullDetails.speed}
                          </p>
                        </div>
                      </div>

                      {/* Included Amenities */}
                      <div>
                        <h4 className="text-[#1F2937] mb-2">INCLUDED AMENITIES</h4>
                        <div className="space-y-2">
                          {option.fullDetails.amenities.map((amenity, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                              <span className="text-[#6B7280]">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Booking Options */}
                      <div>
                        <h4 className="text-[#1F2937] mb-3">BOOKING OPTIONS</h4>
                        
                        {/* Seat Selection */}
                        <div className="mb-4">
                          <Label className="text-[#1F2937] mb-2 block">Seat Selection</Label>
                          <RadioGroup value={selectedSeat} onValueChange={setSelectedSeat}>
                            <div className="space-y-2">
                              {option.fullDetails.seatOptions.map((seatOption, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <RadioGroupItem value={seatOption.type.toLowerCase().split(' ')[0]} id={`seat-${idx}`} />
                                  <Label htmlFor={`seat-${idx}`} className="text-[#1F2937] flex-1">
                                    {seatOption.type}{seatOption.price > 0 ? ` (+€${seatOption.price})` : ''}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Meal Service */}
                        <div className="mb-4">
                          <Label className="text-[#1F2937] mb-2 block">Meal Service</Label>
                          <RadioGroup value={selectedMeal} onValueChange={setSelectedMeal}>
                            <div className="space-y-2">
                              {option.fullDetails.mealOptions.map((mealOption, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={mealOption.type.toLowerCase().replace(/[^a-z]/g, '')} 
                                    id={`meal-${idx}`} 
                                  />
                                  <Label htmlFor={`meal-${idx}`} className="text-[#1F2937] flex-1">
                                    {mealOption.type}{mealOption.price > 0 ? ` (+€${mealOption.price})` : ''}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Cancellation */}
                        <div className="mb-4">
                          <Label className="text-[#1F2937] mb-2 block">Cancellation Policy</Label>
                          <RadioGroup value={selectedCancellation} onValueChange={setSelectedCancellation}>
                            <div className="space-y-2">
                              {option.fullDetails.cancellationOptions.map((cancelOption, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={cancelOption.type.toLowerCase().split(' ')[0]} 
                                    id={`cancel-${idx}`} 
                                  />
                                  <Label htmlFor={`cancel-${idx}`} className="text-[#1F2937] flex-1">
                                    {cancelOption.type}{cancelOption.price > 0 ? ` (+€${cancelOption.price})` : ''}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      {/* Station Info */}
                      <div className="bg-[#EFF6FF] rounded-lg p-3">
                        <h4 className="text-[#1F2937] mb-2">STATION INFORMATION</h4>
                        <p className="text-[#6B7280] mb-1">
                          Prague departure: {option.fullDetails.stationInfo.departure}
                        </p>
                        <p className="text-[#6B7280]">
                          Vienna arrival: {option.fullDetails.stationInfo.arrival}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTransport('pv', option.id);
                            handleExpandTransport(option.id); // Close the expanded view
                          }}
                          className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8]"
                        >
                          Select this option
                        </Button>
                        <Button variant="outline" className="w-full">
                          Compare alternatives
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Show More Button */}
            {visiblePragueVienna < pragueViennaOptions.length && (
              <button
                onClick={() => setVisiblePragueVienna(pragueViennaOptions.length)}
                className="w-full mt-2 py-3 border-2 border-dashed border-[#E5E7EB] rounded-xl text-[#4AA3F2] hover:border-[#4AA3F2] hover:bg-[#EFF6FF] transition-colors flex items-center justify-center gap-2"
              >
                <span>See More Options ({pragueViennaOptions.length - visiblePragueVienna} more)</span>
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Segment 2: Vienna to Munich */}
      <div className="mb-6">
        <button
          onClick={() => setViennaMunichSegmentExpanded(!viennaMunichSegmentExpanded)}
          className="w-full flex items-center justify-between mb-3 hover:bg-[#F9FAFB] p-3 -mx-3 rounded-lg transition-colors"
        >
          <div>
            <h3 className="text-[#1F2937] mb-1 text-left">Vienna → Munich • Dec 19 (Day 5)</h3>
            <p className="text-[#6B7280] text-left">Choose your preferred option</p>
          </div>
          {viennaMunichSegmentExpanded ? (
            <ChevronUp className="w-6 h-6 text-[#6B7280] flex-shrink-0" />
          ) : (
            <ChevronDown className="w-6 h-6 text-[#6B7280] flex-shrink-0" />
          )}
        </button>

        {viennaMunichSegmentExpanded && (
          <div className="space-y-3">
            {viennaMunichOptions.slice(0, visibleViennaMunich).map((option) => {
              const isExpanded = expandedTransportId === option.id;
              const isSelected = selectedViennaMunichId === option.id;

              return (
                <div
                  key={option.id}
                  onClick={() => !isExpanded && handleSelectTransport('vm', option.id)}
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'border-[#4AA3F2]'
                      : option.recommended
                      ? 'border-l-4 border-l-[#10B981] border-t border-r border-b border-[#E5E7EB]'
                      : 'border-[#E5E7EB]'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpandTransport(option.id);
                    }}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl">{option.logo}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-[#1F2937]">{option.type}</h4>
                            {option.recommended && (
                              <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">
                                Recommended
                              </Badge>
                            )}
                            {option.badge && !option.recommended && (
                              <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20">
                                {option.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[#6B7280] mb-1">{option.provider}</p>
                          <p className="text-[#6B7280]">{option.details}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#1F2937] text-2xl">€{option.price}</p>
                        <p className="text-[#6B7280]">per person{option.extraInfo ? ` ${option.extraInfo}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-[#F3F4F6] text-[#6B7280] rounded-lg text-sm">
                          {option.duration}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded State */}
                  {isExpanded && option.fullDetails && (
                    <div className="border-t border-[#E5E7EB] p-4 space-y-4 animate-in slide-in-from-top duration-300">
                      {/* Journey Details */}
                      <div>
                        <h4 className="text-[#1F2937] mb-2">JOURNEY DETAILS</h4>
                        <div className="bg-[#F9FAFB] rounded-lg p-3 space-y-1">
                          <p className="text-[#1F2937]">
                            {option.fullDetails.trainNumber} • {option.fullDetails.from} → {option.fullDetails.to}
                          </p>
                          <p className="text-[#6B7280]">
                            Departure: {option.departTime} from {option.fullDetails.from}
                          </p>
                          <p className="text-[#6B7280]">
                            Arrival: {option.arriveTime || 'Flexible'} at {option.fullDetails.to}
                          </p>
                          <p className="text-[#6B7280]">
                            Distance: {option.fullDetails.distance} • Average speed: {option.fullDetails.speed}
                          </p>
                        </div>
                      </div>

                      {/* Included Amenities */}
                      <div>
                        <h4 className="text-[#1F2937] mb-2">INCLUDED AMENITIES</h4>
                        <div className="space-y-2">
                          {option.fullDetails.amenities.map((amenity, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                              <span className="text-[#6B7280]">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Booking Options */}
                      <div>
                        <h4 className="text-[#1F2937] mb-3">BOOKING OPTIONS</h4>
                        
                        {/* Seat Selection */}
                        <div className="mb-4">
                          <Label className="text-[#1F2937] mb-2 block">Seat Selection</Label>
                          <RadioGroup value={selectedSeat} onValueChange={setSelectedSeat}>
                            <div className="space-y-2">
                              {option.fullDetails.seatOptions.map((seatOption, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <RadioGroupItem value={seatOption.type.toLowerCase().split(' ')[0]} id={`seat-vm-${idx}`} />
                                  <Label htmlFor={`seat-vm-${idx}`} className="text-[#1F2937] flex-1">
                                    {seatOption.type}{seatOption.price > 0 ? ` (+€${seatOption.price})` : ''}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Meal Service */}
                        <div className="mb-4">
                          <Label className="text-[#1F2937] mb-2 block">Meal Service</Label>
                          <RadioGroup value={selectedMeal} onValueChange={setSelectedMeal}>
                            <div className="space-y-2">
                              {option.fullDetails.mealOptions.map((mealOption, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={mealOption.type.toLowerCase().replace(/[^a-z]/g, '')} 
                                    id={`meal-vm-${idx}`} 
                                  />
                                  <Label htmlFor={`meal-vm-${idx}`} className="text-[#1F2937] flex-1">
                                    {mealOption.type}{mealOption.price > 0 ? ` (+€${mealOption.price})` : ''}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Cancellation */}
                        <div className="mb-4">
                          <Label className="text-[#1F2937] mb-2 block">Cancellation Policy</Label>
                          <RadioGroup value={selectedCancellation} onValueChange={setSelectedCancellation}>
                            <div className="space-y-2">
                              {option.fullDetails.cancellationOptions.map((cancelOption, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={cancelOption.type.toLowerCase().split(' ')[0]} 
                                    id={`cancel-vm-${idx}`} 
                                  />
                                  <Label htmlFor={`cancel-vm-${idx}`} className="text-[#1F2937] flex-1">
                                    {cancelOption.type}{cancelOption.price > 0 ? ` (+€${cancelOption.price})` : ''}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      {/* Station Info */}
                      <div className="bg-[#EFF6FF] rounded-lg p-3">
                        <h4 className="text-[#1F2937] mb-2">STATION INFORMATION</h4>
                        <p className="text-[#6B7280] mb-1">
                          Vienna departure: {option.fullDetails.stationInfo.departure}
                        </p>
                        <p className="text-[#6B7280]">
                          Munich arrival: {option.fullDetails.stationInfo.arrival}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTransport('vm', option.id);
                            handleExpandTransport(option.id); // Close the expanded view
                          }}
                          className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8]"
                        >
                          Select this option
                        </Button>
                        <Button variant="outline" className="w-full">
                          Compare alternatives
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Show More Button */}
            {visibleViennaMunich < viennaMunichOptions.length && (
              <button
                onClick={() => setVisibleViennaMunich(viennaMunichOptions.length)}
                className="w-full mt-2 py-3 border-2 border-dashed border-[#E5E7EB] rounded-xl text-[#4AA3F2] hover:border-[#4AA3F2] hover:bg-[#EFF6FF] transition-colors flex items-center justify-center gap-2"
              >
                <span>See More Options ({viennaMunichOptions.length - visibleViennaMunich} more)</span>
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Multi-segment Deals */}
      <div className="mb-6">
        <h3 className="text-[#1F2937] mb-3">💡 Multi-segment Savings</h3>
        <div className="bg-gradient-to-br from-[#10B981]/10 to-[#059669]/10 rounded-xl p-4 border border-[#10B981]/30">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0 text-white">
              <Train className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-[#1F2937] mb-1">Book both segments together</h4>
              <p className="text-[#6B7280] mb-2">
                Train pass: Prague → Vienna → Munich
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#10B981] text-2xl">€165</span>
                <span className="text-[#6B7280]">per person (Save €19)</span>
              </div>
              <p className="text-[#6B7280] text-sm mb-1">
                Includes: Reserved seats, flexible times
              </p>
              <p className="text-[#6B7280] text-sm">
                Valid for 7 days with unlimited changes
              </p>
            </div>
          </div>
          <Button className="w-full bg-[#10B981] text-white hover:bg-[#059669]">
            View train pass options
          </Button>
        </div>
      </div>

      {/* Alternative Routes */}
      <div className="mb-6">
        <h3 className="text-[#1F2937] mb-3">Consider these alternatives</h3>
        <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
          <h4 className="text-[#1F2937] mb-2">Prague → Munich direct, then Munich → Vienna</h4>
          <p className="text-[#6B7280] mb-2">
            Might save time if you prefer Munich first
          </p>
          <p className="text-[#1F2937] mb-3">Total cost: €142 per person</p>
          <Button variant="outline" className="w-full">
            See this route
          </Button>
        </div>
      </div>

      {/* Luggage & Special Needs */}
      <div className="mb-6">
        <button
          onClick={() => setShowLuggageSection(!showLuggageSection)}
          className="w-full flex items-center justify-between text-[#1F2937] mb-2"
        >
          <span>Luggage & Accessibility</span>
          {showLuggageSection ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
        
        {showLuggageSection && (
          <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-2 text-sm">
            <p className="text-[#6B7280]">
              <span className="text-[#1F2937]">Large luggage (&gt;23kg):</span> Some restrictions on buses
            </p>
            <p className="text-[#6B7280]">
              <span className="text-[#1F2937]">Wheelchair accessibility:</span> All trains equipped
            </p>
            <p className="text-[#6B7280]">
              <span className="text-[#1F2937]">Bike transport:</span> Available on trains (+€10)
            </p>
            <p className="text-[#6B7280]">
              <span className="text-[#1F2937]">Pet travel:</span> Small pets free, large pets €15
            </p>
          </div>
        )}
      </div>

      {/* Selected Transport Summary */}
      {(selectedPragueVienna || selectedViennaMunich) && (
        <div className="bg-[#EFF6FF] rounded-xl p-4 border border-[#4AA3F2]/30 mb-6">
          <h3 className="text-[#1F2937] mb-3">Selected Transport Plan</h3>
          {selectedPragueVienna && (
            <p className="text-[#1F2937] mb-1">
              Prague → Vienna: {selectedPragueVienna.provider} (€{selectedPragueVienna.price})
            </p>
          )}
          {selectedViennaMunich && (
            <p className="text-[#1F2937] mb-2">
              Vienna → Munich: {selectedViennaMunich.provider} (€{selectedViennaMunich.price})
            </p>
          )}
          {selectedPragueVienna && selectedViennaMunich && (
            <>
              <p className="text-[#1F2937] mb-1">
                Total: €{totalTransportCost} per person × 3 adults = €{totalTransportCost * 3}
              </p>
              <p className="text-[#6B7280]">
                Total travel time: {totalTransportTime}
              </p>
            </>
          )}
        </div>
      )}

      {/* Bottom CTAs */}
      <div ref={confirmationRef} className="space-y-3">
        <Button
          onClick={onLockChoices}
          className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] py-6 rounded-xl shadow-lg"
        >
          Confirm Transport Selection
        </Button>
        <Button
          variant="outline"
          className="w-full border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] py-6 rounded-xl"
        >
          Save progress
        </Button>
      </div>
    </>
  );
}

