---
sidebar_position: 1
---

import SpriteSheetStandard from '../../../static/img/Human_Soldier_Sword_Shield_Jump_Fall-Sheet.png';

# Sprite Animations

A sprite animation shows the frames of an animation clip on an entity's
sprite, one after another. The frames come from a sprite sheet: a single
image with the frames arranged in a grid.

## Sprite sheets

<img src={SpriteSheetStandard} alt="Sprite sheet" width="1000" />

A [`SpriteSheet`](/Forge/docs/api/interfaces/SpriteSheet) holds the frames
of an image divided into equal rows and columns, as `frames[row][column]`.
Each frame is an [`AnimationFrame`](/Forge/docs/api/interfaces/AnimationFrame):
its `offset` and `dimensions` in the image, as fractions (`0` to `1`) of the
image's width and height.

[`createSpriteSheet`](/Forge/docs/api/functions/createSpriteSheet) takes an
image or texture and the number of rows and columns:

```ts
import { createSpriteSheet } from '@forge-game-engine/forge/animations';

const spriteSheet = createSpriteSheet(texture, 1, 6); // 1 row, 6 columns
```

## Animation clips

An [`AnimationClip`](/Forge/docs/api/classes/AnimationClip) is the sequence
of frames one animation plays, such as a walk or a jump. One sprite sheet
can hold the frames of several clips.

[`selectAnimationFrames(spriteSheet, count, startFrame)`](/Forge/docs/api/functions/selectAnimationFrames)
selects `count` frames in row-major order (left to right, then the next row),
starting at frame index `startFrame` (default `0`):

```ts
import {
  AnimationClip,
  selectAnimationFrames,
} from '@forge-game-engine/forge/animations';

const clip = new AnimationClip(selectAnimationFrames(spriteSheet, 6, 2));
```

For a sheet of 2 rows and 5 columns, that selects these frames:

```
[ ][ ][x][x][x]
[x][x][x][ ][ ]
```

## Playing a clip on an entity

Clips are stored in an [`AssetRegistry`](/Forge/docs/api/classes/AssetRegistry).
A [`SpriteAnimationEcsComponent`](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent)
refers to its clip by the handle `register` returns. The entity also needs a
sprite whose size is one frame: pass the frame's size in texels as
`frameDimensions` to `createImageSprite` (see
[Sprites](../rendering/sprites.md)).

```ts
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createSpriteAnimationEcsSystem,
  createSpriteSheet,
  selectAnimationFrames,
} from '@forge-game-engine/forge/animations';
import {
  addSpriteComponent,
  createImageSprite,
} from '@forge-game-engine/forge/rendering';

const entity = world.createEntity();

addSpriteComponent(
  world,
  entity,
  createImageSprite(texture, { frameDimensions: { x: 32, y: 32 } }),
);

const spriteSheet = createSpriteSheet(texture, 2, 5);
const idleClip = new AnimationClip(selectAnimationFrames(spriteSheet, 5));

const animationClips = new AssetRegistry<AnimationClip>();
const idleClipHandle = animationClips.register('idle', idleClip);

addSpriteAnimationComponent(world, entity, {
  animationClipHandle: idleClipHandle,
});

world.addSystem(createSpriteAnimationEcsSystem(time, animationClips));
```

One registry can hold every clip, and any number of entities can play the
same clip.

[`createSpriteAnimationEcsSystem`](/Forge/docs/api/functions/createSpriteAnimationEcsSystem)
changes the frame of each entity with a `SpriteAnimationEcsComponent` and a
sprite. Each time a frame's duration has passed, it writes the offset of the
frame at `animationFrameIndex` to the sprite's `uvOffset` and moves
`animationFrameIndex` to the next frame. After the clip's last frame, it
moves back to frame `0`, so a clip loops for as long as the component is on
the entity.

## Setting the frame rate

`frameDurationMilliseconds` (default `100`) is how long each frame is shown.
`playbackSpeed` (default `1`) divides it: `2` plays twice as fast and `0.5`
half as fast.

```ts
addSpriteAnimationComponent(world, entity, {
  animationClipHandle: idleClipHandle,
  frameDurationMilliseconds: 80,
  playbackSpeed: 1.5,
});
```

Frame durations are measured with the [Time](../common/time.md)'s
`timeInSeconds`, so they follow its `timeScale`.

:::caution
The animation system throws if `frameDurationMilliseconds / playbackSpeed`
is `0` or less.
:::

## Changing the clip

Set `animationClipHandle` to another clip's handle, and set
`animationFrameIndex` to `0` so the new clip starts from its first frame:

```ts
import { spriteAnimationId } from '@forge-game-engine/forge/animations';

const spriteAnimation = world.getComponentRequired(entity, spriteAnimationId);

spriteAnimation.animationClipHandle = jumpClipHandle;
spriteAnimation.animationFrameIndex = 0;
```

:::caution
The animation system throws if `animationFrameIndex` is past the last frame
of the clip, which happens when the new clip has fewer frames than the old
one and the index isn't reset.
:::

## Stopping an animation

Remove the `SpriteAnimationEcsComponent` with
`world.removeComponent(entity, spriteAnimationId)`. The sprite keeps showing
the last frame written to its `uvOffset`.
