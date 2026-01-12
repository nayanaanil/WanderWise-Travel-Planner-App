"use client";

import { ArrowLeft } from 'lucide-react';

interface StepHeaderProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  rightAction?: {
    label: string;
    onClick: () => void;
  };
}

export function StepHeader({ 
  title, 
  currentStep, 
  totalSteps, 
  onBack,
  rightAction 
}: StepHeaderProps) {
  return (
    <header className="fixed top-3 left-1/2 -translate-x-1/2 w-full max-w-md bg-gradient-to-br from-orange-50 via-pink-50 to-orange-50 border-b border-orange-100/50 z-40">
      <div className="flex items-center justify-between px-6 py-[12.8px]">
        {onBack ? (
          <button 
            onClick={onBack}
            className="p-1 hover:bg-[#E5E7EB] rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#1F2937]" />
          </button>
        ) : (
          <div className="w-6" />
        )}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              
              return (
                <div
                  key={stepNumber}
                  className={`transition-all duration-200 border border-gray-400 ${
                    isCurrent
                      ? 'w-4 h-4 bg-[#FE4C40] rounded-full'
                      : isCompleted
                      ? 'w-3 h-3 bg-[#fd9d96] rounded-full opacity-80'
                      : 'w-3 h-3 bg-[#E5E7EB] rounded-full'
                  }`}
                />
              );
            })}
          </div>
        </div>
        {rightAction ? (
          <button 
            onClick={rightAction.onClick}
            className="px-3 py-1.5 text-[#4AA3F2] hover:bg-[#EFF6FF] rounded-lg transition-colors"
          >
            {rightAction.label}
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>
    </header>
  );
}







