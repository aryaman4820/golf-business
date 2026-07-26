import type { ClubProfile, Tier } from "../types";

export type PricingContext = {
  age: number;
  isStudentVerified: boolean;
};

export function resolveClubPrice(
  club: ClubProfile,
  ctx: PricingContext,
  userAge: number = 36,
  isStudentVerified: boolean = false,
): number {
  const basePeak = Number(club.price_full_7day_adult) || 0;

  if (isStudentVerified && club.price_student && Number(club.price_student) > 0) {
    return Number(club.price_student);
  }

  let calculatedPrice: number | null;
  if (userAge < 12) {
    calculatedPrice = club.price_under_12;
  } else if (userAge >= 12 && userAge <= 17) {
    calculatedPrice = club.price_junior_12_18;
  } else if (userAge >= 18 && userAge <= 21) {
    calculatedPrice = club.price_colt_21;
  } else if (userAge >= 22 && userAge <= 25) {
    calculatedPrice = club.price_intermediate_25;
  } else if (userAge >= 26 && userAge <= 29) {
    calculatedPrice = club.price_intermediate_28;
  } else if (userAge >= 30 && userAge <= 35) {
    calculatedPrice = club.price_intermediate_31_35;
  } else {
    calculatedPrice = basePeak;
  }

  const finalPrice = Number(calculatedPrice);
  return finalPrice > 0 ? finalPrice : basePeak;
}

export const EXTRA_COURSE_FEE: Record<Tier, number> = {
  Budget: 50,
  "Mid-tier": 100,
  Premium: 200,
  Luxury: 400,
};

export const INCLUDED_COURSES = 4;

export type PackageBreakdown = {
  totalRevenueSum: number;
  totalMembersSum: number;
  calculatedBasePrice: number;
  highestStandalonePrice: number;
  packageSubscriptionTotal: number;
  extraCourseCount: number;
  extraCourseFeePer: number;
  totalExtraCourseFees: number;
  totalJoining: number;
  totalLevy: number;
  totalStaticUpfrontFees: number;
  grandTotal: number;
  clubCount: number;
};

export function computePackageBreakdown(
  clubs: ClubProfile[],
  ctx: PricingContext,
  activeTier: Tier,
): PackageBreakdown {
  const clubCount = clubs.length;

  // ── Step 1: Compute the sums for selected clubs (raw DB statistics) ──
  let totalRevenueSum = 0;
  let totalMembersSum = 0;
  for (const club of clubs) {
    totalRevenueSum += Number(club.total_historic_revenue) || 0;
    totalMembersSum += Number(club.total_member_count) || 0;
  }

  // ── Step 2: Execute the division and markup equation ──
  let calculatedBasePrice =
    totalMembersSum > 0 ? (totalRevenueSum / totalMembersSum) * 1.12 : 0;

  // ── Step 3: Apply the max standalone override floor ──
  let highestStandalonePrice = 0;
  for (const club of clubs) {
    const standalone = resolveClubPrice(club, ctx, ctx.age, ctx.isStudentVerified);
    if (standalone > highestStandalonePrice) {
      highestStandalonePrice = standalone;
    }
  }

  if (calculatedBasePrice < highestStandalonePrice) {
    calculatedBasePrice = highestStandalonePrice * 1.1;
  }

  // ── Step 4: Add extra course fees (if above 4 courses) ──
  const extraCourseCount = Math.max(0, clubCount - INCLUDED_COURSES);
  const extraCourseFeePer = EXTRA_COURSE_FEE[activeTier] ?? 0;
  const totalExtraCourseFees = extraCourseCount * extraCourseFeePer;

  const packageSubscriptionTotal = calculatedBasePrice + totalExtraCourseFees;

  // ── Step 5: Accumulate static fixed entry fees ──
  let totalJoining = 0;
  let totalLevy = 0;
  for (const club of clubs) {
    totalJoining += Number(club.joining_fee_7day) || 0;
    totalLevy += Number(club.clubhouse_bar_levy) || 0;
  }
  const totalStaticUpfrontFees = totalJoining + totalLevy;

  // ── Step 6: Final grand total ──
  const grandTotal = packageSubscriptionTotal + totalStaticUpfrontFees;

  return {
    totalRevenueSum,
    totalMembersSum,
    calculatedBasePrice,
    highestStandalonePrice,
    packageSubscriptionTotal,
    extraCourseCount,
    extraCourseFeePer,
    totalExtraCourseFees,
    totalJoining,
    totalLevy,
    totalStaticUpfrontFees,
    grandTotal,
    clubCount,
  };
}

export function packageTotal(
  clubs: ClubProfile[],
  ctx: PricingContext,
  activeTier: Tier,
): number {
  return computePackageBreakdown(clubs, ctx, activeTier).grandTotal;
}
