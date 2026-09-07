const SYNC_COLUMNS = `
  serverId TEXT,
  branchId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'PENDING',
  serverConfirmed INTEGER NOT NULL DEFAULT 0,
  syncedAt TEXT,
  purgeAfter TEXT,
  retryCount INTEGER NOT NULL DEFAULT 0,
  lastSyncError TEXT
`;

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS branches_cache (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    gst TEXT,
    manager TEXT,
    opening TEXT,
    closing TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS verified_users (
    id TEXT PRIMARY KEY NOT NULL,
    role TEXT NOT NULL,
    branchId TEXT,
    loginId TEXT NOT NULL,
    employeeId TEXT,
    name TEXT NOT NULL,
    passwordHash TEXT,
    permissions TEXT NOT NULL DEFAULT '[]',
    lastLoginAt TEXT,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS verified_devices (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    deviceLabel TEXT,
    rememberToken TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    lastUsedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES verified_users(id)
  );`,

  `CREATE TABLE IF NOT EXISTS permissions_cache (
    role TEXT PRIMARY KEY NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    barcode TEXT,
    categoryId TEXT,
    mrp REAL NOT NULL DEFAULT 0,
    sellingPrice REAL NOT NULL DEFAULT 0,
    purchasePrice REAL NOT NULL DEFAULT 0,
    gst REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'Pcs',
    minStock INTEGER NOT NULL DEFAULT 0,
    batch TEXT,
    hsn TEXT,
    mfgDate TEXT,
    expiryDate TEXT,
    brand TEXT,
    supplier TEXT,
    updatedAt TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`,

  `CREATE TABLE IF NOT EXISTS branch_stock (
    branchId TEXT NOT NULL,
    productId TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 0,
    minStock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'IN_STOCK',
    updatedAt TEXT NOT NULL,
    PRIMARY KEY (branchId, productId)
  );`,

  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL,
    localId TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    gst TEXT,
    doctor TEXT,
    type TEXT NOT NULL DEFAULT 'RETAIL',
    ${SYNC_COLUMNS}
  );`,

  `CREATE TABLE IF NOT EXISTS held_bills (
    localId TEXT PRIMARY KEY NOT NULL,
    branchId TEXT NOT NULL,
    customerId TEXT,
    customerName TEXT,
    itemsJson TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    gst REAL NOT NULL DEFAULT 0,
    grandTotal REAL NOT NULL DEFAULT 0,
    heldBy TEXT,
    heldAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY NOT NULL,
    localId TEXT NOT NULL UNIQUE,
    invoiceNumber TEXT NOT NULL,
    customerId TEXT,
    employeeId TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    gst REAL NOT NULL DEFAULT 0,
    grandTotal REAL NOT NULL DEFAULT 0,
    paymentStatus TEXT NOT NULL DEFAULT 'PAID',
    isHeld INTEGER NOT NULL DEFAULT 0,
    ${SYNC_COLUMNS}
  );`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_branch ON invoices(branchId);`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_syncstatus ON invoices(syncStatus);`,

  `CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY NOT NULL,
    invoiceLocalId TEXT NOT NULL,
    productId TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    sellingPrice REAL NOT NULL,
    gst REAL NOT NULL DEFAULT 0,
    lineTotal REAL NOT NULL,
    FOREIGN KEY (invoiceLocalId) REFERENCES invoices(localId)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoiceLocalId);`,

  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY NOT NULL,
    invoiceLocalId TEXT NOT NULL,
    method TEXT NOT NULL,
    amount REAL NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (invoiceLocalId) REFERENCES invoices(localId)
  );`,

  `CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY NOT NULL,
    branchId TEXT NOT NULL,
    productId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL,
    referenceId TEXT,
    createdAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    gst TEXT,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY NOT NULL,
    localId TEXT NOT NULL UNIQUE,
    supplierId TEXT NOT NULL,
    invoiceNumber TEXT,
    totalAmount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'RECEIVED',
    ${SYNC_COLUMNS}
  );`,

  `CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY NOT NULL,
    purchaseLocalId TEXT NOT NULL,
    productId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    purchasePrice REAL NOT NULL,
    lineTotal REAL NOT NULL,
    FOREIGN KEY (purchaseLocalId) REFERENCES purchases(localId)
  );`,

  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    localId TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    spentAt TEXT NOT NULL,
    ${SYNC_COLUMNS}
  );`,

  `CREATE TABLE IF NOT EXISTS stock_transfers (
    id TEXT PRIMARY KEY NOT NULL,
    localId TEXT NOT NULL UNIQUE,
    fromBranchId TEXT NOT NULL,
    toBranchId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    requestedBy TEXT,
    ${SYNC_COLUMNS}
  );`,

  `CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id TEXT PRIMARY KEY NOT NULL,
    transferLocalId TEXT NOT NULL,
    productId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (transferLocalId) REFERENCES stock_transfers(localId)
  );`,

  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entityType TEXT NOT NULL,
    entityLocalId TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retryCount INTEGER NOT NULL DEFAULT 0,
    lastAttemptAt TEXT,
    lastError TEXT,
    createdAt TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);`,

  `CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY NOT NULL,
    entityType TEXT NOT NULL,
    entityLocalId TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    createdAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS cleanup_history (
    id TEXT PRIMARY KEY NOT NULL,
    ranAt TEXT NOT NULL,
    invoicesDeleted INTEGER NOT NULL DEFAULT 0,
    filesDeleted INTEGER NOT NULL DEFAULT 0,
    logsDeleted INTEGER NOT NULL DEFAULT 0
  );`,
];
