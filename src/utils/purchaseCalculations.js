/**
 * Pure calculation helpers for the frontend Purchase Editor and Billing
 * invoice-level discount (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase
 * 3). Kept side-effect free so they can be spot-checked and reused by both
 * the editor/billing UI and the purchase/print preview without duplicating
 * math.
 *
 * Invoice-level discount is a PRE-TAX allocation: it is spread across each
 * line's taxable amount (proportional to that line's share of total taxable
 * value) before GST is computed on the adjusted taxable amount. This is
 * different from a post-tax commercial write-off, which is out of scope here
 * (see calculatePurchaseTotals doc comment).
 */

import { round2, allocateInvoiceDiscount } from './discountAllocation';

/** Item-discount-only line math (no invoice-level allocation) - used for the
 * live per-line preview while editing, before invoice discount is relevant. */
export function calculateLine(item) {
  const quantity = Number(item.quantity) || 0;
  const purchasePrice = Number(item.purchasePrice) || 0;
  const discountPercent = Number(item.discountPercent) || 0;
  const gstPercent = Number(item.gstPercent) || 0;
  const isInterState = Boolean(item.isInterState);

  const grossAmount = quantity * purchasePrice;
  const discountFromPercent = (grossAmount * discountPercent) / 100;
  const discountAmount = item.discountAmount !== undefined && item.discountAmount !== ''
    ? Math.min(Number(item.discountAmount) || 0, grossAmount)
    : Math.min(discountFromPercent, grossAmount);

  const taxableAmount = Math.max(round2(grossAmount - discountAmount), 0);
  const taxAmount = round2((taxableAmount * gstPercent) / 100);
  const cgst = isInterState ? 0 : round2(taxAmount / 2);
  const sgst = isInterState ? 0 : round2(taxAmount / 2);
  const igst = isInterState ? taxAmount : 0;
  const lineTotal = round2(taxableAmount + cgst + sgst + igst);

  return { grossAmount, discountAmount, taxableAmount, cgst, sgst, igst, lineTotal };
}

function lineTaxableBeforeInvoiceDiscount(item) {
  const quantity = Number(item.quantity) || 0;
  const purchasePrice = Number(item.purchasePrice) || 0;
  const discountPercent = Number(item.discountPercent) || 0;
  const grossAmount = quantity * purchasePrice;
  const discountFromPercent = (grossAmount * discountPercent) / 100;
  const discountAmount = item.discountAmount !== undefined && item.discountAmount !== ''
    ? Math.min(Number(item.discountAmount) || 0, grossAmount)
    : Math.min(discountFromPercent, grossAmount);
  const taxableAmount = Math.max(round2(grossAmount - discountAmount), 0);
  return { grossAmount, discountAmount, taxableAmount };
}

/**
 * Full totals including invoice-level discount, allocated pre-tax:
 *  1. Gross line amount
 *  2. Item discount -> line taxable (before invoice discount)
 *  3. Invoice discount allocated proportionally across eligible lines
 *     (allocatedDiscount = invoiceDiscount * lineTaxable / totalTaxable);
 *     the last eligible line absorbs the rounding remainder so the sum of
 *     allocated amounts always equals the invoice discount exactly.
 *  4. GST recomputed per line from each line's adjusted taxable amount
 *  5. Other charges are added post-tax and are NOT taxed themselves - see
 *     "Other Charges rule" in docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3.
 *  6. Round-off to the nearest currency unit.
 *
 * A post-tax commercial discount (e.g. a settlement write-off applied after
 * invoicing) would need a separate, explicitly named field - it is not what
 * `invoiceDiscount` here represents.
 */
export function calculatePurchaseTotals(items = [], { invoiceDiscount = 0, otherCharges = 0, isInterState = false } = {}) {
  const baseLines = items.map((item) => ({ ...item, ...lineTaxableBeforeInvoiceDiscount(item), gstPercent: Number(item.gstPercent) || 0 }));
  const totalTaxableBeforeInvoiceDiscount = baseLines.reduce((sum, l) => sum + l.taxableAmount, 0);
  const safeInvoiceDiscount = Math.min(Math.max(Number(invoiceDiscount) || 0, 0), totalTaxableBeforeInvoiceDiscount);
  const allocations = allocateInvoiceDiscount(baseLines, safeInvoiceDiscount);

  const lines = baseLines.map((line, index) => {
    const allocatedInvoiceDiscount = allocations[index];
    const adjustedTaxable = Math.max(round2(line.taxableAmount - allocatedInvoiceDiscount), 0);
    const taxAmount = round2((adjustedTaxable * line.gstPercent) / 100);
    const cgst = isInterState ? 0 : round2(taxAmount / 2);
    const sgst = isInterState ? 0 : round2(taxAmount / 2);
    const igst = isInterState ? taxAmount : 0;
    const lineTotal = round2(adjustedTaxable + cgst + sgst + igst);

    return { ...line, allocatedInvoiceDiscount, adjustedTaxable, cgst, sgst, igst, lineTotal };
  });

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalFreeQuantity = items.reduce((sum, item) => sum + (Number(item.freeQuantity) || 0), 0);
  const grossAmount = lines.reduce((sum, l) => sum + l.grossAmount, 0);
  const productDiscounts = lines.reduce((sum, l) => sum + l.discountAmount, 0);
  const taxableAmount = round2(lines.reduce((sum, l) => sum + l.adjustedTaxable, 0));
  const cgst = round2(lines.reduce((sum, l) => sum + l.cgst, 0));
  const sgst = round2(lines.reduce((sum, l) => sum + l.sgst, 0));
  const igst = round2(lines.reduce((sum, l) => sum + l.igst, 0));
  const taxTotal = round2(cgst + sgst + igst);
  const otherChargesAmount = Number(otherCharges) || 0;

  // Other Charges are treated as non-taxable in this frontend phase (Rule A -
  // see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase 3): added straight to
  // the net amount, after tax, with no GST computed on them. The UI labels
  // this field "Other Charges (Non-taxable)" to make the rule visible.
  const netBeforeRound = taxableAmount + taxTotal + otherChargesAmount;
  const netAmount = Math.round(netBeforeRound);
  const roundOff = round2(netAmount - netBeforeRound);

  return {
    lines,
    totalQuantity,
    totalFreeQuantity,
    grossAmount,
    productDiscounts,
    invoiceDiscount: safeInvoiceDiscount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    otherCharges: otherChargesAmount,
    roundOff,
    netAmount,
  };
}

export function calculateBalance(netAmount, paidAmount) {
  const paid = Math.min(Number(paidAmount) || 0, netAmount);
  return { paidAmount: paid, balanceAmount: Math.max(round2(netAmount - paid), 0) };
}

export default { calculateLine, calculatePurchaseTotals, calculateBalance };
