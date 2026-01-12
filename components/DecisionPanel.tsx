"use client";

import React from 'react';
import { DecisionOption } from '@/lib/decisions/types';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type DecisionPanelProps = {
  summary: string;
  options: DecisionOption[];
  optionSummaries?: Record<string, string>;
  onSelectOption: (option: DecisionOption) => void;
  status?: 'OK' | 'WARNING' | 'BLOCKED';
  risks?: string[];
};

export function DecisionPanel({
  summary,
  options,
  optionSummaries = {},
  onSelectOption,
  status = 'OK',
  risks,
}: DecisionPanelProps) {
  // PART 4: Limit to 2-3 distinct options to reduce cognitive overload
  const filterOptions = (opts: DecisionOption[]): DecisionOption[] => {
    if (opts.length <= 3) return opts;
    
    // Priority grouping:
    // 1. Recommended/primary action (first option or explicitly recommended)
    // 2. Best alternative
    // 3. Cancel/fallback
    
    const result: DecisionOption[] = [];
    
    // Always include first option (usually the recommendation)
    result.push(opts[0]);
    
    // Find best alternative that's semantically different
    const alternativeIndex = opts.findIndex((opt, idx) => 
      idx > 0 && 
      opt.action.type !== opts[0].action.type &&
      !opt.label.toLowerCase().includes('cancel')
    );
    if (alternativeIndex !== -1) {
      result.push(opts[alternativeIndex]);
    }
    
    // Always include cancel/fallback option if present
    const cancelIndex = opts.findIndex(opt => 
      opt.label.toLowerCase().includes('cancel') ||
      opt.action.type === 'CANCEL'
    );
    if (cancelIndex !== -1 && result.length < 3) {
      result.push(opts[cancelIndex]);
    } else if (result.length < 3 && opts.length > 1) {
      // If no cancel, add the second option
      result.push(opts[1]);
    }
    
    return result;
  };
  
  const filteredOptions = filterOptions(options);
  
  const getStatusIcon = () => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'BLOCKED':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case 'OK':
        return 'bg-green-50 border-green-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'BLOCKED':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`w-full border-2 rounded-xl p-4 ${getStatusBgColor()}`}>
      {/* Summary Section */}
      <div className="flex items-start gap-3 mb-4">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm text-gray-900 leading-relaxed">{summary}</p>
          {risks && risks.length > 0 && (
            <div className="mt-2 space-y-1">
              {risks.map((risk, index) => (
                <div key={index} className="text-xs text-gray-700">
                  • {risk}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Options Section */}
      {filteredOptions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 mb-2">Options:</div>
          {filteredOptions.map((option) => {
            const explanation = optionSummaries[option.id] || option.description;
            return (
              <button
                key={option.id}
                onClick={() => onSelectOption(option)}
                className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-sm text-gray-900 mb-1">
                  {option.label}
                </div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  {explanation}
                </div>
                {option.tradeoffs && option.tradeoffs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Note: {option.tradeoffs.join(', ')}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

