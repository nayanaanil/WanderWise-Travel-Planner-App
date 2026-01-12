import { Seasonality } from "./types"

export const REGION_SEASONALITY: Record<string, Seasonality> = {
  "European Christmas Markets": {
    Jan: { label: "off_season", tempC: "-5–5°C", note: "Markets closed, quiet towns" },
    Feb: { label: "off_season", tempC: "-3–7°C", note: "Winter calm after festivities" },
    Mar: { label: "off_season", tempC: "2–12°C", note: "Spring without market activity" },
    Apr: { label: "off_season", tempC: "7–16°C" },
    May: { label: "off_season", tempC: "12–20°C" },
    Jun: { label: "off_season", tempC: "16–24°C" },
    Jul: { label: "off_season", tempC: "18–27°C" },
    Aug: { label: "off_season", tempC: "18–27°C" },
    Sep: { label: "off_season", tempC: "14–22°C" },
    Oct: { label: "second_best", tempC: "9–16°C", note: "Early markets in select cities" },
    Nov: { label: "our_pick", tempC: "3–10°C", note: "Markets open, festive mood begins" },
    Dec: { label: "our_pick", tempC: "-2–6°C", note: "Peak festive atmosphere" }
  },

  "Swiss Alps": {
    Jan: { label: "our_pick", tempC: "-10–0°C", note: "Peak ski season" },
    Feb: { label: "our_pick", tempC: "-9–1°C", note: "Reliable snow conditions" },
    Mar: { label: "second_best", tempC: "-5–5°C", note: "Late skiing, sunnier days" },
    Apr: { label: "off_season", tempC: "0–10°C", note: "Snow melts, quiet resorts" },
    May: { label: "off_season", tempC: "5–15°C", note: "Between winter and summer seasons" },
    Jun: { label: "second_best", tempC: "10–20°C", note: "Early hiking season" },
    Jul: { label: "our_pick", tempC: "12–22°C", note: "Peak hiking and alpine views" },
    Aug: { label: "our_pick", tempC: "12–22°C" },
    Sep: { label: "our_pick", tempC: "8–18°C", note: "Clear trails, autumn colors" },
    Oct: { label: "second_best", tempC: "4–12°C", note: "Quiet mountains, crisp air" },
    Nov: { label: "off_season", tempC: "-2–6°C", note: "Pre-ski lull" },
    Dec: { label: "our_pick", tempC: "-8–0°C", note: "Ski season begins" }
  },

  "Greek Islands": {
    Jan: { label: "off_season", tempC: "8–14°C", note: "Quiet islands, limited services" },
    Feb: { label: "off_season", tempC: "9–15°C" },
    Mar: { label: "second_best", tempC: "11–18°C", note: "Spring calm before crowds" },
    Apr: { label: "our_pick", tempC: "15–22°C" },
    May: { label: "our_pick", tempC: "18–26°C" },
    Jun: { label: "second_best", tempC: "22–30°C" },
    Jul: { label: "off_season", tempC: "26–35°C", note: "Very hot, peak crowds" },
    Aug: { label: "off_season", tempC: "26–35°C", note: "Hot, busy summer energy" },
    Sep: { label: "our_pick", tempC: "22–30°C" },
    Oct: { label: "our_pick", tempC: "18–25°C" },
    Nov: { label: "second_best", tempC: "13–20°C" },
    Dec: { label: "off_season", tempC: "9–15°C", note: "Off-season island pace" }
  },

  "Scandinavia": {
    Jan: { label: "off_season", tempC: "-15–-5°C", note: "Extreme cold, limited daylight" },
    Feb: { label: "off_season", tempC: "-14–-4°C", note: "Deep winter conditions" },
    Mar: { label: "second_best", tempC: "-8–2°C", note: "Northern lights linger" },
    Apr: { label: "second_best", tempC: "-1–8°C", note: "Snow retreating, longer days" },
    May: { label: "our_pick", tempC: "5–14°C" },
    Jun: { label: "our_pick", tempC: "10–20°C", note: "Long days, mild weather" },
    Jul: { label: "our_pick", tempC: "14–22°C", note: "Peak summer, midnight sun" },
    Aug: { label: "our_pick", tempC: "13–21°C" },
    Sep: { label: "second_best", tempC: "8–15°C", note: "Autumn colors, fewer visitors" },
    Oct: { label: "off_season", tempC: "2–9°C", note: "Darkening days, shoulder lull" },
    Nov: { label: "off_season", tempC: "-4–3°C" },
    Dec: { label: "off_season", tempC: "-12–-3°C", note: "Polar nights begin" }
  },

  "South East Asia": {
    Jan: { label: "our_pick", tempC: "24–30°C" },
    Feb: { label: "our_pick", tempC: "25–32°C" },
    Mar: { label: "second_best", tempC: "26–34°C" },
    Apr: { label: "off_season", tempC: "28–36°C", note: "Very hot, slower sightseeing" },
    May: { label: "off_season", tempC: "27–34°C", note: "Monsoon rains begin" },
    Jun: { label: "off_season", tempC: "26–32°C", note: "Lush landscapes, fewer crowds" },
    Jul: { label: "off_season", tempC: "26–32°C" },
    Aug: { label: "off_season", tempC: "26–32°C" },
    Sep: { label: "off_season", tempC: "25–31°C" },
    Oct: { label: "second_best", tempC: "25–31°C", note: "Rain eases, shoulder season" },
    Nov: { label: "our_pick", tempC: "24–30°C" },
    Dec: { label: "our_pick", tempC: "24–30°C" }
  },

  "Mediterranean Coast": {
    Jan: { label: "off_season", tempC: "8–14°C", note: "Quiet coastal towns" },
    Feb: { label: "off_season", tempC: "9–15°C" },
    Mar: { label: "second_best", tempC: "12–18°C" },
    Apr: { label: "our_pick", tempC: "15–22°C" },
    May: { label: "our_pick", tempC: "18–26°C" },
    Jun: { label: "second_best", tempC: "22–30°C" },
    Jul: { label: "off_season", tempC: "26–35°C", note: "Intense heat, peak crowds" },
    Aug: { label: "off_season", tempC: "26–35°C", note: "Hot, busy summer coast" },
    Sep: { label: "our_pick", tempC: "22–30°C" },
    Oct: { label: "our_pick", tempC: "18–25°C" },
    Nov: { label: "second_best", tempC: "13–20°C" },
    Dec: { label: "off_season", tempC: "9–15°C" }
  },

  "Patagonia": {
    Jan: { label: "our_pick", tempC: "10–18°C", note: "Peak trekking season" },
    Feb: { label: "our_pick", tempC: "9–17°C" },
    Mar: { label: "second_best", tempC: "7–15°C", note: "Autumn colors begin" },
    Apr: { label: "off_season", tempC: "4–11°C", note: "Weather turns unpredictable" },
    May: { label: "off_season", tempC: "1–8°C" },
    Jun: { label: "off_season", tempC: "-1–5°C" },
    Jul: { label: "off_season", tempC: "-2–4°C" },
    Aug: { label: "off_season", tempC: "-1–5°C" },
    Sep: { label: "second_best", tempC: "3–10°C", note: "Early spring conditions" },
    Oct: { label: "our_pick", tempC: "6–14°C" },
    Nov: { label: "our_pick", tempC: "8–16°C" },
    Dec: { label: "our_pick", tempC: "9–17°C" }
  }

}
