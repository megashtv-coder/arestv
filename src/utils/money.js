/**
 * Round to 2 decimal places, the way currency amounts should always be
 * stored. Plain float addition/subtraction (e.g. paidAmount + newPayment,
 * amount - fee) drifts into values like 800.0000000000001 — invisible in
 * formatted display (fmt() already rounds), but poisons anything that
 * stores or compares the raw number afterwards (e.g. "is this invoice now
 * fully paid?" via paidAmount >= amount). Round right after the arithmetic,
 * not just at display time, so the stored value itself stays clean.
 */
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}
