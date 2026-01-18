import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Edit2, Plane, Train, Hotel, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { StepHeader } from '@/components/StepHeader';

interface TripSummaryOverviewScreenProps {
  onBack: () => void;
  onContinue: () => void;
  onEditFlights: () => void;
  onEditTransport: () => void;
  onEditAccommodation: () => void;
}

export function TripSummaryOverviewScreen({ 
  onBack, 
  onContinue, 
  onEditFlights,
  onEditTransport,
  onEditAccommodation 
}: TripSummaryOverviewScreenProps) {
  const [includedExpanded, setIncludedExpanded] = useState(false);
  const [policiesExpanded, setPoliciesExpanded] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] flex flex-col max-w-md mx-auto">
      <StepHeader
        title="Review Your Trip"
        currentStep={8}
        totalSteps={9}
        onBack={onBack}
      />
      
      {/* Route Summary */}
      <div className="fixed top-[120px] left-0 right-0 bg-white border-b border-[#E5E7EB] z-30 max-w-md mx-auto px-4 py-3">
        <div className="bg-[#EFF6FF] rounded-lg p-3 border border-[#4AA3F2]/30">
          <p className="text-[#1E40AF] text-sm text-center">
            Prague → Vienna → Munich • Dec 15-22
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-48 pb-32 px-4 overflow-y-auto">
        {/* Trip Overview Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB] mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#1F2937]">Your Christmas Markets Adventure</h2>
          </div>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#1F2937] text-sm">3 Adults</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#1F2937] text-sm">8 days, 7 nights</span>
            </div>
          </div>
          
          {/* Flights Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                  <Plane className="w-4 h-4 text-[#4AA3F2]" />
                </div>
                <h3 className="text-[#1F2937]">Flights</h3>
              </div>
              <button 
                onClick={onEditFlights}
                className="flex items-center gap-1 text-[#4AA3F2] hover:text-[#1A73E8] text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
            
            <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
              <div>
                <p className="text-[#6B7280] text-sm">Outbound</p>
                <p className="text-[#1F2937]">Dec 15 • London (LHR) → Prague (PRG)</p>
                <p className="text-[#6B7280] text-sm">BA 854 • 08:30 - 11:45 • 2h 15m</p>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-[#6B7280] text-sm">Return</p>
                <p className="text-[#1F2937]">Dec 22 • Munich (MUC) → London (LHR)</p>
                <p className="text-[#6B7280] text-sm">LH 2475 • 16:20 - 17:45 • 2h 25m</p>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-[#10B981] text-sm">✓ Checked bags included • Seat selection included</p>
              </div>
            </div>
          </div>

          {/* Transportation Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#DBEAFE] rounded-lg flex items-center justify-center">
                  <Train className="w-4 h-4 text-[#2563EB]" />
                </div>
                <h3 className="text-[#1F2937]">Transportation</h3>
              </div>
              <button 
                onClick={onEditTransport}
                className="flex items-center gap-1 text-[#4AA3F2] hover:text-[#1A73E8] text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
            
            <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
              <div>
                <p className="text-[#1F2937]">Dec 18 • Prague → Vienna</p>
                <p className="text-[#6B7280] text-sm">Railjet 73 • 09:25 - 13:40 • 4h 15m</p>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-[#1F2937]">Dec 21 • Vienna → Munich</p>
                <p className="text-[#6B7280] text-sm">Railjet 62 • 10:15 - 14:45 • 4h 30m</p>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-[#10B981] text-sm">✓ Reserved seats • WiFi included</p>
              </div>
            </div>
          </div>

          {/* Accommodation Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#FEF3C7] rounded-lg flex items-center justify-center">
                  <Hotel className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <h3 className="text-[#1F2937]">Accommodation</h3>
              </div>
              <button 
                onClick={onEditAccommodation}
                className="flex items-center gap-1 text-[#4AA3F2] hover:text-[#1A73E8] text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
            
            <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-3">
              <div>
                <p className="text-[#1F2937]">Hotel Golden Well</p>
                <p className="text-[#6B7280] text-sm">Prague • Dec 15-18 • 3 nights</p>
                <p className="text-[#6B7280] text-sm">Triple Room with Breakfast</p>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-[#1F2937]">Hotel Sacher Wien</p>
                <p className="text-[#6B7280] text-sm">Vienna • Dec 18-21 • 3 nights</p>
                <p className="text-[#6B7280] text-sm">Deluxe Triple Room with Breakfast</p>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-[#1F2937]">Airport Hotel Regent</p>
                <p className="text-[#6B7280] text-sm">Munich • Dec 21-22 • 1 night</p>
                <p className="text-[#6B7280] text-sm">Family Room with Breakfast</p>
              </div>
              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-[#10B981] text-sm">✓ Breakfast included • WiFi • City tax included</p>
              </div>
            </div>
          </div>
        </div>

        {/* What's Included */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] mb-6 overflow-hidden">
          <button
            onClick={() => setIncludedExpanded(!includedExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
          >
            <h2 className="text-[#1F2937]">What&apos;s Included in Your Trip</h2>
            {includedExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280]" />
            )}
          </button>

          {includedExpanded && (
            <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plane className="w-4 h-4 text-[#4AA3F2]" />
                  </div>
                  <div>
                    <p className="text-[#1F2937]">Round-trip flights with checked bags</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#DBEAFE] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Train className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-[#1F2937]">All city-to-city transportation</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#FEF3C7] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Hotel className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-[#1F2937]">7 nights accommodation with breakfast</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center flex-shrink-0">
                    📱
                  </div>
                  <div>
                    <p className="text-[#1F2937]">Digital tickets and confirmations</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center flex-shrink-0">
                    🎯
                  </div>
                  <div>
                    <p className="text-[#1F2937]">24/7 customer support</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center flex-shrink-0">
                    📧
                  </div>
                  <div>
                    <p className="text-[#1F2937]">Detailed itinerary and travel guide</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Booking Policies */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] mb-6 overflow-hidden">
          <button
            onClick={() => setPoliciesExpanded(!policiesExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
          >
            <h2 className="text-[#1F2937]">Booking Terms & Policies</h2>
            {policiesExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280]" />
            )}
          </button>

          {policiesExpanded && (
            <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-4 space-y-4">
              <div>
                <h3 className="text-[#1F2937] mb-2">Cancellation Policy</h3>
                <ul className="space-y-2 text-sm text-[#6B7280]">
                  <li>• Full refund if cancelled within 24 hours</li>
                  <li>• 50% refund if cancelled 14+ days before travel</li>
                  <li>• 25% refund if cancelled 7-14 days before travel</li>
                  <li>• No refund if cancelled less than 7 days before travel</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[#1F2937] mb-2">Changes & Modifications</h3>
                <ul className="space-y-2 text-sm text-[#6B7280]">
                  <li>• Flight changes: €50 per person + fare difference</li>
                  <li>• Hotel changes: Subject to availability</li>
                  <li>• Date changes: €100 per person + price difference</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[#1F2937] mb-2">Booking Protection</h3>
                <ul className="space-y-2 text-sm text-[#6B7280]">
                  <li>• Secure payment processing (SSL encrypted)</li>
                  <li>• ATOL protected flights</li>
                  <li>• Instant booking confirmations</li>
                  <li>• 24/7 emergency support while traveling</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 pt-4 pb-20 max-w-md mx-auto">
        <Button
          onClick={onContinue}
          className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] py-6 rounded-xl shadow-lg"
        >
          Continue to Payment
        </Button>
        <p className="text-[#6B7280] text-sm text-center mt-2">
          Review costs and complete your booking
        </p>
      </div>

      <BottomNav activeTab="trips" />
    </div>
  );
}
