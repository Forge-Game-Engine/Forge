# Design: Persistent Player Preferences

|                                       |                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Draft, for review                                                                                                                                                        |
| **Kind**                              | Feature                                                                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/audio/audio-mixer.ts` and `src/graphics/graphics-settings-store.ts` (two copies of the same load/validate/save code)                         |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                 |
| **Related**                           | [#567](https://github.com/Forge-Game-Engine/Forge/issues/567) (save/load epic), [`audio-mixer.md`](./audio-mixer.md), [`webgl-context-loss.md`](./webgl-context-loss.md) |

## 0. Targeted modules

| Path                                        | Change   | Notes                                                                        |
| ------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `src/preferences/`                          | **New**  | `createPreferences`: typed, defaulted, validated values persisted per device |
| `src/index.ts`, `package.json` exports      | Modified | New module                                                                   |
| `documentation-site/docs/docs/preferences/` | **New**  | Guide                                                                        |

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
This design adds the equivalent to Forge.

---

## 2. Scope

### In scope

- `createPreferences`: a named set of flat values with defaults,
  per-field validation, persistence in `localStorage`, and a change event.
- Graceful failure when storage is unavailable, blocked or full.

### Out of scope

- **Saving game state** (worlds, entities, progress). That's
  [#567](https://github.com/Forge-Game-Engine/Forge/issues/567).
- **Other storage backends.** #567 plans a storage abstraction covering
  IndexedDB and remote saves, which are asynchronous. Preferences are read
  synchronously before any world exists, so they use `localStorage`, as
  Unity's `PlayerPrefs` and `bevy_pkv` do in the browser. Whether they
  should later share #567's backends is open question 1.
- **Nested values and migrations.** Values are flat numbers, strings and
  booleans. Structured data such as key bindings can be stored as a JSON
  string, the way Unity stores input binding overrides in `PlayerPrefs`. A
  field that changes meaning gets a new name (open question 2).
- **Syncing across devices.**

---

## 3. How established engines handle this

- **Unity**: `PlayerPrefs.SetFloat`/`GetFloat(key, default)`, stored per
  platform (the registry, a plist, or IndexedDB on WebGL). Separate from
  save games.
- **Godot**: `ConfigFile` with sections and keys, saved under `user://`,
  read with `get_value(section, key, default)`.
- **Bevy**: no built-in. `bevy_pkv` is a key-value store
  (`get::<T>(key)`, `set(key, &value)`) meant for settings and saves; in
  the browser it uses `localStorage`, chosen to keep its API synchronous.
  `bevy-persistent` persists a whole typed resource.

The key-value stores keep only the keys a game set and apply defaults when
reading, so a missing or new setting just works, and a default the game
changes in an update reaches every player who never changed it.

---

## 4. Design

```ts
type PreferenceValue = number | string | boolean;

interface Preferences<T extends { [K in keyof T]: PreferenceValue }> {
  /**
   * The current values: stored ones that passed validation, defaults for
   * the rest. Replaced (not mutated) on every change, so read it from the
   * preferences object rather than keeping a reference.
   */
  readonly values: Readonly<T>;
  /** Applies `changes` and saves them. Never throws because storage failed. */
  set(changes: Partial<T>): void;
  /** Forgets everything stored, so every value is its default again. */
  reset(): void;
  /** Raised after `set` or `reset` with the new values. */
  readonly onChange: ParameterizedForgeEvent<Readonly<T>>;
}

interface PreferencesOptions<T> {
  /** Per-field checks beyond "same type as the default", e.g. one of a set of strings. */
  validators: { [K in keyof T]?: (value: unknown) => value is T[K] };
}

const defaultPreferencesOptions = { validators: {} };

function createPreferences<T extends { [K in keyof T]: PreferenceValue }>(
  name: string,
  defaults: T,
  options: Partial<PreferencesOptions<T>> = {},
): Preferences<T>;
```

The constraint is written as a mapped type, not
`Record<string, PreferenceValue>`, so interfaces such as the demo's
`AudioSettings` are accepted.

- **Loading** happens once, in `createPreferences`. A stored field is used
  if it has the same type as its default (numbers must also be finite) and
  passes its validator; otherwise the default is used, independently of
  the other fields. Unreadable storage or malformed data gives the
  defaults. An out-of-range stored value (a volume of `-0.1`) therefore
  becomes the default, not the nearest valid value.
- **Saving** stores only the keys that have been `set`, as JSON under
  `name`. Defaults are never written, so changing a default in a game
  update reaches every player who hadn't changed that setting. `reset`
  removes the stored entry.
- **Failures.** `localStorage` is accessed only inside `try` blocks: even
  reading the property throws a `SecurityError` where storage is blocked.
  A failed write (quota, blocked storage) is swallowed and the values
  still apply for the session, which is all a game can do anyway. `set`
  with a value that fails validation, including `NaN` or `Infinity`,
  throws: that's a programming error, and `JSON.stringify` would turn a
  non-finite number into `null` and quietly lose it on reload.
- **One set per name.** Creating two preferences with the same `name`
  throws, since each would overwrite the other's stored keys.

### 4.1 Who owns the values

The preferences object is the single owner of persisted settings. Other
state derived from them (a graphics settings component, the audio mixer's
bus volumes in [`audio-mixer.md`](./audio-mixer.md)) is written from
`onChange`, and changes go through `set`, so nothing keeps a second copy
that drifts from what's stored.

The demo's audio settings become:

```ts
const isVolume = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1;

const audioPreferences = createPreferences(
  'galactic-journey.audio-settings',
  { master: 1, music: 1, sfx: 1, muted: false },
  { validators: { master: isVolume, music: isVolume, sfx: isVolume } },
);
```

and its graphics settings pass a validator for the quality names. The
graphics "trial" logic (falling back to a known-good quality after a crash)
stays in the game: it's policy, built on top.

---

## 5. Phases

### Phase 1: Preferences

| #   | Task                                                                               | Size |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1.1 | `createPreferences`: per-field loading, storing only set keys, `reset`, `onChange` | M    |
| 1.2 | `localStorage` failure handling (blocked, full, malformed); duplicate-name check   | S    |
| 1.3 | Module wiring (`src/index.ts`, `package.json` exports)                             | S    |
| 1.4 | Guide; a settings panel in a docs demo; changelog under `#### Added`               | M    |

**Definition of done:** a docs demo's settings survive a reload; a
corrupted stored value falls back to its default without affecting the
other fields; changing a default reaches a player who never set it.

---

## 6. Decision log

### DL-1: A preferences store separate from save games

**Options.** (a) A small preferences API now. (b) Wait for #567's world
serialization and store settings as entities.

**Decision: (a).**

**Rationale.** Settings are read before any world exists (the demo picks
its render quality before creating its render pipeline), are tiny, aren't
entities, and need per-field fallback rather than migrations. Unity and
Godot keep them separate for the same reasons.

### DL-2: Validation per field, not per object

**Rationale.** A game update that adds or retypes one setting shouldn't
reset the player's others. Both demo stores already do it per field.

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

---

## 7. Open questions

1. **Should preferences share #567's storage backends** once they exist?
   They're asynchronous (IndexedDB, remote), and preferences are read
   synchronously at startup, so sharing them would make loading async.
   - (a) Keep preferences on `localStorage` (proposed). (b) Design one
     storage abstraction for both as part of #567.
2. **Renamed or reinterpreted settings.** With per-field fallback, a
   renamed field resets to its default. A migration hook could carry it
   over.
   - (a) No migrations until a game needs one (proposed). (b) A
     `migrate(storedObject)` option.

---

## 8. Testing considerations

- Loading: missing storage, a `SecurityError` on access, malformed JSON, a
  wrong-typed field, a non-finite number, a field failing its validator,
  extra fields; each falls back per field.
- Saving: only set keys are written; `reset` removes the entry; a throwing
  `setItem` leaves values applied; `onChange` raised.
- `set` with an invalid or non-finite value throws; a second
  `createPreferences` with the same name throws.
- jsdom provides `localStorage` for the unit tests.

## 9. Documentation and demo follow-up

- New `preferences/` guide.
- Demo: the load/validate/save code in the audio mixer and the graphics
  settings store is replaced by two `createPreferences` calls; the
  graphics settings component and the mixer's buses are updated from
  `onChange`.
