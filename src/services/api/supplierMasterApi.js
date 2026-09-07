import { fetchSuppliers } from './purchaseApi';
import { getAllSupplierProfiles, upsertSupplierProfile } from '../mock/supplierProfileStore';

/**
 * Frontend Supplier Management composition layer. Reuses the real
 * purchaseApi.fetchSuppliers() read as-is. The suppliers table has no
 * create/status/branch columns, so new suppliers and all extended fields are
 * stored entirely in supplierProfileStore (mock-only suppliers are flagged
 * isMockOnly and merged in alongside real ones) - the real table is never
 * written to.
 */
function mergeProfile(supplier, profile) {
  return {
    ...supplier,
    supplierCode: supplier.id,
    contactPerson: profile?.contactPerson || '',
    altMobile: profile?.altMobile || '',
    email: profile?.email || '',
    creditPeriod: profile?.creditPeriod ?? 0,
    paymentTerms: profile?.paymentTerms || 'CASH',
    openingBalance: profile?.openingBalance ?? 0,
    openingBalanceType: profile?.openingBalanceType || 'DEBIT',
    bankName: profile?.bankName || '',
    accountHolderName: profile?.accountHolderName || '',
    accountNumber: profile?.accountNumber || '',
    ifsc: profile?.ifsc || '',
    branchId: profile?.branchId || null,
    remarks: profile?.remarks || '',
    status: profile?.status || 'Active',
  };
}

export async function listSuppliersWithProfile(branchId) {
  const [suppliers, profiles] = await Promise.all([fetchSuppliers(), getAllSupplierProfiles()]);
  const profileBySupplierId = Object.fromEntries(profiles.map((p) => [p.supplierId, p]));

  const real = suppliers.map((s) => mergeProfile(s, profileBySupplierId[s.id]));
  const mockOnly = profiles
    .filter((p) => p.isMockOnly && !suppliers.some((s) => s.id === p.supplierId))
    .map((p) => mergeProfile({ id: p.supplierId, name: p.name, mobile: p.mobile, address: p.address, gst: p.gst }, p));

  const combined = [...real, ...mockOnly];
  return branchId ? combined.filter((s) => !s.branchId || s.branchId === branchId) : combined;
}

export async function getSupplierById(supplierId) {
  const list = await listSuppliersWithProfile();
  return list.find((s) => s.id === supplierId) || null;
}

export async function createSupplierWithProfile(input) {
  const id = `SUP-${Date.now().toString().slice(-6)}`;
  await upsertSupplierProfile(id, {
    isMockOnly: true,
    name: input.name,
    mobile: input.mobile,
    address: input.address,
    gst: input.gst,
    contactPerson: input.contactPerson,
    altMobile: input.altMobile,
    email: input.email,
    creditPeriod: input.creditPeriod,
    paymentTerms: input.paymentTerms,
    openingBalance: input.openingBalance,
    openingBalanceType: input.openingBalanceType,
    bankName: input.bankName,
    accountHolderName: input.accountHolderName,
    accountNumber: input.accountNumber,
    ifsc: input.ifsc,
    branchId: input.branchId,
    remarks: input.remarks,
    status: 'Active',
  });
  return getSupplierById(id);
}

export async function updateSupplierProfile(supplierId, patch) {
  return upsertSupplierProfile(supplierId, patch);
}

export async function setSupplierStatus(supplierId, status) {
  return upsertSupplierProfile(supplierId, { status });
}

export default { listSuppliersWithProfile, getSupplierById, createSupplierWithProfile, updateSupplierProfile, setSupplierStatus };
