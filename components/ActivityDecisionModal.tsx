"use client";

import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { DecisionResult, DecisionOption } from '@/lib/decisions/types';

interface ActivityDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: DecisionOption) => void;
  decision: DecisionResult | null;
  explanation: { summary: string; optionSummaries: Record<string, string> } | null;
  activityName?: string;
  isApplying?: boolean;
}

export function ActivityDecisionModal({
  isOpen,
  onClose,
  onSelectOption,
  decision,
  explanation,
  activityName,
  isApplying = false,
}: ActivityDecisionModalProps) {
  if (!isOpen || !decision || !explanation) return null;

  /**
   * Filter options to reduce decision fatigue
   * MAX 3 options shown, prioritized by semantic value
   */
  const filterOptions = (options: DecisionOption[]): DecisionOption[] => {
    if (options.length <= 3) return options;

    const filtered: DecisionOption[] = [];
    
    // Priority 1: Find the recommended option (first non-cancel option or one with "recommended" in label)
    const recommendedOption = options.find(
      opt => opt.action.type !== 'CANCEL' && 
             (opt.label.toLowerCase().includes('recommended') || 
              opt.description.toLowerCase().includes('recommended'))
    ) || options.find(opt => opt.action.type !== 'CANCEL');
    
    if (recommendedOption) {
      filtered.push(recommendedOption);
    }

    // Priority 2: Find best alternative (semantically different from recommended)
    const alternativeOption = options.find(opt => {
      if (opt.action.type === 'CANCEL') return false;
      if (filtered.some(f => f.id === opt.id)) return false;
      
      // Look for different action types or clear semantic differences
      if (recommendedOption) {
        const isDifferentAction = opt.action.type !== recommendedOption.action.type;
        const isReplace = opt.action.type === 'REPLACE_ACTIVITY';
        const isMove = opt.action.type === 'MOVE_AND_ADD';
        const isDifferentSlot = opt.action.payload?.timeSlot !== recommendedOption.action.payload?.timeSlot;
        
        return isDifferentAction || isReplace || isMove || isDifferentSlot;
      }
      
      return true;
    });
    
    if (alternativeOption) {
      filtered.push(alternativeOption);
    }

    // Priority 3: Always include Cancel option if it exists
    const cancelOption = options.find(opt => opt.action.type === 'CANCEL');
    if (cancelOption && filtered.length < 3) {
      filtered.push(cancelOption);
    }
    
    // If we still don't have 3 and there are more options, add the next distinct one
    if (filtered.length < 3) {
      const remaining = options.find(opt => 
        !filtered.some(f => f.id === opt.id) &&
        opt.action.type !== 'CANCEL'
      );
      if (remaining) {
        filtered.push(remaining);
      }
    }

    return filtered.slice(0, 3); // Hard cap at 3
  };

  const filteredOptions = filterOptions(decision.options);

  const getStatusIcon = () => {
    switch (decision.status) {
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
    switch (decision.status) {
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

  const getHeaderColor = () => {
    switch (decision.status) {
      case 'OK':
        return 'text-green-900';
      case 'WARNING':
        return 'text-yellow-900';
      case 'BLOCKED':
        return 'text-red-900';
      default:
        return 'text-blue-900';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container - Centered with max-height constraint */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-[80%] max-w-[358px] max-h-[70vh] flex flex-col pointer-events-auto overflow-hidden mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Sticky */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
            <h2 className={`text-lg font-bold ${getHeaderColor()}`}>
              {decision.status === 'BLOCKED' ? 'Cannot Add Activity' : 'Review Before Adding'}
            </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isApplying}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {/* Summary Section */}
            <div className={`mb-4 border-2 rounded-xl p-3 ${getStatusBgColor()}`}>
              <p className="text-xs text-gray-900 leading-relaxed">
                {explanation.summary.replace(/\b\w+\s+activity\b/gi, 'This activity')}
              </p>

              {/* Risks */}
              {decision.risks && decision.risks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <div className="text-xs font-medium text-gray-700 mb-2">Potential Issues:</div>
                  <div className="space-y-1">
                    {decision.risks.map((risk, index) => (
                      <div key={index} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facts (if no summary) */}
              {!explanation.summary && decision.facts && decision.facts.length > 0 && (
                <div className="space-y-1">
                  {decision.facts.map((fact, index) => (
                    <div key={index} className="text-xs text-gray-700">
                      • {fact}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options Section */}
            {filteredOptions.length > 0 && (
              <div className="space-y-3">
                {filteredOptions.map((option) => {
                  const isRecommended = option.label.toLowerCase().includes('recommended') || option.label.toLowerCase().includes('move to recommended');
                  const isKeepMyChoice = option.label.toLowerCase().includes('keep my choice') || option.label.toLowerCase().includes('keep my');
                  
                  // Determine button styling based on option type
                  let buttonClasses = "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed ";
                  if (isRecommended) {
                    buttonClasses += "bg-orange-400 text-white hover:bg-orange-500 hover:shadow-lg ";
                  } else if (isKeepMyChoice) {
                    buttonClasses += "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md ";
                  } else {
                    buttonClasses += "bg-[#FE4C40] text-white hover:bg-[#E63C30] hover:shadow-lg ";
                  }
                  
                  // Determine button text
                  let buttonText = option.label;
                  if (isRecommended) {
                    buttonText = 'Move to recommended time';
                  } else if (isKeepMyChoice) {
                    buttonText = 'Keep my choice';
                  }
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => onSelectOption(option)}
                      disabled={isApplying}
                      className={buttonClasses}
                    >
                      {buttonText}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

