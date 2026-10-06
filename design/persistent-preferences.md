# Design: Persistent Player Preferences

|                                       |                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Draft, for review                                                                                                                                                        |
| **Kind**                              | Feature                                                                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/audio/audio-mixer.ts` and `src/graphics/graphics-settings-store.ts` (two copies of the same load/validate/save code)                         |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                 |
| **Related**                           | [#567](https://github.com/Forge-Game-Engine/Forge/issues/567) (save/load epic), [`audio-mixer.md`](./audio-mixer.md), [`webgl-context-loss.md`](./webgl-context-loss.md) |

## 0. Targeted modules

| Path                                        | Change   | Notes                                                                                  |
| ------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `src/storage/`                              | **New**  | `StorageBackend`, the interface #567's save system shares; `createLocalStorageBackend` |
| `src/preferences/`                          | **New**  | `createPreferences`: typed, defaulted, validated values persisted per device           |
| `src/index.ts`, `package.json` exports      | Modified | New modules                                                                            |
| `documentation-site/docs/docs/preferences/` | **New**  | Guide                                                                                  |
| `documentation-site/docs/docs/storage/`     | **New**  | `StorageBackend`, the `localStorage` backend, implementing another backend             |

---

## 1. Summary

Every game has settings that should survive a reload: volumes, mute,
graphics quality, input preferences. Forge has nothing for this, so the
demo writes it twice. Its audio mixer and its graphics settings each:

- pick a `localStorage` key under the game's name,
- parse the stored JSON in a `try`, because storage can be unavailable,
- check each field's type and fall back to its default if it's missing or
  wrong (for example after a game update changed the settings),
- write the whole object back in a `try`, because storage can be full or
  blocked in a private window, in which case the setting lasts for the
  session.

None of that is specific to the game. Unity has `PlayerPrefs` and Godot
has `ConfigFile` for exactly this, separate from saving game progress.
This design adds the equivalent to Forge, stored through a storage
interface that [#567](https://github.com/Forge-Game-Engine/Forge/issues/567)'s
save system will share, with `localStorage` as its first implementation.

---

## 2. Scope

### In scope

- `StorageBackend`: the interface every storage implementation satisfies,
  and `createLocalStorageBackend`, its first implementation.
- `createPreferences`: a named set of flat values with defaults,
  per-field validation, persistence through a `StorageBackend`, and a
  change event.
- Specific errors when storage is unavailable, blocked or full, which the
  game handles as it sees fit.

### Out of scope

- **Saving game state** (worlds, entities, progress). That's
  [#567](https://github.com/Forge-Game-Engine/Forge/issues/567).
- **Other backends' implementations.** IndexedDB, a remote endpoint or a
  desktop wrapper's file system implement `StorageBackend` later, with
  #567 or when a game needs one. #567 is expected to extend the interface
  too (listing what's stored, for a load menu), which custom backends then
  implement as well; that's acceptable before 1.0.
- **Nested values and migrations.** Values are flat numbers, strings and
  booleans. Structured data such as key bindings can be stored as a JSON
  string, the way Unity stores input binding overrides in `PlayerPrefs`. A
  field that changes meaning gets a new name (open question 1).
- **Syncing across devices.**

---

## 3. How established engines handle this

- **Unity**: `PlayerPrefs.SetFloat`/`GetFloat(key, default)`, one API
  over per-platform storage (the registry, a plist, or IndexedDB on
  WebGL). Separate from save games. On WebGL, reads and writes go to
  memory synchronously, and reaching IndexedDB is asynchronous.
- **Godot**: `ConfigFile` with sections and keys, saved under `user://`,
  read with `get_value(section, key, default)`. On the web, `user://` is
  kept in IndexedDB and loaded when the game starts.
- **Bevy**: no built-in. `bevy_pkv` is a key-value store
  (`get::<T>(key)`, `set(key, &value)`) meant for settings and saves; in
  the browser it uses `localStorage`, chosen to keep its API synchronous.
  `bevy-persistent` persists a whole typed resource.

The key-value stores keep only the keys a game set and apply defaults when
reading, so a missing or new setting just works, and a default the game
changes in an update reaches every player who never changed it.

---

## 4. Design

### 4.1 Storage backends

```ts
/**
 * Where persisted strings are kept. Asynchronous, so IndexedDB and remote
 * endpoints can implement it as well as `localStorage`.
 */
interface StorageBackend {
  /** The string stored under `key`, or `null`. Rejects with a `StorageError` if storage can't be read. */
  get(key: string): Promise<string | null>;
  /** Stores `value` under `key`. Rejects with a `StorageError` if it can't be stored. */
  set(key: string, value: string): Promise<void>;
  /** Removes whatever is stored under `key`. Rejects with a `StorageError` if it can't. */
  remove(key: string): Promise<void>;
}

/** What every backend rejects with when storage fails. The original error is its `cause`. */
class StorageError extends Error {}
/** There's no storage to use: no `localStorage` in this environment, an unreachable endpoint. */
class StorageUnavailableError extends StorageError {}
/** Storage exists but is blocked: by the browser's settings, a frame denied storage, private browsing. */
class StorageBlockedError extends StorageError {}
/** Storage is full. */
class StorageFullError extends StorageError {}

function createLocalStorageBackend(): StorageBackend;
/** Keeps values in memory only: for tests, or for a game that chooses to carry on without storage. */
function createMemoryStorageBackend(): StorageBackend;
```

Values are strings, the format every candidate backend can hold
(`localStorage` holds nothing else); callers serialize. The interface
lives in its own `src/storage` module because preferences are its first
user, not its only one: #567's save system stores serialized worlds
through the same interface, so a game that switches backends changes one
argument, not its game code.

The contract every backend keeps:

- Every promise it returns settles. A backend that talks to a network
  applies its own timeouts, so a hung request can't stall its callers.
- `remove` resolves once nothing is stored under the key, whether or not
  anything was.
- Creating a backend touches nothing; only its methods touch storage. The
  docs site imports engine modules during its server-side build, where
  there's no `window`.

The `localStorage` backend touches `localStorage` only inside `try` blocks
(even reading the property throws a `SecurityError` where storage is
blocked) and turns each failure into the matching error: no
`localStorage` is `StorageUnavailableError`, a `SecurityError` is
`StorageBlockedError`, and a `QuotaExceededError` is `StorageFullError`.
Anything else is rethrown as it is. It does its work inside the call and
returns a settled promise, so its writes land straight away, as the
demo's do today, and aren't lost if the page closes right after.

### 4.2 Preferences

```ts
type PreferenceValue = number | string | boolean;

interface Preferences<T extends { [K in keyof T]: PreferenceValue }> {
  /**
   * The current values: the stored ones, and defaults for fields that
   * aren't stored. Replaced (not mutated) on every change, so read it from
   * the preferences object rather than keeping a reference.
   */
  readonly values: Readonly<T>;
  /**
   * Applies `changes` at once and stores them. Resolves once they're
   * stored; rejects with the backend's `StorageError` if they can't be.
   * @throws `PreferencesValueError` if a value fails validation; nothing is applied then.
   */
  set(changes: Partial<T>): Promise<void>;
  /** Makes every value its default again and removes the stored entry. Settles like `set`. */
  reset(): Promise<void>;
  /** Raised after `set` or `reset` with the new values. */
  readonly onChange: ParameterizedForgeEvent<Readonly<T>>;
}

interface PreferencesOptions<T> {
  /** Per-field checks beyond "same type as the default", e.g. one of a set of strings. */
  validators: { [K in keyof T]?: (value: unknown) => value is T[K] };
  /** Where the preferences are stored. */
  storage: StorageBackend;
}

const defaultPreferencesOptions = {
  validators: {},
  storage: createLocalStorageBackend(),
};

function createPreferences<T extends { [K in keyof T]: PreferenceValue }>(
  name: string,
  defaults: T,
  options: Partial<PreferencesOptions<T>> = {},
): Promise<Preferences<T>>;

/** The stored entry isn't a JSON object: something else wrote it, or it's damaged. */
class PreferencesFormatError extends Error {}

/** A value doesn't have its default's type, or fails its validator. */
class PreferencesValueError extends Error {
  /** The field the value is for. */
  readonly field: string;
  /** The value, as stored or as passed to `set`. */
  readonly value: unknown;
}
```

The constraint is written as a mapped type, not
`Record<string, PreferenceValue>`, so interfaces such as the demo's
`AudioSettings` are accepted.

- **Loading** happens once, in `createPreferences`, which resolves once
  the stored entry has been read. After that, `values` is read from memory
  and `set` applies synchronously, whatever the backend, as Unity's
  `PlayerPrefs` and Godot's `user://` behave on the web once their stores
  are loaded. A field that isn't stored takes its default, which is how a
  game update adds one. A stored field must have its default's type
  (numbers must also be finite) and pass its validator; otherwise
  `createPreferences` rejects with `PreferencesValueError`, naming the
  field (DL-2). A stored volume of `-0.1` is an error, not a default.
- **Saving** writes the entry as it was loaded, with the keys `set` since
  then applied, as JSON under `name`. Fields this version doesn't know
  stay as they were stored, so nothing set in an earlier session, or by a
  newer version of the game, is lost. Defaults are never written,
  so changing a default in a game update reaches every player who hadn't
  changed that setting. `reset` empties the entry, which removes it.
- **Write order.** One queue does every write, for `set` and `reset`
  alike, with at most one write in flight: it stores the current entry, or
  removes it when it's empty. Changes made while a write is in flight go
  out together in the next one, and their promises settle with it, so a
  slow backend can't apply an older write after a newer one, nor bring
  values back after a `reset`. Godot's web build syncs IndexedDB the same
  way: one sync at a time, and another after it if anything changed. An
  idle queue starts its write without awaiting anything first and never
  waits on a timer, so with the `localStorage` backend a change is stored
  by the end of the task that made it.
- **Failures are the game's to handle.** Nothing falls back silently:
  - `createPreferences` rejects with the backend's `StorageError` if the
    stored entry can't be read, with `PreferencesFormatError` if it isn't
    a JSON object (written by something else, or damaged), and with
    `PreferencesValueError` if a stored field has the wrong type or fails
    its validator.
  - `set` and `reset` reject with the backend's `StorageError` if the
    change can't be stored. The values stay applied in memory, and the
    next write that succeeds stores them, since every write stores the
    whole entry. The game decides what a failed save means: tell the
    player, retry, or carry on for the session.
  - A backend that throws instead of rejecting is treated the same.
  - A game that wants to carry on without storage creates its preferences
    on `createMemoryStorageBackend()` after catching the error, which makes
    that choice visible in its code.
  - `set` with a value that fails validation, including `NaN` or
    `Infinity`, throws `PreferencesValueError` before applying anything:
    that's a programming error, and `JSON.stringify` would turn a
    non-finite number into `null` and quietly lose it on reload.
- **Names.** Use one preferences object per `name`; two would overwrite
  each other's writes. Nothing enforces it: a registry of names would
  make re-creating preferences throw, and docs demos and single-page apps
  create their games again on every visit. `localStorage` keys are shared
  by every page of an origin, and some hosts serve many games from one
  origin (itch.io's HTML5 games, an organization's GitHub Pages sites), so
  a name carries a game prefix, as the demo's `galactic-journey.` does.

### 4.3 Who owns the values

The preferences object is the single owner of persisted settings. Other
state derived from them (a graphics settings component, the audio mixer's
bus volumes in [`audio-mixer.md`](./audio-mixer.md)) is initialized from
`values` once `createPreferences` resolves and updated from `onChange`
(which is raised only by changes), and changes go through `set`, so
nothing keeps a second copy that drifts from what's stored.

The demo's audio settings become:

```ts
const isVolume = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1;

const audioPreferences = await createPreferences(
  'galactic-journey.audio-settings',
  { master: 1, music: 1, sfx: 1, muted: false },
  { validators: { master: isVolume, music: isVolume, sfx: isVolume } },
);
```

and its graphics settings pass a validator for the quality names, in the
async function that already creates the game. Today the demo carries on
with defaults when storage is blocked; with this design it does so
explicitly, catching `StorageError` and creating its preferences on a
memory backend for the session. A `PreferencesValueError` (settings an
older version stored in another format) it handles by removing the entry
through the backend and creating its preferences again: the demo's policy,
not the engine's. The graphics "trial" logic (falling back
to a known-good quality after a crash) stays in the game: it's policy,
built on top.

---

## 5. Phases

### Phase 1: Storage and preferences

| #   | Task                                                                                                                                                                         | Size |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `src/storage`: `StorageBackend`, the `StorageError` classes, `createLocalStorageBackend` mapping unavailable, blocked and full storage to them, `createMemoryStorageBackend` | S    |
| 1.2 | `createPreferences`: per-field loading, storing only set keys, `reset`, `onChange`, the write queue, promises from `set` and `reset`                                         | M    |
| 1.3 | Failures surfaced (rejected and throwing reads and writes, `PreferencesFormatError`)                                                                                         | S    |
| 1.4 | Module wiring for both modules (`src/index.ts`, `package.json` exports)                                                                                                      | S    |
| 1.5 | Guides (`preferences/`, `storage/`); a settings panel in a docs demo; changelog bullets for both modules under `#### Added`                                                  | M    |

**Definition of done:** a docs demo's settings survive a reload and a
second visit to its page; a stored value of the wrong type rejects with
an error naming its field; a field that isn't stored takes its default,
and changing a default reaches a player who never set it; keys set in an earlier session survive a write in
the next; a test backend that resolves writes out of order still ends with
the latest values stored, and with nothing stored after a `reset`.

---

## 6. Decision log

### DL-1: A preferences store separate from save games

**Options.** (a) A small preferences API now. (b) Wait for #567's world
serialization and store settings as entities.

**Decision: (a).**

**Rationale.** Settings are read before any world exists (the demo picks
its render quality before creating its render pipeline), are tiny, and
aren't entities. Unity and Godot keep them separate for the same reasons.

### DL-2: A stored value of the wrong type is an error

**Options.** (a) Fall back to the default for that field, as both demo
stores do. (b) Reject with an error naming the field.

**Decision: (b)**, decided in review.

**Rationale.** The same record holds more than settings: achievements,
account details and other data where quietly replacing a stored value
with its default loses it. A value of the wrong type is a bug, or a
change of format the game has to handle itself (migrating the entry or
resetting it), so it's an error, at `set` as much as at load. A field
that isn't stored at all is different: it takes its default, which is how
a game update adds one.

### DL-3: Store only what was set

**Options.** (a) Store the whole set on every change, as the demo does.
(b) Store only the keys that were set.

**Decision: (b).**

**Rationale.** (a) pins every default the first time a player changes
anything, so a later change to a default (the demo's starting graphics
quality, say) never reaches them. Every key-value store in §3 works like
(b).

### DL-4: Flat values only

**Rationale.** Every setting in the demo and in typical options menus is
a number, string or boolean. Flat values make the type check against the
default sufficient for most fields, and keep the stored format readable.

### DL-5: A storage interface now, with `localStorage` its first implementation

**Options.** (a) Preferences use `localStorage` directly; #567 designs
storage later. (b) A `StorageBackend` interface now, which #567's save
system shares, with `localStorage` its only implementation for now.

**Decision: (b)**, decided in review.

**Rationale.** #567 calls for a storage-backend abstraction so a game can
choose `localStorage`, IndexedDB or a remote endpoint without changing
its code. Preferences are the first code that needs storage, so they set
the interface, and later backends implement it without touching
preferences or the games using them (#567 is expected to add listing to
it). Unity's `PlayerPrefs` and Godot's `user://` are likewise one API over
per-platform storage.

### DL-6: The interface is asynchronous

**Options.** (a) Synchronous, like Web Storage. (b) Asynchronous.

**Decision: (b).**

**Rationale.** IndexedDB and remote endpoints are asynchronous. A
synchronous interface only works over a store that's loaded before the
game starts, which is what Unity's WebGL player and Godot's web build do
in their own startup: Unity loads its IndexedDB file system before the
game's code runs, and Godot loads `user://`. Forge has no startup step of
its own to do that in (`createGame` is synchronous, and games await their
assets before calling it), and #567's saves shouldn't all be loaded into
memory up front, and need a result for each write. Web key-value
libraries such as localForage are asynchronous for the same reasons.
Preferences, which are small, do the one load themselves: they're awaited
at creation and then read from memory, Unity's and Godot's model one
level up. The cost is `await createPreferences(...)`, where a game
already awaits its assets.

### DL-7: Storage failures are errors the game handles

**Options.** (a) Swallow them: defaults when storage can't be read,
values kept for the session when it can't be written. (b) Specific errors
the game catches.

**Decision: (b)**, decided in review.

**Rationale.** Only the game knows what a failure means for it: telling
the player their settings won't be kept, retrying a remote save, or
carrying on without storage. Swallowing hides the failure from the one
place that can act on it. Godot's `ConfigFile.load` and `save` return an
error for the game to check, and Unity's web player threw
`PlayerPrefsException` when a write exceeded its storage.

---

## 7. Open questions

1. **Renamed or retyped fields.** A renamed field reads as not stored and
   takes its default; a retyped one is an error (DL-2), which the game
   handles by rewriting or removing the entry through the backend. A
   migration hook would transform the stored entry before it's validated.
   [#567](https://github.com/Forge-Game-Engine/Forge/issues/567) plans a
   versioning and migration story for saved data.
   - (a) No migration hook until a game needs one, then adopt #567's
     (proposed). (b) A `migrate(storedObject)` option now.
2. **Persisted state in the world, or beside it?** Preferences are one
   case of state kept outside the game (in `localStorage`, behind an API)
   and mirrored into it, so they could be a component that a system loads
   and writes back, rather than an object.
   - (a) A persisted record beside the world, named for what it is rather
     than for player preferences, and passed to the systems that need it
     as `Time` and `InputManager` are (proposed). Settings are needed
     before the world exists (the render quality picks the render
     context's options), writes go through `set` rather than needing
     change detection, which Forge doesn't have, and the record stays the
     one owner of its values (§4.3).
   - (b) A persisted component, loaded when it's added and written back
     by a system that diffs it every frame.

---

## 8. Testing considerations

- Loading: a wrong-typed field, a non-finite number and a field failing
  its validator each reject `createPreferences` with a
  `PreferencesValueError` naming the field and value; a field that isn't
  stored takes its default; extra fields survive the next write; a
  rejected or throwing read rejects with the backend's error; malformed
  JSON rejects with `PreferencesFormatError`.
- Saving: defaults are never written; keys set in an earlier session
  survive a write in the next; `reset` removes the entry, and a `reset`
  while a write is in flight ends with nothing stored; a rejected write
  rejects that `set`'s promise, leaves the values applied, and a later
  successful write stores them; `onChange` raised; writes are serialized
  and the latest state wins against a backend that settles out of order;
  with the `localStorage` backend, a change is stored by the end of the
  task.
- `set` with an invalid or non-finite value throws `PreferencesValueError`
  and applies nothing;
  creating preferences again under the same name works.
- The `localStorage` backend: no `localStorage`, a `SecurityError` and a
  `QuotaExceededError` reject with `StorageUnavailableError`,
  `StorageBlockedError` and `StorageFullError`, with the original as
  `cause`; its writes land before the call returns; importing the module
  where there's no `window` doesn't throw.
- The memory backend: values round-trip; nothing is shared between two
  backends.
- jsdom provides `localStorage`; preferences tests use the memory backend,
  and a stub backend to control timing.

## 9. Documentation and demo follow-up

- New `preferences/` guide.
- New `storage/` page: `StorageBackend` and its contract, the
  `localStorage` backend (keys are shared across the origin, so prefix
  them), and how to implement another backend.
- Demo: the load/validate/save code in the audio mixer and the graphics
  settings store is replaced by two awaited `createPreferences` calls; the
  graphics settings component and the mixer's buses are initialized from
  `values` and updated from `onChange`.
