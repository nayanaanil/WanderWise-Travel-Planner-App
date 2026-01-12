"use client";

import React from 'react';
import { Building2, AlertCircle, CheckCircle, Info, Calendar, MapPin, X, AlertTriangle } from 'lucide-react';
import { ImpactCard } from '@/lib/route-optimizer/routeDiff';

interface HotelImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onChooseDifferent: () => void;
  hotelImpactResult: any;
  selectedHotel: any;
  baselineStay: any;
  candidateStay: any;
  isApproving: boolean;
}

export function HotelImpactModal({
  isOpen,
  onClose,
  onApprove,
  onChooseDifferent,
  hotelImpactResult,
  selectedHotel,
  baselineStay,
  candidateStay,
  isApproving,
}: HotelImpactModalProps) {
  if (!isOpen || !hotelImpactResult) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getSeverityStyle = (severity: ImpactCard['severity']) => {
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
  };

  const candidate = hotelImpactResult.candidates?.[0];
  const impactCards = candidate?.impactCards || [];
  const maxSeverity = impactCards.length > 0 ? impactCards[0].severity : 1;
  const isBlocking = maxSeverity === 'BLOCKING';
  const affectedCity = hotelImpactResult.hotel.city;
  
  // Determine if this is a "No Impact" scenario
  const hasNoImpact = impactCards.length === 0;

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
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900">Review Impact Before Applying</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Selected Hotel Summary */}
            <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <Building2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {selectedHotel?.name || `${hotelImpactResult.hotel.city} Hotel`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {hotelImpactResult.hotel.city}
                  </p>
                </div>
              </div>

              {/* Availability Warning for Low Confidence */}
              {selectedHotel?.availabilityConfidence === 'low' && selectedHotel?.availabilityReason && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-orange-900 mb-1">
                        Availability risk
                      </div>
                      <p className="text-xs text-orange-800 leading-relaxed mb-2">
                        {selectedHotel.availabilityReason}
                      </p>
                      {selectedHotel.restrictions && selectedHotel.restrictions.length > 0 && (
                        <p className="text-xs text-orange-700 italic">
                          Recommendation: {selectedHotel.restrictions[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{hotelImpactResult.hotel.city}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>
                    {formatDate(hotelImpactResult.hotel.checkIn)} → {formatDate(hotelImpactResult.hotel.checkOut)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-blue-600 font-medium">{hotelImpactResult.hotel.nights}</span>
                  <span>night{hotelImpactResult.hotel.nights !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Impact Cards */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-gray-900 mb-3">Impact Summary</h4>

              {impactCards.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-green-900 mb-1">No Impact</div>
                      <p className="text-sm text-green-800">
                        This hotel fits your itinerary without any changes.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {impactCards.map((card: ImpactCard, index: number) => {
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
                            <div className={`font-medium ${style.color} mb-1 text-sm`}>
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
              )}
            </div>
          </div>

          {/* Actions - Sticky Footer */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 space-y-3 rounded-b-2xl">
            <button
              onClick={onApprove}
              disabled={isBlocking || isApproving}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                isBlocking || isApproving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#FE4C40] to-[#FF6B5A] text-white hover:shadow-lg'
              }`}
            >
              {isApproving ? 'Applying...' : 'Apply to Itinerary'}
            </button>

            {/* Only show "Choose Safer Option" when there ARE impacts */}
            {!hasNoImpact && (
              <button
                onClick={onChooseDifferent}
                disabled={isApproving}
                className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Choose Safer Option
              </button>
            )}

            {isBlocking && (
              <p className="text-sm text-red-600 text-center">
                Cannot apply: This selection has blocking issues. Please choose a different hotel.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

