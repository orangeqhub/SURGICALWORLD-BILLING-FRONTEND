/**
 * Shared pre-tax invoice-discount allocator, used by both the Purchase
 * Editor (src/utils/purchaseCalculations.js) and Billing
 * (src/context/BillingContext.js) so the same rule applies everywhere an
 * invoice/bill-level discount exists (see
 * docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3):
 *
 *   allocatedDiscount = invoiceDiscount * lineTaxable / totalTaxable
 *
 * The last eligible line absorbs the rounding remainder so the sum of
 * allocated amounts always equals the invoice discount exactly (to the
 * paisa/cent). GST must be computed from each line's *adjusted* taxable
 * amount after this allocation, never from the pre-discount amount.
 */
export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * @param {{ taxableAmount: number }[]} lines - each line's taxable amount
 *   after item-level discount, before invoice-level discount
 * @param {number} invoiceDiscount
 * @returns {number[]} allocatedDiscount per line, same order as input,
 *   summing exactly to min(invoiceDiscount, total taxable)
 */
export function allocateInvoiceDiscount(lines, invoiceDiscount) {
  const totalTaxable = lines.reduce((sum, l) => sum + l.taxableAmount, 0);
  const safeDiscount = Math.min(Math.max(Number(invoiceDiscount) || 0, 0), totalTaxable);

  if (totalTaxable <= 0 || safeDiscount <= 0) {
    return lines.map(() => 0);
  }

  let allocatedSoFar = 0;
  return lines.map((line, index) => {
    const isLast = index === lines.length - 1;
    const share = isLast ? round2(safeDiscount - allocatedSoFar) : round2((safeDiscount * line.taxableAmount) / totalTaxable);
    allocatedSoFar = round2(allocatedSoFar + share);
    return share;
  });
}

export default { round2, allocateInvoiceDiscount };
