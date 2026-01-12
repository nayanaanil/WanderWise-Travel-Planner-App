import { Plane, Building2, Car, Lightbulb, Calendar, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface BookingOptimizationDashboardProps {
  onOptimizeFlights: () => void;
  onOptimizeHotels: () => void;
  onReviewTransport: () => void;
  onAutoOptimize: () => void;
  onManualStepByStep: () => void;
  onBookCurrent: () => void;
}

export function BookingOptimizationDashboard({
  onOptimizeFlights,
  onOptimizeHotels,
  onReviewTransport,
  onAutoOptimize,
  onManualStepByStep,
  onBookCurrent
}: BookingOptimizationDashboardProps) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32">
      <Header />
      
      <div className="pt-16 px-6 max-w-md mx-auto">
        {/* Header Section */}
        <div className="mt-8 mb-8">
          <h1 className="text-[#1F2937] mb-3">🎄 Christmas Markets Tour 2024</h1>
          <p className="text-[#6B7280] mb-2">Munich → Innsbruck → Salzburg → Vienna</p>
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Calendar className="w-4 h-4" />
            <span>Dec 15-22, 2024</span>
            <span>•</span>
            <Users className="w-4 h-4" />
            <span>3 Adults</span>
            <span>•</span>
            <span>7 Days</span>
          </div>
        </div>

        {/* Status Cards */}
        <div className="space-y-4 mb-6">
          {/* Card 1 - Flights */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#E5E7EB] rounded-xl flex items-center justify-center flex-shrink-0">
                <Plane className="w-6 h-6 text-[#1A73E8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start flex-wrap gap-2 mb-2">
                  <h3 className="text-[#1F2937] flex-shrink-0">Flights</h3>
                  <Badge className="bg-[#FFF5E6] text-[#FF8C00] border-[#FFD699] hover:bg-[#FFF5E6] whitespace-nowrap">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="text-xs">Needs Optimization</span>
                  </Badge>
                </div>
                <p className="text-[#6B7280] mb-3 break-words">Round-trip Munich ($1,847/person)</p>
                <ul className="space-y-1 mb-3">
                  <li className="text-[#6B7280] break-words">• Expensive return flights</li>
                  <li className="text-[#6B7280] break-words">• Limited departure times</li>
                </ul>
                <p className="text-[#10B981] mb-4 break-words">Potential Savings: $400-600 per person</p>
                <Button 
                  onClick={onOptimizeFlights}
                  className="w-full bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
                >
                  Optimize Flights
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2 - Accommodations */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#E5E7EB] rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-[#1A73E8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start flex-wrap gap-2 mb-2">
                  <h3 className="text-[#1F2937] flex-shrink-0">Accommodations</h3>
                  <Badge className="bg-[#FFF5E6] text-[#FF8C00] border-[#FFD699] hover:bg-[#FFF5E6] whitespace-nowrap">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="text-xs">Partially Optimized</span>
                  </Badge>
                </div>
                <p className="text-[#6B7280] mb-3 break-words">$1,240 total (4 cities)</p>
                <ul className="space-y-1 mb-3">
                  <li className="text-[#6B7280] break-words">• Vienna dates conflict with availability</li>
                  <li className="text-[#6B7280] break-words">• 3-adult rooms limited in Salzburg</li>
                </ul>
                <p className="text-[#10B981] mb-4 break-words">Potential Savings: $200-300 total</p>
                <Button 
                  onClick={onOptimizeHotels}
                  className="w-full bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
                >
                  Optimize Hotels
                </Button>
              </div>
            </div>
          </div>

          {/* Card 3 - Transportation */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#E5E7EB] rounded-xl flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-[#1A73E8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start flex-wrap gap-2 mb-2">
                  <h3 className="text-[#1F2937] flex-shrink-0">Transportation</h3>
                  <Badge className="bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0] hover:bg-[#ECFDF5] whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="text-xs">Optimized</span>
                  </Badge>
                </div>
                <p className="text-[#6B7280] mb-3 break-words">Train + Car Rental ($340 total)</p>
                <p className="text-[#6B7280] mb-3 break-words">Train Munich→Innsbruck, Car Innsbruck→Vienna</p>
                <p className="text-[#10B981] mb-4 break-words">No issues found</p>
                <Button 
                  onClick={onReviewTransport}
                  variant="outline"
                  className="w-full border-[#E5E7EB] text-[#1F2937]"
                >
                  Review Options
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Insights Panel */}
        <div className="bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] rounded-2xl p-5 mb-6 border border-[#90CAF9]">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-[#FF8C00]" fill="#FF8C00" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#1F2937] mb-3">AI Recommendations:</h3>
              <ul className="space-y-2 mb-4">
                <li className="text-[#1F2937]">• Switch to one-way flights (Munich in, Vienna out) → Save $520</li>
                <li className="text-[#1F2937]">• This change affects hotel booking order - Vienna first</li>
                <li className="text-[#1F2937]">• Car rental pickup location needs adjustment</li>
              </ul>
              <button 
                className="text-[#1A73E8] hover:underline"
              >
                See Full Analysis →
              </button>
            </div>
          </div>
        </div>

        {/* Cost Summary Box */}
        <div className="bg-white rounded-2xl p-6 mb-6 border-2 border-[#E5E7EB] shadow-sm">
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280]">Current Total:</span>
              <span className="text-[#1F2937]">$8,847</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280]">Optimized Potential:</span>
              <span className="text-[#1F2937]">$7,927 - $8,127</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#10B981]">Savings Opportunity:</span>
              <span className="text-[#10B981]">$720 - $920</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="space-y-3 mb-8">
          <Button 
            onClick={onAutoOptimize}
            className="w-full bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
          >
            Auto-Optimize Everything
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={onManualStepByStep}
              variant="outline"
              className="w-full border-[#4AA3F2] text-[#4AA3F2]"
            >
              Manual Step-by-Step
            </Button>
            <Button 
              onClick={onBookCurrent}
              variant="outline"
              className="w-full border-[#E5E7EB] text-[#6B7280]"
            >
              Book Current Plan
            </Button>
          </div>
        </div>
      </div>

      <BottomNav activeTab="trips" />
    </div>
  );
}
