import { describe, expect, it, vi } from 'vitest';
import { createLocalStorageBackend } from './create-local-storage-backend';
import { createMemoryStorageBackend } from './create-memory-storage-backend';
import { createPersistentState } from './create-persistent-state';
import {
  PersistentStateFormatError,
  PersistentStateValueError,
} from './persistent-state-errors';
import { StorageBackend } from './storage-backend';
import { StorageFullError } from './storage-errors';

interface AudioSettings {
  volume: number;
  muted: boolean;
  quality: string;
}

const defaults: AudioSettings = { volume: 1, muted: false, quality: 'high' };
const name = 'test-game.settings';

const isVolume = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1;

const backendWith = async (stored?: unknown): Promise<StorageBackend> => {
  const backend = createMemoryStorageBackend();

  if (stored !== undefined) {
    await backend.set(name, JSON.stringify(stored));
  }

  return backend;
};

const storedEntry = async (backend: StorageBackend): Promise<unknown> => {
  const stored = await backend.get(name);

  return stored === null ? null : JSON.parse(stored);
};

const valueError = async (
  promise: Promise<unknown>,
): Promise<PersistentStateValueError> => {
  const error: unknown = await promise.catch((e: unknown) => e);

  expect(error).toBeInstanceOf(PersistentStateValueError);

  return error as PersistentStateValueError;
};

interface ControlledWrite {
  kind: 'set' | 'remove';
  value: string | null;
  resolve: () => void;
  reject: (error: unknown) => void;
}

/**
 * A backend whose writes settle only when the test settles them, and which
 * keeps whatever the last-settled write stored.
 */
const createControlledBackend = (): {
  backend: StorageBackend;
  writes: ControlledWrite[];
  stored: () => string | null;
} => {
  const writes: ControlledWrite[] = [];
  let stored: string | null = null;

  const write = (kind: 'set' | 'remove', value: string | null): Promise<void> =>
    new Promise((resolve, reject) => {
      writes.push({
        kind,
        value,
        resolve: () => {
          stored = value;
          resolve();
        },
        reject,
      });
    });

  return {
    backend: {
      get: () => Promise.resolve(stored),
      set: (_key, value) => write('set', value),
      remove: () => write('remove', null),
    },
    writes,
    stored: () => stored,
  };
};

describe('createPersistentState', () => {
  describe('loading', () => {
    it('takes the defaults when nothing is stored', async () => {
      const state = await createPersistentState(name, defaults, {
        storage: await backendWith(),
      });

      expect(state.values).toEqual(defaults);
      expect(state.name).toBe(name);
    });

    it('takes stored fields, and defaults for fields that are not stored', async () => {
      const state = await createPersistentState(name, defaults, {
        storage: await backendWith({ volume: 0.5 }),
      });

      expect(state.values).toEqual({ ...defaults, volume: 0.5 });
    });

    it.each([
      ['a wrong type', { volume: 'loud' }, 'volume', 'loud'],
      ['a non-finite number', { volume: null }, 'volume', null],
      ['a failing validator', { volume: -0.1 }, 'volume', -0.1],
    ])(
      'rejects a stored field with %s, naming the field and value',
      async (_, stored, field, value) => {
        const error = await valueError(
          createPersistentState(name, defaults, {
            storage: await backendWith(stored),
            validators: { volume: isVolume },
          }),
        );

        expect(error.field).toBe(field);
        expect(error.value).toBe(value);
        expect(error.stateName).toBe(name);
      },
    );

    it('rejects a default that fails its validator', async () => {
      const error = await valueError(
        createPersistentState(
          name,
          { ...defaults, volume: 2 },
          { storage: await backendWith(), validators: { volume: isVolume } },
        ),
      );

      expect(error.field).toBe('volume');
    });

    it('rejects a non-finite default', async () => {
      const error = await valueError(
        createPersistentState(
          name,
          { ...defaults, volume: Number.NaN },
          { storage: await backendWith() },
        ),
      );

      expect(error.field).toBe('volume');
    });

    it.each(['not json', '[1, 2]', '42', 'null'])(
      'rejects an entry that is not a JSON object (%s) with PersistentStateFormatError',
      async (stored) => {
        const backend = createMemoryStorageBackend();

        await backend.set(name, stored);

        await expect(
          createPersistentState(name, defaults, { storage: backend }),
        ).rejects.toBeInstanceOf(PersistentStateFormatError);
      },
    );

    it('rejects with the error of a read that rejects', async () => {
      const readError = new Error('read failed');
      const backend = createMemoryStorageBackend();

      backend.get = () => Promise.reject(readError);

      await expect(
        createPersistentState(name, defaults, { storage: backend }),
      ).rejects.toBe(readError);
    });

    it('rejects with the error of a read that throws', async () => {
      const readError = new Error('read failed');
      const backend = createMemoryStorageBackend();

      backend.get = () => {
        throw readError;
      };

      await expect(
        createPersistentState(name, defaults, { storage: backend }),
      ).rejects.toBe(readError);
    });

    it('can be created again under the same name', async () => {
      const storage = await backendWith();
      const first = await createPersistentState(name, defaults, { storage });

      await first.set({ volume: 0.25 });

      const second = await createPersistentState(name, defaults, { storage });

      expect(second.values.volume).toBe(0.25);
    });
  });

  describe('saving', () => {
    it('stores only the fields that were set', async () => {
      const storage = await backendWith();
      const state = await createPersistentState(name, defaults, { storage });

      await state.set({ muted: true });

      expect(await storedEntry(storage)).toEqual({ muted: true });
    });

    it('keeps fields stored by an earlier session, including unknown ones', async () => {
      const storage = await backendWith({ volume: 0.5, future: 'kept' });
      const state = await createPersistentState(name, defaults, { storage });

      await state.set({ muted: true });

      expect(await storedEntry(storage)).toEqual({
        volume: 0.5,
        future: 'kept',
        muted: true,
      });
    });

    it('gives a changed default to a field that was never set', async () => {
      const storage = await backendWith();
      const first = await createPersistentState(name, defaults, { storage });

      await first.set({ muted: true });

      const updated = await createPersistentState(
        name,
        { ...defaults, volume: 0.8 },
        { storage },
      );

      expect(updated.values).toEqual({ ...defaults, volume: 0.8, muted: true });
    });

    it('replaces values on every change and raises onChange with them', async () => {
      const state = await createPersistentState(name, defaults, {
        storage: await backendWith(),
      });
      const before = state.values;
      const listener = vi.fn();

      state.onChange.registerListener(listener);
      const write = state.set({ volume: 0.5 });

      expect(state.values).not.toBe(before);
      expect(before.volume).toBe(1);
      expect(Object.isFrozen(state.values)).toBe(true);
      expect(listener).toHaveBeenCalledWith({ ...defaults, volume: 0.5 });

      await write;
    });

    it('throws PersistentStateValueError for an invalid value, applying nothing', async () => {
      const storage = await backendWith();
      const state = await createPersistentState(name, defaults, {
        storage,
        validators: { volume: isVolume },
      });
      const listener = vi.fn();

      state.onChange.registerListener(listener);

      for (const changes of [
        { muted: false, volume: 2 },
        { volume: Number.POSITIVE_INFINITY },
        { volume: Number.NaN },
        { quality: 3 as unknown as string },
        { constructor: 1 } as Partial<AudioSettings>,
      ]) {
        expect(() => state.set(changes)).toThrow(PersistentStateValueError);
      }

      expect(state.values).toEqual(defaults);
      expect(listener).not.toHaveBeenCalled();
      expect(await storage.get(name)).toBeNull();
    });

    it('reset makes every value its default and removes the entry', async () => {
      const storage = await backendWith({ volume: 0.5 });
      const state = await createPersistentState(name, defaults, { storage });
      const listener = vi.fn();

      state.onChange.registerListener(listener);
      await state.reset();

      expect(state.values).toEqual(defaults);
      expect(listener).toHaveBeenCalledWith(defaults);
      expect(await storage.get(name)).toBeNull();
    });

    it('stores a change with the localStorage backend before set returns', async () => {
      localStorage.clear();
      const state = await createPersistentState(name, defaults, {
        storage: createLocalStorageBackend(),
      });

      const write = state.set({ volume: 0.5 });

      expect(localStorage.getItem(name)).toBe('{"volume":0.5}');
      await write;
      localStorage.clear();
    });
  });

  describe('the write queue', () => {
    it('has at most one write in flight, and sends changes made meanwhile together in the next', async () => {
      const { backend, writes, stored } = createControlledBackend();
      const state = await createPersistentState(name, defaults, {
        storage: backend,
      });

      const first = state.set({ volume: 0.1 });
      const second = state.set({ volume: 0.2 });
      const third = state.set({ muted: true });

      expect(writes).toHaveLength(1);

      writes[0].resolve();
      await first;

      expect(writes).toHaveLength(2);
      expect(JSON.parse(writes[1].value ?? '')).toEqual({
        volume: 0.2,
        muted: true,
      });

      writes[1].resolve();
      await Promise.all([second, third]);

      expect(JSON.parse(stored() ?? '')).toEqual({ volume: 0.2, muted: true });
    });

    it('ends with the latest values stored when the backend settles writes out of order', async () => {
      let stored: string | null = null;
      let delay = 30;
      const backend: StorageBackend = {
        get: () => Promise.resolve(stored),
        // Each write settles sooner than the one before it, so without the
        // queue an older write would land last.
        set: (_key, value) =>
          new Promise((resolve) => {
            delay -= 10;
            setTimeout(() => {
              stored = value;
              resolve();
            }, delay);
          }),
        remove: () => Promise.resolve(),
      };
      const state = await createPersistentState(name, defaults, {
        storage: backend,
      });

      await Promise.all([
        state.set({ quality: 'low' }),
        state.set({ quality: 'medium' }),
        state.set({ quality: 'ultra' }),
      ]);

      expect(JSON.parse(stored ?? '')).toEqual({ quality: 'ultra' });
    });

    it('ends with nothing stored after a reset while a write is in flight', async () => {
      const { backend, writes, stored } = createControlledBackend();
      const state = await createPersistentState(name, defaults, {
        storage: backend,
      });

      const write = state.set({ volume: 0.1 });
      const reset = state.reset();

      writes[0].resolve();
      await write;

      expect(writes[1].kind).toBe('remove');

      writes[1].resolve();
      await reset;

      expect(stored()).toBeNull();
    });

    it('rejects a failed write, keeps the values, and stores them with the next write', async () => {
      const { backend, writes, stored } = createControlledBackend();
      const state = await createPersistentState(name, defaults, {
        storage: backend,
      });
      const fullError = new StorageFullError('full');

      const failed = state.set({ volume: 0.1 });

      writes[0].reject(fullError);
      await expect(failed).rejects.toBe(fullError);

      expect(state.values).toEqual({ ...defaults, volume: 0.1 });

      const next = state.set({ muted: true });

      writes[1].resolve();
      await next;

      expect(JSON.parse(stored() ?? '')).toEqual({ volume: 0.1, muted: true });
    });

    it('rejects every change batched into a write that fails', async () => {
      const { backend, writes } = createControlledBackend();
      const state = await createPersistentState(name, defaults, {
        storage: backend,
      });
      const fullError = new StorageFullError('full');

      const first = state.set({ volume: 0.1 });
      const second = state.set({ volume: 0.2 });
      const third = state.set({ volume: 0.3 });

      writes[0].resolve();
      await first;
      writes[1].reject(fullError);

      await expect(second).rejects.toBe(fullError);
      await expect(third).rejects.toBe(fullError);
    });

    it('treats a write that throws like one that rejects', async () => {
      const writeError = new Error('write failed');
      const storage = createMemoryStorageBackend();
      const state = await createPersistentState(name, defaults, { storage });

      storage.set = () => {
        throw writeError;
      };

      await expect(state.set({ volume: 0.5 })).rejects.toBe(writeError);
      expect(state.values.volume).toBe(0.5);
    });
  });
});
