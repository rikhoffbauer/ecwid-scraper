export interface ProductList {
  id: string;
  name: string;
  productKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalCatalogueState {
  schemaVersion: 1;
  favorites: string[];
  lists: ProductList[];
}

const DB_NAME = "ecwid-product-browser";
const DB_VERSION = 1;
const STORE = "kv";
const STATE_KEY = "catalogue-state";

export const EMPTY_LOCAL_CATALOGUE_STATE: LocalCatalogueState = { schemaVersion: 1, favorites: [], lists: [] };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
    request.onsuccess = () => resolve(request.result);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB get failed"));
    request.onsuccess = () => resolve(request.result as T | undefined);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const request = tx.objectStore(STORE).put(value, key);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB put failed"));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

function normalizeState(value: unknown): LocalCatalogueState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_LOCAL_CATALOGUE_STATE;
  const record = value as Partial<LocalCatalogueState>;
  return {
    schemaVersion: 1,
    favorites: Array.isArray(record.favorites) ? [...new Set(record.favorites.filter((item): item is string => typeof item === "string"))] : [],
    lists: Array.isArray(record.lists) ? record.lists.filter((list): list is ProductList => !!list && typeof list === "object" && typeof (list as ProductList).id === "string" && typeof (list as ProductList).name === "string").map((list) => ({ ...list, productKeys: [...new Set((list.productKeys ?? []).filter((item): item is string => typeof item === "string"))] })) : []
  };
}

export async function loadLocalCatalogueState(): Promise<LocalCatalogueState> {
  if (typeof indexedDB === "undefined") return EMPTY_LOCAL_CATALOGUE_STATE;
  return normalizeState(await idbGet<LocalCatalogueState>(STATE_KEY));
}

export async function saveLocalCatalogueState(state: LocalCatalogueState): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await idbSet(STATE_KEY, normalizeState(state));
}

export function makeListId(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "list"}-${Date.now().toString(36)}`;
}
