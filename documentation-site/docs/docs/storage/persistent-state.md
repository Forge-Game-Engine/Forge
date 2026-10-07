---
sidebar_position: 2
---

# Persistent State

A persistent state is a named record of flat values (numbers, strings and
booleans) with a default for every field. It's read from storage once, when
it's created, and every change is stored. It exists outside any world, so
it can be read before a world is created and it outlives the worlds that
read it.

## Creating a persistent state

[`createPersistentState`](/Forge/docs/api/functions/createPersistentState)
takes the name the record is stored under and the default of every field,
and resolves once the stored entry has been read:

```ts
import { createPersistentState } from '@forge-game-engine/forge/storage';

const audioSettings = await createPersistentState('my-game.audio-settings', {
  volume: 1,
  muted: false,
});
```

The record is stored in `localStorage` unless you pass another
[backend](./storage-backends.md) as the `storage` option.

`localStorage` keys are shared by every page of an origin, and some hosts
serve many games from one origin, so prefix the name with your game's
name. Use one record per name: two records with the same name overwrite
each other's stored entry.

## Reading values

[`values`](/Forge/docs/api/interfaces/PersistentState#values) holds the
current value of every field: the stored value if there is one, otherwise
the default.

```ts
const { volume, muted } = audioSettings.values;
```

`values` is replaced with a new object on every change, so read it from the
record each time rather than keeping a reference to it.

## Validating values

A stored value must have the same type as its default, and a number must be
finite. For anything stricter, pass a validator for the field:

```ts
const isVolume = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1;

const audioSettings = await createPersistentState(
  'my-game.audio-settings',
  { volume: 1, muted: false },
  { validators: { volume: isVolume } },
);
```

The same checks apply to the defaults and to every value passed to `set`.

A stored value that fails its checks is ignored, and its field takes its
default. That happens when a stored record was written by an earlier
version of the game with other defaults or validators, or edited by hand.
The record's other fields still load. The stored value is replaced the next
time its field is set. A stored entry that isn't a JSON object loads as
nothing stored, and the first write replaces it.

## Changing values

[`set`](/Forge/docs/api/interfaces/PersistentState#set) applies the given
fields to `values` immediately, raises `onChange` and stores them:

```ts
await audioSettings.set({ volume: 0.5 });
```

The promise resolves once the change is stored. `set` throws a
[`PersistentStateValueError`](/Forge/docs/api/classes/PersistentStateValueError)
without applying anything if a value fails its checks.

Only fields that were passed to `set` are stored. A field that was never
set keeps taking its default, so a default changed in a later version of
the game applies to every player who never changed that field. Stored
fields that the current defaults don't list are kept.

Writes are stored one at a time and in order. Changes made before the
current write settles are stored together by the next write.

## Resetting to the defaults

[`reset`](/Forge/docs/api/interfaces/PersistentState#reset) makes every
value its default again, raises `onChange` and removes the stored entry:

```ts
await audioSettings.reset();
```

## Writing values into the world

Systems read components, not records. Write a record's values into a
component when the world is created, and again whenever the record changes:

```ts
const settingsEntity = world.createEntity();

world.addComponent(settingsEntity, audioSettingsId, {
  ...audioSettings.values,
});

audioSettings.onChange.registerListener((values) => {
  Object.assign(
    world.getComponentRequired(settingsEntity, audioSettingsId),
    values,
  );
});
```

[`onChange`](/Forge/docs/api/interfaces/PersistentState#onchange) is raised
after every `set` and `reset`, with the new values. Change the values with
`set`, not by writing the component, so the record is the only writer of
the fields it mirrors and every change is stored.

## Handling storage failures

`createPersistentState` rejects with the backend's
[`StorageError`](/Forge/docs/api/classes/StorageError) if the stored entry
can't be read, for example because storage is blocked, and with a
[`PersistentStateValueError`](/Forge/docs/api/classes/PersistentStateValueError)
if a default fails its checks. Its `field` and `value` name the value.

To carry on without storage when it can't be read, catch the error and
create the record on a memory backend:

```ts
import {
  createMemoryStorageBackend,
  createPersistentState,
  StorageError,
} from '@forge-game-engine/forge/storage';

const defaults = { volume: 1, muted: false };

const loadAudioSettings = async () => {
  try {
    return await createPersistentState('my-game.audio-settings', defaults);
  } catch (error) {
    if (!(error instanceof StorageError)) {
      throw error;
    }

    return createPersistentState('my-game.audio-settings', defaults, {
      storage: createMemoryStorageBackend(),
    });
  }
};
```

`set` and `reset` reject with the backend's `StorageError` if the change
can't be stored. The values stay applied, and the next write that succeeds
stores them.
