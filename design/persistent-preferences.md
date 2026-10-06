# Design: Persistent Player Preferences

|                                       |                                                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                          |
| **Kind**                              | Feature                                                                                                                    |
| **Found in**                          | Galactic Journey demo: `src/audio/audio-mixer.ts` and `src/graphics/graphics-settings-store.ts` (two copies of the same load/validate/save code) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                   |
| **Related**                           | [#567](https://github.com/Forge-Game-Engine/Forge/issues/567) (save/load epic), [`audio-mixer.md`](./audio-mixer.md), [`webgl-context-loss.md`](./webgl-context-loss.md) |

## 0. Targeted modules

| Path                                   | Change   | Notes                                                                             |
| -------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `src/preferences/`                     | **New**  | `createPreferences`: typed, defaulted, validated values persisted per device      |
| `src/index.ts`, `package.json` exports | Modified | New module                                                                        |
| `documentation-site/docs/docs/preferences/` | **New** | Guide                                                                        |

---

## 1. Summary

Every game has settings that should survive a reload: volumes, mute,
graphics quality, control preferences. Forge has nothing for this, so the
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
  per-field validation, persistence, and a change event.
- Graceful failure when storage is unavailable or full.
- A pluggable storage backend, with `localStorage` as the default.

### Out of scope

- **Saving game state** (worlds, entities, progress). That's
  [#567](https://github.com/Forge-Game-Engine/Forge/issues/567), which
  also plans storage backends; preferences can move onto those backends
  when they exist.
- **Nested values and migrations.** Values are flat numbers, strings and
  booleans; a field that changes meaning gets a new name (open question 1).
- **Syncing across devices.**

---

## 3. How established engines handle this

- **Unity**: `PlayerPrefs.SetFloat`/`GetFloat(key, default)`, stored per
  platform (the registry, a plist, or IndexedDB on WebGL). Separate from
  save games.
- **Godot**: `ConfigFile` with sections and keys, saved under `user://`,
  read with `get_value(section, key, default)`.
- **Bevy**: no built-in; community crates (`bevy_pkv`,
  `bevy-persistent`) store typed resources the same way.

All of them read with a default, so a missing or new setting just works.

---

## 4. Design

```ts
type PreferenceValue = number | string | boolean;

interface Preferences<T extends Record<string, PreferenceValue>> {
  /** The current values: saved ones that passed validation, defaults otherwise. */
  readonly values: Readonly<T>;
  /** Applies `changes` and saves. Never throws because storage failed. */
  set(changes: Partial<T>): void;
  /** Back to the defaults, and saved. */
  reset(): void;
  /** Raised after `set` or `reset` with the new values. */
  readonly onChange: ParameterizedForgeEvent<Readonly<T>>;
}

function createPreferences<T extends Record<string, PreferenceValue>>(
  name: string,
  defaults: T,
  options?: Partial<PreferencesOptions<T>>,
): Preferences<T>;

interface PreferencesOptions<T> {
  /** Per-field checks beyond "same type as the default", e.g. one of a set of strings. */
  validators: { [K in keyof T]?: (value: unknown) => value is T[K] };
  /** Where values are kept. Defaults to `localStorage`. */
  storage: PreferenceStorage;
}

interface PreferenceStorage {
  read(name: string): string | null;
  write(name: string, data: string): void;
}
```

- **Loading** happens once, in `createPreferences`. Each field is taken
  from storage if it has the same type as its default and passes its
  validator, and from the defaults otherwise, independently of the other
  fields. Unreadable storage or malformed data gives the defaults.
- **Saving** writes the whole set as JSON under `name`. A failed write
  (quota, blocked storage) is swallowed: the values still apply for the
  session, which is all a game can do anyway. `set` with a value that
  fails validation throws, since that's a programming error.
- **Values outside the defaults' keys** in storage are dropped on the next
  save.

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

| #   | Task                                                                                 | Size |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1.1 | `createPreferences`, per-field loading, saving, `onChange`                           | M    |
| 1.2 | `localStorage` backend with failure handling; an in-memory backend for tests         | S    |
| 1.3 | Module wiring (`src/index.ts`, `package.json` exports)                               | S    |
| 1.4 | Guide; a settings panel in a docs demo; changelog under `#### Added`                 | M    |

**Definition of done:** a docs demo's settings survive a reload, and a
corrupted stored value falls back to its default without affecting the
other fields.

---

## 6. Decision log

### DL-1: A preferences store separate from save games

**Options.** (a) A small preferences API now. (b) Wait for #567's world
serialization and store settings as entities.

**Decision: (a).**

**Rationale.** Settings are read before any world exists (the demo picks
its render quality before creating its render pipeline), are tiny, and
have different failure rules from a save game. Unity and Godot keep them
separate for the same reasons.

### DL-2: Validation per field, not per object

**Rationale.** A game update that adds or retypes one setting shouldn't
reset the player's others. Both demo stores already do it per field.

### DL-3: Flat values only

**Rationale.** Every setting in the demo and in typical options menus is
a number, string or boolean. Flat values make the type check against the
default sufficient for most fields, and keep the stored format readable.

---

## 7. Open questions

1. **Renamed or reinterpreted settings.** With per-field fallback, a
   renamed field resets to its default. A migration hook could carry it
   over.
   - (a) No migrations until a game needs one (proposed). (b) A
     `migrate(storedObject)` option.

---

## 8. Testing considerations

- Loading: missing storage, malformed JSON, a wrong-typed field, a field
  failing its validator, extra fields; each falls back per field.
- Saving: a throwing backend leaves values applied; `onChange` raised.
- `set` with an invalid value throws.

## 9. Documentation and demo follow-up

- New `preferences/` guide.
- Demo: the load/validate/save code in the audio mixer and the graphics
  settings store is replaced by two `createPreferences` calls.
