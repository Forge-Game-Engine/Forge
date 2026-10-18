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

A sprite sheet is cut into frames with
[`createGridTextureAtlas`](../rendering/texture-atlases.md#creating-a-grid-atlas),
given the size of one frame in texels. Its `regions` are the frames in
row-major order (left to right, then the next row down), each an untrimmed
[`TextureRegion`](../rendering/sprites.md#texture-regions) of the sheet:

```ts
import { createGridTextureAtlas } from '@forge-game-engine/forge/rendering';

const sheetAtlas = createGridTextureAtlas(texture, {
  cellWidth: 32,
  cellHeight: 32,
});
```

## Animation clips

An [`AnimationClip`](/Forge/docs/api/classes/AnimationClip) is the sequence
of frames one animation plays, such as a walk or a jump, each a
`TextureRegion` of one texture. One sprite sheet can hold the frames of
several clips.

A clip's frames can have different sizes in the texture and different
[trims](../rendering/sprites.md#drawing-a-trimmed-frame), but they share
one untrimmed frame size: every frame is drawn inside the sprite's `width`
and `height`.

A run of consecutive frames is a slice of the atlas's `regions`. This clip
plays 6 frames, starting at frame index `2`:

```ts
import { AnimationClip } from '@forge-game-engine/forge/animations';

const clip = new AnimationClip(sheetAtlas.regions.slice(2, 2 + 6));
```

For a sheet of 2 rows and 5 columns, that selects these frames:

```
[ ][ ][x][x][x]
[x][x][x][ ][ ]
```

Frames that aren't consecutive are picked by index, for example
`[4, 5, 12, 13].map((index) => sheetAtlas.getRegionAt(index))`.

## Playing a clip on an entity

Clips are stored in an [`AssetRegistry`](/Forge/docs/api/classes/AssetRegistry).
A [`SpriteAnimationEcsComponent`](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent)
refers to its clip by the handle `register` returns. The entity also needs a
sprite whose size is one frame: create it from one of the atlas's frames
with `createAtlasSprite` (see
[Texture Atlases](../rendering/texture-atlases.md#creating-a-sprite-from-a-region)).

```ts
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createSpriteAnimationEcsSystem,
} from '@forge-game-engine/forge/animations';
import {
  addSpriteComponent,
  createAtlasSprite,
  createGridTextureAtlas,
} from '@forge-game-engine/forge/rendering';

const sheetAtlas = createGridTextureAtlas(texture, {
  cellWidth: 32,
  cellHeight: 32,
});

const entity = world.createEntity();

addSpriteComponent(world, entity, createAtlasSprite(sheetAtlas, 0));

const idleClip = new AnimationClip(sheetAtlas.regions.slice(0, 5));

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
sprite. Each time a frame's duration has passed, it assigns the frame at
`animationFrameIndex` to the sprite's `region` and moves
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
the last frame assigned to its `region`.
