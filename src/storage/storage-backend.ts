/**
 * Where persisted strings are kept: `localStorage`, IndexedDB, a remote
 * endpoint or a desktop wrapper's file system. The interface is
 * asynchronous so every one of them can implement it.
 *
 * Every backend keeps this contract:
 * - Every promise it returns settles. A backend that talks to a network
 *   applies its own timeouts.
 * - `remove` resolves once nothing is stored under the key, whether or not
 *   anything was.
 * - Creating a backend touches nothing; only its methods touch storage, so
 *   a backend can be created where there's no `window`.
 */
export interface StorageBackend {
  /**
   * Reads the string stored under a key.
   * @param key - The key to read.
   * @returns The stored string, or `null` if nothing is stored under `key`.
   * Rejects with a `StorageError` if storage can't be read.
   */
  get(key: string): Promise<string | null>;

  /**
   * Stores a string under a key, replacing what was stored there.
   * @param key - The key to store under.
   * @param value - The string to store.
   * @returns A promise that resolves once `value` is stored. Rejects with a
   * `StorageError` if it can't be stored.
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Removes whatever is stored under a key.
   * @param key - The key to remove.
   * @returns A promise that resolves once nothing is stored under `key`.
   * Rejects with a `StorageError` if it can't be removed.
   */
  remove(key: string): Promise<void>;
}
