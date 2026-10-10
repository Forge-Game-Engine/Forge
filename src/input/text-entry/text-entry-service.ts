import { createTextEntry, TextEntry } from './text-entry.js';

/**
 * Owns the hidden inputs (see {@link TextEntry}) of a game's text fields,
 * one per owner (the entity of the field it belongs to), and the DOM
 * listeners the system that runs the fields attaches to their container.
 * Like a render context owns GPU resources, it owns these DOM resources:
 * the system that runs the fields asks it to release them when a field goes
 * away, and it releases every one of them in {@link releaseAll}.
 *
 * Create one per game with {@link createTextEntryService}, give it to
 * `registerUiSystems` and to every `createTextInput`.
 */
export interface TextEntryService {
  /** The element the hidden inputs are added to, and listeners attached to. */
  readonly container: HTMLElement;

  /**
   * The owners whose entry the system that runs the fields hasn't claimed
   * (see {@link claim}): entries created since it last ran, and entries of
   * fields it stopped running while they kept their entry. It checks these
   * every run, so an entry whose field was removed before the system ever
   * saw it is still released.
   */
  readonly unclaimedOwners: readonly number[];

  /** Whether {@link listen} has attached listeners not yet removed. */
  readonly isListening: boolean;

  /**
   * Creates a hidden input for `owner` (see `createTextEntry`), unclaimed.
   * An owner has one entry: one it already had is disposed.
   * @param owner - The entity of the field the entry belongs to.
   * @returns The entry.
   */
  create(owner: number): TextEntry;

  /**
   * Reads `owner`'s entry.
   * @param owner - The entity of the field.
   * @returns The entry, or `null` if the owner has none.
   */
  get(owner: number): TextEntry | null;

  /**
   * Records that the system that runs the fields is running `owner`'s
   * field, so it will release the entry from its `removed` journal, and the
   * owner leaves {@link unclaimedOwners}. Does nothing for an owner with no
   * entry.
   * @param owner - The entity of the field.
   */
  claim(owner: number): void;

  /**
   * Records that the system stopped running `owner`'s field while the
   * field kept its entry, so the owner is in {@link unclaimedOwners} again.
   * Does nothing for an owner with no entry.
   * @param owner - The entity of the field.
   */
  unclaim(owner: number): void;

  /**
   * Disposes `owner`'s entry, removing its hidden input. Does nothing for an
   * owner with no entry.
   * @param owner - The entity of the field.
   */
  release(owner: number): void;

  /**
   * Attaches a listener to the container, to be removed by
   * {@link releaseAll}.
   * @param type - The event type.
   * @param listener - The listener.
   */
  listen<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ): void;

  /**
   * Disposes every entry and removes every listener. The service can be
   * used again afterwards.
   */
  releaseAll(): void;
}

/**
 * Creates a {@link TextEntryService} whose hidden inputs go in `container`.
 * @param container - The element the game's canvas is in.
 * @returns The service.
 */
export function createTextEntryService(
  container: HTMLElement,
): TextEntryService {
  const entries = new Map<number, TextEntry>();
  const unclaimedOwners: number[] = [];
  // Removes each listener `listen` attached.
  const listenerRemovers: (() => void)[] = [];

  const unclaimedPosition = (owner: number): number =>
    unclaimedOwners.indexOf(owner);

  const removeUnclaimed = (owner: number): void => {
    const position = unclaimedPosition(owner);

    if (position === -1) {
      return;
    }

    unclaimedOwners[position] = unclaimedOwners[unclaimedOwners.length - 1];
    unclaimedOwners.pop();
  };

  const release = (owner: number): void => {
    const entry = entries.get(owner);

    if (!entry) {
      return;
    }

    entry.dispose();
    entries.delete(owner);
    removeUnclaimed(owner);
  };

  return {
    container,
    unclaimedOwners,
    get isListening(): boolean {
      return listenerRemovers.length > 0;
    },
    create: (owner: number): TextEntry => {
      release(owner);

      const entry = createTextEntry(container);

      entries.set(owner, entry);
      unclaimedOwners.push(owner);

      return entry;
    },
    get: (owner: number): TextEntry | null => entries.get(owner) ?? null,
    claim: removeUnclaimed,
    unclaim: (owner: number): void => {
      if (entries.has(owner) && unclaimedPosition(owner) === -1) {
        unclaimedOwners.push(owner);
      }
    },
    release,
    listen: <K extends keyof HTMLElementEventMap>(
      type: K,
      listener: (event: HTMLElementEventMap[K]) => void,
    ): void => {
      container.addEventListener(type, listener);
      listenerRemovers.push(() =>
        container.removeEventListener(type, listener),
      );
    },
    releaseAll: (): void => {
      for (const removeListener of listenerRemovers) {
        removeListener();
      }

      listenerRemovers.length = 0;

      for (const entry of entries.values()) {
        entry.dispose();
      }

      entries.clear();
      unclaimedOwners.length = 0;
    },
  };
}
