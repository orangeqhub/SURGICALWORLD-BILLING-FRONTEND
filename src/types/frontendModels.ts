/**
 * Shared type definitions for the frontend-only CRM/Ledger/Payments/Receipts
 * extension (see docs/FRONTEND_PHASE_IMPLEMENTATION.md). None of these are
 * backed by SQLite tables - they are persisted via AsyncStorage through
 * src/services/mock and exposed to screens through src/services/api, so the
 * mock layer can be swapped for real backend calls later without UI changes.
 */

export type LedgerPartyType = 'CUSTOMER' | 'SUPPLIER';

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export type LedgerReferenceType = 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'RECEIPT' | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  branchId: string;
  partyType: LedgerPartyType;
  partyId: string;
  partyName: string;
  type: LedgerEntryType;
  amount: number;
  referenceType: LedgerReferenceType;
  referenceId: string | null;
  note: string;
  date: string;
  createdBy: string | null;
}

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE';

export interface PaymentRecord {
  id: string;
  branchId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  note: string;
  date: string;
  createdBy: string | null;
  status: 'RECORDED' | 'VOID';
}

export interface ReceiptRecord {
  id: string;
  branchId: string;
  customerId: string;
  customerName: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  note: string;
  date: string;
  createdBy: string | null;
  status: 'RECORDED' | 'VOID';
}

export interface CrmNote {
  id: string;
  customerId: string;
  branchId: string;
  note: string;
  followUpDate: string | null;
  createdBy: string | null;
  createdAt: string;
}
