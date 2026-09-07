/**
 * Shared helper for report aggregates built over datasets that mix REAL
 * (SQLite-backed) and FRONTEND_DEMO (AsyncStorage-backed) rows - currently
 * only Purchases (purchaseFrontendApi.js tags every row `source`). Money
 * totals/pivots must never count both: this keeps every REAL row, drops
 * any FRONTEND_DEMO row that shares an identity with a REAL row (the same
 * conceptual transaction re-entered in both places), and returns the demo
 * rows separately so callers can still list them (tagged, for visibility)
 * without folding them into a sum.
 */
export function splitRealAndDemo(rows, identityKey = (row) => row.purchaseNumber || row.invoiceNumber) {
  const real = rows.filter((row) => row.source !== 'FRONTEND_DEMO');
  const realIdentities = new Set(real.map(identityKey).filter(Boolean));
  const demo = rows.filter((row) => row.source === 'FRONTEND_DEMO' && !realIdentities.has(identityKey(row)));
  return { real, demo, deduped: [...real, ...demo] };
}

export default { splitRealAndDemo };
