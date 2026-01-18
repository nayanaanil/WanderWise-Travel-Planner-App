import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Baby, IndianRupee, ChevronRight } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Slider } from '@/ui/slider';
import { format } from 'date-fns';
import { StepHeader } from '@/components/StepHeader';
import { getTripState, saveTripState } from '@/lib/tripState';
import { routes } from '@/lib/navigation';

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
  const router = useRouter();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [budget, setBudget] = useState('');
  const [budgetValue, setBudgetValue] = useState<number[]>([50000]);
  const [budgetType, setBudgetType] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [defaultMonth, setDefaultMonth] = useState<Date | undefined>(undefined);

  // Convert month abbreviation to Date object for current/next year
  const getMonthDate = (monthAbbr: string): Date => {
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
    };
    const monthIndex = monthMap[monthAbbr] ?? 0;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // If preferred month is in the past for this year, use next year
    const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
    
    return new Date(year, monthIndex, 1);
  };

  // Load state from sessionStorage on mount
  useEffect(() => {
    const tripState = getTripState();
    
    // Set default month from preferredMonth if it exists
    if (tripState.preferredMonth) {
      const monthDate = getMonthDate(tripState.preferredMonth);
      setDefaultMonth(monthDate);
    }
    
    if (tripState.dateRange?.from && tripState.dateRange?.to) {
      setDateRange({
        from: tripState.dateRange.from instanceof Date ? tripState.dateRange.from : new Date(tripState.dateRange.from),
        to: tripState.dateRange.to instanceof Date ? tripState.dateRange.to : new Date(tripState.dateRange.to),
      });
    }
    
    if (tripState.adults !== undefined) {
      setAdults(tripState.adults);
    }
    
    if (tripState.kids !== undefined) {
      setKids(tripState.kids);
    }
    
    if (tripState.budget) {
      setBudget(tripState.budget);
      setBudgetValue([parseInt(tripState.budget)]);
    }
    
    if (tripState.budgetType) {
      setBudgetType(tripState.budgetType);
    }
    
    setIsHydrated(true);
  }, []);

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

  // Auto-save to sessionStorage when values change (optional - handleContinue will always save)
  // Keep this for UX (auto-save as user types), but handleContinue is the source of truth
  useEffect(() => {
    if (!isHydrated) return;
    
    // Only auto-save if both dates are present (partial selections shouldn't overwrite)
    if (dateRange.from && dateRange.to) {
      saveTripState({
        dateRange: { from: dateRange.from, to: dateRange.to },
        adults,
        kids,
        budget: budget || undefined,
        budgetType: budgetType || undefined,
      });
    }
  }, [dateRange, adults, kids, budget, budgetType, isHydrated]);

  const handleContinue = async () => {
    // Validate form
    if (!dateRange?.from || !dateRange?.to) {
      console.error(">>> ERROR: Date range missing on continue:", dateRange);
      return;
    }

    if (adults <= 0 || !budget || parseInt(budget) < minimumBudget) {
      return; // Form validation failed
    }

    // CRITICAL: Always get current tripState and merge with new values
    const tripState = getTripState();
    
    // CRITICAL: Always save dateRange before navigation
    // This ensures dateRange is never undefined on the processing page
    // saveTripState is synchronous, so it completes immediately
    saveTripState({
      ...tripState,
      dateRange: { from: dateRange.from, to: dateRange.to },
      adults,
      kids,
      budget,
      budgetType,
    });

    // Verify save completed (saveTripState is synchronous, but we verify to be safe)
    const verifyState = getTripState();
    if (!verifyState.dateRange?.from || !verifyState.dateRange?.to) {
      console.error(">>> ERROR: Failed to save dateRange, retrying...");
      // Retry save
      saveTripState({
        dateRange: { from: dateRange.from, to: dateRange.to },
        adults,
        kids,
        budget,
        budgetType,
      });
    }

    // Navigate after save is confirmed
    // Use router.push directly instead of relying on onContinue callback
    router.push(routes.plan.locations);
    
    // Also call onContinue for backward compatibility (parent page may need it)
    if (onContinue) {
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
    <div className="min-h-[100dvh] pb-0 flex flex-col overflow-y-auto">
      <StepHeader
        title="Trip Duration & Details"
        currentStep={3}
        totalSteps={10}
        onBack={onBack}
      />
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-4 pt-[120px] pb-[15px] bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none">
        {/* Page Title */}
        <div className="text-center mb-14">
          <h1 className="text-lg md:text-xl font-medium text-gray-900">
            Select your travel dates
          </h1>
        </div>

        {/* Form Container */}
        <div className="space-y-3">
          {/* Date Selection */}
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#FE4C40]" />
              </div>
              <h3 className="text-gray-900">Travel Dates</h3>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#FFF5F4] to-white border-2 border-gray-200 rounded-xl text-left hover:border-[#FE4C40] transition-colors"
                >
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
              <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0 z-50" align="start" sideOffset={4}>
                <CalendarComponent
                  mode="range"
                  // Pass dateRange correctly as selected prop
                  // DayPicker expects { from: Date | undefined, to: Date | undefined }
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  // Set default month to preferredMonth if it exists
                  defaultMonth={defaultMonth}
                  // Custom range selection logic:
                  // 1st click → set start date (from), to = undefined
                  // 2nd click → set end date (to)
                  // 3rd click → reset and start new range (from = new date, to = undefined)
                  onSelect={(range) => {
                    if (!range || !range.from) {
                      // DayPicker returned undefined or no from date - clear selection
                      setDateRange({ from: undefined, to: undefined });
                      return;
                    }

                    // Check if we have a complete range (both from and to)
                    const hasCompleteRange = dateRange.from && dateRange.to;

                    // Custom logic: if both from and to exist, third click starts a new range
                    if (hasCompleteRange) {
                      // Both dates already selected - third click resets and starts new range
                      // Ignore the to date from DayPicker, only use the new from date
                      setDateRange({ from: range.from, to: undefined });
                      return;
                    }

                    // Default behavior: update range as DayPicker provides it
                    // This handles: 1st click (from only) and 2nd click (from + to)
                    setDateRange({
                      from: range.from,
                      to: range.to,
                    });
                  }}
                  // Stack two months vertically to fit in viewport
                  numberOfMonths={2}
                  classNames={{
                    months: "flex flex-col gap-4",
                  }}
                  // Disable past dates
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Travelers */}
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFF5F4] to-[#FFE5E2] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FE4C40]" />
              </div>
              <h3 className="text-gray-900">Travelers</h3>
            </div>
            
            {/* Adults Counter */}
            <div className="flex items-center justify-between mb-3">
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
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
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
        </div>

        {/* Continue Button */}
        <div className="mt-10">
          <button
            onClick={handleContinue}
            disabled={!isFormValid}
            className={`w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md ${
              isFormValid
                ? 'bg-[#FE4C40] text-white hover:bg-[#E63C30] hover:shadow-lg'
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