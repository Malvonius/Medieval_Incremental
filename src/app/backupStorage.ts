import type { KeyValueStorage } from "../game/persistence";

/** Asynchroner Schlüssel-Wert-Speicher (z. B. IndexedDB). */
export interface AsyncKeyValue {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Synchrones localStorage als Primärspeicher (nötig für das Speichern beim Schließen des Tabs),
 * gespiegelt nach IndexedDB. Löscht der Browser localStorage, stellt `restore` den Stand wieder her.
 */
export class MirroredStorage implements KeyValueStorage {
  constructor(
    private readonly primary: KeyValueStorage,
    private readonly mirror: AsyncKeyValue,
  ) {}

  static async restore(primary: KeyValueStorage, mirror: AsyncKeyValue, keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      if (primary.getItem(key) !== null) continue;
      const value = await mirror.get(key);
      if (value !== null) primary.setItem(key, value);
    }
  }

  getItem(key: string): string | null {
    return this.primary.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.mirror.set(key, value).catch((error: unknown) => console.warn("IndexedDB-Backup fehlgeschlagen", error));
    this.primary.setItem(key, value);
  }

  removeItem(key: string): void {
    this.mirror.delete(key).catch((error: unknown) => console.warn("IndexedDB-Backup fehlgeschlagen", error));
    this.primary.removeItem(key);
  }
}

/** Minimaler IndexedDB-Wrapper: eine Datenbank, ein Object Store, Strings als Werte. */
export function indexedDbStore(dbName = "vhal", storeName = "kv"): AsyncKeyValue {
  let db: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> =>
    (db ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB nicht verfügbar"));
    }));
  const run = <T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    open().then(
      (database) =>
        new Promise<T>((resolve, reject) => {
          const request = op(database.transaction(storeName, mode).objectStore(storeName));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen"));
        }),
    );
  return {
    get: (key) => run<unknown>("readonly", (s) => s.get(key)).then((v) => (typeof v === "string" ? v : null)),
    set: (key, value) => run("readwrite", (s) => s.put(value, key)).then(() => undefined),
    delete: (key) => run("readwrite", (s) => s.delete(key)).then(() => undefined),
  };
}
