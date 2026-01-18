/**
 * Navigation routes for the travel planning app
 */
export const routes = {
  home: '/',
  explore: '/explore',
  trips: '/trips',
  profile: '/profile',
  plan: {
    destination: '/plan/destination',
    fastPath: '/plan/fast-path',
    timing: '/plan/timing',
    duration: '/plan/duration',
    pace: '/plan/pace',
    locations: '/plan/locations',
    processing: '/plan/processing',
    itinerary: '/plan/itinerary',
    building: '/plan/building',
    logistics: '/plan/logistics',
    map: '/plan/map',
  },
  bookings: {
    dashboard: '/bookings',
    customize: '/bookings/customize',
    transport: '/bookings/transport',
    accommodation: '/bookings/accommodation',
    review: '/bookings/review',
    summary: '/bookings/summary',
    complete: '/bookings/complete',
    flights: {
      index: '/bookings/flights',
      options: '/bookings/flights/options',
    },
    hotels: {
      index: '/bookings/hotels',
      options: '/bookings/hotels/options',
      impact: '/bookings/hotels/impact',
    },
  },
} as const;

