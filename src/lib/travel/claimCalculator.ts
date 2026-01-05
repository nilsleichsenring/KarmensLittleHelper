// ========================================================
// Claim calculation – single source of truth
// ========================================================

export type ClaimTotals = {
  /** Sum of all ticket amounts (EUR) */
  claimedTotal: number;

  /** Maximum allowed amount based on distance & travel type */
  approvedMax: number;

  /** claimedTotal - approvedMax ( >0 = overclaimed ) */
  difference: number;
};

// --------------------------------------------------------
// Helpers (internal)
// --------------------------------------------------------
function calculateParticipantMax(
  isGreen: boolean | null,
  rates: { standard: number | null; green: number | null }
): number {
  if (rates.standard == null || rates.green == null) return 0;

  // Fallback: treat NULL as standard travel
  return isGreen ? rates.green : rates.standard;
}

// --------------------------------------------------------
// Public API
// --------------------------------------------------------
export function calculateClaimTotals(
  participants: { is_green_travel: boolean | null }[],
  tickets: { amount_eur: number | null }[],
  rates: { standard: number | null; green: number | null }
): ClaimTotals {
  // 1️⃣ Claimed total (tickets)
  const claimedTotal = tickets.reduce(
    (sum, t) => sum + (t.amount_eur ?? 0),
    0
  );

  // 2️⃣ Approved maximum (participants × rate)
  const approvedMax = participants.reduce((sum, p) => {
    return sum + calculateParticipantMax(p.is_green_travel, rates);
  }, 0);

  // 3️⃣ Difference
  const difference = claimedTotal - approvedMax;

  return {
    claimedTotal,
    approvedMax,
    difference,
  };
}
