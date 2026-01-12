export type DestinationSuggestionRule = {
  type: "country" | "city" | "region";
  suggestions: string[];
};

export const destinationSuggestions: Record<string, DestinationSuggestionRule> = {
  /* =========================
     COUNTRIES
     ========================= */

  France: {
    type: "country",
    suggestions: ["Paris", "Nice", "Lyon", "Marseille", "Cannes"]
  },

  Italy: {
    type: "country",
    suggestions: ["Rome", "Florence", "Venice", "Milan", "Naples"]
  },

  Spain: {
    type: "country",
    suggestions: ["Barcelona", "Madrid", "Seville", "Valencia", "Granada"]
  },

  Austria: {
    type: "country",
    suggestions: ["Vienna", "Salzburg", "Innsbruck", "Munich", "Budapest"]
  },

  Germany: {
    type: "country",
    suggestions: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"]
  },

  Netherlands: {
    type: "country",
    suggestions: ["Amsterdam", "Rotterdam", "Utrecht", "Brussels", "Antwerp"]
  },

  Switzerland: {
    type: "country",
    suggestions: ["Zurich", "Lucerne", "Interlaken", "Geneva", "Bern"]
  },

  UnitedKingdom: {
    type: "country",
    suggestions: ["London", "Edinburgh", "Manchester", "Liverpool", "Bath"]
  },

  Japan: {
    type: "country",
    suggestions: ["Tokyo", "Kyoto", "Osaka", "Hiroshima", "Nara"]
  },

  Thailand: {
    type: "country",
    suggestions: ["Bangkok", "Chiang Mai", "Phuket", "Krabi", "Koh Samui"]
  },

  Indonesia: {
    type: "country",
    suggestions: ["Bali", "Yogyakarta", "Jakarta", "Lombok", "Komodo"]
  },

  Greece: {
    type: "country",
    suggestions: ["Athens", "Santorini", "Mykonos", "Crete", "Rhodes"]
  },

  UnitedStates: {
    type: "country",
    suggestions: ["New York", "Los Angeles", "San Francisco", "Las Vegas", "Chicago"]
  },

  Canada: {
    type: "country",
    suggestions: ["Toronto", "Vancouver", "Montreal", "Quebec City", "Calgary"]
  },

  Australia: {
    type: "country",
    suggestions: ["Sydney", "Melbourne", "Brisbane", "Gold Coast", "Perth"]
  },

  NewZealand: {
    type: "country",
    suggestions: ["Auckland", "Queenstown", "Wellington", "Rotorua", "Christchurch"]
  },

  India: {
    type: "country",
    suggestions: ["Delhi", "Mumbai", "Jaipur", "Agra", "Varanasi"]
  },

  SouthAfrica: {
    type: "country",
    suggestions: ["Cape Town", "Johannesburg", "Kruger", "Durban", "Garden Route"]
  },

  Mexico: {
    type: "country",
    suggestions: ["Mexico City", "Cancun", "Tulum", "Merida", "Playa del Carmen"]
  },

  Egypt: {
    type: "country",
    suggestions: ["Cairo", "Giza", "Luxor", "Aswan", "Abu Simbel"]
  },

  /* =========================
     REGIONS
     ========================= */

  Europe: {
    type: "region",
    suggestions: ["Paris", "Rome", "Barcelona", "Vienna", "Amsterdam"]
  },

  "Central Europe": {
    type: "region",
    suggestions: ["Vienna", "Prague", "Budapest", "Munich", "Salzburg"]
  },

  Mediterranean: {
    type: "region",
    suggestions: ["Barcelona", "Rome", "Nice", "Athens", "Dubrovnik"]
  },

  Scandinavia: {
    type: "region",
    suggestions: ["Stockholm", "Copenhagen", "Oslo", "Helsinki", "Bergen"]
  },

  "South East Asia": {
    type: "region",
    suggestions: ["Bangkok", "Singapore", "Hanoi", "Ho Chi Minh City", "Bali"]
  },

  "Middle East": {
    type: "region",
    suggestions: ["Dubai", "Abu Dhabi", "Istanbul", "Petra", "Jerusalem"]
  },

  "North India": {
    type: "region",
    suggestions: ["Delhi", "Agra", "Jaipur", "Varanasi", "Amritsar"]
  },

  "South India": {
    type: "region",
    suggestions: ["Bangalore", "Chennai", "Kochi", "Mysore", "Madurai"]
  },

  "Himalayan Region": {
    type: "region",
    suggestions: ["Leh", "Manali", "Dharamshala", "Rishikesh", "Shimla"]
  },

  "West Coast USA": {
    type: "region",
    suggestions: ["Los Angeles", "San Francisco", "San Diego", "Seattle", "Portland"]
  },

  "East Coast USA": {
    type: "region",
    suggestions: ["New York", "Boston", "Washington DC", "Philadelphia", "Miami"]
  },

  Caribbean: {
    type: "region",
    suggestions: ["Barbados", "Bahamas", "Jamaica", "Saint Lucia", "Aruba"]
  },

  /* =========================
     CITIES (CITY INPUT → NEARBY CITIES)
     ========================= */

  Paris: {
    type: "city",
    suggestions: ["Brussels", "Amsterdam", "Lyon", "Zurich", "Luxembourg"]
  },

  Rome: {
    type: "city",
    suggestions: ["Florence", "Naples", "Venice", "Milan", "Pisa"]
  },

  Vienna: {
    type: "city",
    suggestions: ["Salzburg", "Innsbruck", "Budapest", "Prague", "Munich"]
  },

  Barcelona: {
    type: "city",
    suggestions: ["Madrid", "Valencia", "Seville", "Nice", "Marseille"]
  },

  Amsterdam: {
    type: "city",
    suggestions: ["Brussels", "Antwerp", "Rotterdam", "Cologne", "Paris"]
  },

  Tokyo: {
    type: "city",
    suggestions: ["Kyoto", "Osaka", "Hakone", "Nikko", "Kamakura"]
  },

  Bangkok: {
    type: "city",
    suggestions: ["Ayutthaya", "Chiang Mai", "Phuket", "Krabi", "Siem Reap"]
  },

  London: {
    type: "city",
    suggestions: ["Edinburgh", "Bath", "Oxford", "Cambridge", "Manchester"]
  },

  NewYork: {
    type: "city",
    suggestions: ["Boston", "Washington DC", "Philadelphia", "Niagara Falls", "Toronto"]
  },

  Dubai: {
    type: "city",
    suggestions: ["Abu Dhabi", "Sharjah", "Muscat", "Doha", "Ras Al Khaimah"]
  }
};
