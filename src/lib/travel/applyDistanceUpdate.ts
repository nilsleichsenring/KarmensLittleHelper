// src/lib/travel/applyDistanceUpdate.ts

import {
  calculateDistanceBand,
  calculateRatesForBand,
} from "./rateCalculator";

/**
 * Centralized business logic:
 * Given a distance in km, derive band + rates.
 * This is the single source of truth for distance handling.
 */
export function applyDistanceUpdate(distanceKm: number | null) {
  if (distanceKm == null || Number.isNaN(distanceKm)) {
    return {
      distance_km: null,
      distance_band: null,
      rate_standard_eur: null,
      rate_green_eur: null,
    };
  }

  const band = calculateDistanceBand(distanceKm);
  const rates = calculateRatesForBand(band);

  return {
    distance_km: distanceKm,
    distance_band: band,
    rate_standard_eur: rates.standard,
    rate_green_eur: rates.green,
  };
}
