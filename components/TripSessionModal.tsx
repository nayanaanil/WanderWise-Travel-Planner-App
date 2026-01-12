"use client";

import { X } from 'lucide-react';

interface TripSessionModalProps {
  onContinueTrip: () => void;
  onNewTrip: () => void;
  tripDestination?: string;
}

export function TripSessionModal({ onContinueTrip, onNewTrip, tripDestination }: TripSessionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-600 mb-6">
          You have an active trip in progress{tripDestination ? ` to ${tripDestination}` : ''}. What would you like to do?
        </p>

        {/* Options */}
        <div className="space-y-3">
          <button
            onClick={onContinueTrip}
            className="w-full py-4 px-6 bg-[#FE4C40] text-white rounded-xl font-semibold hover:bg-[#E63C30] transition-all shadow-md hover:shadow-lg"
          >
            Continue Planning
          </button>
          
          <button
            onClick={onNewTrip}
            className="w-full py-4 px-6 bg-white text-gray-900 rounded-xl font-semibold border-2 border-gray-200 hover:border-[#FE4C40] hover:text-[#FE4C40] transition-all"
          >
            Start New Trip
          </button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Starting a new trip will save your current progress
        </p>
      </div>
    </div>
  );
}

