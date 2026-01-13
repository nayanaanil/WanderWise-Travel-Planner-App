import { useState, useEffect } from 'react';
import { Check, AlertCircle, Hotel, Car, Calendar, Shield, TrendingUp, Clock, ChevronRight, MessageCircle, RefreshCw } from 'lucide-react';
import { StepHeader } from '@/components/StepHeader';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';

interface FlightConfirmationScreenProps {
  onConfirmBooking: () => void;
  onBackToOptions: () => void;
}

export function FlightConfirmationScreen({
  onConfirmBooking,
  onBackToOptions
}: FlightConfirmationScreenProps) {
  const [timeRemaining, setTimeRemaining] = useState(12 * 60); // 12 minutes in seconds
  const [transportApproval1, setTransportApproval1] = useState(false);
  const [transportApproval2, setTransportApproval2] = useState(false);
  const [isUpdatingTransport, setIsUpdatingTransport] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const handleAutoUpdateTransport = () => {
    setIsUpdatingTransport(true);
    setTimeout(() => {
      setIsUpdatingTransport(false);
      setTransportApproval1(true);
      setTransportApproval2(true);
    }, 1500);
  };

  const canConfirmBooking = transportApproval1 && transportApproval2;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col pb-20">
      <StepHeader title="Confirmation" currentStep={8} totalSteps={10} onBack={onBackToOptions} />
      
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#10B981] rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-[#1F2937]">Flight Selection Confirmed</h1>
          </div>
          <p className="text-[#6B7280] mb-1">Christmas Markets Tour • 3 Adults</p>
          <p className="text-[#6B7280]">Munich → Innsbruck → Salzburg → Vienna</p>
          <p className="text-[#6B7280]">Dec 15-22, 2024</p>
        </div>

        {/* Section 1: Selection Confirmation */}
        <div className="mb-6">
          <div className="bg-[#D1FAE5] rounded-2xl p-4 mb-4 border border-[#10B981]">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-5 h-5 text-[#10B981]" />
              <p className="text-[#1F2937]">You selected the optimized one-way flights</p>
            </div>
            <p className="text-[#6B7280]">Austrian Airlines + Ryanair • Total savings: $1,785</p>
          </div>

          {/* Selected Flight Summary Card */}
          <div className="bg-white rounded-2xl p-5 border-l-4 border-[#10B981] shadow-sm">
            <div className="inline-block bg-[#10B981] px-3 py-1 rounded-lg mb-4">
              <span className="text-white uppercase">Selected Option</span>
            </div>

            {/* Outbound Flight */}
            <div className="mb-5">
              <p className="text-[#1F2937] mb-2">Dec 15 • Austrian Airlines OS 117</p>
              <p className="text-[#1F2937] mb-1">Munich (MUC) → Vienna (VIE)</p>
              <p className="text-[#6B7280] mb-1">14:30 → 15:50 • 1h 20m • Direct</p>
              <p className="text-[#6B7280]">Terminal 2 → Terminal 3</p>
            </div>

            {/* Return Flight */}
            <div className="mb-5 pb-5 border-b border-[#E5E7EB]">
              <p className="text-[#1F2937] mb-2">Dec 22 • Ryanair FR 1234</p>
              <p className="text-[#1F2937] mb-1">Vienna (VIE) → Munich (MUC)</p>
              <p className="text-[#6B7280] mb-1">16:15 → 19:00 • 3h 45m • 1 stop in Frankfurt</p>
              <p className="text-[#6B7280]">Terminal 3 → Terminal 2</p>
            </div>

            {/* Pricing Summary */}
            <div className="bg-[#F9FAFB] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#9CA3AF] line-through">$6,216 total</span>
                <span className="text-[#10B981] text-2xl">$4,431 total</span>
              </div>
              <p className="text-[#6B7280] text-right mb-3">$1,477 per person</p>
              <div className="inline-block bg-[#10B981] px-4 py-2 rounded-lg w-full">
                <p className="text-white text-center">💰 Saved $1,785 total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Impact Analysis */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-5 h-5 text-[#4AA3F2]" />
            <h2 className="text-[#1F2937]">Impact on Your Trip</h2>
          </div>
          <p className="text-[#6B7280] mb-4">Here&apos;s what changes with your new flights:</p>

          {/* Hotels Impact Card */}
          <div className="bg-[#D1FAE5] rounded-2xl p-5 mb-4 border border-[#10B981]">
            <div className="flex items-start gap-3 mb-3">
              <Hotel className="w-6 h-6 text-[#10B981] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-[#10B981]" />
                  <span className="text-[#10B981]">NO CHANGES NEEDED</span>
                </div>
                <p className="text-[#1F2937] mb-1">Hotel Vier Jahreszeiten Munich: Dec 14-15 ✅</p>
                <p className="text-[#1F2937] mb-1">Hotel Sacher Vienna: Dec 21-22 ✅</p>
                <p className="text-[#6B7280]">All check-in/check-out times compatible</p>
              </div>
            </div>
            <a href="#" className="text-[#4AA3F2] hover:underline flex items-center gap-1">
              View hotel bookings <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Ground Transport Impact Card */}
          <div className="bg-[#FEF3C7] rounded-2xl p-5 mb-4 border border-[#F59E0B]">
            <div className="flex items-start gap-3 mb-3">
              <Car className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                  <span className="text-[#F59E0B]">MINOR ADJUSTMENTS NEEDED</span>
                </div>
                <p className="text-[#1F2937] mb-1">Vienna airport pickup: Move from 18:30 → 19:15</p>
                <p className="text-[#1F2937] mb-1">Munich airport drop-off: Move from 09:00 → 14:00</p>
                <p className="text-[#6B7280] mb-3">All other transfers unchanged</p>
                <Button 
                  className="w-full bg-[#F59E0B] text-white hover:bg-[#D97706]"
                  onClick={handleAutoUpdateTransport}
                  disabled={isUpdatingTransport}
                >
                  {isUpdatingTransport ? 'Updating...' : 'Auto-Update Transport'}
                </Button>
              </div>
            </div>
          </div>

          {/* Activities Impact Card */}
          <div className="bg-[#D1FAE5] rounded-2xl p-5 mb-4 border border-[#10B981]">
            <div className="flex items-start gap-3 mb-3">
              <Calendar className="w-6 h-6 text-[#10B981] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-[#10B981]" />
                  <span className="text-[#10B981]">ALL ACTIVITIES COMPATIBLE</span>
                </div>
                <p className="text-[#1F2937] mb-1">Christmas Market tours: All times work ✅</p>
                <p className="text-[#1F2937] mb-1">Salzburg Mozart concert: Dec 19, 19:30 ✅</p>
                <p className="text-[#1F2937] mb-1">Vienna palace tour: Dec 21, 10:00 ✅</p>
              </div>
            </div>
            <a href="#" className="text-[#4AA3F2] hover:underline flex items-center gap-1">
              View full itinerary <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Travel Insurance Impact Card */}
          <div className="bg-[#DBEAFE] rounded-2xl p-5 mb-4 border border-[#3B82F6]">
            <div className="flex items-start gap-3 mb-3">
              <Shield className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-[#3B82F6]" />
                  <span className="text-[#3B82F6]">COVERAGE UPDATED</span>
                </div>
                <p className="text-[#1F2937] mb-1">Policy automatically updated for new flights</p>
                <p className="text-[#1F2937] mb-1">Coverage remains the same</p>
                <p className="text-[#6B7280]">No additional cost</p>
              </div>
            </div>
            <a href="#" className="text-[#4AA3F2] hover:underline flex items-center gap-1">
              View policy details <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Summary Impact Box */}
          <div className="bg-[#F3E8FF] rounded-2xl p-5 border-2 border-[#A855F7]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#A855F7]" />
              <h3 className="text-[#1F2937]">Overall Impact Summary</h3>
            </div>
            <div className="space-y-2 text-[#1F2937]">
              <p>• 1 transport adjustment needed (auto-fixable)</p>
              <p>• 0 hotel changes required</p>
              <p>• 0 activity conflicts</p>
              <p>• $1,785 total savings confirmed</p>
              <p>• 3h 25m less total travel time</p>
            </div>
          </div>
        </div>

        {/* Section 3: Next Steps */}
        <div className="mb-6">
          <h2 className="text-[#1F2937] mb-4">Next Steps</h2>

          {/* Action Required Alert */}
          <div className="bg-[#FEF3C7] rounded-2xl p-5 mb-4 border border-[#F59E0B]">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              <h3 className="text-[#F59E0B]">Action Required</h3>
            </div>
            <p className="text-[#1F2937] mb-4">Please confirm the transport time changes before proceeding</p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="approval1" 
                  checked={transportApproval1}
                  onCheckedChange={(checked) => setTransportApproval1(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="approval1" className="text-[#1F2937] cursor-pointer">
                  I approve the Vienna pickup time change to 19:15
                </label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="approval2" 
                  checked={transportApproval2}
                  onCheckedChange={(checked) => setTransportApproval2(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="approval2" className="text-[#1F2937] cursor-pointer">
                  I approve the Munich drop-off time change to 14:00
                </label>
              </div>
            </div>
          </div>

          {/* Booking Timeline */}
          <div className="bg-[#F9FAFB] rounded-2xl p-5 mb-4 border border-[#E5E7EB]">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-[#4AA3F2]" />
              <h3 className="text-[#1F2937]">Next Steps Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#4AA3F2] rounded-full mt-2"></div>
                <p className="text-[#1F2937]">Confirm changes (now)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#D1D5DB] rounded-full mt-2"></div>
                <p className="text-[#6B7280]">Book optimized flights (within 15 minutes)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#D1D5DB] rounded-full mt-2"></div>
                <p className="text-[#6B7280]">Update transport bookings (automatic)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#D1D5DB] rounded-full mt-2"></div>
                <p className="text-[#6B7280]">Receive updated itinerary (within 1 hour)</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown Summary */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB]">
            <h3 className="text-[#1F2937] mb-4">Final Cost Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Original trip cost:</span>
                <span className="text-[#6B7280]">$12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#10B981]">Flight optimization:</span>
                <span className="text-[#10B981]">-$1,785</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#F59E0B]">Transport updates:</span>
                <span className="text-[#F59E0B]">+$25</span>
              </div>
            </div>
            <div className="border-t-2 border-[#E5E7EB] pt-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#1F2937] text-xl">New trip cost:</span>
                <span className="text-[#10B981] text-2xl">$10,690</span>
              </div>
              <div className="bg-[#10B981] rounded-lg px-4 py-2">
                <p className="text-white text-center">💰 Total savings: $1,760</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-4 mb-6">
          <Button 
            className="w-full bg-[#10B981] text-white hover:bg-[#059669] h-14"
            onClick={onConfirmBooking}
            disabled={!canConfirmBooking}
          >
            Confirm & Book Optimized Flights
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-[#F59E0B]">
            <Clock className="w-4 h-4" />
            <span>Price valid for {minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-[#E5E7EB] text-[#6B7280]"
              onClick={onBackToOptions}
            >
              ← Back to Flight Options
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-[#4AA3F2] text-[#4AA3F2]"
            >
              Save & Decide Later
            </Button>
          </div>

          <a href="#" className="text-[#4AA3F2] hover:underline flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Need help? Chat with travel expert
          </a>
        </div>
      </div>

      <BottomNav activeTab="bookings" />
    </div>
  );
}
