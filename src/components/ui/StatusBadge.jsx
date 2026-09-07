import React from 'react';
import Badge from './Badge';

const STATUS_MAP = {
  PENDING: { label: 'Pending', tone: 'warning' },
  SYNCING: { label: 'Syncing', tone: 'info' },
  SYNCED: { label: 'Synced', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  CONFLICT: { label: 'Conflict', tone: 'danger' },
  HELD: { label: 'Held', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  PARTIAL: { label: 'Partial', tone: 'warning' },
  CREDIT: { label: 'Credit', tone: 'info' },
  IN_STOCK: { label: 'In Stock', tone: 'success' },
  LOW_STOCK: { label: 'Low Stock', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Out of Stock', tone: 'danger' },
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  IN_TRANSIT: { label: 'Dispatched', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  NEAR_EXPIRY: { label: 'Near Expiry', tone: 'warning' },
  EXPIRED: { label: 'Expired', tone: 'danger' },
  DEPLETED: { label: 'Depleted', tone: 'neutral' },
  BLOCKED: { label: 'Blocked', tone: 'danger' },
};

export default function StatusBadge({ status, style }) {
  const entry = STATUS_MAP[status] || { label: status || 'Unknown', tone: 'neutral' };
  return <Badge label={entry.label} tone={entry.tone} style={style} />;
}
