import { useState, useEffect } from 'react';
import { Zap, Coffee, Sunset, Mountain, Users, ShoppingBag, Utensils, Camera, ChevronRight } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';
import { getTripState, saveTripState } from '@/lib/tripState';

interface PaceStyleParametersScreenProps {
  destination: string;
  onContinue: (params: { pace: string; styles: string[] }) => void;
  onBack?: () => void;
}

export function PaceStyleParametersScreen({ destination, onContinue, onBack }: PaceStyleParametersScreenProps) {
  const [selectedPace, setSelectedPace] = useState<string>('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [customPaceStyle, setCustomPaceStyle] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from sessionStorage on mount
  useEffect(() => {
    const tripState = getTripState();
    
    if (tripState.pace) {
      setSelectedPace(tripState.pace);
    }
    
    if (tripState.styles && tripState.styles.length > 0) {
      setSelectedStyles(tripState.styles);
    }
    
    setIsHydrated(true);
  }, []);

  const paceOptions = [
    { id: 'relaxed', name: 'Relaxed', icon: Coffee, description: '1-2 activities per day' },
    { id: 'moderate', name: 'Moderate', icon: Sunset, description: '2-3 activities per day' },
    { id: 'packed', name: 'Packed', icon: Zap, description: '3-5 activities per day' },
  ];

  const travelStyles = [
    { id: 'adventure', name: 'Adventure', icon: Mountain },
    { id: 'cultural', name: 'Culture', icon: Users },
    { id: 'shopping', name: 'Shopping', icon: ShoppingBag },
    { id: 'foodie', name: 'Foodie', icon: Utensils },
    { id: 'photography', name: 'Photography', icon: Camera },
    { id: 'relaxation', name: 'Relaxation', icon: Coffee },
  ];

const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev => {
      const updated = prev.includes(styleId)
        ? prev.filter(id => id !== styleId)
        : [...prev, styleId];
      
      // Save to sessionStorage immediately
      if (isHydrated) {
        saveTripState({ styles: updated });
      }
      
      return updated;
    });
  };

  // Auto-save pace when selected
  useEffect(() => {
    if (!isHydrated || !selectedPace) return;
    saveTripState({ pace: selectedPace });
  }, [selectedPace, isHydrated]);

  const handleContinue = () => {
    if (selectedPace && selectedStyles.length > 0) {
      // Final save before continuing
      saveTripState({
        pace: selectedPace,
        styles: selectedStyles,
      });
      
      onContinue({ pace: selectedPace, styles: selectedStyles });
    }
  };

  const isFormValid = selectedPace && selectedStyles.length > 0;

  return (
    <div className="min-h-[100dvh] pb-24 flex flex-col overflow-y-auto">
      <StepHeader
        title="Travel Pace & Style"
        currentStep={4}
        totalSteps={10}
        onBack={onBack}
      />
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-4 pt-[110px] pb-[15px] bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none">
        {/* Page Title */}
        <div className="text-center mb-14">
          <h1 className="text-lg md:text-xl font-medium text-gray-900">
            How do you like to travel?
          </h1>
        </div>

        {/* Pace Selection */}
        <div className="mb-5">
          <h3 className="text-gray-900 mb-3">Select Your Pace</h3>
          <div className="space-y-2">
            {paceOptions.map((pace) => {
              const Icon = pace.icon;
              return (
                <button
                  key={pace.id}
                  onClick={() => setSelectedPace(pace.id)}
                  className={`w-full p-3 rounded-2xl border-2 transition-all text-left ${
                    selectedPace === pace.id
                      ? 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-[#FE4C40]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedPace === pace.id
                        ? 'bg-[#FE4C40] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-gray-900 inline">{pace.name} </h4>
                      <span className="text-sm text-gray-600">{pace.description}</span>
                    </div>
                    {selectedPace === pace.id && (
                      <div className="w-6 h-6 rounded-full bg-[#FE4C40] text-white flex items-center justify-center text-sm flex-shrink-0">
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>


        </div>

        {/* Travel Style Selection */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-gray-900">Travel Interests</h3>
            <p className="text-sm text-gray-600">Select all that apply</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {travelStyles.map((style) => {
              const Icon = style.icon;
              const isSelected = selectedStyles.includes(style.id);
              return (
                <button
                  key={style.id}
                  onClick={() => toggleStyle(style.id)}
                  className={`p-2.5 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-[#FE4C40]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#FE4C40] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                      {style.name}
                    </span>
                  </div>
                </button>
              );
            })}
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