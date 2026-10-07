import { ParameterizedForgeEvent } from '../events/index.js';
import { createLocalStorageBackend } from './create-local-storage-backend.js';
import { PersistentStateValueError } from './persistent-state-errors.js';
import { StorageBackend } from './storage-backend.js';
import { withDefaults } from '../utilities/with-defaults.js';

/**
 * A value a persistent state can hold. Structured data can be stored as a
 * JSON string.
 */
export type PersistentValue = number | string | boolean;

/**
 * The shape of a persistent state's values: an object whose every field is
 * a {@link PersistentValue}. Written as a mapped type so interfaces are
 * accepted as well as type aliases.
 */
export type PersistentValues<T> = { [K in keyof T]: PersistentValue };

/**
 * Checks a value beyond "same type as the default", for example that a
 * number is in a range or a string is one of a set.
 */
export type PersistentValueValidator<TValue> = (
  value: unknown,
) => value is TValue;

/**
 * A named record of flat values kept outside the game, loaded once by
 * {@link createPersistentState} and stored through a `StorageBackend` on
 * every change.
 */
export interface PersistentState<T extends PersistentValues<T>> {
  /** The name the record is stored under. */
  readonly name: string;

  /**
   * The current values: the stored ones, and defaults for fields that
   * aren't stored. Replaced, not mutated, on every change, so read it from
   * the record rather than keeping a reference.
   */
  readonly values: Readonly<T>;

  /** Raised after every `set` or `reset`, with the new values. */
  readonly onChange: ParameterizedForgeEvent<Readonly<T>>;

  /**
   * Applies `changes` to `values` at once, raises `onChange` and stores
   * the changed fields. If storing fails, the changes stay applied, and
   * the next write that succeeds stores them.
   * @param changes - The fields to change.
   * @returns A promise that resolves once the changes are stored. Rejects
   * with the backend's error if they can't be.
   * @throws `PersistentStateValueError` if a value doesn't have its
   * default's type, isn't a finite number, or fails its validator. Nothing
   * is applied then.
   */
  set(changes: Partial<T>): Promise<void>;

  /**
   * Makes every value its default again, raises `onChange` and removes the
   * stored entry.
   * @returns A promise that resolves once the entry is removed. Rejects
   * with the backend's error if it can't be.
   */
  reset(): Promise<void>;
}

/**
 * Options for {@link createPersistentState}.
 */
export interface PersistentStateOptions<T extends PersistentValues<T>> {
  /**
   * Per-field checks beyond "same type as the default". A value passed to
   * `set` that fails its field's validator is an error, and a stored value
   * that fails it is ignored, so its field takes its default.
   */
  validators: { [K in keyof T]?: PersistentValueValidator<T[K]> };

  /** Where the record is stored. Defaults to `localStorage`. */
  storage: StorageBackend;
}

const defaultPersistentStateOptions = {
  validators: {},
  storage: createLocalStorageBackend(),
};

type StoredEntry = Record<string, unknown>;

interface PendingWrite {
  resolve: () => void;
  reject: (error: unknown) => void;
}

/**
 * Calls a backend method straight away, turning a synchronous throw into a
 * rejection: the promise executor runs synchronously and rejects with
 * whatever it throws. `Promise.resolve().then(operation)` would also catch
 * the throw, but would start the write a microtask late.
 */
const callBackend = <TResult>(
  operation: () => Promise<TResult>,
): Promise<TResult> =>
  // eslint-disable-next-line sonarjs/prefer-promise-shorthand
  new Promise((resolve) => {
    resolve(operation());
  });

/**
 * Reads a stored entry, or an empty one if it isn't a JSON object: then
 * every field takes its default, and the first write replaces it.
 */
const parseEntry = (stored: string): StoredEntry => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stored);
  } catch {
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  return parsed as StoredEntry;
};

/**
 * Creates a persistent state: a named record of flat values (numbers,
 * strings and booleans) with defaults, kept outside the game through a
 * `StorageBackend`, `localStorage` by default.
 *
 * The stored entry is read once, here. A field that isn't stored takes its
 * default, and so does a stored field that fails the checks a value passed
 * to `set` must pass (written by an earlier version of the game with other
 * defaults or validators, or edited by hand), or every field when the entry
 * isn't a JSON object. A stored value that fails its checks stays stored
 * until its field is set. Only fields passed to `set` are stored, as a JSON object under
 * `name`, so a default changed in a later version of the game reaches
 * everyone who never set that field. Stored fields this version doesn't
 * know are kept. Use one record per `name`, prefixed with the game's name:
 * two records with one name overwrite each other's entry, and
 * `localStorage` keys are shared by every page of an origin.
 *
 * Writes go out one at a time, in order. A change made while a write is in
 * flight goes out with the next write, so a backend that settles out of
 * order can't store older values over newer ones. With the `localStorage`
 * backend, a change is stored before `set` returns.
 * @param name - The key the record is stored under.
 * @param defaults - Every field of the record, with the value it has when
 * it isn't stored.
 * @param options - The validators and the storage backend.
 * @returns A promise that resolves with the record once its entry is
 * read. Rejects with the backend's error if the entry can't be read, and
 * with a `PersistentStateValueError` if a default isn't a finite number
 * where it should be or fails its validator.
 */
export async function createPersistentState<T extends PersistentValues<T>>(
  name: string,
  defaults: T,
  options: Partial<PersistentStateOptions<T>> = {},
): Promise<PersistentState<T>> {
  const { validators, storage }: PersistentStateOptions<T> = withDefaults(
    defaultPersistentStateOptions,
    options,
  );

  const isValid = (field: string, value: unknown): boolean => {
    if (!Object.hasOwn(defaults, field)) {
      return false;
    }

    const key = field as keyof T;

    if (typeof value !== typeof defaults[key]) {
      return false;
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      return false;
    }

    const validator = validators[key];

    return validator === undefined || validator(value);
  };

  for (const [field, value] of Object.entries(defaults)) {
    if (!isValid(field, value)) {
      throw new PersistentStateValueError(name, field, value);
    }
  }

  const stored = await callBackend(() => storage.get(name));
  let entry: StoredEntry = stored === null ? {} : parseEntry(stored);
  const loaded: Partial<T> = {};

  for (const field of Object.keys(defaults)) {
    if (!Object.hasOwn(entry, field)) {
      continue;
    }

    const value = entry[field];

    if (isValid(field, value)) {
      loaded[field as keyof T] = value as T[keyof T];
    }
  }

  let values: Readonly<T> = Object.freeze({ ...defaults, ...loaded });
  const onChange = new ParameterizedForgeEvent<Readonly<T>>(
    `persistentState.${name}.onChange`,
  );

  let writing = false;
  let nextWrite: PendingWrite[] | null = null;

  const startWrite = (): Promise<void> => {
    const isEmpty = Object.keys(entry).length === 0;
    const serialized = JSON.stringify(entry);

    writing = true;

    const write = callBackend(() =>
      isEmpty ? storage.remove(name) : storage.set(name, serialized),
    );

    const onSettled = (): void => {
      writing = false;

      if (nextWrite === null) {
        return;
      }

      const waiting = nextWrite;

      nextWrite = null;
      startWrite().then(
        () => {
          for (const pending of waiting) {
            pending.resolve();
          }
        },
        (error: unknown) => {
          for (const pending of waiting) {
            pending.reject(error);
          }
        },
      );
    };

    write.then(onSettled, onSettled);

    return write;
  };

  const queueWrite = (): Promise<void> => {
    if (!writing) {
      return startWrite();
    }

    const waiting = nextWrite ?? [];

    nextWrite = waiting;

    return new Promise((resolve, reject) => {
      waiting.push({ resolve, reject });
    });
  };

  const applyValues = (newValues: T): void => {
    values = Object.freeze(newValues);
    onChange.raise(values);
  };

  return {
    name,
    get values(): Readonly<T> {
      return values;
    },
    onChange,
    set: (changes: Partial<T>): Promise<void> => {
      const entries = Object.entries(changes);

      for (const [field, value] of entries) {
        if (!isValid(field, value)) {
          throw new PersistentStateValueError(name, field, value);
        }
      }

      entry = { ...entry, ...changes };
      applyValues({ ...values, ...changes });

      return queueWrite();
    },
    reset: (): Promise<void> => {
      entry = {};
      applyValues({ ...defaults });

      return queueWrite();
    },
  };
}
