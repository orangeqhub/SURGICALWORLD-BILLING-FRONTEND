import { fetchCustomers, addCustomer } from './customerApi';
import { getAllCustomerProfiles, upsertCustomerProfile } from '../mock/customerProfileStore';

/**
 * Frontend CRM composition layer over the real customerApi/customerRepository
 * (SQLite-backed) plus the Phase 2 customerProfileStore mock for fields the
 * schema doesn't have (see docs/FRONTEND_PHASE_IMPLEMENTATION.md). Reuses
 * fetchCustomers/addCustomer read+create as-is; never modifies the
 * customers table directly.
 */
function mergeProfile(customer, profiles) {
  const profile = profiles.find((p) => p.customerId === customer.id) || {};
  return {
    ...customer,
    customerCode: customer.id,
    allianceNumber: profile.allianceNumber || '',
    orgName: profile.orgName || '',
    billingAddress: profile.billingAddress || customer.address || '',
    shippingAddress: profile.shippingAddress || customer.address || '',
    altMobile: profile.altMobile || '',
    email: profile.email || '',
    contactPerson: profile.contactPerson || '',
    creditLimit: profile.creditLimit ?? 0,
    paymentTerms: profile.paymentTerms || 'CASH',
    openingBalance: profile.openingBalance ?? 0,
    openingBalanceType: profile.openingBalanceType || 'DEBIT',
    remarks: profile.remarks || '',
    status: profile.status || 'Active',
  };
}

export async function listCustomersWithProfile(branchId) {
  const [customers, profiles] = await Promise.all([fetchCustomers(branchId), getAllCustomerProfiles()]);
  return customers.map((c) => mergeProfile(c, profiles));
}

export async function getCustomerById(branchId, customerId) {
  const list = await listCustomersWithProfile(branchId);
  return list.find((c) => c.id === customerId) || null;
}

export async function createCustomerWithProfile(input) {
  const base = await addCustomer({
    name: input.name,
    mobile: input.mobile,
    address: input.billingAddress,
    gst: input.gst,
    doctor: input.doctor || '',
    type: input.type || 'RETAIL',
    branchId: input.branchId,
  });

  await upsertCustomerProfile(base.id, {
    allianceNumber: input.allianceNumber,
    orgName: input.orgName,
    billingAddress: input.billingAddress,
    shippingAddress: input.shippingAddress,
    altMobile: input.altMobile,
    email: input.email,
    contactPerson: input.contactPerson,
    creditLimit: input.creditLimit,
    paymentTerms: input.paymentTerms,
    openingBalance: input.openingBalance,
    openingBalanceType: input.openingBalanceType,
    remarks: input.remarks,
    status: 'Active',
  });

  return getCustomerById(input.branchId, base.id);
}

export async function updateCustomerProfile(customerId, patch) {
  return upsertCustomerProfile(customerId, patch);
}

export async function setCustomerStatus(customerId, status) {
  return upsertCustomerProfile(customerId, { status });
}

export default { listCustomersWithProfile, getCustomerById, createCustomerWithProfile, updateCustomerProfile, setCustomerStatus };
