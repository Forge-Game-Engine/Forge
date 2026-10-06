import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStorageBackend } from './create-local-storage-backend';
import {
  StorageBlockedError,
  StorageError,
  StorageFullError,
  StorageUnavailableError,
} from './storage-errors';

const namedError = (name: string): Error => {
  const error = new Error(name);

  error.name = name;

  return error;
};

describe('createLocalStorageBackend', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('round-trips and removes values in localStorage', async () => {
    const backend = createLocalStorageBackend();

    await backend.set('game.key', 'value');

    expect(localStorage.getItem('game.key')).toBe('value');
    await expect(backend.get('game.key')).resolves.toBe('value');

    await backend.remove('game.key');

    await expect(backend.get('game.key')).resolves.toBeNull();
  });

  it('stores a value before set returns', () => {
    const backend = createLocalStorageBackend();

    void backend.set('game.key', 'value');

    expect(localStorage.getItem('game.key')).toBe('value');
  });

  it('touches nothing when created', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => createLocalStorageBackend()).not.toThrow();
  });

  it('rejects with StorageUnavailableError when there is no localStorage', async () => {
    vi.stubGlobal('localStorage', undefined);
    const backend = createLocalStorageBackend();

    await expect(backend.get('key')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    await expect(backend.set('key', 'value')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    await expect(backend.remove('key')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
  });

  it('rejects with StorageBlockedError when reading localStorage throws a SecurityError', async () => {
    const securityError = namedError('SecurityError');

    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw securityError;
    });
    const backend = createLocalStorageBackend();

    const error: unknown = await backend.get('key').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StorageBlockedError);
    expect((error as StorageBlockedError).cause).toBe(securityError);
  });

  it.each(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'])(
    'rejects with StorageFullError when setItem throws a %s',
    async (name) => {
      const quotaError = namedError(name);

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });
      const backend = createLocalStorageBackend();

      const error: unknown = await backend
        .set('key', 'value')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(StorageFullError);
      expect((error as StorageFullError).cause).toBe(quotaError);
    },
  );

  it('rejects with any other error as it is', async () => {
    const otherError = new TypeError('something else');

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw otherError;
    });
    const backend = createLocalStorageBackend();

    await expect(backend.get('key')).rejects.toBe(otherError);
  });

  it('rejects with a StorageError caused by a thrown value that is not an Error', async () => {
    const thrown = 'not an error';

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      // The test is about a thrown value that isn't an Error.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw thrown;
    });
    const backend = createLocalStorageBackend();

    const error: unknown = await backend.get('key').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).cause).toBe(thrown);
  });
});
