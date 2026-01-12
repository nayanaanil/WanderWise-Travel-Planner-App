import { CheckCircle2, Plane, Building2, Ticket, Calendar, DollarSign } from 'lucide-react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Button } from './ui/button';

interface BookingSummaryScreenProps {
  onBack: () => void;
  onConfirm: () => void;
}

export function BookingSummaryScreen({ onBack, onConfirm }: BookingSummaryScreenProps) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      <Header onBack={onBack} />
      
      <div className="pt-16 px-4 max-w-md mx-auto">
        {/* Success Header */}
        <div className="mt-6 mb-8 text-center">
          <div className="w-20 h-20 bg-[#4AA3F2] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-[#1F2937] mb-2">Booking Summary</h1>
          <p className="text-[#6B7280]">
            Review your selections before confirming
          </p>
        </div>

        {/* Trip Details Card */}
        <div className="bg-white rounded-2xl p-5 mb-4 border border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#E5E7EB]">
            <Calendar className="w-5 h-5 text-[#4AA3F2]" />
            <div>
              <div className="text-[#1F2937]">2 Days in Carmel-by-the-Sea</div>
              <div className="text-[#6B7280]">Jan 13-14, 2025</div>
            </div>
          </div>

          {/* Flight Details */}
          <div className="mb-4 pb-4 border-b border-[#E5E7EB]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#E5E7EB] rounded-lg flex items-center justify-center flex-shrink-0">
                <Plane className="w-5 h-5 text-[#1A73E8]" />
              </div>
              <div className="flex-1">
                <div className="text-[#1F2937] mb-1">Flight</div>
                <div className="text-[#6B7280] mb-1">United Airlines UA 1234</div>
                <div className="text-[#6B7280]">Jan 13 • 10:30 AM - 2:45 PM</div>
                <div className="text-[#6B7280]">SFO → MRY • Non-stop</div>
              </div>
              <div className="text-[#1F2937]">$289</div>
            </div>
          </div>

          {/* Accommodation Details */}
          <div className="mb-4 pb-4 border-b border-[#E5E7EB]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#E5E7EB] rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#1A73E8]" />
              </div>
              <div className="flex-1">
                <div className="text-[#1F2937] mb-1">Accommodation</div>
                <div className="text-[#6B7280] mb-1">The Cypress Inn</div>
                <div className="text-[#6B7280]">Jan 13-14 • 1 night</div>
                <div className="text-[#6B7280]">Downtown Carmel • ⭐ 4.8</div>
              </div>
              <div className="text-[#1F2937]">$285</div>
            </div>
          </div>

          {/* Activities */}
          <div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#E5E7EB] rounded-lg flex items-center justify-center flex-shrink-0">
                <Ticket className="w-5 h-5 text-[#1A73E8]" />
              </div>
              <div className="flex-1">
                <div className="text-[#1F2937] mb-2">Activities & Tickets</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="text-[#6B7280]">Ocean Avenue Art Walk</div>
                    <div className="text-[#6B7280]">$45</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-[#6B7280]">Wine Tasting Tour</div>
                    <div className="text-[#6B7280]">$125</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-[#4AA3F2]" />
            <h3 className="text-[#1F2937]">Price Breakdown</h3>
          </div>
          
          <div className="space-y-3 mb-4 pb-4 border-b border-[#E5E7EB]">
            <div className="flex justify-between text-[#6B7280]">
              <span>Flight</span>
              <span>$289</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Accommodation (1 night)</span>
              <span>$285</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Activities & Tickets</span>
              <span>$170</span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Taxes & Fees</span>
              <span>$74</span>
            </div>
          </div>
          
          <div className="flex justify-between text-[#1F2937]">
            <span>Total</span>
            <span>$818</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 border-[#E5E7EB] text-[#1F2937]"
          >
            Back
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
          >
            Confirm Booking
          </Button>
        </div>
      </div>

      <BottomNav activeTab="trips" />
    </div>
  );
}
