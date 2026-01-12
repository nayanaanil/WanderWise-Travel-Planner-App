import { Seasonality } from "./types"

export const COUNTRY_SEASONALITY: Record<string, Seasonality> = {
  India: {
  Jan: { label: "our_pick", tempC: "10–25°C", note: "Comfortable weather across most regions" },
  Feb: { label: "our_pick", tempC: "15–28°C", note: "Great balance of warmth and sightseeing" },
  Mar: { label: "second_best", tempC: "20–35°C", note: "Warming up, still good for early mornings" },
  Apr: { label: "off_season", tempC: "25–40°C", note: "Very hot in most regions, travel slows midday" },
  May: { label: "off_season", tempC: "28–42°C", note: "Extreme heat limits outdoor exploration" },
  Jun: { label: "off_season", tempC: "25–35°C", note: "Monsoon begins, landscapes turn lush" },
  Jul: { label: "off_season", tempC: "24–32°C", note: "Heavy rains, fewer crowds" },
  Aug: { label: "off_season", tempC: "24–32°C", note: "Monsoon continues, travel can be slower" },
  Sep: { label: "second_best", tempC: "23–32°C", note: "Rains ease, shoulder season begins" },
  Oct: { label: "our_pick", tempC: "20–30°C", note: "Festive season and pleasant weather" },
  Nov: { label: "our_pick", tempC: "15–28°C", note: "Ideal conditions across the country" },
  Dec: { label: "our_pick", tempC: "10–25°C", note: "Peak travel season with mild weather" }
},

Japan: {
  Jan: { label: "off_season", tempC: "0–8°C"},
  Feb: { label: "off_season", tempC: "1–9°C"},
  Mar: { label: "our_pick", tempC: "6–14°C", note: "Cherry blossom season begins" },
  Apr: { label: "our_pick", tempC: "10–18°C", note: "Peak cherry blossoms and spring festivals" },
  May: { label: "our_pick", tempC: "15–23°C", note: "Comfortable and vibrant before summer" },
  Jun: { label: "off_season", tempC: "18–26°C", note: "Rainy season, humid days" },
  Jul: { label: "off_season", tempC: "22–31°C", note: "Hot and humid summer" },
  Aug: { label: "off_season", tempC: "23–32°C" },
  Sep: { label: "second_best", tempC: "20–28°C", note: "Late summer easing into autumn" },
  Oct: { label: "our_pick", tempC: "14–22°C", note: "Autumn colors and crisp air" },
  Nov: { label: "our_pick", tempC: "8–16°C", note: "Peak fall foliage season" },
  Dec: { label: "second_best", tempC: "3–11°C"}
},

Italy: {
  Jan: { label: "off_season", tempC: "3–10°C", note: "Quiet cities and local pace" },
  Feb: { label: "off_season", tempC: "4–11°C", note: "Low crowds, cool weather" },
  Mar: { label: "second_best", tempC: "8–15°C", note: "Spring begins, fewer tourists" },
  Apr: { label: "our_pick", tempC: "12–18°C", note: "Ideal sightseeing weather" },
  May: { label: "our_pick", tempC: "16–22°C", note: "Warm days before summer crowds" },
  Jun: { label: "second_best", tempC: "20–26°C", note: "Early summer energy" },
  Jul: { label: "off_season", tempC: "24–32°C", note: "Hot and crowded, slower sightseeing" },
  Aug: { label: "off_season", tempC: "24–32°C", note: "Many locals on holiday" },
  Sep: { label: "our_pick", tempC: "18–26°C", note: "Harvest season and pleasant weather" },
  Oct: { label: "our_pick", tempC: "14–20°C", note: "Autumn charm and food festivals" },
  Nov: { label: "second_best", tempC: "8–15°C", note: "Quieter cities, cooler days" },
  Dec: { label: "second_best", tempC: "4–12°C", note: "Festive lights and winter atmosphere" }
},

France: {
  Jan: { label: "off_season", tempC: "2–8°C", note: "Quiet winter streets" },
  Feb: { label: "off_season", tempC: "3–9°C", note: "Low crowds, museum-friendly weather" },
  Mar: { label: "second_best", tempC: "7–14°C", note: "Early spring awakening" },
  Apr: { label: "our_pick", tempC: "10–17°C", note: "Spring blooms and café weather" },
  May: { label: "our_pick", tempC: "14–20°C", note: "One of the best months to explore" },
  Jun: { label: "second_best", tempC: "18–24°C", note: "Long days and lively streets" },
  Jul: { label: "off_season", tempC: "20–30°C", note: "Peak crowds and summer travel" },
  Aug: { label: "off_season", tempC: "20–30°C", note: "Many locals on holiday" },
  Sep: { label: "our_pick", tempC: "17–25°C", note: "Post-summer calm and great weather" },
  Oct: { label: "our_pick", tempC: "12–18°C", note: "Autumn colors and wine season" },
  Nov: { label: "second_best", tempC: "7–13°C", note: "Quieter cultural travel" },
  Dec: { label: "second_best", tempC: "3–9°C", note: "Christmas markets and festive lights" }
},

  Spain: {
    Jan: { label: "second_best", tempC: "8–15°C" },
    Feb: { label: "second_best", tempC: "9–16°C" },
    Mar: { label: "our_pick", tempC: "12–20°C" },
    Apr: { label: "our_pick", tempC: "14–22°C" },
    May: { label: "our_pick", tempC: "18–25°C" },
    Jun: { label: "second_best", tempC: "22–30°C" },
    Jul: { label: "off_season", tempC: "28–38°C", note: "Very hot" },
    Aug: { label: "off_season", tempC: "28–38°C" },
    Sep: { label: "our_pick", tempC: "22–30°C" },
    Oct: { label: "our_pick", tempC: "16–24°C" },
    Nov: { label: "second_best", tempC: "12–18°C" },
    Dec: { label: "second_best", tempC: "8–15°C" }
  },

  Thailand: {
    Jan: { label: "our_pick", tempC: "24–30°C" },
    Feb: { label: "our_pick", tempC: "25–32°C" },
    Mar: { label: "second_best", tempC: "26–34°C" },
    Apr: { label: "off_season", tempC: "28–36°C", note: "Very hot" },
    May: { label: "off_season", tempC: "26–34°C", note: "Monsoon begins" },
    Jun: { label: "off_season", tempC: "25–32°C" },
    Jul: { label: "off_season", tempC: "25–32°C" },
    Aug: { label: "off_season", tempC: "25–32°C" },
    Sep: { label: "off_season", tempC: "24–31°C" },
    Oct: { label: "second_best", tempC: "24–31°C" },
    Nov: { label: "our_pick", tempC: "24–30°C" },
    Dec: { label: "our_pick", tempC: "23–30°C" }
  },

  Indonesia: {
    Jan: { label: "off_season", tempC: "26–30°C", note: "Rainy season" },
    Feb: { label: "off_season", tempC: "26–30°C" },
    Mar: { label: "second_best", tempC: "27–31°C" },
    Apr: { label: "our_pick", tempC: "27–31°C" },
    May: { label: "our_pick", tempC: "26–30°C" },
    Jun: { label: "our_pick", tempC: "25–29°C" },
    Jul: { label: "our_pick", tempC: "24–28°C" },
    Aug: { label: "our_pick", tempC: "24–28°C" },
    Sep: { label: "our_pick", tempC: "25–29°C" },
    Oct: { label: "second_best", tempC: "26–30°C" },
    Nov: { label: "off_season", tempC: "26–30°C" },
    Dec: { label: "off_season", tempC: "26–30°C" }
  },

  Greece: {
  Jan: { label: "off_season", tempC: "8–14°C" },
  Feb: { label: "off_season", tempC: "9–15°C" },
  Mar: { label: "second_best", tempC: "11–18°C" },
  Apr: { label: "our_pick", tempC: "15–22°C" },
  May: { label: "our_pick", tempC: "18–26°C" },
  Jun: { label: "second_best", tempC: "22–30°C" },
  Jul: { label: "off_season", tempC: "26–35°C", note: "Very hot and crowded" },
  Aug: { label: "off_season", tempC: "26–35°C" },
  Sep: { label: "our_pick", tempC: "22–30°C" },
  Oct: { label: "our_pick", tempC: "18–25°C" },
  Nov: { label: "second_best", tempC: "13–20°C" },
  Dec: { label: "off_season", tempC: "9–15°C" }
},

Iceland: {
  Jan: { label: "off_season", tempC: "-5–2°C", note: "Extreme cold" },
  Feb: { label: "off_season", tempC: "-4–3°C" },
  Mar: { label: "second_best", tempC: "-2–5°C", note: "Northern lights" },
  Apr: { label: "second_best", tempC: "1–7°C" },
  May: { label: "our_pick", tempC: "5–12°C" },
  Jun: { label: "our_pick", tempC: "8–15°C" },
  Jul: { label: "our_pick", tempC: "10–16°C" },
  Aug: { label: "our_pick", tempC: "9–14°C" },
  Sep: { label: "second_best", tempC: "6–11°C" },
  Oct: { label: "off_season", tempC: "2–7°C" },
  Nov: { label: "off_season", tempC: "-1–4°C" },
  Dec: { label: "off_season", tempC: "-4–1°C" }
},

Switzerland: {
  Jan: { label: "our_pick", tempC: "-5–5°C", note: "Ski season" },
  Feb: { label: "our_pick", tempC: "-4–6°C" },
  Mar: { label: "second_best", tempC: "0–10°C" },
  Apr: { label: "off_season", tempC: "5–15°C" },
  May: { label: "off_season", tempC: "10–18°C" },
  Jun: { label: "second_best", tempC: "14–22°C" },
  Jul: { label: "our_pick", tempC: "18–26°C" },
  Aug: { label: "our_pick", tempC: "18–26°C" },
  Sep: { label: "our_pick", tempC: "14–22°C" },
  Oct: { label: "second_best", tempC: "8–16°C" },
  Nov: { label: "off_season", tempC: "2–10°C" },
  Dec: { label: "our_pick", tempC: "-3–6°C", note: "Ski season begins" }
},

Australia: {
  Jan: { label: "off_season", tempC: "25–35°C", note: "Very hot" },
  Feb: { label: "off_season", tempC: "24–34°C" },
  Mar: { label: "second_best", tempC: "22–30°C" },
  Apr: { label: "our_pick", tempC: "18–26°C" },
  May: { label: "our_pick", tempC: "14–22°C" },
  Jun: { label: "second_best", tempC: "10–18°C" },
  Jul: { label: "second_best", tempC: "8–16°C" },
  Aug: { label: "second_best", tempC: "9–18°C" },
  Sep: { label: "our_pick", tempC: "12–22°C" },
  Oct: { label: "our_pick", tempC: "16–26°C" },
  Nov: { label: "our_pick", tempC: "20–30°C" },
  Dec: { label: "off_season", tempC: "23–33°C", note: "Peak summer" }
},

NewZealand: {
Jan: { label: "our_pick", tempC: "20–25°C" },
Feb: { label: "our_pick", tempC: "20–25°C" },
Mar: { label: "our_pick", tempC: "18–23°C" },
Apr: { label: "second_best", tempC: "15–20°C" },
May: { label: "off_season", tempC: "10–16°C" },
Jun: { label: "off_season", tempC: "7–13°C" },
Jul: { label: "off_season", tempC: "6–12°C" },
Aug: { label: "off_season", tempC: "7–13°C" },
Sep: { label: "second_best", tempC: "10–16°C" },
Oct: { label: "second_best", tempC: "13–18°C" },
Nov: { label: "our_pick", tempC: "16–21°C" },
Dec: { label: "our_pick", tempC: "18–24°C" }
},

UnitedStates: {
Jan: { label: "second_best", tempC: "-5–15°C" },
Feb: { label: "second_best", tempC: "-3–17°C" },
Mar: { label: "our_pick", tempC: "5–20°C" },
Apr: { label: "our_pick", tempC: "10–25°C" },
May: { label: "our_pick", tempC: "15–28°C" },
Jun: { label: "second_best", tempC: "20–32°C" },
Jul: { label: "off_season", tempC: "25–38°C", note: "Peak summer crowds" },
Aug: { label: "off_season", tempC: "25–38°C" },
Sep: { label: "our_pick", tempC: "18–30°C" },
Oct: { label: "our_pick", tempC: "10–25°C" },
Nov: { label: "second_best", tempC: "5–18°C" },
Dec: { label: "second_best", tempC: "-2–15°C" }
},

Canada: {
Jan: { label: "off_season", tempC: "-15–-5°C", note: "Very cold" },
Feb: { label: "off_season", tempC: "-12–-3°C" },
Mar: { label: "second_best", tempC: "-5–5°C" },
Apr: { label: "second_best", tempC: "3–12°C" },
May: { label: "our_pick", tempC: "10–20°C" },
Jun: { label: "our_pick", tempC: "15–25°C" },
Jul: { label: "our_pick", tempC: "18–28°C" },
Aug: { label: "our_pick", tempC: "18–27°C" },
Sep: { label: "our_pick", tempC: "12–22°C" },
Oct: { label: "second_best", tempC: "5–15°C" },
Nov: { label: "off_season", tempC: "-2–7°C" },
Dec: { label: "off_season", tempC: "-10–-2°C" }
},

UnitedKingdom: {
Jan: { label: "off_season", tempC: "2–7°C" },
Feb: { label: "off_season", tempC: "2–8°C" },
Mar: { label: "second_best", tempC: "5–11°C" },
Apr: { label: "our_pick", tempC: "8–14°C" },
May: { label: "our_pick", tempC: "12–18°C" },
Jun: { label: "second_best", tempC: "15–21°C" },
Jul: { label: "off_season", tempC: "17–25°C", note: "Peak crowds" },
Aug: { label: "off_season", tempC: "17–25°C" },
Sep: { label: "our_pick", tempC: "14–20°C" },
Oct: { label: "our_pick", tempC: "10–16°C" },
Nov: { label: "second_best", tempC: "6–11°C" },
Dec: { label: "second_best", tempC: "3–8°C", note: "Festive season" }
},

Germany: {
Jan: { label: "off_season", tempC: "-2–5°C" },
Feb: { label: "off_season", tempC: "-1–6°C" },
Mar: { label: "second_best", tempC: "3–10°C" },
Apr: { label: "our_pick", tempC: "8–15°C" },
May: { label: "our_pick", tempC: "12–20°C" },
Jun: { label: "second_best", tempC: "16–24°C" },
Jul: { label: "off_season", tempC: "18–30°C", note: "Peak crowds" },
Aug: { label: "off_season", tempC: "18–30°C" },
Sep: { label: "our_pick", tempC: "14–22°C" },
Oct: { label: "our_pick", tempC: "9–16°C", note: "Oktoberfest season" },
Nov: { label: "second_best", tempC: "4–10°C" },
Dec: { label: "our_pick", tempC: "-1–6°C", note: "Christmas markets" }
},

Netherlands: {
Jan: { label: "off_season", tempC: "1–6°C" },
Feb: { label: "off_season", tempC: "1–7°C" },
Mar: { label: "second_best", tempC: "4–10°C" },
Apr: { label: "our_pick", tempC: "8–15°C", note: "Tulip season" },
May: { label: "our_pick", tempC: "12–18°C" },
Jun: { label: "second_best", tempC: "15–21°C" },
Jul: { label: "off_season", tempC: "17–25°C" },
Aug: { label: "off_season", tempC: "17–25°C" },
Sep: { label: "our_pick", tempC: "14–20°C" },
Oct: { label: "our_pick", tempC: "10–16°C" },
Nov: { label: "second_best", tempC: "6–11°C" },
Dec: { label: "second_best", tempC: "2–7°C" }
},

Austria: {
Jan: { label: "our_pick", tempC: "-5–3°C", note: "Ski season" },
Feb: { label: "our_pick", tempC: "-4–5°C" },
Mar: { label: "second_best", tempC: "0–10°C" },
Apr: { label: "off_season", tempC: "6–15°C" },
May: { label: "second_best", tempC: "10–18°C" },
Jun: { label: "second_best", tempC: "14–22°C" },
Jul: { label: "our_pick", tempC: "18–26°C" },
Aug: { label: "our_pick", tempC: "18–26°C" },
Sep: { label: "our_pick", tempC: "14–22°C" },
Oct: { label: "second_best", tempC: "8–16°C" },
Nov: { label: "off_season", tempC: "2–10°C" },
Dec: { label: "our_pick", tempC: "-3–5°C", note: "Christmas markets" }
},

CzechRepublic: {
Jan: { label: "off_season", tempC: "-3–3°C" },
Feb: { label: "off_season", tempC: "-2–5°C" },
Mar: { label: "second_best", tempC: "3–10°C" },
Apr: { label: "our_pick", tempC: "8–15°C" },
May: { label: "our_pick", tempC: "12–20°C" },
Jun: { label: "second_best", tempC: "16–24°C" },
Jul: { label: "off_season", tempC: "18–30°C" },
Aug: { label: "off_season", tempC: "18–30°C" },
Sep: { label: "our_pick", tempC: "14–22°C" },
Oct: { label: "our_pick", tempC: "9–16°C" },
Nov: { label: "second_best", tempC: "4–10°C" },
Dec: { label: "our_pick", tempC: "-1–6°C", note: "Christmas markets" }
},

Portugal: {
Jan: { label: "second_best", tempC: "10–16°C" },
Feb: { label: "second_best", tempC: "11–17°C" },
Mar: { label: "our_pick", tempC: "14–20°C" },
Apr: { label: "our_pick", tempC: "16–22°C" },
May: { label: "our_pick", tempC: "18–25°C" },
Jun: { label: "second_best", tempC: "22–28°C" },
Jul: { label: "off_season", tempC: "26–35°C", note: "Very hot" },
Aug: { label: "off_season", tempC: "26–35°C" },
Sep: { label: "our_pick", tempC: "22–28°C" },
Oct: { label: "our_pick", tempC: "18–24°C" },
Nov: { label: "second_best", tempC: "14–20°C" },
Dec: { label: "second_best", tempC: "10–16°C" }
},

Turkey: {
Jan: { label: "off_season", tempC: "5–12°C" },
Feb: { label: "off_season", tempC: "6–13°C" },
Mar: { label: "second_best", tempC: "10–18°C" },
Apr: { label: "our_pick", tempC: "15–22°C" },
May: { label: "our_pick", tempC: "18–26°C" },
Jun: { label: "second_best", tempC: "22–30°C" },
Jul: { label: "off_season", tempC: "26–35°C", note: "Very hot" },
Aug: { label: "off_season", tempC: "26–35°C" },
Sep: { label: "our_pick", tempC: "22–30°C" },
Oct: { label: "our_pick", tempC: "18–25°C" },
Nov: { label: "second_best", tempC: "12–18°C" },
Dec: { label: "second_best", tempC: "7–13°C" }
},

Egypt: {
Jan: { label: "our_pick", tempC: "15–22°C" },
Feb: { label: "our_pick", tempC: "16–24°C" },
Mar: { label: "second_best", tempC: "18–28°C" },
Apr: { label: "off_season", tempC: "22–32°C", note: "Heat increases" },
May: { label: "off_season", tempC: "26–36°C" },
Jun: { label: "off_season", tempC: "28–40°C" },
Jul: { label: "off_season", tempC: "30–42°C" },
Aug: { label: "off_season", tempC: "30–42°C" },
Sep: { label: "off_season", tempC: "28–38°C" },
Oct: { label: "second_best", tempC: "24–32°C" },
Nov: { label: "our_pick", tempC: "20–28°C" },
Dec: { label: "our_pick", tempC: "16–24°C" }
},

Singapore: {
Jan: { label: "second_best", tempC: "25–30°C" },
Feb: { label: "second_best", tempC: "25–31°C" },
Mar: { label: "second_best", tempC: "26–31°C" },
Apr: { label: "off_season", tempC: "27–32°C", note: "Hot and humid" },
May: { label: "off_season", tempC: "27–32°C" },
Jun: { label: "second_best", tempC: "26–31°C" },
Jul: { label: "second_best", tempC: "26–31°C" },
Aug: { label: "second_best", tempC: "26–31°C" },
Sep: { label: "off_season", tempC: "26–31°C" },
Oct: { label: "off_season", tempC: "26–31°C" },
Nov: { label: "second_best", tempC: "25–30°C" },
Dec: { label: "second_best", tempC: "25–30°C" }
},

UAE: {
Jan: { label: "our_pick", tempC: "18–26°C" },
Feb: { label: "our_pick", tempC: "19–28°C" },
Mar: { label: "second_best", tempC: "22–32°C" },
Apr: { label: "off_season", tempC: "26–38°C", note: "Heat increases" },
May: { label: "off_season", tempC: "30–42°C" },
Jun: { label: "off_season", tempC: "32–45°C" },
Jul: { label: "off_season", tempC: "34–47°C" },
Aug: { label: "off_season", tempC: "34–47°C" },
Sep: { label: "off_season", tempC: "32–43°C" },
Oct: { label: "second_best", tempC: "28–38°C" },
Nov: { label: "our_pick", tempC: "24–32°C" },
Dec: { label: "our_pick", tempC: "20–28°C" }
},

SouthKorea: {
Jan: { label: "off_season", tempC: "-5–5°C" },
Feb: { label: "off_season", tempC: "-3–7°C" },
Mar: { label: "second_best", tempC: "2–12°C" },
Apr: { label: "our_pick", tempC: "8–18°C" },
May: { label: "our_pick", tempC: "13–23°C" },
Jun: { label: "off_season", tempC: "18–26°C", note: "Rainy season" },
Jul: { label: "off_season", tempC: "22–30°C" },
Aug: { label: "off_season", tempC: "22–30°C" },
Sep: { label: "second_best", tempC: "17–25°C" },
Oct: { label: "our_pick", tempC: "10–20°C" },
Nov: { label: "our_pick", tempC: "4–13°C" },
Dec: { label: "second_best", tempC: "-2–8°C" }
},

HongKong: {
Jan: { label: "our_pick", tempC: "15–21°C" },
Feb: { label: "our_pick", tempC: "16–22°C" },
Mar: { label: "second_best", tempC: "18–24°C" },
Apr: { label: "off_season", tempC: "22–28°C", note: "Humidity rises" },
May: { label: "off_season", tempC: "25–31°C" },
Jun: { label: "off_season", tempC: "27–32°C" },
Jul: { label: "off_season", tempC: "28–33°C" },
Aug: { label: "off_season", tempC: "28–33°C" },
Sep: { label: "off_season", tempC: "27–32°C" },
Oct: { label: "second_best", tempC: "24–30°C" },
Nov: { label: "our_pick", tempC: "20–26°C" },
Dec: { label: "our_pick", tempC: "16–22°C" }
},

China: {
Jan: { label: "off_season", tempC: "-5–8°C" },
Feb: { label: "off_season", tempC: "-2–10°C", note: "Chinese New Year crowds" },
Mar: { label: "second_best", tempC: "5–15°C" },
Apr: { label: "our_pick", tempC: "10–22°C" },
May: { label: "our_pick", tempC: "15–26°C" },
Jun: { label: "off_season", tempC: "20–30°C", note: "Rainy season" },
Jul: { label: "off_season", tempC: "25–35°C" },
Aug: { label: "off_season", tempC: "25–35°C" },
Sep: { label: "our_pick", tempC: "20–28°C" },
Oct: { label: "off_season", tempC: "15–25°C", note: "Golden Week crowds" },
Nov: { label: "second_best", tempC: "8–18°C" },
Dec: { label: "second_best", tempC: "-2–10°C" }
},

Taiwan: {
Jan: { label: "our_pick", tempC: "15–22°C" },
Feb: { label: "our_pick", tempC: "16–23°C" },
Mar: { label: "second_best", tempC: "18–25°C" },
Apr: { label: "off_season", tempC: "22–28°C", note: "Humidity rises" },
May: { label: "off_season", tempC: "25–31°C" },
Jun: { label: "off_season", tempC: "27–33°C" },
Jul: { label: "off_season", tempC: "28–34°C" },
Aug: { label: "off_season", tempC: "28–34°C" },
Sep: { label: "off_season", tempC: "27–32°C" },
Oct: { label: "second_best", tempC: "24–30°C" },
Nov: { label: "our_pick", tempC: "20–26°C" },
Dec: { label: "our_pick", tempC: "16–22°C" }
},

Philippines: {
Jan: { label: "our_pick", tempC: "25–30°C" },
Feb: { label: "our_pick", tempC: "26–31°C" },
Mar: { label: "second_best", tempC: "27–32°C" },
Apr: { label: "off_season", tempC: "28–34°C", note: "Hot season" },
May: { label: "off_season", tempC: "27–33°C" },
Jun: { label: "off_season", tempC: "26–32°C" },
Jul: { label: "off_season", tempC: "26–32°C" },
Aug: { label: "off_season", tempC: "26–32°C" },
Sep: { label: "off_season", tempC: "26–31°C" },
Oct: { label: "second_best", tempC: "26–31°C" },
Nov: { label: "our_pick", tempC: "25–30°C" },
Dec: { label: "our_pick", tempC: "25–30°C" }
},

Vietnam: {
Jan: { label: "our_pick", tempC: "18–26°C" },
Feb: { label: "our_pick", tempC: "20–28°C" },
Mar: { label: "second_best", tempC: "22–30°C" },
Apr: { label: "off_season", tempC: "25–33°C" },
May: { label: "off_season", tempC: "26–34°C" },
Jun: { label: "off_season", tempC: "26–34°C" },
Jul: { label: "off_season", tempC: "26–34°C" },
Aug: { label: "off_season", tempC: "26–33°C" },
Sep: { label: "off_season", tempC: "25–32°C" },
Oct: { label: "second_best", tempC: "24–30°C" },
Nov: { label: "our_pick", tempC: "22–28°C" },
Dec: { label: "our_pick", tempC: "18–26°C" }
},

Malaysia: {
Jan: { label: "second_best", tempC: "25–30°C" },
Feb: { label: "second_best", tempC: "26–31°C" },
Mar: { label: "second_best", tempC: "26–32°C" },
Apr: { label: "off_season", tempC: "27–33°C" },
May: { label: "off_season", tempC: "27–33°C" },
Jun: { label: "off_season", tempC: "26–32°C" },
Jul: { label: "off_season", tempC: "26–32°C" },
Aug: { label: "off_season", tempC: "26–32°C" },
Sep: { label: "off_season", tempC: "26–31°C" },
Oct: { label: "off_season", tempC: "26–31°C" },
Nov: { label: "second_best", tempC: "25–30°C" },
Dec: { label: "second_best", tempC: "25–30°C" }
},

Maldives: {
Jan: { label: "our_pick", tempC: "26–30°C" },
Feb: { label: "our_pick", tempC: "26–31°C" },
Mar: { label: "our_pick", tempC: "27–31°C" },
Apr: { label: "second_best", tempC: "27–31°C" },
May: { label: "off_season", tempC: "27–30°C", note: "Monsoon begins" },
Jun: { label: "off_season", tempC: "26–29°C" },
Jul: { label: "off_season", tempC: "26–29°C" },
Aug: { label: "off_season", tempC: "26–29°C" },
Sep: { label: "off_season", tempC: "26–29°C" },
Oct: { label: "second_best", tempC: "26–30°C" },
Nov: { label: "our_pick", tempC: "26–30°C" },
Dec: { label: "our_pick", tempC: "26–30°C" }
},

Mauritius: {
Jan: { label: "off_season", tempC: "25–30°C", note: "Cyclone risk" },
Feb: { label: "off_season", tempC: "25–30°C" },
Mar: { label: "second_best", tempC: "24–29°C" },
Apr: { label: "our_pick", tempC: "22–28°C" },
May: { label: "our_pick", tempC: "20–26°C" },
Jun: { label: "our_pick", tempC: "18–24°C" },
Jul: { label: "our_pick", tempC: "17–23°C" },
Aug: { label: "our_pick", tempC: "17–23°C" },
Sep: { label: "our_pick", tempC: "18–24°C" },
Oct: { label: "second_best", tempC: "20–26°C" },
Nov: { label: "second_best", tempC: "22–28°C" },
Dec: { label: "off_season", tempC: "24–29°C" }
},

Seychelles: {
Jan: { label: "off_season", tempC: "26–30°C", note: "Rainy season" },
Feb: { label: "off_season", tempC: "26–30°C" },
Mar: { label: "second_best", tempC: "26–30°C" },
Apr: { label: "our_pick", tempC: "26–30°C" },
May: { label: "our_pick", tempC: "25–29°C" },
Jun: { label: "our_pick", tempC: "24–28°C" },
Jul: { label: "our_pick", tempC: "24–28°C" },
Aug: { label: "our_pick", tempC: "24–28°C" },
Sep: { label: "our_pick", tempC: "25–29°C" },
Oct: { label: "second_best", tempC: "26–30°C" },
Nov: { label: "second_best", tempC: "26–30°C" },
Dec: { label: "off_season", tempC: "26–30°C" }
},

FrenchPolynesia: {
Jan: { label: "off_season", tempC: "26–30°C", note: "Rainy season" },
Feb: { label: "off_season", tempC: "26–30°C" },
Mar: { label: "second_best", tempC: "26–30°C" },
Apr: { label: "our_pick", tempC: "25–29°C" },
May: { label: "our_pick", tempC: "24–28°C" },
Jun: { label: "our_pick", tempC: "23–27°C" },
Jul: { label: "our_pick", tempC: "22–26°C" },
Aug: { label: "our_pick", tempC: "22–26°C" },
Sep: { label: "our_pick", tempC: "23–27°C" },
Oct: { label: "second_best", tempC: "24–28°C" },
Nov: { label: "second_best", tempC: "25–29°C" },
Dec: { label: "off_season", tempC: "26–30°C" }
},

Fiji: {
Jan: { label: "off_season", tempC: "26–31°C", note: "Cyclone season" },
Feb: { label: "off_season", tempC: "26–31°C" },
Mar: { label: "second_best", tempC: "25–30°C" },
Apr: { label: "our_pick", tempC: "24–29°C" },
May: { label: "our_pick", tempC: "23–28°C" },
Jun: { label: "our_pick", tempC: "22–27°C" },
Jul: { label: "our_pick", tempC: "21–26°C" },
Aug: { label: "our_pick", tempC: "21–26°C" },
Sep: { label: "our_pick", tempC: "22–27°C" },
Oct: { label: "second_best", tempC: "23–28°C" },
Nov: { label: "second_best", tempC: "24–29°C" },
Dec: { label: "off_season", tempC: "25–30°C" }
},

Hungary: {
Jan: { label: "off_season", tempC: "-2–4°C" },
Feb: { label: "off_season", tempC: "-1–6°C" },
Mar: { label: "second_best", tempC: "4–12°C" },
Apr: { label: "our_pick", tempC: "9–17°C" },
May: { label: "our_pick", tempC: "14–22°C" },
Jun: { label: "second_best", tempC: "18–26°C" },
Jul: { label: "off_season", tempC: "20–30°C" },
Aug: { label: "off_season", tempC: "20–30°C" },
Sep: { label: "our_pick", tempC: "15–23°C" },
Oct: { label: "our_pick", tempC: "10–18°C" },
Nov: { label: "second_best", tempC: "5–11°C" },
Dec: { label: "our_pick", tempC: "0–6°C", note: "Christmas markets" }
},

Ireland: {
Jan: { label: "off_season", tempC: "2–7°C" },
Feb: { label: "off_season", tempC: "2–8°C" },
Mar: { label: "second_best", tempC: "5–11°C" },
Apr: { label: "our_pick", tempC: "8–14°C" },
May: { label: "our_pick", tempC: "11–17°C" },
Jun: { label: "second_best", tempC: "14–20°C" },
Jul: { label: "off_season", tempC: "16–22°C" },
Aug: { label: "off_season", tempC: "16–22°C" },
Sep: { label: "our_pick", tempC: "14–19°C" },
Oct: { label: "our_pick", tempC: "10–15°C" },
Nov: { label: "second_best", tempC: "6–11°C" },
Dec: { label: "second_best", tempC: "3–8°C" }
},

Norway: {
Jan: { label: "off_season", tempC: "-10–-2°C", note: "Extreme cold" },
Feb: { label: "off_season", tempC: "-9–-1°C" },
Mar: { label: "second_best", tempC: "-5–3°C", note: "Northern lights" },
Apr: { label: "second_best", tempC: "0–7°C" },
May: { label: "our_pick", tempC: "6–14°C" },
Jun: { label: "our_pick", tempC: "10–18°C" },
Jul: { label: "our_pick", tempC: "12–20°C" },
Aug: { label: "our_pick", tempC: "11–19°C" },
Sep: { label: "second_best", tempC: "7–14°C" },
Oct: { label: "off_season", tempC: "2–8°C" },
Nov: { label: "off_season", tempC: "-2–4°C" },
Dec: { label: "off_season", tempC: "-8–-2°C" }
},

Sweden: {
Jan: { label: "off_season", tempC: "-7–-1°C" },
Feb: { label: "off_season", tempC: "-6–0°C" },
Mar: { label: "second_best", tempC: "-1–6°C" },
Apr: { label: "second_best", tempC: "4–11°C" },
May: { label: "our_pick", tempC: "10–17°C" },
Jun: { label: "our_pick", tempC: "15–22°C" },
Jul: { label: "our_pick", tempC: "17–24°C" },
Aug: { label: "our_pick", tempC: "16–23°C" },
Sep: { label: "second_best", tempC: "11–17°C" },
Oct: { label: "off_season", tempC: "6–12°C" },
Nov: { label: "off_season", tempC: "1–6°C" },
Dec: { label: "off_season", tempC: "-4–1°C" }
},

Denmark: {
Jan: { label: "off_season", tempC: "0–5°C" },
Feb: { label: "off_season", tempC: "0–6°C" },
Mar: { label: "second_best", tempC: "3–10°C" },
Apr: { label: "our_pick", tempC: "7–14°C" },
May: { label: "our_pick", tempC: "12–18°C" },
Jun: { label: "second_best", tempC: "15–21°C" },
Jul: { label: "off_season", tempC: "17–24°C" },
Aug: { label: "off_season", tempC: "17–24°C" },
Sep: { label: "our_pick", tempC: "14–19°C" },
Oct: { label: "our_pick", tempC: "10–15°C" },
Nov: { label: "second_best", tempC: "6–11°C" },
Dec: { label: "second_best", tempC: "2–7°C" }
},

Finland: {
Jan: { label: "off_season", tempC: "-10–-3°C" },
Feb: { label: "off_season", tempC: "-9–-2°C" },
Mar: { label: "second_best", tempC: "-5–2°C", note: "Northern lights" },
Apr: { label: "second_best", tempC: "1–8°C" },
May: { label: "our_pick", tempC: "7–15°C" },
Jun: { label: "our_pick", tempC: "12–20°C" },
Jul: { label: "our_pick", tempC: "15–23°C" },
Aug: { label: "our_pick", tempC: "14–22°C" },
Sep: { label: "second_best", tempC: "9–15°C" },
Oct: { label: "off_season", tempC: "3–9°C" },
Nov: { label: "off_season", tempC: "-2–4°C" },
Dec: { label: "off_season", tempC: "-8–-2°C" }
},

Morocco: {
Jan: { label: "our_pick", tempC: "12–20°C" },
Feb: { label: "our_pick", tempC: "13–22°C" },
Mar: { label: "second_best", tempC: "15–25°C" },
Apr: { label: "our_pick", tempC: "18–28°C" },
May: { label: "our_pick", tempC: "20–30°C" },
Jun: { label: "off_season", tempC: "25–35°C", note: "Very hot inland" },
Jul: { label: "off_season", tempC: "28–40°C" },
Aug: { label: "off_season", tempC: "28–40°C" },
Sep: { label: "second_best", tempC: "24–34°C" },
Oct: { label: "our_pick", tempC: "20–28°C" },
Nov: { label: "our_pick", tempC: "16–24°C" },
Dec: { label: "our_pick", tempC: "13–21°C" }
},

SouthAfrica: {
Jan: { label: "off_season", tempC: "22–32°C", note: "Very hot" },
Feb: { label: "off_season", tempC: "22–31°C" },
Mar: { label: "second_best", tempC: "20–28°C" },
Apr: { label: "our_pick", tempC: "16–25°C" },
May: { label: "our_pick", tempC: "12–22°C" },
Jun: { label: "second_best", tempC: "8–18°C" },
Jul: { label: "second_best", tempC: "7–17°C" },
Aug: { label: "second_best", tempC: "9–19°C" },
Sep: { label: "our_pick", tempC: "12–22°C" },
Oct: { label: "our_pick", tempC: "15–25°C" },
Nov: { label: "our_pick", tempC: "18–28°C" },
Dec: { label: "off_season", tempC: "21–31°C" }
},

Brazil: {
Jan: { label: "off_season", tempC: "24–30°C", note: "Rainy season" },
Feb: { label: "off_season", tempC: "24–30°C" },
Mar: { label: "second_best", tempC: "22–28°C" },
Apr: { label: "our_pick", tempC: "20–26°C" },
May: { label: "our_pick", tempC: "18–24°C" },
Jun: { label: "our_pick", tempC: "16–23°C" },
Jul: { label: "our_pick", tempC: "15–22°C" },
Aug: { label: "our_pick", tempC: "16–23°C" },
Sep: { label: "our_pick", tempC: "18–25°C" },
Oct: { label: "second_best", tempC: "20–27°C" },
Nov: { label: "off_season", tempC: "22–28°C" },
Dec: { label: "off_season", tempC: "24–30°C" }
},

Argentina: {
Jan: { label: "off_season", tempC: "25–35°C", note: "Peak summer" },
Feb: { label: "off_season", tempC: "24–34°C" },
Mar: { label: "second_best", tempC: "20–28°C" },
Apr: { label: "our_pick", tempC: "15–23°C" },
May: { label: "our_pick", tempC: "12–20°C" },
Jun: { label: "off_season", tempC: "8–15°C" },
Jul: { label: "off_season", tempC: "7–14°C" },
Aug: { label: "off_season", tempC: "9–16°C" },
Sep: { label: "second_best", tempC: "12–20°C" },
Oct: { label: "our_pick", tempC: "15–23°C" },
Nov: { label: "our_pick", tempC: "18–26°C" },
Dec: { label: "off_season", tempC: "22–30°C" }
},

Peru: {
Jan: { label: "off_season", tempC: "18–26°C", note: "Rainy season" },
Feb: { label: "off_season", tempC: "18–26°C" },
Mar: { label: "second_best", tempC: "17–25°C" },
Apr: { label: "our_pick", tempC: "15–23°C" },
May: { label: "our_pick", tempC: "14–22°C" },
Jun: { label: "our_pick", tempC: "12–20°C" },
Jul: { label: "our_pick", tempC: "12–20°C" },
Aug: { label: "our_pick", tempC: "13–21°C" },
Sep: { label: "our_pick", tempC: "14–22°C" },
Oct: { label: "second_best", tempC: "16–24°C" },
Nov: { label: "off_season", tempC: "17–25°C" },
Dec: { label: "off_season", tempC: "18–26°C" }
},

Mexico: {
Jan: { label: "our_pick", tempC: "18–26°C" },
Feb: { label: "our_pick", tempC: "19–27°C" },
Mar: { label: "second_best", tempC: "22–30°C" },
Apr: { label: "off_season", tempC: "25–35°C", note: "Heat rises" },
May: { label: "off_season", tempC: "26–36°C" },
Jun: { label: "off_season", tempC: "26–34°C" },
Jul: { label: "off_season", tempC: "26–34°C" },
Aug: { label: "off_season", tempC: "26–34°C" },
Sep: { label: "off_season", tempC: "25–33°C" },
Oct: { label: "second_best", tempC: "23–30°C" },
Nov: { label: "our_pick", tempC: "20–28°C" },
Dec: { label: "our_pick", tempC: "18–26°C" }
}
}
