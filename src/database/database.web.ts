import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Browser-only replacement for database.ts. expo-sqlite's web target
 * (wa-sqlite/NativeDatabase) is unreliable under Metro web builds, so on web
 * we skip SQLite entirely and keep the same tables as plain JSON arrays
 * persisted to AsyncStorage (localStorage under the hood on web).
 */

const STORAGE_KEY = 'surgical_world_web_db_v1';

type Row = Record<string, any>;
type Store = Record<string, Row[]>;

let store: Store | null = null;
let loadPromise: Promise<Store> | null = null;

async function loadStore(): Promise<Store> {
  if (store) return store;
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      store = raw ? (JSON.parse(raw) as Store) : {};
      return store as Store;
    });
  }
  return loadPromise;
}

async function persist(): Promise<void> {
  if (!store) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export async function getDatabase(): Promise<true> {
  await loadStore();
  return true;
}

export async function getTable<T extends Row = Row>(name: string): Promise<T[]> {
  const s = await loadStore();
  if (!s[name]) {
    s[name] = [];
  }
  return s[name] as T[];
}

export async function commit(): Promise<void> {
  await persist();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
