import { useState } from 'react';
import { Plane, Clipboard, Lightbulb, Calendar, Users, AlertCircle } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Checkbox } from '@/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import { Alert, AlertDescription } from '@/ui/alert';
import { Slider } from '@/ui/slider';

interface FlightPreferencesScreenProps {
  onBack: () => void;
  onFindFlights: () => void;
  onSaveAndSkip: () => void;
}

export function FlightPreferencesScreen({
  onBack,
  onFindFlights,
  onSaveAndSkip
}: FlightPreferencesScreenProps) {
  const [departureTime, setDepartureTime] = useState('no-preference');
  const [maxLayovers, setMaxLayovers] = useState([2]);
  const [checkedBags, setCheckedBags] = useState([1]);
  const [bagSize, setBagSize] = useState('standard');
  const [carryOn, setCarryOn] = useState('standard');
  const [legroomLevel, setLegroomLevel] = useState([0]);
  const [dateFlexibility, setDateFlexibility] = useState([0]);
  const [airportFlexibility, setAirportFlexibility] = useState('primary');
  const [budgetPriority, setBudgetPriority] = useState('best-value');

  const getLayoverText = (value: number) => {
    if (value === 0) return 'Direct only';
    if (value === 1) return '1 stop max';
    return 'Any stops';
  };

  const getCheckedBagsText = (value: number) => {
    if (value === 0) return 'None';
    if (value === 1) return '1 bag per person';
    return '2 bags per person';
  };

  const getLegroomText = (value: number) => {
    if (value === 0) return 'Standard';
    if (value === 1) return 'Extra legroom';
    return 'Premium economy+';
  };

  const getDateFlexText = (value: number) => {
    if (value === 0) return 'Exact dates';
    return `±${value} day${value > 1 ? 's' : ''}`;
  };

  const PillButton = ({ 
    active, 
    onClick, 
    children 
  }: { 
    active: boolean; 
    onClick: () => void; 
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full transition-colors min-h-[44px] ${
        active 
          ? 'bg-[#4AA3F2] text-white' 
          : 'bg-white border border-[#E5E7EB] text-[#1F2937] hover:border-[#4AA3F2]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] pb-32">
      <StepHeader title="Flight Preferences" currentStep={7} totalSteps={10} onBack={onBack} />
      
      <div className="pt-16 px-6 max-w-md mx-auto">
        {/* Header Section */}
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#4AA3F2] rounded-xl flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-[#1F2937] text-2xl">Flight Preferences</h1>
            </div>
          </div>
          <p className="text-[#6B7280] mb-2">Christmas Markets Tour • 3 Adults</p>
          <p className="text-[#6B7280]">Munich → Innsbruck → Salzburg → Vienna</p>
          <div className="flex items-center gap-2 text-[#6B7280] mt-1">
            <Calendar className="w-4 h-4" />
            <span>Dec 15-22, 2024</span>
          </div>
        </div>

        {/* Current Selection Reminder Card */}
        <div className="bg-[#F3F4F6] rounded-2xl p-4 mb-6 border border-[#E5E7EB]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Clipboard className="w-5 h-5 text-[#6B7280] mt-1 flex-shrink-0" />
              <div>
                <p className="text-[#6B7280] mb-1">Current Selection:</p>
                <p className="text-[#1F2937]">Round-trip Munich flights • $1,847 per person</p>
              </div>
            </div>
            <button className="text-[#4AA3F2] hover:underline whitespace-nowrap">
              Change
            </button>
          </div>
        </div>

        {/* All Preferences - Highlighted Card */}
        <div className="mb-8 bg-white rounded-2xl p-6 border-2 border-[#4AA3F2] shadow-md">
          
          {/* Departure Preferences Section */}
          <div className="pb-8 border-b-2 border-[#E5E7EB] mb-8">
            <h2 className="text-[#1F2937] text-xl mb-6">Departure Preferences</h2>
            
            <div className="mb-6">
              <Label className="text-[#6B7280] mb-3 block">Departure Time</Label>
              <div className="flex flex-wrap gap-2">
                <PillButton 
                  active={departureTime === 'morning'} 
                  onClick={() => setDepartureTime('morning')}
                >
                  Morning
                </PillButton>
                <PillButton 
                  active={departureTime === 'afternoon'} 
                  onClick={() => setDepartureTime('afternoon')}
                >
                  Afternoon
                </PillButton>
                <PillButton 
                  active={departureTime === 'evening'} 
                  onClick={() => setDepartureTime('evening')}
                >
                  Evening
                </PillButton>
                <PillButton 
                  active={departureTime === 'no-preference'} 
                  onClick={() => setDepartureTime('no-preference')}
                >
                  No preference
                </PillButton>
              </div>
            </div>

            <div className="mb-6">
              <Label className="text-[#6B7280] mb-3 block">Preferred Airlines</Label>
              <Select defaultValue="any">
                <SelectTrigger className="w-full bg-white border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="lufthansa">Lufthansa</SelectItem>
                  <SelectItem value="austrian">Austrian Airlines</SelectItem>
                  <SelectItem value="swiss">Swiss Air</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-[#6B7280]">Maximum Layovers</Label>
                <span className="text-[#4AA3F2]">{getLayoverText(maxLayovers[0])}</span>
              </div>
              <Slider 
                value={maxLayovers}
                onValueChange={setMaxLayovers}
                max={2}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Direct</span>
                <span>1 stop</span>
                <span>Any</span>
              </div>
            </div>
          </div>

          {/* Baggage Requirements Section */}
          <div className="pb-8 border-b-2 border-[#E5E7EB] mb-8">
            <h2 className="text-[#1F2937] text-xl mb-6">Baggage Requirements</h2>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-[#6B7280]">Checked Bags per Person</Label>
                <span className="text-[#4AA3F2]">{getCheckedBagsText(checkedBags[0])}</span>
              </div>
              <Slider 
                value={checkedBags}
                onValueChange={setCheckedBags}
                max={2}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between text-[#9CA3AF]">
                <span>None</span>
                <span>1 bag</span>
                <span>2 bags</span>
              </div>
            </div>

            <div className="mb-6">
              <Label className="text-[#6B7280] mb-3 block">Bag Size</Label>
              <div className="flex flex-wrap gap-2">
                <PillButton 
                  active={bagSize === 'standard'} 
                  onClick={() => setBagSize('standard')}
                >
                  Standard (23kg)
                </PillButton>
                <PillButton 
                  active={bagSize === 'large'} 
                  onClick={() => setBagSize('large')}
                >
                  Large (32kg)
                </PillButton>
                <PillButton 
                  active={bagSize === 'no-preference'} 
                  onClick={() => setBagSize('no-preference')}
                >
                  No preference
                </PillButton>
              </div>
            </div>

            <div className="mb-6">
              <Label className="text-[#6B7280] mb-3 block">Carry-on</Label>
              <div className="flex flex-wrap gap-2">
                <PillButton 
                  active={carryOn === 'standard'} 
                  onClick={() => setCarryOn('standard')}
                >
                  Standard included
                </PillButton>
                <PillButton 
                  active={carryOn === 'large'} 
                  onClick={() => setCarryOn('large')}
                >
                  Large carry-on needed
                </PillButton>
              </div>
            </div>

            <Alert className="bg-[#FFF5E6] border-[#FFD699]">
              <AlertCircle className="h-4 w-4 text-[#FF8C00]" />
              <AlertDescription className="text-[#6B7280]">
                7-day trip with winter clothing typically requires checked bags
              </AlertDescription>
            </Alert>
          </div>

          {/* Seat Preferences Section */}
          <div className="pb-8 border-b-2 border-[#E5E7EB] mb-8">
            <h2 className="text-[#1F2937] text-xl mb-6">Seat Preferences</h2>
            
            <div className="mb-6">
              <Label className="text-[#6B7280] mb-3 block">Seat Selection</Label>
              <Select defaultValue="any">
                <SelectTrigger className="w-full bg-white border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any available</SelectItem>
                  <SelectItem value="window">Window preferred</SelectItem>
                  <SelectItem value="aisle">Aisle preferred</SelectItem>
                  <SelectItem value="adjacent">Adjacent seats required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-[#6B7280]">Legroom Preference</Label>
                <span className="text-[#4AA3F2]">{getLegroomText(legroomLevel[0])}</span>
              </div>
              <Slider 
                value={legroomLevel}
                onValueChange={setLegroomLevel}
                max={2}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Standard</span>
                <span>Extra</span>
                <span>Premium</span>
              </div>
            </div>

            <div>
              <Label className="text-[#6B7280] mb-3 block">Special Needs</Label>
              <Select defaultValue="none">
                <SelectTrigger className="w-full bg-white border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="wheelchair">Wheelchair assistance</SelectItem>
                  <SelectItem value="dietary">Dietary requirements</SelectItem>
                  <SelectItem value="medical">Medical equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flexibility Section */}
          <div className="pb-8 border-b-2 border-[#E5E7EB] mb-8">
            <h2 className="text-[#1F2937] text-xl mb-6">Flexibility</h2>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-[#6B7280]">Date Flexibility</Label>
                <span className="text-[#4AA3F2]">{getDateFlexText(dateFlexibility[0])}</span>
              </div>
              <Slider 
                value={dateFlexibility}
                onValueChange={setDateFlexibility}
                max={3}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between text-[#9CA3AF]">
                <span>Exact</span>
                <span>±1</span>
                <span>±2</span>
                <span>±3 days</span>
              </div>
            </div>

            <div>
              <Label className="text-[#6B7280] mb-3 block">Airport Flexibility</Label>
              <div className="flex flex-wrap gap-2">
                <PillButton 
                  active={airportFlexibility === 'primary'} 
                  onClick={() => setAirportFlexibility('primary')}
                >
                  Primary only
                </PillButton>
                <PillButton 
                  active={airportFlexibility === 'nearby'} 
                  onClick={() => setAirportFlexibility('nearby')}
                >
                  Include nearby airports
                </PillButton>
              </div>
            </div>
          </div>

          {/* Budget Priority Section */}
          <div>
            <h2 className="text-[#1F2937] text-xl mb-6">Budget Priority</h2>
            
            <div className="mb-6">
              <Label className="text-[#6B7280] mb-3 block">Priority</Label>
              <div className="flex flex-wrap gap-2">
                <PillButton 
                  active={budgetPriority === 'lowest'} 
                  onClick={() => setBudgetPriority('lowest')}
                >
                  Lowest price
                </PillButton>
                <PillButton 
                  active={budgetPriority === 'best-value'} 
                  onClick={() => setBudgetPriority('best-value')}
                >
                  Best value
                </PillButton>
                <PillButton 
                  active={budgetPriority === 'convenience'} 
                  onClick={() => setBudgetPriority('convenience')}
                >
                  Convenience
                </PillButton>
                <PillButton 
                  active={budgetPriority === 'premium'} 
                  onClick={() => setBudgetPriority('premium')}
                >
                  Premium experience
                </PillButton>
              </div>
            </div>

            <div>
              <Label className="text-[#6B7280] mb-3 block">Include all fees:</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox id="baggage-fee" defaultChecked />
                  <Label htmlFor="baggage-fee" className="text-[#6B7280]">
                    Baggage
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="seat-fee" defaultChecked />
                  <Label htmlFor="seat-fee" className="text-[#6B7280]">
                    Seat selection
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="meals-fee" defaultChecked />
                  <Label htmlFor="meals-fee" className="text-[#6B7280]">
                    Meals
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Recommendations Panel */}
        <div className="bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] rounded-2xl p-5 mb-6 border border-[#90CAF9]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-[#FF8C00]" fill="#FF8C00" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#1F2937] mb-3">Based on your itinerary:</h3>
              <ul className="space-y-2">
                <li className="text-[#1F2937]">• Budget airlines may cost more with required baggage fees</li>
                <li className="text-[#1F2937]">• Winter clothing + 7 days = checked bags recommended</li>
                <li className="text-[#1F2937]">• 3 adults need guaranteed adjacent seating</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="space-y-3 mb-8">
          <Button 
            onClick={onFindFlights}
            className="w-full bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
          >
            Find Optimized Flights
          </Button>
          <Button 
            onClick={onSaveAndSkip}
            variant="outline"
            className="w-full border-[#4AA3F2] text-[#4AA3F2]"
          >
            Save Preferences & Skip
          </Button>
        </div>
      </div>

      <BottomNav activeTab="trips" />
    </div>
  );
}
