import { Seasonality } from "./types";

export const CITY_SEASONALITY: Record<string, Partial<Seasonality>> = {
  // Extreme north / special light conditions
  Reykjavik: {
    Jan: { label: "off_season", tempC: "-5–1°C", note: "Very short daylight" },
    Feb: { label: "off_season", tempC: "-4–2°C", note: "Limited daylight" },
    Mar: { label: "second_best", tempC: "-2–4°C", note: "Northern lights possible" },
    Apr: { label: "second_best", tempC: "1–7°C", note: "Longer days, lingering snow" },
    May: { label: "second_best", tempC: "5–10°C", note: "Spring thaw, quieter travel" },
    Jun: { label: "our_pick", tempC: "9–15°C", note: "Midnight sun" },
    Jul: { label: "our_pick", tempC: "10–16°C", note: "Best weather, long days" },
    Aug: { label: "second_best", tempC: "9–14°C", note: "Early autumn colors" },
    Sep: { label: "second_best", tempC: "6–11°C", note: "Autumn light, fewer visitors" },
    Oct: { label: "off_season", tempC: "2–7°C", note: "Weather turns unpredictable" },
    Nov: { label: "off_season", tempC: "-1–4°C", note: "Very limited daylight" },
    Dec: { label: "off_season", tempC: "-5–2°C", note: "Polar nights begin" }
  },

  Oslo: {
    Jan: { label: "off_season", tempC: "-7–-1°C", note: "Deep winter cold" },
    Feb: { label: "off_season", tempC: "-6–0°C", note: "Snowy, quiet city" },
    Mar: { label: "second_best", tempC: "-2–5°C", note: "Winter fading slowly" },
    Apr: { label: "second_best", tempC: "4–11°C", note: "Spring arrives, fewer crowds" },
    May: { label: "our_pick", tempC: "10–17°C", note: "Fresh spring atmosphere" },
    Jun: { label: "our_pick", tempC: "14–20°C", note: "Long days, outdoor life" },
    Jul: { label: "our_pick", tempC: "16–22°C", note: "Peak summer energy" },
    Aug: { label: "our_pick", tempC: "15–21°C", note: "Mild weather, relaxed pace" },
    Sep: { label: "second_best", tempC: "11–16°C", note: "Early autumn calm" },
    Oct: { label: "off_season", tempC: "6–10°C", note: "Shortening days" },
    Nov: { label: "off_season", tempC: "0–5°C", note: "Dark, quiet period" },
    Dec: { label: "off_season", tempC: "-5–0°C", note: "Winter settles in" }
  },

  Helsinki: {
    Jan: { label: "off_season", tempC: "-10–-3°C", note: "Harsh winter cold" },
    Feb: { label: "off_season", tempC: "-9–-2°C", note: "Frozen landscapes" },
    Mar: { label: "second_best", tempC: "-4–3°C", note: "Winter loosening grip" },
    Apr: { label: "second_best", tempC: "2–9°C", note: "Spring light returns" },
    May: { label: "our_pick", tempC: "8–15°C", note: "Fresh spring days" },
    Jun: { label: "our_pick", tempC: "13–20°C", note: "Long daylight hours" },
    Jul: { label: "our_pick", tempC: "16–23°C", note: "Peak summer comfort" },
    Aug: { label: "our_pick", tempC: "15–22°C", note: "Warm days, cool evenings" },
    Sep: { label: "second_best", tempC: "10–16°C", note: "Autumn colors appear" },
    Oct: { label: "off_season", tempC: "4–9°C", note: "Grey, quieter weeks" },
    Nov: { label: "off_season", tempC: "-1–4°C", note: "Darkness returns" },
    Dec: { label: "off_season", tempC: "-7–-1°C", note: "Deep winter atmosphere" }
  },

  Dubai: {
    Jan: { label: "our_pick", tempC: "18–25°C", note: "Perfect winter weather" },
    Feb: { label: "our_pick", tempC: "19–27°C", note: "Ideal outdoor conditions" },
    Mar: { label: "second_best", tempC: "22–32°C", note: "Warm days, manageable heat" },
    Apr: { label: "off_season", tempC: "26–38°C", note: "Heat rising quickly" },
    May: { label: "off_season", tempC: "30–42°C", note: "Intense daytime heat" },
    Jun: { label: "off_season", tempC: "35–42°C", note: "Indoor-focused travel" },
    Jul: { label: "off_season", tempC: "38–45°C", note: "Extreme summer heat" },
    Aug: { label: "off_season", tempC: "38–45°C", note: "Very hot, quiet city" },
    Sep: { label: "off_season", tempC: "33–41°C", note: "Heat slowly easing" },
    Oct: { label: "second_best", tempC: "28–38°C", note: "Shoulder season warmth" },
    Nov: { label: "our_pick", tempC: "24–32°C", note: "Comfortable outdoor weather" },
    Dec: { label: "our_pick", tempC: "20–28°C", note: "Peak winter season" }
  },

  Cairo: {
    Jan: { label: "our_pick", tempC: "10–20°C", note: "Mild sightseeing weather" },
    Feb: { label: "our_pick", tempC: "11–22°C", note: "Comfortable winter days" },
    Mar: { label: "second_best", tempC: "14–26°C", note: "Warming but pleasant" },
    Apr: { label: "off_season", tempC: "18–32°C", note: "Heat rising fast" },
    May: { label: "off_season", tempC: "22–36°C", note: "Hot, slower exploration" },
    Jun: { label: "off_season", tempC: "25–38°C", note: "Extreme daytime heat" },
    Jul: { label: "off_season", tempC: "26–40°C", note: "Very hot, low comfort" },
    Aug: { label: "off_season", tempC: "26–40°C", note: "Persistent summer heat" },
    Sep: { label: "off_season", tempC: "24–37°C", note: "Heat slowly easing" },
    Oct: { label: "second_best", tempC: "20–32°C", note: "Transitional shoulder season" },
    Nov: { label: "our_pick", tempC: "16–26°C", note: "Excellent sightseeing weather" },
    Dec: { label: "our_pick", tempC: "12–22°C", note: "Cool, comfortable days" }
  },

  Marrakech: {
    Jan: { label: "our_pick", tempC: "6–18°C", note: "Cool, pleasant days" },
    Feb: { label: "our_pick", tempC: "7–20°C", note: "Mild winter warmth" },
    Mar: { label: "second_best", tempC: "10–24°C", note: "Spring warmth builds" },
    Apr: { label: "our_pick", tempC: "13–28°C", note: "Warm days, lively streets" },
    May: { label: "our_pick", tempC: "16–32°C", note: "Hot afternoons begin" },
    Jun: { label: "off_season", tempC: "20–38°C", note: "Very hot inland heat" },
    Jul: { label: "off_season", tempC: "24–42°C", note: "Extreme summer heat" },
    Aug: { label: "off_season", tempC: "24–42°C", note: "Oppressive daytime heat" },
    Sep: { label: "second_best", tempC: "20–36°C", note: "Heat easing slowly" },
    Oct: { label: "our_pick", tempC: "16–30°C", note: "Ideal autumn weather" },
    Nov: { label: "our_pick", tempC: "10–24°C", note: "Comfortable exploration days" },
    Dec: { label: "our_pick", tempC: "7–20°C", note: "Cool desert evenings" }
  }


}
