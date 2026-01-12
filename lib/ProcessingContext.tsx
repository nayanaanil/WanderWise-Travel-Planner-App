"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingContextType {
  isProcessing: boolean;
  processingMessage: string | null;
  startProcessing: (message?: string) => void;
  stopProcessing: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const startProcessing = (message?: string) => {
    setIsProcessing(true);
    setProcessingMessage(message || null);
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    setProcessingMessage(null);
  };

  return (
    <ProcessingContext.Provider value={{ isProcessing, processingMessage, startProcessing, stopProcessing }}>
      {children}
      
      {/* Global Processing Indicator */}
      {isProcessing && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Subtle backdrop overlay */}
          <div className="absolute inset-0 bg-black/5" />
          
          {/* Centered processing indicator */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 min-w-[200px]">
              <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {processingMessage || 'Processing...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (context === undefined) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
}


