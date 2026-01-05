// src/pages/admin/project/types.ts

export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;

  organisation_id: string | null;
  project_type: string | null;

  // NEW FIELD
  project_reference: string | null;

  start_date: string | null;
  end_date: string | null;
  internal_notes: string | null;

  // 👇 NEU – das fehlende Puzzlestück
  project_access_token: string | null;

  // Host organisation info (JOIN via organisations table)
  organisations?: {
    name: string;
    country_code: string;
  } | null;
};

export type ProjectCountry = {
  id: string;
  project_id: string;
  country_code: string;
  created_at: string;
};

export type ProjectPartnerOrg = {
  id: string;
  project_id: string;
  country_code: string | null;
  organisation_name: string;
  created_at: string;

  // Kontakt (vom Partner / Admin korrigierbar)
  contact_name: string | null;
  contact_email: string | null;

  // Organisations-Anschrift
  address_line1: string | null;
  address_line2: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_region: string | null;

  // Bankdaten
  account_holder: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;

  // Konto-Inhaber-Anschrift
  use_org_address_for_bank: boolean | null;
  bank_address_line1: string | null;
  bank_address_line2: string | null;
  bank_address_postal_code: string | null;
  bank_address_city: string | null;
  bank_address_region: string | null;

  // Distanz & Raten
  distance_km: number | null;
  distance_band: number | null;
  rate_standard_eur: number | null;
  rate_green_eur: number | null;
};

export type CountryRef = {
  code: string;
  name: string;
};

/* =========================================================
   CLAIM / SUBMISSION
========================================================= */

export type ClaimStatus =
  | "open"
  | "approved"
  | "adjusted"
  | "rejected";


export type PaymentStatus = "unpaid" | "paid";

export type SubmissionSummary = {
  id: string;
  project_id: string;
  country_code: string;
  organisation_name: string;

  submitted: boolean;
  submitted_at: string | null;

  reviewed_at: string | null;
  claim_status: ClaimStatus;

  /* 🆕 Payment */
  payment_status: PaymentStatus;
  payment_paid_at: string | null;

  participantCount: number;
  ticketCount: number;
  totalEur: number;
};


export type Participant = {
  id: string;
  full_name: string;

  // Partner & Admin (Admin darf überschreiben)
  is_green_travel?: boolean | null;
};

export type Ticket = {
  id: string;
  from_location: string;
  to_location: string;
  travel_mode: string | null;

  currency: string;
  amount_eur: number;
  amount_original: number | null;

  trip_type: "oneway" | "return" | "roundtrip" | null;
  file_url: string | null;

  // 🆕 Admin review fields
  approved: boolean;              // 🔒 required
  admin_note?: string | null;     // optional (future-proof)
};

