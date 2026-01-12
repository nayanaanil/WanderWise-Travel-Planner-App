import { useState } from 'react';
import { Zap, Coffee, Sunset, Mountain, Users, ShoppingBag, Utensils, Camera, ChevronRight, ChevronLeft } from 'lucide-react';

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

  const paceOptions = [
    { id: 'relaxed', name: 'Relaxed', icon: Coffee, description: '2-3 activities per day, plenty of rest time' },
    { id: 'moderate', name: 'Moderate', icon: Sunset, description: '4-5 activities per day, balanced schedule' },
    { id: 'packed', name: 'Packed', icon: Zap, description: '6+ activities per day, maximize your trip' },
  ];

  const travelStyles = [
    { id: 'adventure', name: 'Adventure', icon: Mountain },
    { id: 'cultural', name: 'Cultural', icon: Users },
    { id: 'shopping', name: 'Shopping', icon: ShoppingBag },
    { id: 'foodie', name: 'Foodie', icon: Utensils },
    { id: 'photography', name: 'Photography', icon: Camera },
    { id: 'relaxation', name: 'Relaxation', icon: Coffee },
  ];

  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev =>
      prev.includes(styleId)
        ? prev.filter(id => id !== styleId)
        : [...prev, styleId]
    );
  };

  const handleContinue = () => {
    if (selectedPace && selectedStyles.length > 0) {
      onContinue({ pace: selectedPace, styles: selectedStyles });
    }
  };

  const isFormValid = selectedPace && selectedStyles.length > 0;

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
            Travel Pace & Style
          </h1>
          <p className="text-gray-600" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            How would you like to experience your trip?
          </p>
        </div>

        {/* Pace Selection */}
        <div className="mb-8">
          <h3 className="text-gray-900 mb-4">Select Your Pace</h3>
          <div className="space-y-3">
            {paceOptions.map((pace) => {
              const Icon = pace.icon;
              return (
                <button
                  key={pace.id}
                  onClick={() => setSelectedPace(pace.id)}
                  className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                    selectedPace === pace.id
                      ? 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-[#FE4C40]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedPace === pace.id
                        ? 'bg-[#FE4C40] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-gray-900 mb-1">{pace.name}</h4>
                      <p className="text-sm text-gray-600">{pace.description}</p>
                    </div>
                    {selectedPace === pace.id && (
                      <div className="w-6 h-6 rounded-full bg-[#FE4C40] text-white flex items-center justify-center text-sm">
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
        <div className="mb-8">
          <h3 className="text-gray-900 mb-2">Travel Interests</h3>
          <p className="text-sm text-gray-600 mb-4">Select all that apply</p>
          <div className="grid grid-cols-2 gap-3">
            {travelStyles.map((style) => {
              const Icon = style.icon;
              const isSelected = selectedStyles.includes(style.id);
              return (
                <button
                  key={style.id}
                  onClick={() => toggleStyle(style.id)}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#FE4C40] bg-gradient-to-br from-[#FFF5F4] to-white shadow-md'
                      : 'border-gray-200 bg-white hover:border-[#FE4C40]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#FE4C40] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-sm ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                      {style.name}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#FE4C40] text-white flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Interest Input */}
          <div className="mt-4">
            <input
              type="text"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              placeholder="Or type your own travel interests..."
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-[#FE4C40] focus:outline-none transition-colors text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Selected Summary */}
        {selectedPace && selectedStyles.length > 0 && (
          <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-6 text-white shadow-lg mb-6">
            <h3 className="text-lg mb-3">Your Preferences</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-white/80">Pace:</span>
                <span className="capitalize">{selectedPace}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-white/80">Interests:</span>
                <span className="flex-1">
                  {selectedStyles.map((id) => 
                    travelStyles.find(s => s.id === id)?.name
                  ).join(', ')}
                </span>
              </div>
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
  );
}