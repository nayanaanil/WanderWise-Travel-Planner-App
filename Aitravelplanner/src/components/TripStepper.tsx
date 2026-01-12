import { Check } from 'lucide-react';

type Step = {
  id: number;
  label: string;
  screen: string;
};

interface TripStepperProps {
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
  completedSteps: number[];
}

export function TripStepper({ currentStep, onStepClick, completedSteps }: TripStepperProps) {
  const steps: Step[] = [
    { id: 1, label: 'Destination', screen: 'destination-selection' },
    { id: 2, label: 'Duration', screen: 'duration-parameters' },
    { id: 3, label: 'Pace & Style', screen: 'pace-style-parameters' },
    { id: 4, label: 'Must-See', screen: 'must-see-items' },
  ];

  return (
    <div className="px-6 py-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => {
                // Only allow clicking on current step, completed steps, or the next step after current
                if (completedSteps.includes(step.id) || step.id === currentStep) {
                  onStepClick(step.id);
                }
              }}
              disabled={!completedSteps.includes(step.id) && step.id !== currentStep}
              className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                completedSteps.includes(step.id)
                  ? 'bg-[#FE4C40] text-white cursor-pointer hover:scale-110'
                  : step.id === currentStep
                  ? 'bg-[#FE4C40] text-white ring-4 ring-[#FE4C40]/20'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {completedSteps.includes(step.id) ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs">{step.id}</span>
              )}
            </button>
            
            {/* Step Label */}
            <div className="ml-2 hidden sm:block">
              <p className={`text-xs transition-colors ${
                step.id === currentStep
                  ? 'text-[#FE4C40]'
                  : completedSteps.includes(step.id)
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}>
                {step.label}
              </p>
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2">
                <div className={`h-full transition-colors ${
                  completedSteps.includes(step.id)
                    ? 'bg-[#FE4C40]'
                    : 'bg-gray-200'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Mobile: Show current step label */}
      <div className="sm:hidden text-center mt-2">
        <p className="text-sm text-[#FE4C40]">
          Step {currentStep}: {steps.find(s => s.id === currentStep)?.label}
        </p>
      </div>
    </div>
  );
}
