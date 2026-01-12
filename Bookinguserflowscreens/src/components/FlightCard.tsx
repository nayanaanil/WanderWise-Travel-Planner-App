import { Plane, Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface FlightCardProps {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  price: number;
  isAlternative?: boolean;
  dateChange?: string;
  onSelect: () => void;
}

export function FlightCard({
  airline,
  flightNumber,
  departureTime,
  arrivalTime,
  departureAirport,
  arrivalAirport,
  duration,
  stops,
  price,
  isAlternative = false,
  dateChange,
  onSelect
}: FlightCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border ${isAlternative ? 'border-[#FF6B6B]' : 'border-[#E5E7EB]'}`}>
      {isAlternative && dateChange && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-[#FFF5F5] rounded-lg">
          <AlertCircle className="w-4 h-4 text-[#FF6B6B]" />
          <span className="text-[#FF6B6B]">{dateChange}</span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#E5E7EB] rounded-lg flex items-center justify-center">
            <Plane className="w-5 h-5 text-[#1A73E8]" />
          </div>
          <div>
            <div className="text-[#1F2937]">{airline}</div>
            <div className="text-[#6B7280]">{flightNumber}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#1F2937]">${price}</div>
          <div className="text-[#6B7280]">per person</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-[#1F2937] mb-1">{departureTime}</div>
          <div className="text-[#6B7280]">{departureAirport}</div>
        </div>
        
        <div className="flex-1 flex flex-col items-center px-4">
          <div className="text-[#6B7280] mb-1">{duration}</div>
          <div className="w-full h-px bg-[#E5E7EB] relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#4AA3F2] rounded-full" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#4AA3F2] rounded-full" />
          </div>
          <div className="text-[#6B7280] mt-1">
            {stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="flex-1 text-right">
          <div className="text-[#1F2937] mb-1">{arrivalTime}</div>
          <div className="text-[#6B7280]">{arrivalAirport}</div>
        </div>
      </div>

      <Button 
        onClick={onSelect}
        className="w-full bg-[#4AA3F2] hover:bg-[#1A73E8] text-white"
      >
        Select Flight
      </Button>
    </div>
  );
}
