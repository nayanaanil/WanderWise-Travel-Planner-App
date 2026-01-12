import { useState } from 'react';
import { Calendar, Users, Baby, IndianRupee, ChevronRight, ChevronLeft } from 'lucide-react';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';
import { format } from 'date-fns';

interface DurationParametersScreenProps {
  destination: string;
  onContinue: (params: {
    dateRange: { from: Date; to: Date };
    adults: number;
    kids: number;
    budget: string;
  }) => void;
  onBack?: () => void;
}

export function DurationParametersScreen({ destination, onContinue, onBack }: DurationParametersScreenProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [budget, setBudget] = useState('');
  const [budgetValue, setBudgetValue] = useState<number[]>([50000]);
  const [budgetType, setBudgetType] = useState('');

  // Calculate realistic minimum budget based on destination and trip duration
  const getMinimumBudget = () => {
    const tripDuration = dateRange.from && dateRange.to 
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      : 3;
    
    const totalTravelers = adults + kids;
    
    // Budget per person per day based on destination type
    const budgetByDestination: { [key: string]: number } = {
      // International - Premium
      'Paris': 12000,
      'Tokyo': 10000,
      'New York': 15000,
      'London': 13000,
      'Dubai': 11000,
      'Singapore': 9000,
      'Maldives': 18000,
      'Bali': 7000,
      'Switzerland': 16000,
      
      // Domestic - India
      'Goa': 3500,
      'Kerala': 3000,
      'Rajasthan': 3200,
      'Jaipur': 3000,
      'Udaipur': 3500,
      'Kashmir': 4500,
      'Manali': 3800,
      'Shimla': 3500,
      'Rishikesh': 2800,
      'Leh Ladakh': 5000,
      'Andaman': 5500,
      'Mumbai': 4000,
      'Bangalore': 3500,
      'Delhi': 3500,
    };
    
    // Default budget per person per day
    const defaultBudgetPerDay = 4000;
    const budgetPerPersonPerDay = budgetByDestination[destination] || defaultBudgetPerDay;
    
    // Minimum budget calculation
    const minBudget = budgetPerPersonPerDay * totalTravelers * tripDuration;
    
    return Math.ceil(minBudget / 5000) * 5000; // Round to nearest 5000
  };

  const getMaximumBudget = () => {
    const minBudget = getMinimumBudget();
    return minBudget * 5; // Max is 5x the minimum
  };

  const minimumBudget = getMinimumBudget();
  const maximumBudget = getMaximumBudget();

  const handleContinue = () => {
    if (dateRange.from && dateRange.to && adults > 0 && budget && parseInt(budget) >= minimumBudget) {
      onContinue({
        dateRange: { from: dateRange.from, to: dateRange.to },
        adults,
        kids,
        budget,
      });
    }
  };

  const isFormValid = dateRange.from && dateRange.to && adults > 0 && budget && parseInt(budget) >= minimumBudget;
  const tripDuration = dateRange.from && dateRange.to 
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

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
          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-md" style={{ fontSize: '16px', fontWeight: 600 }}>✓</div>
          <div className="w-16 h-1 bg-black rounded-full"></div>
          <div className="w-10 h-10 rounded-full bg-[#FE4C40] text-white flex items-center justify-center shadow-md" style={{ fontSize: '16px', fontWeight: 600 }}>2</div>
          <div className="w-16 h-1 bg-gray-200 rounded-full"></div>
          <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center" style={{ fontSize: '16px', fontWeight: 600 }}>3</div>
        </div>

        {/* Header - Premium */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full mb-4" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
            <span className="text-xl">✈️</span>
            <p className="text-[#FE4C40]" style={{ fontSize: '14px', fontWeight: 600 }}>{destination}</p>
          </div>
          <h1 className="text-gray-900 mb-3" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Trip Duration & Details
          </h1>
          <p className="text-gray-600" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            When and how many travelers?
          </p>
        </div>

        {/* Form Container */}
        <div className="space-y-4">
          {/* Date Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#FE4C40]" />
              </div>
              <h3 className="text-gray-900">Travel Dates</h3>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-4 bg-gradient-to-r from-[#FFF5F4] to-white border-2 border-gray-200 rounded-xl text-left hover:border-[#FE4C40] transition-colors">
                  {dateRange.from && dateRange.to ? (
                    <div>
                      <span className="text-gray-900">
                        {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">{tripDuration} days</p>
                    </div>
                  ) : (
                    <span className="text-gray-500">Select your travel dates</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={1}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Travelers */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FE4C40]" />
              </div>
              <h3 className="text-gray-900">Travelers</h3>
            </div>
            
            {/* Adults Counter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-gray-900">Adults</p>
                  <p className="text-sm text-gray-500">Age 13+</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-[#FE4C40] text-gray-700 flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center text-gray-900">{adults}</span>
                <button
                  onClick={() => setAdults(adults + 1)}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-[#FE4C40] text-gray-700 flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Kids Counter */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-gray-900">Kids</p>
                  <p className="text-sm text-gray-500">Age 0-12</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setKids(Math.max(0, kids - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-[#FE4C40] text-gray-700 flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center text-gray-900">{kids}</span>
                <button
                  onClick={() => setKids(kids + 1)}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-[#FE4C40] text-gray-700 flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Budget Slider */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-[#FE4C40]" />
              </div>
              <h3 className="text-gray-900">Budget Type</h3>
            </div>
            
            {/* Quick Budget Presets */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const budgetPreset = minimumBudget;
                  setBudgetValue([budgetPreset]);
                  setBudget(budgetPreset.toString());
                  setBudgetType('Budget');
                }}
                className={`py-2.5 px-3 bg-gradient-to-r from-[#FFF5F4] to-white border-2 rounded-xl text-sm transition-all ${
                  budgetValue[0] === minimumBudget
                    ? 'border-[#FE4C40] text-[#FE4C40]'
                    : 'border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40]'
                }`}
              >
                Budget
              </button>
              <button
                onClick={() => {
                  const budgetPreset = Math.floor(minimumBudget + (maximumBudget - minimumBudget) * 0.3);
                  setBudgetValue([budgetPreset]);
                  setBudget(budgetPreset.toString());
                  setBudgetType('Moderate');
                }}
                className={`py-2.5 px-3 bg-gradient-to-r from-[#FFF5F4] to-white border-2 rounded-xl text-sm transition-all ${
                  budgetValue[0] === Math.floor(minimumBudget + (maximumBudget - minimumBudget) * 0.3)
                    ? 'border-[#FE4C40] text-[#FE4C40]'
                    : 'border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40]'
                }`}
              >
                Moderate
              </button>
              <button
                onClick={() => {
                  const budgetPreset = Math.floor(minimumBudget + (maximumBudget - minimumBudget) * 0.6);
                  setBudgetValue([budgetPreset]);
                  setBudget(budgetPreset.toString());
                  setBudgetType('Premium');
                }}
                className={`py-2.5 px-3 bg-gradient-to-r from-[#FFF5F4] to-white border-2 rounded-xl text-sm transition-all ${
                  budgetValue[0] === Math.floor(minimumBudget + (maximumBudget - minimumBudget) * 0.6)
                    ? 'border-[#FE4C40] text-[#FE4C40]'
                    : 'border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40]'
                }`}
              >
                Premium
              </button>
              <button
                onClick={() => {
                  const budgetPreset = maximumBudget;
                  setBudgetValue([budgetPreset]);
                  setBudget(budgetPreset.toString());
                  setBudgetType('Luxury');
                }}
                className={`py-2.5 px-3 bg-gradient-to-r from-[#FFF5F4] to-white border-2 rounded-xl text-sm transition-all ${
                  budgetValue[0] === maximumBudget
                    ? 'border-[#FE4C40] text-[#FE4C40]'
                    : 'border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40]'
                }`}
              >
                Luxury
              </button>
            </div>
          </div>

          {/* Summary Card */}
          {dateRange.from && dateRange.to && (
            <div className="bg-gradient-to-br from-[#FE4C40] to-[#E63C30] rounded-2xl p-6 text-white shadow-lg">
              <h3 className="text-lg mb-3">Trip Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/80">Duration:</span>
                  <span>{tripDuration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Travelers:</span>
                  <span>
                    {adults} {adults === 1 ? 'adult' : 'adults'}
                    {kids > 0 && `, ${kids} ${kids === 1 ? 'kid' : 'kids'}`}
                  </span>
                </div>
                {budget && (
                  <div className="flex justify-between">
                    <span className="text-white/80">Budget Type:</span>
                    <span>{budgetType}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!isFormValid}
            className={`w-full py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
              isFormValid
                ? 'bg-black text-white hover:bg-gray-900 shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}