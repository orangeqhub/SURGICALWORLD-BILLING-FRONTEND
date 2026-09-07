export function formatCurrency(value) {
  const number = Number(value) || 0;
  return '₹' + number.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function formatCurrencyCompact(value) {
  const number = Number(value) || 0;
  return '₹' + number.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatDate(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(date) {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function generateLocalId(prefix = 'LOC') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function generateInvoiceNumber(branchCode, sequence) {
  return `INV-${branchCode}-${String(sequence).padStart(6, '0')}`;
}

export default {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatTime,
  formatDateTime,
  timeAgo,
  generateLocalId,
  generateInvoiceNumber,
};
