export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface SyncableFields {
  localId: string;
  serverId: string | null;
  branchId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  serverConfirmed: number;
  syncedAt: string | null;
  purgeAfter: string | null;
  retryCount: number;
  lastSyncError: string | null;
}

export interface AppSettingRow {
  key: string;
  value: string;
  updatedAt: string;
}

export interface BranchCacheRow {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  gst: string;
  manager: string;
  opening: string;
  closing: string;
  status: string;
  updatedAt: string;
}

export interface VerifiedUserRow {
  id: string;
  role: 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'EMPLOYEE';
  branchId: string | null;
  loginId: string;
  employeeId: string | null;
  name: string;
  passwordHash: string | null;
  permissions: string;
  lastLoginAt: string | null;
  updatedAt: string;
}

export interface VerifiedDeviceRow {
  id: string;
  userId: string;
  deviceLabel: string;
  rememberToken: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface PermissionsCacheRow {
  role: string;
  permissions: string;
  updatedAt: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  updatedAt: string;
}

export interface ProductRow {
  id: string;
  name: string;
  code: string;
  barcode: string;
  categoryId: string;
  mrp: number;
  sellingPrice: number;
  purchasePrice: number;
  gst: number;
  unit: string;
  minStock: number;
  batch: string;
  hsn: string;
  mfgDate: string | null;
  expiryDate: string | null;
  brand: string;
  supplier: string;
  updatedAt: string;
}

export interface BranchStockRow {
  branchId: string;
  productId: string;
  available: number;
  minStock: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  updatedAt: string;
}

export interface CustomerRow extends SyncableFields {
  id: string;
  name: string;
  mobile: string;
  address: string;
  gst: string;
  doctor: string;
  type: string;
}

export interface HeldBillRow {
  localId: string;
  branchId: string;
  customerId: string | null;
  customerName: string | null;
  itemsJson: string;
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  heldBy: string;
  heldAt: string;
}

export interface InvoiceRow extends SyncableFields {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  employeeId: string;
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'CREDIT';
  isHeld: number;
}

export interface InvoiceItemRow {
  id: string;
  invoiceLocalId: string;
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  gst: number;
  lineTotal: number;
}

export interface PaymentRow {
  id: string;
  invoiceLocalId: string;
  method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  amount: number;
  createdAt: string;
}

export interface StockMovementRow {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  type: 'SALE' | 'PURCHASE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';
  referenceId: string | null;
  createdAt: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  mobile: string;
  address: string;
  gst: string;
  updatedAt: string;
}

export interface PurchaseRow extends SyncableFields {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
}

export interface PurchaseItemRow {
  id: string;
  purchaseLocalId: string;
  productId: string;
  quantity: number;
  purchasePrice: number;
  lineTotal: number;
}

export interface ExpenseRow extends SyncableFields {
  id: string;
  category: string;
  amount: number;
  note: string;
  spentAt: string;
}

export interface StockTransferRow extends SyncableFields {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'COMPLETED';
  requestedBy: string;
}

export interface StockTransferItemRow {
  id: string;
  transferLocalId: string;
  productId: string;
  quantity: number;
}

export interface SyncQueueRow {
  id: string;
  entityType: string;
  entityLocalId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  status: SyncStatus;
  retryCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface SyncLogRow {
  id: string;
  entityType: string;
  entityLocalId: string;
  status: 'SUCCESS' | 'FAILURE';
  message: string | null;
  createdAt: string;
}

export interface CleanupHistoryRow {
  id: string;
  ranAt: string;
  invoicesDeleted: number;
  filesDeleted: number;
  logsDeleted: number;
}
