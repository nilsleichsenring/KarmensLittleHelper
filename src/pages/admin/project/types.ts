// src/pages/admin/project/types.ts

export type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  organisation_id: string | null;
  project_type: string | null;
  start_date: string | null;
  end_date: string | null;
  internal_notes: string | null;
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
};

export type CountryRef = {
  code: string;
  name: string;
};

export type SubmissionSummary = {
  id: string;
  organisation_name: string;
  country_code: string;
  submitted: boolean;
  submitted_at: string | null;
  participantCount: number;
  ticketCount: number;
  totalEur: number;
};

export type Participant = {
  id: string;
  full_name: string;
};

export type Ticket = {
  id: string;
  from_location: string;
  to_location: string;
  amount_eur: number;
  assigned_participants?: { id: string; full_name: string }[];
};
