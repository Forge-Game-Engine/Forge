import { StorageBackend } from './storage-backend.js';
import {
  StorageBlockedError,
  StorageFullError,
  StorageUnavailableError,
} from './storage-errors.js';

// Chrome, Safari and current Firefox name the error `QuotaExceededError`;
// older Firefox versions name it `NS_ERROR_DOM_QUOTA_REACHED`.
const quotaErrorNames = new Set([
  'QuotaExceededError',
  'NS_ERROR_DOM_QUOTA_REACHED',
]);

// Browsers throw `DOMException`s, which aren't `Error` instances in every
// environment, so errors are recognized by name.
const hasErrorName = (error: unknown, names: Set<string>): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  typeof error.name === 'string' &&
  names.has(error.name);

const securityErrorNames = new Set(['SecurityError']);

/**
 * Turns an error thrown by `localStorage` into the matching `StorageError`,
 * and returns anything else as it is.
 */
const toStorageError = (error: unknown, action: string): unknown => {
  if (hasErrorName(error, securityErrorNames)) {
    return new StorageBlockedError(
      `Unable to ${action}: localStorage is blocked.`,
      error,
    );
  }

  if (hasErrorName(error, quotaErrorNames)) {
    return new StorageFullError(
      `Unable to ${action}: localStorage is full.`,
      error,
    );
  }

  return error;
};

/**
 * Runs `operation` against `localStorage` and returns its result as a
 * settled promise. Reading the `localStorage` property itself throws a
 * `SecurityError` where storage is blocked, so it's read here too.
 */
const withLocalStorage = <T>(
  action: string,
  operation: (storage: Storage) => T,
): Promise<T> => {
  try {
    const storage = (globalThis as { localStorage?: Storage | null })
      .localStorage;

    if (!storage) {
      throw new StorageUnavailableError(
        `Unable to ${action}: there's no localStorage in this environment.`,
      );
    }

    return Promise.resolve(operation(storage));
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    return Promise.reject(toStorageError(error, action));
  }
};

/**
 * Creates a backend that stores values in the browser's `localStorage`.
 * Every method does its work before it returns, so a write is stored even
 * if the page closes straight after. `localStorage` keys are shared by
 * every page of an origin, so prefix keys with the game's name.
 *
 * Creating the backend doesn't touch `localStorage`, so it can be created
 * where there's no `window`. Its methods reject with a
 * `StorageUnavailableError` when there's no `localStorage`, a
 * `StorageBlockedError` when it's blocked (a `SecurityError`), and a
 * `StorageFullError` when it's full (a `QuotaExceededError`). Any other
 * error is rejected with as it is.
 * @returns The `localStorage` backend.
 */
export function createLocalStorageBackend(): StorageBackend {
  return {
    get: (key) =>
      withLocalStorage(`read "${key}"`, (storage) => storage.getItem(key)),
    set: (key, value) =>
      withLocalStorage(`store "${key}"`, (storage) => {
        storage.setItem(key, value);
      }),
    remove: (key) =>
      withLocalStorage(`remove "${key}"`, (storage) => {
        storage.removeItem(key);
      }),
  };
}
