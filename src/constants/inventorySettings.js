/**
 * Frontend-only inventory configuration (see docs/FRONTEND_PHASE_IMPLEMENTATION.md,
 * Phase 2). Kept as simple constants so a backend-driven setting can replace
 * this file later without touching call sites.
 */
export const NEAR_EXPIRY_DAYS = 90;

export const BATCH_STATUSES = {
  ACTIVE: 'ACTIVE',
  NEAR_EXPIRY: 'NEAR_EXPIRY',
  EXPIRED: 'EXPIRED',
  DEPLETED: 'DEPLETED',
  BLOCKED: 'BLOCKED',
};

export const ADJUSTMENT_REASONS = ['Opening Stock', 'Damaged', 'Expired', 'Missing', 'Excess', 'Correction', 'Other'];

export const MOVEMENT_TYPES = [
  'OPENING_STOCK',
  'PURCHASE',
  'SALE',
  'PURCHASE_RETURN',
  'SALES_RETURN',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE',
  'DAMAGED',
  'EXPIRED',
];

export const OPENING_BALANCE_TYPES = [
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Credit', value: 'CREDIT' },
];

export const PAYMENT_TERMS_OPTIONS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Net 7', value: 'NET_7' },
  { label: 'Net 15', value: 'NET_15' },
  { label: 'Net 30', value: 'NET_30' },
  { label: 'Net 45', value: 'NET_45' },
];

export default {
  NEAR_EXPIRY_DAYS,
  BATCH_STATUSES,
  ADJUSTMENT_REASONS,
  MOVEMENT_TYPES,
  OPENING_BALANCE_TYPES,
  PAYMENT_TERMS_OPTIONS,
};
