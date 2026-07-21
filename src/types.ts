export type Tier = "Budget" | "Mid-tier" | "Premium" | "Luxury";

export const TIER_ORDER: Tier[] = ["Budget", "Mid-tier", "Premium", "Luxury"];

export type ClubProfile = {
  id: string;
  created_at: string | null;
  name: string | null;
  location: string | null;
  joining_fee_7day: number | null;
  joining_fee_5day: number | null;
  clubhouse_bar_levy: number | null;
  year: number | null;
  total_historic_revenue: number | null;
  total_member_count: number | null;
  price_under_12: number | null;
  price_junior_12_18: number | null;
  price_colt_21: number | null;
  price_intermediate_25: number | null;
  price_intermediate_28: number | null;
  price_intermediate_31_35: number | null;
  price_full_7day_adult: number | null;
  price_5day_adult: number | null;
  price_country_member: number | null;
  price_student: number | null;
  tier: Tier | null;
  lat?: number | null;
  lng?: number | null;
};

export type SelectedClub = {
  tier: Tier;
  club: ClubProfile;
};
