# Information Architecture

## Approach

WanderWise organizes information and functionality according to the user's travel decision journey, from initial inspiration through post-trip reflection. The architecture prioritizes progressive disclosure—surfacing only relevant decisions at each phase—and maintains persistent personalization context (travel personality, preferences, and trip state) across all sections. This approach reduces cognitive load by eliminating redundant data entry and ensuring AI guidance appears contextually when trade-offs matter most.

## Structure

```
WanderWise
│
├── Home
│   └── Entry point with Fast Path / Guided Path selection
│
├── Plan (Trip Planning Phase)
│   ├── Destination & Timing
│   │   ├── Source location selection
│   │   ├── Destination selection (with autocomplete)
│   │   └── Date range selection
│   │
│   ├── Preferences (Guided Path only)
│   │   ├── Duration parameters
│   │   ├── Pace & style preferences
│   │   ├── Travel interests
│   │   └── Must-see items
│   │
│   ├── Itinerary Generation
│   │   ├── Draft itinerary options
│   │   ├── Detailed itinerary view
│   │   └── Logistics view (day-wise plan with activities)
│   │
│   └── Map View
│       └── Route visualization
│
├── Bookings (Booking & Preparation Phase)
│   ├── Flight Selection
│   │   ├── Gateway city options (with AI priority guidance)
│   │   ├── Flight options (with AI priority guidance)
│   │   └── Flight confirmation
│   │
│   ├── Hotel Selection
│   │   ├── Hotel options per city (with AI priority guidance)
│   │   └── Hotel impact evaluation
│   │
│   ├── Activity Selection
│   │   ├── Activity options per city/slot (with AI priority guidance)
│   │   └── Activity conflict resolution
│   │
│   ├── Transportation
│   │   └── Inter-city transport options
│   │
│   └── Review & Summary
│       ├── Booking summary
│       └── Trip cost overview
│
├── Explore (Inspiration Phase)
│   └── Destination discovery and browsing
│
├── Trips (Trip Management)
│   ├── Active trips
│   ├── Upcoming trips
│   └── Past trips
│
└── Profile
    ├── Travel preferences (persistent)
    ├── Saved destinations
    └── Booking history
```

## Section Details

### Home
- **Purpose**: Entry point that routes users to either Fast Path (minimal input) or Guided Path (full customization)
- **Key Information**: 
  - Fast Path option (destination + dates only, with inferred defaults)
  - Guided Path option (full preference collection)
  - AI agent introduction (compass icon with contextual guidance)
- **Personalization Context**: None on first visit; subsequent visits may surface saved preferences or active trips

### Plan

#### Destination & Timing
- **Purpose**: Capture essential trip parameters that drive all downstream personalization
- **Key Information**:
  - Source location (autocomplete, no free text)
  - Destination selection (autocomplete with free text fallback)
  - Date range (start and end dates)
- **Personalization Context**: Selected destination and dates persist throughout the planning journey and inform AI recommendations

#### Preferences (Guided Path only)
- **Purpose**: Collect travel personality signals that personalize itinerary generation and booking recommendations
- **Key Information**:
  - Duration bucket (3-5, 6-8, 9-11, 12-15 days)
  - Pace preference (relaxed, moderate, fast-paced)
  - Travel interests/styles (adventure, culture, relaxation, etc.)
  - Must-see items (specific attractions or experiences)
- **Personalization Context**: All preferences stored in `tripState` and used by AI agents for activity generation, hotel ranking, and flight recommendations. Fast Path users skip this step with inferred defaults (marked as `assumed: true`).

#### Itinerary Generation
- **Purpose**: Present AI-generated itinerary concepts and allow refinement before booking
- **Key Information**:
  - **Draft Itineraries**: Multiple high-level concepts (cities, nights, themes)
  - **Detailed Itinerary**: Selected draft expanded with day-by-day structure
  - **Logistics View**: Day-wise plan showing:
    - Daily activities (assigned to day/night slots)
    - Hotel stays per city
    - Transportation between cities
    - Total cost summary
    - Booking status (flights, hotels)
- **Personalization Context**: Itinerary reflects all collected preferences. Users can refine activities, which updates `dayActivities` state and triggers re-ranking.

#### Map View
- **Purpose**: Visualize the route and spatial relationships between destinations
- **Key Information**: Route overlay on map with city markers and travel segments

### Bookings

#### Flight Selection
- **Purpose**: Select gateway cities and specific flights with AI-guided trade-off analysis
- **Key Information**:
  - **Gateway Options**: Alternative departure/arrival cities with cost, duration, and convenience trade-offs
  - **Flight Options**: Specific flights with price, duration, stops, and timing
  - **AI Priority Guidance**: Contextual brief and priority pills (fit, comfort, availability) when meaningful differences exist
  - **Agent Pick**: Single recommended option with explanation and accepted trade-off
- **Personalization Context**: AI guidance uses group size, date constraints, and inferred preferences from `tripState`. Selected flights stored in `structuralRoute`.

#### Hotel Selection
- **Purpose**: Choose accommodations per city with AI-guided decision support
- **Key Information**:
  - **Hotel Options**: Per-city hotel cards with price, room types, availability status, and impact cards
  - **AI Priority Guidance**: Brief and priority pills (fit, comfort, availability) when hotels meaningfully differ
  - **Agent Pick**: Single recommended hotel per city with explanation
  - **Impact Evaluation**: Warnings if hotel selection conflicts with route or timing
- **Personalization Context**: AI guidance considers stay windows, group size, and route constraints. Selected hotels stored in `selectedHotels` and `lockedHotelStays`.

#### Activity Selection
- **Purpose**: Assign activities to day/night slots with conflict resolution
- **Key Information**:
  - **Activity Options**: Filtered list (excludes already-assigned activities) with metadata (timing, energy, crowd level, flexibility)
  - **AI Priority Guidance**: Brief and priority pills (timing fit, crowd density, energy demand, rigidity) when activities meaningfully differ
  - **Agent Pick**: Single recommended activity per slot with explanation
  - **Conflict Resolution**: Smart reorder suggestions when slot mismatches or energy overloads occur
- **Personalization Context**: AI guidance uses pace, interests, and existing `dayActivities` to suggest complementary activities. Activity assignments update `dayActivities` state reactively.

#### Transportation
- **Purpose**: Select inter-city transport options (flights, trains, buses)
- **Key Information**: Transport options with cost, duration, and convenience factors

#### Review & Summary
- **Purpose**: Final review of all bookings before confirmation
- **Key Information**:
  - Complete booking summary (flights, hotels, activities)
  - Total cost breakdown
  - Booking status per category

### Explore
- **Purpose**: Discovery and inspiration for future trips
- **Key Information**: Destination recommendations, seasonal insights, themed collections
- **Personalization Context**: May use persistent profile preferences to personalize recommendations

### Trips
- **Purpose**: Manage active, upcoming, and past trips
- **Key Information**:
  - Active trip details and quick access to logistics
  - Upcoming trip countdown and preparation checklist
  - Past trip history and memories
- **Personalization Context**: Each trip retains full `tripState` snapshot for reference

### Profile
- **Purpose**: Persistent user preferences and history
- **Key Information**:
  - Travel personality profile (pace, interests, budget sensitivity)
  - Saved destinations and itineraries
  - Booking history and preferences
- **Personalization Context**: Profile preferences inform default suggestions for new trips and can be referenced by AI agents when explicit preferences aren't provided

## Cross-Section Patterns

### AI Decision Support
AI guidance appears contextually when options meaningfully differ (≥2 dimensions). The guidance pattern includes:
- **Brief**: 1-2 sentence explanation of the decision context
- **Priority Pills**: Active dimensions only (fit, comfort, availability for hotels/flights; timing fit, crowd density, energy, rigidity for activities)
- **Agent Pick**: Single recommended option with human-readable explanation and accepted trade-off
- **Progressive Trust**: Encouragement messages and watchful messaging after successful agent-assisted decisions

### Personalization Persistence
- **Trip State**: All trip parameters, preferences, and selections stored in `tripState` (sessionStorage) and persist across navigation
- **Assumed Values**: Fast Path users have inferred defaults marked as `assumed: true`, allowing refinement later
- **Context Passing**: AI agents receive aggregated travel signals (disruption risk, sell-out risk, fatigue risk, etc.) derived from trip state for framing guidance

### Decision Fatigue Reduction
- **Progressive Disclosure**: Only show relevant decisions at each phase (e.g., no hotel selection until itinerary is confirmed)
- **Meaningful Difference Gates**: AI guidance only appears when options truly differ, avoiding noise
- **Single Recommendation**: Agent Pick provides one clear option rather than overwhelming with choices
- **Smart Defaults**: Fast Path infers reasonable defaults to reduce upfront friction
