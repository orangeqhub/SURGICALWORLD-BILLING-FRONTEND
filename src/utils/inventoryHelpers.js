import { NEAR_EXPIRY_DAYS, BATCH_STATUSES } from '../constants/inventorySettings';

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / DAY_MS);
}

export function isExpired(dateStr) {
  const days = daysUntil(dateStr);
  return days !== null && days < 0;
}

export function isNearExpiry(dateStr, thresholdDays = NEAR_EXPIRY_DAYS) {
  const days = daysUntil(dateStr);
  return days !== null && days >= 0 && days <= thresholdDays;
}

export function computeBatchStatus(batch) {
  if (batch.status === 'BLOCKED') return BATCH_STATUSES.BLOCKED;
  const available = Number(batch.available) || 0;
  if (available <= 0) return BATCH_STATUSES.DEPLETED;
  if (isExpired(batch.expiryDate)) return BATCH_STATUSES.EXPIRED;
  if (isNearExpiry(batch.expiryDate)) return BATCH_STATUSES.NEAR_EXPIRY;
  return BATCH_STATUSES.ACTIVE;
}

// --- Shared master-data validation ---

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const HSN_RE = /^\d{4,8}$/;

export function validateMobile(value) {
  if (!value) return null;
  return MOBILE_RE.test(value) ? null : 'Enter a valid 10-digit mobile number';
}

export function validateEmail(value) {
  if (!value) return null;
  return EMAIL_RE.test(value) ? null : 'Enter a valid email address';
}

export function validateGst(value) {
  if (!value) return null;
  return GST_RE.test(value.toUpperCase()) ? null : 'Enter a valid 15-character GSTIN';
}

export function validateIfsc(value) {
  if (!value) return null;
  return IFSC_RE.test(value.toUpperCase()) ? null : 'Enter a valid IFSC code (e.g. HDFC0001234)';
}

export function validateHsn(value) {
  if (!value) return null;
  return HSN_RE.test(value) ? null : 'HSN code should be 4-8 digits';
}

export function validateNonNegative(value, label) {
  if (value === '' || value === null || value === undefined) return null;
  return Number(value) < 0 ? `${label} cannot be negative` : null;
}

export default {
  daysUntil,
  isExpired,
  isNearExpiry,
  computeBatchStatus,
  validateMobile,
  validateEmail,
  validateGst,
  validateIfsc,
  validateHsn,
  validateNonNegative,
};
