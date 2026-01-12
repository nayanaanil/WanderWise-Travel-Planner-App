# Travel Planner - Next.js Refactored Project

This is a refactored Next.js project that combines two separate Figma export projects into one unified travel planning application.

## Project Structure

```
Travel-Planner/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── api/               # API routes (to be implemented)
├── components/            # React components
│   ├── Header.tsx         # App header
│   ├── Footer.tsx         # App footer
│   ├── HomeScreen.tsx     # Home screen (refactored, no inline styles)
│   └── ImageWithFallback.tsx
├── ui/                    # shadcn/ui components
│   └── [all ui components]
├── lib/                   # Utilities and helpers
│   ├── utils.ts          # cn() utility
│   └── use-mobile.ts     # Mobile detection hook
└── api/                   # API utilities (to be implemented)
```

## Completed Tasks

✅ Created Next.js project structure
✅ Set up configuration files (package.json, next.config.js, tsconfig.json, tailwind.config.ts)
✅ Migrated all UI components to ui/ directory
✅ Created lib/ utilities
✅ Refactored HomeScreen component (removed all inline styles)
✅ Created Header and Footer components
✅ Set up global styles
✅ Created basic app router structure

## Remaining Tasks

### Component Migration (36 components remaining)

The following components need to be migrated from the original projects:

**From Aitravelplanner:**
- DestinationSelectionScreen.tsx
- DurationParametersScreen.tsx
- PaceStyleParametersScreen.tsx
- MustSeeItemsScreen.tsx
- AIProcessingScreen.tsx
- ItineraryPlannerScreen.tsx
- ExploreScreen.tsx
- ProfileScreen.tsx
- ChatOverlay.tsx
- NotificationOverlay.tsx
- TripStepper.tsx
- MapTabContent.tsx
- iPhoneFrame.tsx (optional, for demo)

**From Bookinguserflowscreens:**
- BookingOptimizationDashboard.tsx
- FlightPreferencesScreen.tsx
- FlightOptionsResultsScreen.tsx
- FlightConfirmationScreen.tsx
- FlightCard.tsx
- FlightSelectionScreen.tsx
- BookingFlowV2.tsx
- ItineraryCustomizationScreen.tsx
- TransportationOptimizationScreen.tsx
- AccommodationSelectionScreen.tsx
- AccommodationSelectionScreenV2.tsx
- AccommodationCard.tsx
- ActivityCard.tsx
- TripSummaryOverviewScreen.tsx
- TripCostAndBookingScreen.tsx
- TripSummaryScreen.tsx
- BookingSummaryScreen.tsx
- AdditionalBookingsScreen.tsx
- FilterSheet.tsx
- CityToCityContent.tsx
- BottomNav.tsx

### Refactoring Requirements

For each component:
1. Add `"use client"` directive at the top
2. Remove all inline `style={{}}` props
3. Convert inline styles to Tailwind classes:
   - `fontSize: '32px'` → `text-[32px]`
   - `fontWeight: 700` → `font-bold`
   - `letterSpacing: '-0.02em'` → `tracking-[-0.02em]`
   - `boxShadow: '...'` → `shadow-[...]`
   - `lineHeight: 1.3` → `leading-[1.3]`
4. Update import paths:
   - `from './figma/ImageWithFallback'` → `from '@/components/ImageWithFallback'`
   - `from './ui/...'` → `from '@/ui/...'`
5. Fix any TypeScript errors

### App Router Structure

Create routes for the complete user flow:
- `/` - Home
- `/plan` - Trip planning flow
  - `/plan/destination` - Destination selection
  - `/plan/duration` - Duration parameters
  - `/plan/pace` - Pace & style
  - `/plan/must-see` - Must-see items
  - `/plan/processing` - AI processing
  - `/plan/itinerary` - Itinerary preview
- `/bookings` - Booking flow
  - `/bookings/flights` - Flight selection
  - `/bookings/transport` - Transportation
  - `/bookings/accommodation` - Hotels
  - `/bookings/summary` - Booking summary
- `/explore` - Explore destinations
- `/trips` - My trips
- `/profile` - Profile

### API Routes

Create API routes in `app/api/`:
- `/api/itinerary/generate` - Generate itinerary
- `/api/bookings/flights` - Flight search
- `/api/bookings/hotels` - Hotel search
- `/api/bookings/transport` - Transport options

## Running the Project

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Features

- ✅ Clean Next.js 15 structure with App Router
- ✅ Tailwind CSS for styling (no inline styles)
- ✅ shadcn/ui component library
- ✅ TypeScript for type safety
- ✅ Responsive design
- ✅ Modern UI with visual fidelity maintained

## Notes

- All components should be client components (`"use client"`) since they use React hooks
- The original projects used Vite, but this has been converted to Next.js
- All inline styles have been converted to Tailwind classes in migrated components
- The project maintains visual fidelity from the original Figma designs

