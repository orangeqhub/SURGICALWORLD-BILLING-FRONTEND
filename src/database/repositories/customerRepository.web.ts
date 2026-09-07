import { getTable, commit, newId, nowIso } from '../database.web';
import type { CustomerRow } from '../databaseTypes';
import { CUSTOMERS } from '../../constants/customers';

export async function seedCustomers(): Promise<void> {
  const rows = await getTable<CustomerRow>('customers');
  if (rows.length > 0) {
    return;
  }

  const timestamp = nowIso();

  for (const customer of CUSTOMERS) {
    rows.push({
      id: customer.id,
      localId: customer.id,
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address,
      gst: customer.gst,
      doctor: customer.doctor,
      type: customer.type,
      serverId: customer.id,
      branchId: customer.branchId || 'BR-GNT',
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'SYNCED',
      serverConfirmed: 1,
      syncedAt: timestamp,
      purgeAfter: null,
      retryCount: 0,
      lastSyncError: null,
    });
  }

  await commit();
}

export async function listCustomers(branchId?: string): Promise<CustomerRow[]> {
  const rows = await getTable<CustomerRow>('customers');
  const filtered = branchId ? rows.filter((c) => c.branchId === branchId || c.type === 'WALK_IN') : rows;
  return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchCustomers(query: string): Promise<CustomerRow[]> {
  const rows = await getTable<CustomerRow>('customers');
  const q = query.toLowerCase();
  return rows
    .filter((c) => c.name.toLowerCase().includes(q) || (c.mobile || '').includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50);
}

export async function createCustomer(input: {
  name: string;
  mobile?: string;
  address?: string;
  gst?: string;
  doctor?: string;
  type?: string;
  branchId: string;
}): Promise<CustomerRow> {
  const rows = await getTable<CustomerRow>('customers');
  const localId = newId('CUS');
  const timestamp = nowIso();

  const row: CustomerRow = {
    id: localId,
    localId,
    name: input.name,
    mobile: input.mobile || '',
    address: input.address || '',
    gst: input.gst || '',
    doctor: input.doctor || '',
    type: input.type || 'RETAIL',
    serverId: null,
    branchId: input.branchId,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'PENDING',
    serverConfirmed: 0,
    syncedAt: null,
    purgeAfter: null,
    retryCount: 0,
    lastSyncError: null,
  };

  rows.push(row);
  await commit();
  return row;
}
