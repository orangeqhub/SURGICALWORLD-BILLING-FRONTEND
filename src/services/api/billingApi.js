import apiClient, { isMockMode } from './apiClient';
import {
  completeBill,
  holdBill,
  listHeldBills,
  discardHeldBill,
  listInvoices,
  listAllInvoices,
  getInvoiceWithLines,
} from '../../database/repositories/invoiceRepository';
import { enqueueSync } from '../../database/repositories/syncRepository';
import { addLedgerEntry, fetchLedgerEntries } from './ledgerApi';
import { getCustomerById } from './customerMasterApi';

/**
 * Real credit/partial sales must raise the customer's receivable balance so
 * Receivables & Payables (ledger-driven) reflects them - invoices themselves
 * carry no ledger row. Mirrors the Payment/Receipt -> ledger pattern already
 * used by paymentStore.js/receiptStore.js. Skipped for walk-in sales (no
 * customerId) and fully-paid invoices, and never blocks the sale itself.
 */
async function recordCreditSaleLedgerEntry(input, invoice) {
  if (!input.customerId) return;
  const paidTotal = (input.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Number(input.grandTotal) - paidTotal;
  if (outstanding <= 0) return;
  try {
    const existing = await fetchLedgerEntries({ branchId: input.branchId, partyType: 'CUSTOMER', partyId: input.customerId });
    if (existing.some((e) => e.referenceType === 'INVOICE' && e.referenceId === invoice.localId)) return;
    const customer = await getCustomerById(input.branchId, input.customerId);
    await addLedgerEntry({
      branchId: input.branchId,
      partyType: 'CUSTOMER',
      partyId: input.customerId,
      partyName: customer?.name || input.customerId,
      type: 'DEBIT',
      amount: outstanding,
      referenceType: 'INVOICE',
      referenceId: invoice.localId,
      note: `Invoice ${invoice.invoiceNumber || invoice.localId}`,
      createdBy: input.employeeId || null,
    });
  } catch (e) {
    // Ledger entry is best-effort bookkeeping; never fail the sale over it.
  }
}

export async function saveBill(input) {
  const invoice = await completeBill(input);
  await recordCreditSaleLedgerEntry(input, invoice);
  return invoice;
}

export async function holdCurrentBill(input) {
  return holdBill(input);
}

export async function fetchHeldBills(branchId) {
  return listHeldBills(branchId);
}

export async function removeHeldBill(localId) {
  return discardHeldBill(localId);
}

export async function fetchInvoices(branchId, limit = 100) {
  return listInvoices(branchId, limit);
}

export async function fetchAllInvoices(limit = 1000) {
  return listAllInvoices(limit);
}

export async function fetchInvoiceDetail(localId) {
  return getInvoiceWithLines(localId);
}

export async function pushInvoiceToServer(localId, payload) {
  if (isMockMode()) {
    throw new Error('Backend is unavailable in mock mode');
  }
  return apiClient.post('/invoices/sync', payload);
}

export async function requeueInvoiceSync(localId) {
  await enqueueSync('invoice', localId, 'CREATE', { localId });
}

export default {
  saveBill,
  holdCurrentBill,
  fetchHeldBills,
  removeHeldBill,
  fetchInvoices,
  fetchAllInvoices,
  fetchInvoiceDetail,
  pushInvoiceToServer,
  requeueInvoiceSync,
};
