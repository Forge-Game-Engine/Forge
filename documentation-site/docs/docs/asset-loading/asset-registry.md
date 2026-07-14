---
sidebar_position: 2
---

# Asset Registries

[`AssetRegistry<T>`](/Forge/docs/api/classes/AssetRegistry) registers
assets under a human-readable string ID and hands back a numeric ID. Code
that runs once, at setup, can keep using the string name; code that runs
every frame can store and look up the numeric ID instead, avoiding a
string-keyed map lookup in the hot path.

The sprite animation system is the built-in example: each entity's
[`SpriteAnimationEcsComponent`](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent)
stores an `animationClipHandle` (a number), and
[`createSpriteAnimationEcsSystem`](/Forge/docs/api/functions/createSpriteAnimationEcsSystem)
calls [`getDirect`](/Forge/docs/api/classes/AssetRegistry#getdirect) with
that handle on every entity, every frame.

## Registering assets and storing handles

Register each animation clip once during setup. `register` returns the
numeric handle to store on the component:

```ts
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  AnimationClip,
  createAnimation,
  createSpriteAnimationEcsSystem,
} from '@forge-game-engine/forge/animations';

const animationRegistry = new AssetRegistry<AnimationClip>();

const runHandle = animationRegistry.register('run', createAnimation(1, 6));

world.addComponent(playerEntity, spriteAnimationId, {
  animationClipHandle: runHandle,
  animationFrameIndex: 0,
  playbackSpeed: 1,
  frameDurationMilliseconds: 100,
  lastFrameChangeTimeInSeconds: 0,
});

world.addSystem(createSpriteAnimationEcsSystem(world.time, animationRegistry));
```

## `getDirect` vs `getId`

- [`getDirect(numericId)`](/Forge/docs/api/classes/AssetRegistry#getdirect)
  is a plain array index, used by per-frame code that already has the
  numeric handle (like `animationClipHandle` above). It throws if
  `numericId` is out of range, so only pass values that came from
  `register` or `getId`, never a hand-picked number.
- [`getId(stringId)`](/Forge/docs/api/classes/AssetRegistry#getid) does the
  string lookup and is meant for setup-time code that only has the
  human-readable name, for example converting an animation name from a level
  or character definition file into a handle once before the game loop
  starts.

## Gotchas

- [`register`](/Forge/docs/api/classes/AssetRegistry#register) throws if
  the string ID is already registered. Register each name exactly once
  during setup; calling it again later (for example, inside a system's
  `run`) throws rather than returning the existing handle.
- A registry only knows about one asset type. `AssetRegistry<AnimationClip>`
  and, say, an `AssetRegistry<Texture>` are independent instances with their
  own ID spaces, so a handle from one is meaningless to the other.

## Performance note

The reason `animationClipHandle` is a number rather than the animation's
name is that `getDirect` becomes a plain array index. For a system that
runs once per animated sprite per frame, that avoids hashing a string and
doing a `Map` lookup on every entity, every frame, the cost of which adds up
with hundreds of animated sprites.
