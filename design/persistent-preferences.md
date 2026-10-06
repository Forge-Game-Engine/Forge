# Design: Persistent State

|                                       |                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Draft, for review                                                                                                                                                        |
| **Kind**                              | Feature                                                                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/audio/audio-mixer.ts` and `src/graphics/graphics-settings-store.ts` (two copies of the same load/validate/save code)                         |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                 |
| **Related**                           | [#567](https://github.com/Forge-Game-Engine/Forge/issues/567) (save/load epic), the audio module's `SoundMixer`, [`webgl-context-loss.md`](./webgl-context-loss.md)      |

## 0. Targeted modules

| Path                                    | Change   | Notes                                                                                                                                                       |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/storage/`                          | **New**  | `StorageBackend` (shared with #567's save system), the `localStorage` and memory backends, and `createPersistentState`: typed records kept outside the game |
| `src/index.ts`, `package.json` exports  | Modified | New module                                                                                                                                                  |
| `documentation-site/docs/docs/storage/` | **New**  | Guide: persistent state, writing it into the world, backends, implementing another backend                                                                  |

---

## 1. Summary

Games keep state that has to outlive the page: settings such as volumes
and graphics quality, and also achievements, unlocked levels and account
details. Forge has nothing for this, so the demo writes its own, twice.
Its audio mixer and its graphics settings each:

- pick a `localStorage` key under the game's name,
- parse the stored JSON in a `try`, because storage can be unavailable,
- check each field's type and fall back to its default if it's missing or
  wrong (for example after a game update changed the settings),
- write the whole object back in a `try`, because storage can be full or
  blocked in a private window, in which case the setting lasts for the
  session.

None of that is specific to the game. Unity has `PlayerPrefs` and Godot
has `ConfigFile` for exactly this, separate from saving a world. This
design adds persistent state to Forge: typed records kept outside the
game, stored through a storage interface that
[#567](https://github.com/Forge-Game-Engine/Forge/issues/567)'s save
system will share, with `localStorage` as its first implementation. A
record lives above the world, not in it, and writes its values into the
world as component values.

---

## 2. Scope

### In scope

- `StorageBackend`: the interface every storage implementation satisfies;
  `createLocalStorageBackend`, its first implementation, and
  `createMemoryStorageBackend`.
- `createPersistentState`: a named record of flat values with defaults,
  validation, persistence through a `StorageBackend`, and a change event.
- Writing a record's values into the world as component values.
- Specific errors when storage is unavailable, blocked or full, and when
  stored data doesn't match the record.

### Out of scope

- **Serializing worlds** (entities and their components). That's
  [#567](https://github.com/Forge-Game-Engine/Forge/issues/567), which
  stores what it serializes through the same backends.
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
  `bevy-persistent` persists a whole typed resource, which game code
  changes through its own API.

The key-value stores keep only the keys a game set and apply defaults when
reading, so a missing or new field just works, and a default the game
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
(`localStorage` holds nothing else); callers serialize. Persistent state
is the interface's first user, not its only one: #567's save system
stores serialized worlds through it, so a game that switches backends
changes one argument, not its game code.

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

### 4.2 Persistent state

```ts
type PersistentValue = number | string | boolean;

interface PersistentState<T extends { [K in keyof T]: PersistentValue }> {
  /**
   * The current values: the stored ones, and defaults for fields that
   * aren't stored. Replaced (not mutated) on every change, so read it from
   * the record rather than keeping a reference.
   */
  readonly values: Readonly<T>;
  /**
   * Applies `changes` at once and stores them. Resolves once they're
   * stored; rejects with the backend's `StorageError` if they can't be.
   * @throws `PersistentStateValueError` if a value fails validation; nothing is applied then.
   */
  set(changes: Partial<T>): Promise<void>;
  /** Makes every value its default again and removes the stored entry. Settles like `set`. */
  reset(): Promise<void>;
  /** Raised after `set` or `reset` with the new values. */
  readonly onChange: ParameterizedForgeEvent<Readonly<T>>;
}

interface PersistentStateOptions<T> {
  /** Per-field checks beyond "same type as the default", e.g. one of a set of strings. */
  validators: { [K in keyof T]?: (value: unknown) => value is T[K] };
  /** Where the record is stored. */
  storage: StorageBackend;
}

const defaultPersistentStateOptions = {
  validators: {},
  storage: createLocalStorageBackend(),
};

function createPersistentState<T extends { [K in keyof T]: PersistentValue }>(
  name: string,
  defaults: T,
  options: Partial<PersistentStateOptions<T>> = {},
): Promise<PersistentState<T>>;

/** The stored entry isn't a JSON object: something else wrote it, or it's damaged. */
class PersistentStateFormatError extends Error {}

/** A value doesn't have its default's type, or fails its validator. */
class PersistentStateValueError extends Error {
  /** The field the value is for. */
  readonly field: string;
  /** The value, as stored or as passed to `set`. */
  readonly value: unknown;
}
```

The constraint is written as a mapped type, not
`Record<string, PersistentValue>`, so interfaces such as the demo's
`AudioSettings` are accepted.

- **Loading** happens once, in `createPersistentState`, which resolves
  once the stored entry has been read. After that, `values` is read from
  memory and `set` applies synchronously, whatever the backend, as Unity's
  `PlayerPrefs` and Godot's `user://` behave on the web once their stores
  are loaded. A field that isn't stored takes its default, which is how a
  game update adds one. A stored field must have its default's type
  (numbers must also be finite) and pass its validator; otherwise
  `createPersistentState` rejects with `PersistentStateValueError`, naming
  the field (DL-2). A stored volume of `-0.1` is an error, not a default.
- **Saving** writes the entry as it was loaded, with the keys `set` since
  then applied, as JSON under `name`. Fields this version doesn't know
  stay as they were stored, so nothing set in an earlier session, or by a
  newer version of the game, is lost. Defaults are never written, so
  changing a default in a game update reaches every player who hadn't
  changed that field. `reset` empties the entry, which removes it.
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
  - `createPersistentState` rejects with the backend's `StorageError` if
    the stored entry can't be read, with `PersistentStateFormatError` if it
    isn't a JSON object (written by something else, or damaged), and with
    `PersistentStateValueError` if a stored field has the wrong type or
    fails its validator.
  - `set` and `reset` reject with the backend's `StorageError` if the
    change can't be stored. The values stay applied in memory, and the
    next write that succeeds stores them, since every write stores the
    whole entry. The game decides what a failed save means: tell the
    player, retry, or carry on for the session.
  - A backend that throws instead of rejecting is treated the same.
  - A game that wants to carry on without storage creates its record on
    `createMemoryStorageBackend()` after catching the error, which makes
    that choice visible in its code.
  - `set` with a value that fails validation, including `NaN` or
    `Infinity`, throws `PersistentStateValueError` before applying
    anything: that's a programming error, and `JSON.stringify` would turn
    a non-finite number into `null` and quietly lose it on reload.
- **Names.** Use one record per `name`; two would overwrite each other's
  writes. Nothing enforces it: a registry of names would make re-creating
  a record throw, and docs demos and single-page apps create their games
  again on every visit. `localStorage` keys are shared by every page of an
  origin, and some hosts serve many games from one origin (itch.io's HTML5
  games, an organization's GitHub Pages sites), so a name carries a game
  prefix, as the demo's `galactic-journey.` does.

### 4.3 The state lives above the world

A record isn't part of any world, and no system loads or saves it. It's
external state: loaded before a world exists (the demo's graphics quality
picks a render-context option, so it's read before `createGame`), it
outlives the worlds that read it, and its loads and saves are
asynchronous, which systems aren't.

The game's setup code writes a record's values into the world as
component values, once the world exists and again on every `onChange`
(raised only by changes). Systems read that component like any other.
Changes go through `set`, never through the component, so the record is
the one writer of the fields it mirrors, and nothing keeps a second copy
that drifts from what's stored. State outside any world, such as the sound
mixer's bus volumes (`MixerBus.volume` and `muted`), follows
`onChange` the same way.

The demo already has this shape: it reads its graphics settings before
`createGame` and adds them as a component (`addGraphicsSettingsComponent`).
With this design:

```ts
const graphics = await createPersistentState(
  'galactic-journey.graphics',
  { quality: 'high' },
  { validators: { quality: isGraphicsQuality } },
);

const { world } = createGame('demo-game', {
  renderContext: {
    maxPixelRatio: graphicsPresets[graphics.values.quality].maxPixelRatio,
  },
});

const settings = world.createEntity();

world.addComponent(settings, graphicsSettingsId, { ...graphics.values });
graphics.onChange.registerListener((values) => {
  Object.assign(
    world.getComponentRequired(settings, graphicsSettingsId),
    values,
  );
});
```

Its audio settings become another record:

```ts
const isVolume = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1;

const audioSettings = await createPersistentState(
  'galactic-journey.audio-settings',
  { master: 1, music: 1, sfx: 1, muted: false },
  { validators: { master: isVolume, music: isVolume, sfx: isVolume } },
);
```

Today the demo carries on with defaults when storage is blocked; with this
design it does so explicitly, catching `StorageError` and creating its
records on a memory backend for the session. A `PersistentStateValueError`
(settings an older version stored in another format) it handles by
removing the entry through the backend and creating the record again: the
demo's policy, not the engine's. The graphics "trial" logic (falling back
to a known-good quality after a crash) stays in the game too.

---

## 5. Phases

### Phase 1: Storage and persistent state

| #   | Task                                                                                                                                                          | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `StorageBackend`, the `StorageError` classes, `createLocalStorageBackend` mapping unavailable, blocked and full storage to them, `createMemoryStorageBackend` | S    |
| 1.2 | `createPersistentState`: per-field loading, storing only set keys, `reset`, `onChange`, the write queue, promises from `set` and `reset`                      | M    |
| 1.3 | Failures surfaced (rejected and throwing reads and writes, `PersistentStateFormatError`, `PersistentStateValueError`)                                         | S    |
| 1.4 | Module wiring (`src/index.ts`, `package.json` exports)                                                                                                        | S    |
| 1.5 | `storage/` guide, including writing a record into the world; a settings panel in a docs demo; changelog under `#### Added`                                    | M    |

**Definition of done:** a docs demo's settings survive a reload and a
second visit to its page; a stored value of the wrong type rejects with
an error naming its field; a field that isn't stored takes its default,
and changing a default reaches a player who never set it; keys set in an
earlier session survive a write in the next; a test backend that resolves
writes out of order still ends with the latest values stored, and with
nothing stored after a `reset`.

---

## 6. Decision log

### DL-1: Persistent state separate from world serialization

**Options.** (a) Typed records now. (b) Wait for #567's world
serialization and store this state as entities.

**Decision: (a).**

**Rationale.** Some of this state is read before any world exists (the
demo picks its render quality before creating its render pipeline), it's
small and flat, and it isn't entities. Unity and Godot keep settings
separate from saves for the same reasons. #567's serialized worlds go
through the same backends.

### DL-2: A stored value of the wrong type is an error

**Options.** (a) Fall back to the default for that field, as both demo
stores do. (b) Reject with an error naming the field.

**Decision: (b)**, decided in review.

**Rationale.** A record holds more than settings: achievements, account
details and other data where quietly replacing a stored value with its
default loses it. A value of the wrong type is a bug, or a change of
format the game has to handle itself (migrating the entry or resetting
it), so it's an error, at `set` as much as at load. A field that isn't
stored at all is different: it takes its default, which is how a game
update adds one.

### DL-3: Store only what was set

**Options.** (a) Store the whole record on every change, as the demo
does. (b) Store only the keys that were set.

**Decision: (b).**

**Rationale.** (a) pins every default the first time a player changes
anything, so a later change to a default (the demo's starting graphics
quality, say) never reaches them. Every key-value store in §3 works like
(b).

### DL-4: Flat values only

**Rationale.** Every setting in the demo and in typical options menus,
and most achievement and profile fields, is a number, string or boolean.
Flat values make the type check against the default sufficient for most
fields, and keep the stored format readable.

### DL-5: A storage interface now, with `localStorage` its first implementation

**Options.** (a) Use `localStorage` directly; #567 designs storage later.
(b) A `StorageBackend` interface now, which #567's save system shares,
with `localStorage` its only implementation for now.

**Decision: (b)**, decided in review.

**Rationale.** #567 calls for a storage-backend abstraction so a game can
choose `localStorage`, IndexedDB or a remote endpoint without changing
its code. Persistent state is the first code that needs storage, so it
sets the interface, and later backends implement it without touching
persistent state or the games using it (#567 is expected to add listing
to it). Unity's `PlayerPrefs` and Godot's `user://` are likewise one API
over per-platform storage.

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
Records, which are small, do the one load themselves: they're awaited at
creation and then read from memory, Unity's and Godot's model one level
up. The cost is `await createPersistentState(...)`, where a game already
awaits its assets.

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

### DL-8: The state lives above the world and writes into it

**Options.** (a) An object passed to the systems that need it, as `Time`
and `InputManager` are. (b) A component that a system loads and writes
back. (c) A record above the world that writes its values into the world
as component values.

**Decision: (c)**, decided in review.

**Rationale.** The world can't manage external state: it's needed before
the world exists, it outlives it, and loading and saving are
asynchronous, which systems aren't. (b) would also need change detection,
which Forge doesn't have, to know when to write back. With (c), systems
read components as they read everything else, and the record is the one
writer of the fields it mirrors. `bevy-persistent` is the same idea: a
persisted value that game code changes through its own API. In Bevy that
value is a resource; Forge has no resources, so the world-side copy is a
component.

### DL-9: Named for what it holds

**Decision:** persistent state, not player preferences, decided in
review.

**Rationale.** The same record holds achievements, unlocked levels and
account details as well as settings, and the validation, write and
failure rules above are written for all of them.

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
2. **Should Forge write records into components for the game?** §4.3's
   setup code is a few lines per record.
   - (a) Not now; it stays setup code, and a helper comes if games keep
     writing the same lines (proposed). (b) A helper that adds the
     component from `values` and updates it on every `onChange`.

---

## 8. Testing considerations

- Loading: a wrong-typed field, a non-finite number and a field failing
  its validator each reject `createPersistentState` with a
  `PersistentStateValueError` naming the field and value; a field that
  isn't stored takes its default; extra fields survive the next write; a
  rejected or throwing read rejects with the backend's error; malformed
  JSON rejects with `PersistentStateFormatError`.
- Saving: defaults are never written; keys set in an earlier session
  survive a write in the next; `reset` removes the entry, and a `reset`
  while a write is in flight ends with nothing stored; a rejected write
  rejects that `set`'s promise, leaves the values applied, and a later
  successful write stores them; `onChange` raised; writes are serialized
  and the latest state wins against a backend that settles out of order;
  with the `localStorage` backend, a change is stored by the end of the
  task.
- `set` with an invalid or non-finite value throws
  `PersistentStateValueError` and applies nothing; creating a record again
  under the same name works.
- The `localStorage` backend: no `localStorage`, a `SecurityError` and a
  `QuotaExceededError` reject with `StorageUnavailableError`,
  `StorageBlockedError` and `StorageFullError`, with the original as
  `cause`; its writes land before the call returns; importing the module
  where there's no `window` doesn't throw.
- The memory backend: values round-trip; nothing is shared between two
  backends.
- jsdom provides `localStorage`; persistent state tests use the memory
  backend, and a stub backend to control timing.

## 9. Documentation and demo follow-up

- New `storage/` guide: persistent state and writing it into the world;
  `StorageBackend` and its contract; the `localStorage` backend (keys are
  shared across the origin, so prefix them); implementing another
  backend.
- Demo: the load/validate/save code in the audio mixer and the graphics
  settings store is replaced by two awaited `createPersistentState` calls;
  the graphics settings component and the mixer's buses are initialized
  from `values` and updated from `onChange`.
