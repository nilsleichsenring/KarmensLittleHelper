// src/lib/travel/travelIcons.ts

/**
 * Maps travel_mode to a human-readable icon.
 * Pure presentation logic.
 */

export type TravelMode =
  | "flight"
  | "train"
  | "bus"
  | "car"
  | "carpooling"
  | "ship"
  | "other";

export function getTravelModeIcon(
  mode: TravelMode | string | null
): string {
  switch (mode) {
    case "flight":
      return "✈️";
    case "train":
      return "🚆";
    case "bus":
      return "🚌";
    case "car":
      return "🚗";
    case "carpooling":
      return "🚗👥";
    case "ship":
      return "🚢";
    case "other":
      return "❓";
    default:
      return "—";
  }
}
