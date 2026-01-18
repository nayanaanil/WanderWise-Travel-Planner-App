import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Check, CreditCard, Lock, Phone, Mail, Info, MessageCircle, Download, Share2, Plane, Train, Hotel } from 'lucide-react';
import { Button } from '@/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { Checkbox } from '@/ui/checkbox';
import { Label } from '@/ui/label';
import { StepHeader } from '@/components/StepHeader';

interface TripCostAndBookingScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

export function TripCostAndBookingScreen({ onBack, onComplete }: TripCostAndBookingScreenProps) {
  const [flightsExpanded, setFlightsExpanded] = useState(true);
  const [transportExpanded, setTransportExpanded] = useState(false);
  const [accommodationExpanded, setAccommodationExpanded] = useState(false);
  const [traveler2Expanded, setTraveler2Expanded] = useState(false);
  const [traveler3Expanded, setTraveler3Expanded] = useState(false);
  const [specialRequestsExpanded, setSpecialRequestsExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState(false);
  const [understandPolicy, setUnderstandPolicy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');

  const totalCost = 4482;
  const perPersonCost = 1494;
  const budgetPerPerson = 2500;

  const handleCompleteBooking = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccess(true);
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="min-h-[100dvh] bg-[#F9FAFB] flex flex-col items-center justify-center max-w-md mx-auto px-4">
        <div className="w-full bg-white rounded-2xl p-8 text-center shadow-lg">
          <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Check className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-[#1F2937] mb-2">Booking Confirmed!</h1>
          <p className="text-[#6B7280] mb-6">
            Your Christmas Markets adventure is all set
          </p>

          <div className="bg-[#F9FAFB] rounded-xl p-4 mb-6">
            <p className="text-[#6B7280] text-sm mb-1">Booking Reference</p>
            <p className="text-[#1F2937] text-2xl tracking-wider">WW-2024-8X4K</p>
          </div>

          <div className="bg-[#EFF6FF] rounded-xl p-4 mb-6 border border-[#4AA3F2]/30">
            <div className="flex items-center gap-2 text-[#1E40AF]">
              <Mail className="w-5 h-5" />
              <p className="text-sm">Confirmation sent to your email</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onComplete}
              className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] py-6 rounded-xl shadow-lg"
            >
              View Your Trip
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] py-4 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-[#F9FAFB] py-4 rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] flex flex-col max-w-md mx-auto">
      <StepHeader
        title="Confirm & Book"
        currentStep={9}
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
        {/* Cost Breakdown Section */}
        <div className="mb-6">
          <h2 className="text-[#1F2937] mb-4">Total Cost Breakdown</h2>

          {/* Flights */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] mb-3 overflow-hidden">
            <button
              onClick={() => setFlightsExpanded(!flightsExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Plane className="w-5 h-5 text-[#4AA3F2]" />
                <div className="text-left">
                  <p className="text-[#1F2937]">Flights</p>
                  <p className="text-[#6B7280] text-sm">Round-trip for 3 adults</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#1F2937]">€1,260</span>
                {flightsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                )}
              </div>
            </button>

            {flightsExpanded && (
              <div className="px-4 pb-4 space-y-2 border-t border-[#E5E7EB] pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Outbound: London → Prague</span>
                  <span className="text-[#1F2937]">€630</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Return: Munich → London</span>
                  <span className="text-[#1F2937]">€630</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                  <p className="text-[#6B7280] text-sm">3 adults × €420 = €1,260</p>
                  <p className="text-[#10B981] text-sm mt-1">✓ Includes: Checked bags, seat selection</p>
                </div>
              </div>
            )}
          </div>

          {/* Transportation */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] mb-3 overflow-hidden">
            <button
              onClick={() => setTransportExpanded(!transportExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Train className="w-5 h-5 text-[#2563EB]" />
                <div className="text-left">
                  <p className="text-[#1F2937]">Transportation</p>
                  <p className="text-[#6B7280] text-sm">City-to-city trains</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#1F2937]">€552</span>
                {transportExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                )}
              </div>
            </button>

            {transportExpanded && (
              <div className="px-4 pb-4 space-y-2 border-t border-[#E5E7EB] pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Prague → Vienna (Train)</span>
                  <span className="text-[#1F2937]">€276</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Vienna → Munich (Train)</span>
                  <span className="text-[#1F2937]">€276</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                  <p className="text-[#6B7280] text-sm">3 adults × €184 = €552</p>
                  <p className="text-[#10B981] text-sm mt-1">✓ Includes: Reserved seats, WiFi</p>
                </div>
              </div>
            )}
          </div>

          {/* Accommodation */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <button
              onClick={() => setAccommodationExpanded(!accommodationExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Hotel className="w-5 h-5 text-[#F59E0B]" />
                <div className="text-left">
                  <p className="text-[#1F2937]">Accommodation</p>
                  <p className="text-[#6B7280] text-sm">7 nights total</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#1F2937]">€2,670</span>
                {accommodationExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                )}
              </div>
            </button>

            {accommodationExpanded && (
              <div className="px-4 pb-4 space-y-2 border-t border-[#E5E7EB] pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Prague: Hotel Golden Well (3 nights)</span>
                  <span className="text-[#1F2937]">€540</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Vienna: Hotel Sacher Wien (3 nights)</span>
                  <span className="text-[#1F2937]">€585</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Munich: Airport Hotel Regent (1 night)</span>
                  <span className="text-[#1F2937]">€140</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                  <p className="text-[#6B7280] text-sm">3 adults × €890 = €2,670</p>
                  <p className="text-[#10B981] text-sm mt-1">✓ Includes: Breakfast, WiFi, city tax</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Cost Summary */}
        <div className="bg-gradient-to-br from-[#4AA3F2] to-[#1A73E8] rounded-xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90">Total Trip Cost</span>
            <span className="text-3xl">€{totalCost.toLocaleString()}</span>
          </div>
          <p className="text-white/80 mb-4">€{perPersonCost.toLocaleString()} per person</p>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-white">
              <Check className="w-5 h-5" />
              <span className="text-sm">Within your €{budgetPerPerson} per person budget</span>
            </div>
          </div>
          
          <p className="text-white/70 text-sm">All taxes and fees included • No hidden charges</p>
        </div>

        {/* Traveler Information */}
        <div className="mb-6">
          <h2 className="text-[#1F2937] mb-2">Traveler Details</h2>
          <p className="text-[#6B7280] text-sm mb-4">Primary booker will provide details for all 3 travelers</p>

          {/* Primary Traveler */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-3">
            <h3 className="text-[#1F2937] mb-4">Primary Traveler (You)</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullname" className="text-[#6B7280] text-sm mb-1 block">
                  Full name (as on passport)
                </Label>
                <input
                  id="fullname"
                  type="text"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-[#6B7280] text-sm mb-1 block">
                  Email address
                </Label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-[#6B7280] text-sm mb-1 block">
                  Phone number
                </Label>
                <input
                  id="phone"
                  type="tel"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  placeholder="+44 7700 900000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dob" className="text-[#6B7280] text-sm mb-1 block">
                    Date of birth
                  </Label>
                  <input
                    id="dob"
                    type="date"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  />
                </div>

                <div>
                  <Label htmlFor="passport" className="text-[#6B7280] text-sm mb-1 block">
                    Passport number
                  </Label>
                  <input
                    id="passport"
                    type="text"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="passportExpiry" className="text-[#6B7280] text-sm mb-1 block">
                  Passport expiry
                </Label>
                <input
                  id="passportExpiry"
                  type="date"
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Traveler 2 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] mb-3 overflow-hidden">
            <button
              onClick={() => setTraveler2Expanded(!traveler2Expanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <h3 className="text-[#1F2937]">Traveler 2</h3>
              {traveler2Expanded ? (
                <ChevronUp className="w-5 h-5 text-[#6B7280]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6B7280]" />
              )}
            </button>

            {traveler2Expanded && (
              <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-4 space-y-4">
                <div>
                  <Label className="text-[#6B7280] text-sm mb-1 block">
                    Full name (as on passport)
                  </Label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[#6B7280] text-sm mb-1 block">
                      Date of birth
                    </Label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <Label className="text-[#6B7280] text-sm mb-1 block">
                      Passport number
                    </Label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#6B7280] text-sm mb-1 block">
                    Passport expiry
                  </Label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Traveler 3 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <button
              onClick={() => setTraveler3Expanded(!traveler3Expanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <h3 className="text-[#1F2937]">Traveler 3</h3>
              {traveler3Expanded ? (
                <ChevronUp className="w-5 h-5 text-[#6B7280]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6B7280]" />
              )}
            </button>

            {traveler3Expanded && (
              <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-4 space-y-4">
                <div>
                  <Label className="text-[#6B7280] text-sm mb-1 block">
                    Full name (as on passport)
                  </Label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[#6B7280] text-sm mb-1 block">
                      Date of birth
                    </Label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <Label className="text-[#6B7280] text-sm mb-1 block">
                      Passport number
                    </Label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#6B7280] text-sm mb-1 block">
                    Passport expiry
                  </Label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#6B7280] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#6B7280] text-sm">Passport must be valid for 6+ months from travel date</p>
              <button className="text-[#4AA3F2] text-sm hover:underline">
                Why do we need this information?
              </button>
            </div>
          </div>
        </div>

        {/* Special Requests */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] mb-6 overflow-hidden">
          <button
            onClick={() => setSpecialRequestsExpanded(!specialRequestsExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
          >
            <h2 className="text-[#1F2937]">Special Requests (Optional)</h2>
            {specialRequestsExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280]" />
            )}
          </button>

          {specialRequestsExpanded && (
            <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-4">
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent resize-none"
                placeholder="Any dietary requirements, accessibility needs, or special occasions?"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[#6B7280] text-sm">
                  Examples: Vegetarian meals, wheelchair access, celebrating anniversary
                </p>
                <p className="text-[#6B7280] text-sm">{specialRequests.length}/500</p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="mb-6">
          <h2 className="text-[#1F2937] mb-4">Payment Information</h2>

          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-[#10B981]" />
            <span className="text-[#6B7280] text-sm">Secure SSL encrypted payment</span>
            <div className="flex gap-2 ml-auto">
              <div className="text-lg">💳</div>
              <div className="text-lg">💳</div>
              <div className="text-lg">📱</div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="w-4 h-4 text-[#4AA3F2]"
                />
                <CreditCard className="w-5 h-5 text-[#6B7280]" />
                <span className="text-[#1F2937]">Credit/Debit Card</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'paypal'}
                  onChange={() => setPaymentMethod('paypal')}
                  className="w-4 h-4 text-[#4AA3F2]"
                />
                <span className="text-lg">📱</span>
                <span className="text-[#1F2937]">PayPal</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')}
                  className="w-4 h-4 text-[#4AA3F2]"
                />
                <span className="text-lg">🏦</span>
                <span className="text-[#1F2937]">Bank Transfer</span>
              </label>
            </div>
          </div>

          {/* Credit Card Form */}
          {paymentMethod === 'card' && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-[#6B7280] text-sm mb-1 block">
                    Card number
                  </Label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                    placeholder="1234 5678 9012 3456"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[#6B7280] text-sm mb-1 block">
                      Expiry date
                    </Label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                      placeholder="MM/YY"
                    />
                  </div>

                  <div>
                    <Label className="text-[#6B7280] text-sm mb-1 flex items-center gap-1">
                      CVV
                      <Info className="w-3 h-3 text-[#6B7280]" />
                    </Label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                      placeholder="123"
                      maxLength={3}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#6B7280] text-sm mb-1 block">
                    Cardholder name
                  </Label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4AA3F2] focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Final Confirmation */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 mb-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-[#1F2937] text-sm cursor-pointer">
                I agree to the{' '}
                <button className="text-[#4AA3F2] hover:underline">Terms & Conditions</button>
                {' '}and{' '}
                <button className="text-[#4AA3F2] hover:underline">Privacy Policy</button>
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm-info"
                checked={confirmInfo}
                onCheckedChange={(checked) => setConfirmInfo(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="confirm-info" className="text-[#1F2937] text-sm cursor-pointer">
                I confirm all traveler information is accurate
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="understand-policy"
                checked={understandPolicy}
                onCheckedChange={(checked) => setUnderstandPolicy(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="understand-policy" className="text-[#1F2937] text-sm cursor-pointer">
                I understand the cancellation policy
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Booking Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 pt-4 pb-20 max-w-md mx-auto">
        <Button
          onClick={handleCompleteBooking}
          disabled={!agreeTerms || !confirmInfo || !understandPolicy || isProcessing}
          className="w-full bg-[#4AA3F2] text-white hover:bg-[#1A73E8] py-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing your booking...
            </span>
          ) : (
            `Complete Booking - €${totalCost.toLocaleString()}`
          )}
        </Button>
        <p className="text-[#6B7280] text-sm text-center mt-2">
          You will receive confirmation within 5 minutes
        </p>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="flex items-center gap-2 text-[#6B7280] text-xs">
            <Lock className="w-3 h-3" />
            <span>256-bit SSL encryption</span>
          </div>
          <div className="flex items-center gap-2 text-[#6B7280] text-xs">
            <Check className="w-3 h-3" />
            <span>ATOL protected</span>
          </div>
          <div className="flex items-center gap-2 text-[#6B7280] text-xs">
            <Phone className="w-3 h-3" />
            <span>24/7 customer support</span>
          </div>
          <div className="flex items-center gap-2 text-[#6B7280] text-xs">
            <span>⭐</span>
            <span>4.8/5 customer rating</span>
          </div>
        </div>
      </div>

      {/* Floating Help Button */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-[#4AA3F2] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#1A73E8] transition-colors z-50">
        <MessageCircle className="w-6 h-6" />
      </button>

      <BottomNav activeTab="trips" />
    </div>
  );
}
