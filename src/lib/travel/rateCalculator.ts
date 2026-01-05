// ========================================================
// Distance → Band
// ========================================================
export function calculateDistanceBand(
  distanceKm: number | null
): number | null {
  if (distanceKm == null) return null;

  if (distanceKm < 10) return 0;          // 0–9 km
  if (distanceKm <= 99) return 1;         // 10–99 km
  if (distanceKm <= 499) return 2;        // 100–499 km
  if (distanceKm <= 1999) return 3;       // 500–1999 km
  if (distanceKm <= 2999) return 4;       // 2000–2999 km
  if (distanceKm <= 3999) return 5;       // 3000–3999 km

  return null; // außerhalb der definierten Bänder
}

// ========================================================
// Band → Rates (EUR)
// ========================================================
export function calculateRatesForBand(
  band: number | null
): {
  standard: number | null;
  green: number | null;
} {
  switch (band) {
    case 0:
      return { standard: 0, green: 0 };
    case 1:
      return { standard: 28, green: 56 };
    case 2:
      return { standard: 211, green: 285 };
    case 3:
      return { standard: 309, green: 417 };
    case 4:
      return { standard: 395, green: 535 };
    case 5:
      return { standard: 580, green: 785 }; // 3000–3999 km
    default:
      return { standard: null, green: null };
  }
}

// ========================================================
// Participant → Max Allowed (Fallback = Standard)
// ========================================================
export function calculateParticipantMax(
  isGreen: boolean | null,
  rates: { standard: number | null; green: number | null }
): number {
  if (rates.standard == null) return 0;

  // Nur explizit TRUE zählt als Green
  if (isGreen === true) {
    return rates.green ?? rates.standard;
  }

  // false / null / undefined → Standard
  return rates.standard;
}

// ========================================================
// Submission → Max Allowed Total
// ========================================================
export function calculateSubmissionMax(
  participants: { is_green_travel: boolean | null }[],
  rates: { standard: number | null; green: number | null }
): number {
  return participants.reduce((sum, p) => {
    return sum + calculateParticipantMax(p.is_green_travel, rates);
  }, 0);
}

// ========================================================
// Submission → Claimed Total (EUR)
// ========================================================
export function calculateClaimedTotal(
  tickets: { amount_eur: number }[]
): number {
  return tickets.reduce((sum, t) => sum + (t.amount_eur || 0), 0);
}

// ========================================================
// Difference
// positive  → overclaimed
// negative  → still below max
// ========================================================
export function calculateDifference(
  claimed: number,
  maxAllowed: number
): number {
  return claimed - maxAllowed;
}
