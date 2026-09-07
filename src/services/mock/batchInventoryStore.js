import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sw_batch_inventory_state_v1';

/**
 * Single combined, versioned state for mock batch inventory + invoice
 * consumption idempotency (see docs/FRONTEND_PHASE_IMPLEMENTATION.md, Phase
 * 3). Batches and consumedInvoiceReferences are persisted together through
 * one AsyncStorage.setItem so a consumption operation can never leave
 * batches updated but the idempotency marker missing (or vice versa).
 */
async function loadState() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { version: 1, batches: [], consumedInvoiceReferences: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      batches: Array.isArray(parsed.batches) ? parsed.batches : [],
      consumedInvoiceReferences: Array.isArray(parsed.consumedInvoiceReferences) ? parsed.consumedInvoiceReferences : [],
    };
  } catch (e) {
    return { version: 1, batches: [], consumedInvoiceReferences: [] };
  }
}

async function saveState(state) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, ...state }));
}

export async function listAllBatches() {
  const state = await loadState();
  return state.batches;
}

export async function saveAllBatches(batches) {
  const state = await loadState();
  await saveState({ ...state, batches });
  return batches;
}

export async function updateBatch(id, patch) {
  const state = await loadState();
  let updated = null;
  const batches = state.batches.map((b) => {
    if (b.id !== id) return b;
    updated = { ...b, ...patch };
    return updated;
  });
  await saveState({ ...state, batches });
  return updated;
}

export async function isReferenceConsumed(referenceId) {
  const state = await loadState();
  return state.consumedInvoiceReferences.includes(referenceId);
}

/**
 * Applies all batch quantity deltas and records the idempotency marker in
 * ONE read-modify-write cycle (a single AsyncStorage.setItem) - never two
 * separate writes that could leave the state inconsistent if interrupted.
 * Returns { ok: true } or { ok: false, reason } without mutating anything
 * when validation fails (e.g. insufficient quantity on any line).
 */
export async function consumeBatchesAtomically(referenceId, deltasByBatchId) {
  const state = await loadState();
  if (state.consumedInvoiceReferences.includes(referenceId)) {
    return { ok: true, alreadyConsumed: true };
  }

  const batchById = Object.fromEntries(state.batches.map((b) => [b.id, b]));
  for (const [batchId, quantity] of Object.entries(deltasByBatchId)) {
    const batch = batchById[batchId];
    if (!batch) {
      return { ok: false, reason: `Batch ${batchId} not found` };
    }
    if ((batch.available || 0) < quantity) {
      return { ok: false, reason: `Batch ${batchId} has insufficient quantity` };
    }
  }

  const batches = state.batches.map((b) => {
    const delta = deltasByBatchId[b.id];
    if (!delta) return b;
    return { ...b, available: Math.max(0, (b.available || 0) - delta) };
  });

  await saveState({
    ...state,
    batches,
    consumedInvoiceReferences: [...state.consumedInvoiceReferences, referenceId],
  });
  return { ok: true };
}

export default { listAllBatches, saveAllBatches, updateBatch, isReferenceConsumed, consumeBatchesAtomically };
