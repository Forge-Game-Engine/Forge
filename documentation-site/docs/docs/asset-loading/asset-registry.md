---
sidebar_position: 2
---

# Asset Registries

An [`AssetRegistry<T>`](/Forge/docs/api/classes/AssetRegistry) stores
assets of one type under string names and assigns each one a numeric ID.
Looking an asset up by its numeric ID is an array index, so code that runs
for many entities every frame stores the numeric ID instead of the name.
For example,
[`createSpriteAnimationEcsSystem`](/Forge/docs/api/functions/createSpriteAnimationEcsSystem)
looks up each entity's animation clip in an `AssetRegistry<AnimationClip>`
by the numeric `animationClipHandle` of its
[`SpriteAnimationEcsComponent`](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent).

Each registry has its own IDs, so an ID from one registry doesn't refer to
anything in another.

## Registering an asset

[`register(stringId, asset)`](/Forge/docs/api/classes/AssetRegistry#register)
adds an asset and returns its numeric ID. Register each asset once, during
setup, and store the ID where the asset is used:

```ts
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createAnimation,
  createSpriteAnimationEcsSystem,
} from '@forge-game-engine/forge/animations';

const animationRegistry = new AssetRegistry<AnimationClip>();

const runHandle = animationRegistry.register('run', createAnimation(1, 6));

addSpriteAnimationComponent(world, entity, {
  animationClipHandle: runHandle,
});

world.addSystem(createSpriteAnimationEcsSystem(time, animationRegistry));
```

`register` throws if the string ID is already registered.

## Looking up an asset

- [`getId(stringId)`](/Forge/docs/api/classes/AssetRegistry#getid) returns
  the numeric ID of a registered name, for code that has the name, such as
  a name read from a level file. It throws for a name that isn't
  registered.
- [`getDirect(numericId)`](/Forge/docs/api/classes/AssetRegistry#getdirect)
  returns the asset with a numeric ID. It throws for an ID the registry
  hasn't assigned, so pass only IDs returned by `register` or `getId`.

```ts
const runHandle = animationRegistry.getId('run');
const runClip = animationRegistry.getDirect(runHandle);
```
