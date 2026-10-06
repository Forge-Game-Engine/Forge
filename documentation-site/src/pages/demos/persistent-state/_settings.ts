import {
  createMemoryStorageBackend,
  createLocalStorageBackend,
  createPersistentState,
  PersistentState,
  PersistentStateValueError,
  StorageError,
} from '@forge-game-engine/forge/storage';

export interface DemoSettings {
  size: number;
  spin: boolean;
}

export const minSize = 0.5;
export const maxSize = 2;

// `localStorage` keys are shared by every page of the docs site, so the
// name carries a prefix.
const settingsName = 'forge-docs.persistent-state-demo';

const defaultSettings: DemoSettings = { size: 1, spin: true };

const isSize = (value: unknown): value is number =>
  typeof value === 'number' && value >= minSize && value <= maxSize;

const createSettings = (
  storage = createLocalStorageBackend(),
): Promise<PersistentState<DemoSettings>> =>
  createPersistentState(settingsName, defaultSettings, {
    validators: { size: isSize },
    storage,
  });

export interface LoadedSettings {
  settings: PersistentState<DemoSettings>;
  isStored: boolean;
}

/**
 * Loads the demo's settings from `localStorage`. Stored settings that don't
 * pass validation are removed and the defaults are used. When storage can't
 * be read, the settings are kept in memory for this visit.
 * @returns The settings, and whether they're kept in `localStorage`.
 */
export const loadSettings = async (): Promise<LoadedSettings> => {
  try {
    return { settings: await createSettings(), isStored: true };
  } catch (error) {
    if (error instanceof PersistentStateValueError) {
      await createLocalStorageBackend().remove(settingsName);

      return { settings: await createSettings(), isStored: true };
    }

    if (error instanceof StorageError) {
      return {
        settings: await createSettings(createMemoryStorageBackend()),
        isStored: false,
      };
    }

    throw error;
  }
};
