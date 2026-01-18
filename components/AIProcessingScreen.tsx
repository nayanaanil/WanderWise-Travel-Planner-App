import { useEffect, useState } from 'react';
import { Sparkles, MapPin, Calendar, Users, Heart, AlertCircle, RefreshCw } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';

interface AIProcessingScreenProps {
  destination: string;
  onComplete: () => void;
  onBack?: () => void;
  isGenerating?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function AIProcessingScreen({ 
  destination, 
  onComplete, 
  onBack,
  isGenerating = false,
  error = null,
  onRetry
}: AIProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: MapPin, text: 'Analyzing destination data...', color: 'from-black to-gray-900' },
    { icon: Calendar, text: 'Optimizing your schedule...', color: 'from-[#FE4C40] to-[#FE4C40]' },
    { icon: Users, text: 'Personalizing recommendations...', color: 'from-black to-gray-900' },
    { icon: Heart, text: 'Crafting your perfect itinerary...', color: 'from-[#FE4C40] to-[#FE4C40]' },
  ];

  useEffect(() => {
    // Only auto-advance steps if generating and no error
    if (!isGenerating || error) {
      return;
    }

    // Reset to first step when animation starts
    setCurrentStep(0);

    // Ensure animation runs for at least 10 seconds
    // Distribute steps evenly across 10 seconds
    const minTotalDuration = 10000; // 10 seconds
    const stepDuration = minTotalDuration / steps.length; // ~2.5 seconds per step
    
    const intervals = steps.map((_, index) => {
      return setTimeout(() => {
        setCurrentStep(index);
      }, index * stepDuration);
    });

    // Call onComplete after animation completes (but parent handles navigation timing)
    const finalTimeout = setTimeout(() => {
      if (!error && isGenerating) {
        onComplete();
      }
    }, minTotalDuration);

    return () => {
      intervals.forEach(clearTimeout);
      clearTimeout(finalTimeout);
    };
  }, [isGenerating, error, onComplete]);

  // Show error state
  if (error) {
    return (
      <div className="min-h-[100dvh] pb-0 flex flex-col overflow-y-auto">
        <StepHeader
          title="Creating Your Itinerary"
          currentStep={6}
          totalSteps={10}
          onBack={onBack}
        />
        <div className="flex-1 max-w-md mx-auto w-full px-6 pt-[108px] pb-[95px] bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none flex items-center justify-center">
          <div className="w-full text-center py-6">
            {/* Error Icon */}
            <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>

            {/* Error Message */}
            <h1 className="text-2xl text-gray-900 mb-3 font-semibold">
              Unable to Generate Itinerary
            </h1>
            <p className="text-gray-600 mb-8">
              {error}
            </p>

            {/* Retry Button */}
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full py-4 bg-[#FE4C40] text-white rounded-xl font-semibold hover:bg-[#E63C30] transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-0 flex flex-col overflow-y-auto">
      <StepHeader
        title="Creating Your Itinerary"
        currentStep={5}
        totalSteps={10}
        onBack={onBack}
      />
      <div className="flex-1 max-w-md mx-auto w-full px-6 pt-[108px] pb-[95px] bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 rounded-t-2xl rounded-b-none flex items-center justify-center">
        <div className="w-full text-center py-6">

        {/* Animated Logo/Icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-black to-[#FE4C40] rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-[#FE4C40] animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-gray-600 mb-6 text-sm">
          Our AI is crafting a personalized travel plan just for you
        </p>

        {/* Progress Steps */}
        <div className="space-y-3 mb-6">
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
        <div className="mt-6 p-4 bg-white rounded-xl shadow-md">
          <p className="text-xs text-gray-600">
            <span className="text-[#FE4C40]">✨ Did you know?</span> Our AI considers over 100 factors including weather, 
            local events, and travel distances to create your perfect itinerary!
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

