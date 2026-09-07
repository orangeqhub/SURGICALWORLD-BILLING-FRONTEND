import { getDatabase, newId, nowIso } from '../database';
import type { CustomerRow } from '../databaseTypes';
import { CUSTOMERS } from '../../constants/customers';

export async function seedCustomers(): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM customers;');
  if (existing && existing.count > 0) {
    return;
  }

  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    for (const customer of CUSTOMERS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO customers
          (id, localId, name, mobile, address, gst, doctor, type, serverId, branchId, createdAt, updatedAt, syncStatus, serverConfirmed, syncedAt, purgeAfter, retryCount, lastSyncError)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', 1, ?, NULL, 0, NULL);`,
        [
          customer.id,
          customer.id,
          customer.name,
          customer.mobile,
          customer.address,
          customer.gst,
          customer.doctor,
          customer.type,
          customer.id,
          customer.branchId || 'BR-GNT',
          timestamp,
          timestamp,
          timestamp,
        ]
      );
    }
  });
}

export async function listCustomers(branchId?: string): Promise<CustomerRow[]> {
  const db = await getDatabase();
  if (branchId) {
    return db.getAllAsync<CustomerRow>(
      'SELECT * FROM customers WHERE branchId = ? OR type = \'WALK_IN\' ORDER BY name;',
      [branchId]
    );
  }
  return db.getAllAsync<CustomerRow>('SELECT * FROM customers ORDER BY name;');
}

export async function searchCustomers(query: string): Promise<CustomerRow[]> {
  const db = await getDatabase();
  const like = `%${query}%`;
  return db.getAllAsync<CustomerRow>(
    'SELECT * FROM customers WHERE name LIKE ? OR mobile LIKE ? ORDER BY name LIMIT 50;',
    [like, like]
  );
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
  const db = await getDatabase();
  const localId = newId('CUS');
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO customers
      (id, localId, name, mobile, address, gst, doctor, type, serverId, branchId, createdAt, updatedAt, syncStatus, serverConfirmed, syncedAt, purgeAfter, retryCount, lastSyncError)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'PENDING', 0, NULL, NULL, 0, NULL);`,
    [
      localId,
      localId,
      input.name,
      input.mobile || '',
      input.address || '',
      input.gst || '',
      input.doctor || '',
      input.type || 'RETAIL',
      input.branchId,
      timestamp,
      timestamp,
    ]
  );

  const row = await db.getFirstAsync<CustomerRow>('SELECT * FROM customers WHERE localId = ?;', [localId]);
  return row as CustomerRow;
}
