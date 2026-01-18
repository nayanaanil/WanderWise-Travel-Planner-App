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
   * Filter options based on decision status
   * For MOVE/SWAP: Show primary CTA + secondary options
   * For BLOCKED/WARNING: Show all options (up to 3)
   */
  const filterOptions = (options: DecisionOption[]): DecisionOption[] => {
    // For MOVE and SWAP statuses, prioritize the primary recommendation
    if (decision.status === 'MOVE' || decision.status === 'SWAP') {
      const primary = options.find(opt => 
        opt.action.type !== 'CANCEL' && 
        (opt.label.toLowerCase().includes('move') || opt.label.toLowerCase().includes('swap'))
      ) || options.find(opt => opt.action.type !== 'CANCEL');
      
      const filtered: DecisionOption[] = [];
      if (primary) filtered.push(primary);
      
      // Add secondary options (up to 2 more)
      const secondary = options.filter(opt => 
        opt.id !== primary?.id && 
        opt.action.type !== 'CANCEL'
      ).slice(0, 2);
      filtered.push(...secondary);
      
      return filtered;
    }
    
    // For SMART_REORDER_SUGGESTION, show primary + secondary options
    if (decision.status === 'SMART_REORDER_SUGGESTION') {
      const filtered: DecisionOption[] = [];
      const primary = options.find(opt => opt.id === 'smart_reorder_primary');
      if (primary) filtered.push(primary);
      
      const showAnother = options.find(opt => opt.id === 'show_another_option');
      if (showAnother) filtered.push(showAnother);
      
      const keepAsIs = options.find(opt => opt.id === 'keep_as_is' || opt.id === 'keep_anyway');
      if (keepAsIs) filtered.push(keepAsIs);
      
      return filtered;
    }
    
    // For other statuses, limit to 3 options
    if (options.length <= 3) return options;
    
    const filtered: DecisionOption[] = [];
    const primary = options.find(opt => opt.action.type !== 'CANCEL');
    if (primary) filtered.push(primary);
    
    const alternative = options.find(opt => 
      opt.id !== primary?.id && 
      opt.action.type !== 'CANCEL'
    );
    if (alternative) filtered.push(alternative);
    
    const cancel = options.find(opt => opt.action.type === 'CANCEL');
    if (cancel) filtered.push(cancel);
    
    return filtered.slice(0, 3);
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
      case 'MOVE':
      case 'SWAP':
        return <Info className="w-5 h-5 text-orange-600" />;
      case 'ALLOW':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'REORDER_SUGGESTION':
      case 'SMART_REORDER_SUGGESTION':
        return <Info className="w-5 h-5 text-orange-600" />;
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
      case 'MOVE':
      case 'SWAP':
        return 'bg-orange-50 border-orange-200';
      case 'ALLOW':
        return 'bg-blue-50 border-blue-200';
      case 'REORDER_SUGGESTION':
      case 'SMART_REORDER_SUGGESTION':
        return 'bg-orange-50 border-orange-200';
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
      case 'MOVE':
      case 'SWAP':
        return 'text-orange-900';
      case 'ALLOW':
        return 'text-blue-900';
      case 'REORDER_SUGGESTION':
      case 'SMART_REORDER_SUGGESTION':
        return 'text-orange-900';
      default:
        return 'text-blue-900';
    }
  };

  const getHeaderTitle = () => {
    switch (decision.status) {
      case 'BLOCKED':
        return 'Cannot Add Activity';
      case 'MOVE':
        return 'Consider Moving';
      case 'SWAP':
        return 'Consider Swapping';
      case 'REORDER_SUGGESTION':
      case 'SMART_REORDER_SUGGESTION':
        return 'Consider Reordering';
      default:
        return 'Review Before Adding';
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
              {getHeaderTitle()}
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
                {filteredOptions.map((option, index) => {
                  const isPrimary = (decision.status === 'MOVE' || decision.status === 'SWAP') && index === 0;
                  const isAddAnyway = option.label.toLowerCase().includes('add anyway') || option.label.toLowerCase().includes('keep as is');
                  const isCancel = option.action.type === 'CANCEL';
                  
                  // Determine button styling based on option type and status
                  let buttonClasses = "w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed ";
                  
                  if (isPrimary) {
                    // Primary CTA for MOVE/SWAP - prominent orange
                    buttonClasses += "bg-orange-400 text-white hover:bg-orange-500 hover:shadow-lg ";
                  } else if (isAddAnyway) {
                    // Add anyway - secondary gray
                    buttonClasses += "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md ";
                  } else if (isCancel) {
                    // Cancel - subtle
                    buttonClasses += "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md ";
                  } else {
                    // Default - primary red
                    buttonClasses += "bg-[#FE4C40] text-white hover:bg-[#E63C30] hover:shadow-lg ";
                  }
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => onSelectOption(option)}
                      disabled={isApplying}
                      className={buttonClasses}
                    >
                      {option.label}
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

