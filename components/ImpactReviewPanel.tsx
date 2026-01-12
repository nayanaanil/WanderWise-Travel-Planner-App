"use client";

import { AlertCircle, CheckCircle, X, ArrowRight, Calendar, MapPin, Info } from 'lucide-react';
import { Button } from '@/ui/button';
import { ImpactCard } from '@/lib/route-optimizer/routeDiff';
import { StructuralRoute } from '@/lib/route-optimizer/types';

interface ImpactReviewPanelProps {
  impactCards: ImpactCard[];
  baselineRoute: StructuralRoute;
  candidateRoute: StructuralRoute;
  tripStartDate: string;
  onApprove: () => void;
  onCancel: () => void;
}

/**
 * Extract ordered list of base cities from a route's groundRoute.
 * Uses first occurrence of each city (by departureDayOffset order).
 */
function extractBaseCities(route: StructuralRoute): string[] {
  const cities: string[] = [];
  const seen = new Set<string>();
  
  const sortedLegs = [...route.groundRoute]
    .filter(leg => leg.role === 'BASE')
    .sort((a, b) => a.departureDayOffset - b.departureDayOffset);
  
  for (const leg of sortedLegs) {
    if (!seen.has(leg.fromCity)) {
      cities.push(leg.fromCity);
      seen.add(leg.fromCity);
    }
    if (!seen.has(leg.toCity)) {
      cities.push(leg.toCity);
      seen.add(leg.toCity);
    }
  }
  
  return cities;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Get severity color and icon
 */
function getSeverityStyle(severity: ImpactCard['severity']) {
  switch (severity) {
    case 'BLOCKING':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: AlertCircle,
      };
    case 3:
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: AlertCircle,
      };
    case 2:
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: AlertCircle,
      };
    case 1:
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: Info,
      };
    default:
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: Info,
      };
  }
}

export function ImpactReviewPanel({
  impactCards,
  baselineRoute,
  candidateRoute,
  tripStartDate,
  onApprove,
  onCancel,
}: ImpactReviewPanelProps) {
  const maxSeverity = impactCards.length > 0
    ? impactCards[0].severity // Cards are sorted by descending severity
    : 1;
  
  const isBlocking = maxSeverity === 'BLOCKING';
  const baselineCities = extractBaseCities(baselineRoute);
  const candidateCities = extractBaseCities(candidateRoute);
  
  const title = isBlocking
    ? 'Incompatible Route'
    : maxSeverity === 3
    ? 'Review Major Itinerary Changes'
    : maxSeverity === 2
    ? 'Review Itinerary Changes'
    : 'Review Minor Itinerary Changes';
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Before / After Snapshot */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                Current Itinerary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Entry: {formatDate(baselineRoute.outboundFlight.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Exit: {formatDate(baselineRoute.inboundFlight.date)}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600 mt-3">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div>
                    <div className="font-medium">Cities:</div>
                    <div>{baselineCities.join(' → ')}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border border-[#FE4C40] rounded-lg p-4 bg-[#FFF5F4]">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#FE4C40] rounded-full"></span>
                New Itinerary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span>Entry: {formatDate(candidateRoute.outboundFlight.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span>Exit: {formatDate(candidateRoute.inboundFlight.date)}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700 mt-3">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div>
                    <div className="font-medium">Cities:</div>
                    <div>{candidateCities.join(' → ')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Impact Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Impact Summary</h3>
            {impactCards.map((card, index) => {
              const style = getSeverityStyle(card.severity);
              const Icon = style.icon;
              
              return (
                <div
                  key={index}
                  className={`${style.bgColor} ${style.borderColor} border rounded-lg p-4`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${style.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <div className={`font-medium ${style.color} mb-1`}>
                        {card.type.replace(/_/g, ' ')}
                      </div>
                      <p className="text-sm text-gray-700">{card.summary}</p>
                      {card.affectedCities && card.affectedCities.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Affected cities: </span>
                          {card.affectedCities.join(', ')}
                        </div>
                      )}
                      {card.affectedDates && card.affectedDates.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-medium">Affected dates: </span>
                          {card.affectedDates.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Choose Different Flights
          </Button>
          <Button
            onClick={onApprove}
            disabled={isBlocking}
            className={`flex-1 ${
              isBlocking
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#FE4C40] to-[#FF6B5A] text-white hover:shadow-lg'
            }`}
          >
            Approve & Update Itinerary
          </Button>
        </div>
      </div>
    </div>
  );
}

