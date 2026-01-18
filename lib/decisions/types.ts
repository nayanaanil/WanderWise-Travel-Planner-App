/**
 * Shared Decision Result Type
 * 
 * Used by both hotel and activity decision engines.
 * Provides a consistent structure for deterministic decision evaluation.
 */

export type DecisionDomain = 'hotel' | 'activity';

export type DecisionStatus = 'OK' | 'WARNING' | 'BLOCKED' | 'SUGGEST_DAY_SWAP' | 'REORDER_SUGGESTION' | 'SMART_REORDER_SUGGESTION' | 'MOVE' | 'SWAP' | 'ALLOW';

export type DecisionOption = {
  id: string;
  label: string;
  description: string;
  tradeoffs?: string[];
  action: {
    type: string;
    payload?: any;
  };
};

export type DecisionResult = {
  domain: DecisionDomain;
  status: DecisionStatus;
  facts: string[];
  risks?: string[];
  recommendation?: string;
  options: DecisionOption[];
};


