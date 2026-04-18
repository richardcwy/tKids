export const MIN_AGE = 13;

// Returns true if a user born in `birthYear` is at least MIN_AGE years old
// as of `currentYear`. Year-only (no month/day) per PII-minimization.
// Edge case: we accept "turns 13 this year" as old enough — the year-only
// model is conservative by one year at most.
export function isAgeOk(birthYear: number, currentYear: number): boolean {
  if (!Number.isFinite(birthYear) || !Number.isFinite(currentYear)) return false;
  const age = currentYear - birthYear;
  return age >= MIN_AGE;
}
