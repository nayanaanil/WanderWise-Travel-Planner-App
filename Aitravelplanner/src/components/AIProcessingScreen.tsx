import { useEffect, useState } from 'react';
import { Sparkles, MapPin, Calendar, Users, Heart, ChevronLeft } from 'lucide-react';

interface AIProcessingScreenProps {
  destination: string;
  onComplete: () => void;
  onBack?: () => void;
}

export function AIProcessingScreen({ destination, onComplete, onBack }: AIProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: MapPin, text: 'Analyzing destination data...', color: 'from-black to-gray-900' },
    { icon: Calendar, text: 'Optimizing your schedule...', color: 'from-[#FE4C40] to-[#FE4C40]' },
    { icon: Users, text: 'Personalizing recommendations...', color: 'from-black to-gray-900' },
    { icon: Heart, text: 'Crafting your perfect itinerary...', color: 'from-[#FE4C40] to-[#FE4C40]' },
  ];

  useEffect(() => {
    const stepDuration = 1500; // 1.5 seconds per step
    
    const intervals = steps.map((_, index) => {
      return setTimeout(() => {
        setCurrentStep(index);
      }, index * stepDuration);
    });

    // Navigate to next screen after all steps complete
    const finalTimeout = setTimeout(() => {
      onComplete();
    }, steps.length * stepDuration + 500);

    return () => {
      intervals.forEach(clearTimeout);
      clearTimeout(finalTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen pt-16 pb-20 bg-gradient-to-br from-[#FFF5F4]/30 via-white to-[#FFF5F4]/20 flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 py-8 text-center">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-20 left-6 flex items-center gap-2 text-gray-600 hover:text-[#FE4C40] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

        {/* Animated Logo/Icon */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-black to-[#FE4C40] rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-[#FE4C40] animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Destination Badge */}
        <div className="inline-block px-6 py-3 bg-white rounded-full shadow-lg mb-6">
          <p className="text-[#FE4C40]">✈️ {destination}</p>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl text-gray-900 mb-3">
          Creating Your Itinerary
        </h1>
        <p className="text-gray-600 mb-12">
          Our AI is crafting a personalized travel plan just for you
        </p>

        {/* Progress Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                  isActive
                    ? 'bg-white shadow-lg scale-105'
                    : isCompleted
                    ? 'bg-white shadow-md'
                    : 'bg-white/50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    isCompleted
                      ? 'bg-black text-white'
                      : isActive
                      ? `bg-gradient-to-br ${step.color} text-white animate-pulse`
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <span className="text-xl">✓</span>
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className={`${
                    isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.text}
                  </p>
                </div>
                {isActive && (
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#FE4C40] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#FE4C40] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-[#FE4C40] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-black to-[#FE4C40] transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Fun Fact */}
        <div className="mt-8 p-6 bg-white rounded-2xl shadow-md">
          <p className="text-sm text-gray-600">
            <span className="text-[#FE4C40]">✨ Did you know?</span> Our AI considers over 100 factors including weather, 
            local events, and travel distances to create your perfect itinerary!
          </p>
        </div>
      </div>
    </div>
  );
}
