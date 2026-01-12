# Bookings Data Storage Analysis

**Date:** 2026-01-11  
**Purpose:** Identify where flights and hotels are stored when selected  
**Scope:** Flight and hotel selection data flow  

---

## FINDINGS

### 1. FLIGHTS STORAGE

#### Storage Location:
- **State Key:** `tripState.selectedFlights`
- **Type:** `{ outbound?: any; return?: any; }`
- **Location in code:** `lib/tripState.ts` lines 140-144

#### Where Flights Are Saved:
**File:** `components/FlightOptionsResultsScreen.tsx`  
**Function:** `handleConfirmSelection()` (around lines 580-595)

**Code:**
```typescript
setSelectedFlight('outbound', {
  ...outboundFlight,
  gatewayOption: selectedGatewayId,
  originCity: selectedGateway.outbound.originCity,
  gatewayCity: selectedGateway.outbound.gatewayCity,
  date: selectedGateway.outbound.date,
});

setSelectedFlight('return', {
  ...inboundFlight,
  gatewayOption: selectedGatewayId,
  gatewayCity: selectedGateway.inbound.gatewayCity,
  destinationCity: selectedGateway.inbound.destinationCity,
  date: selectedGateway.inbound.date,
});
```

**Storage Function:** `setSelectedFlight(type: "outbound" | "return", option: any)`  
**Location:** `lib/tripState.ts` lines 637-647

**Implementation:**
```typescript
export function setSelectedFlight(type: "outbound" | "return", option: any): void {
  const state = getTripState();
  const currentFlights = state.selectedFlights || {};
  
  saveTripState({
    selectedFlights: {
      ...currentFlights,
      [type]: option,
    },
  });
}
```

**Storage Mechanism:**
- Calls `saveTripState()` which persists to `sessionStorage`
- Key: `'tripState'`
- Updates `selectedFlights` object with `outbound` or `return` property

#### Where Flights Are Read:
**File:** `app/bookings/page.tsx`  
**Line:** 35

**Code:**
```typescript
const selectedFlights = getSelectedFlights();
```

**Read Function:** `getSelectedFlights()`  
**Location:** `lib/tripState.ts` lines 653-659

**Implementation:**
```typescript
export function getSelectedFlights(): {
  outbound?: any;
  return?: any;
} {
  const state = getTripState();
  return state.selectedFlights || {};
}
```

**Read Mechanism:**
- Calls `getTripState()` which reads from `sessionStorage`
- Returns `selectedFlights` object or empty object `{}`

---

### 2. HOTELS STORAGE

#### Storage Location:
- **State Key:** `tripState.selectedHotels`
- **Type:** `{ [city: string]: { hotelId: string; name: string; image?: string; rating?: number; pricePerNight?: number; availabilityStatus?: string; ... } }`
- **Location in code:** `lib/tripState.ts` lines 106-119

#### Where Hotels Are Saved:
**NOTE:** Hotels are selected on the logistics page. The exact location where `setSelectedHotel` is called needs further investigation. However, the storage mechanism is defined as:

**Storage Function:** `setSelectedHotel(cityName: string, option: any)`  
**Location:** `lib/tripState.ts` lines 597-607

**Implementation:**
```typescript
export function setSelectedHotel(cityName: string, option: any): void {
  const state = getTripState();
  const currentHotels = state.selectedHotels || {};
  
  saveTripState({
    selectedHotels: {
      ...currentHotels,
      [cityName]: option,
    },
  });
}
```

**Storage Mechanism:**
- Calls `saveTripState()` which persists to `sessionStorage`
- Key: `'tripState'`
- Updates `selectedHotels` object with city name as key

**PENDING INVESTIGATION:**
- The logistics page reads `tripState.selectedHotels` (line 1820, 1822, 1830)
- But `setSelectedHotel` is NOT imported in the logistics page
- The exact location where hotels are saved to `tripState.selectedHotels` when user confirms hotel selection needs to be found
- Likely locations:
  - Hotel booking API route (`app/api/phase3/hotels/booking/route.ts`)
  - Hotel impact overlay handler (component not yet found)
  - Decision action handler in logistics page (not yet located)

#### Where Hotels Are Read:
**File:** `app/bookings/page.tsx`  
**Line:** 36

**Code:**
```typescript
const selectedHotels = getSelectedHotels();
```

**Read Function:** `getSelectedHotels()`  
**Location:** `lib/tripState.ts` lines 613-616

**Implementation:**
```typescript
export function getSelectedHotels(): { [cityName: string]: any } {
  const state = getTripState();
  return state.selectedHotels || {};
}
```

**Read Mechanism:**
- Calls `getTripState()` which reads from `sessionStorage`
- Returns `selectedHotels` object or empty object `{}`

**Also Read in Logistics Page:**
**File:** `app/plan/logistics/page.tsx`  
**Lines:** 1820-1832

**Code:**
```typescript
if (hotelCTACity && tripState?.selectedHotels) {
  selectedHotel = tripState.selectedHotels[hotelCTACity] || null;
  // Case-insensitive lookup fallback...
}
```

---

## SUMMARY

### Flights:
- **Saved in:** `components/FlightOptionsResultsScreen.tsx` → calls `setSelectedFlight()`
- **Stored in:** `tripState.selectedFlights` (via `saveTripState()` → `sessionStorage`)
- **Read from:** `app/bookings/page.tsx` → calls `getSelectedFlights()`

### Hotels:
- **Saved in:** Logistics page (exact location needs investigation - likely in hotel impact/decision handling)
- **Stored in:** `tripState.selectedHotels` (via `saveTripState()` → `sessionStorage`)
- **Read from:** `app/bookings/page.tsx` → calls `getSelectedHotels()`
- **Also read from:** `app/plan/logistics/page.tsx` → reads `tripState.selectedHotels` directly

---

## DATA STRUCTURE

### Flight Object Structure (as stored):
```typescript
{
  id: string;
  airline?: string;
  airlineName?: string;
  price: number;
  duration?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  stops?: number;
  gatewayOption?: string;
  originCity?: string;
  gatewayCity?: string;
  destinationCity?: string;
  date?: string;
  // ... other flight properties from Phase1FlightOption
}
```

### Hotel Object Structure (as stored):
```typescript
{
  hotelId: string;
  name: string;
  image?: string;
  rating?: number;
  pricePerNight?: number;
  availabilityStatus?: 'available' | 'limited' | 'unavailable';
  availabilityConfidence?: 'high' | 'medium' | 'low';
  availabilityReason?: string;
  restrictions?: string[];
  // ... other hotel properties
}
```

---

## STORAGE MECHANISM

Both flights and hotels use the same storage mechanism:

1. **Save Function:** `saveTripState(state)` in `lib/tripState.ts`
2. **Storage:** `sessionStorage.setItem('tripState', JSON.stringify(state))`
3. **Read Function:** `getTripState()` in `lib/tripState.ts`
4. **Retrieval:** `JSON.parse(sessionStorage.getItem('tripState') || '{}')`

**Key Points:**
- All trip state (including `selectedFlights` and `selectedHotels`) is stored in a single `tripState` object
- Persisted in browser `sessionStorage` (survives page refreshes, cleared when browser tab closes)
- State is merged/updated (not replaced entirely) when saving

---

**END OF ANALYSIS**
