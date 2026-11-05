/** The currency categories a logged flight can count toward, besides Last Flight (always). */
export const FLIGHT_CURRENCY_CATEGORIES = ["ifr", "night_proficiency", "peculiar_runways"] as const;
export type FlightCurrencyCategory = (typeof FLIGHT_CURRENCY_CATEGORIES)[number];
