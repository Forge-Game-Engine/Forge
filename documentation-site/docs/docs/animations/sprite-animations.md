---
sidebar_position: 1
---

import SpriteSheetStandard from '../../../static/img/Human_Soldier_Sword_Shield_Jump_Fall-Sheet.png';

# Sprite Animations

A sprite animation shows the frames of an animation clip on an entity's
sprite, one after another. The frames are regions of one
[texture atlas](../rendering/texture-atlases.md): a sprite sheet, with the
frames arranged in a grid, or an atlas exported by a packer such as
TexturePacker.

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
of frames one animation plays, such as a walk or a jump. It has a
`texture` and `frames`, each frame a `TextureRegion` of that texture. One
atlas can hold the frames of several clips.

[`createAtlasAnimationClip(atlas, frames)`](/Forge/docs/api/functions/createAtlasAnimationClip)
builds a clip from an atlas's regions, given each frame's index in
`atlas.regions` or its region name. The clip's texture is the atlas's
texture. A grid atlas's frames are addressed by index; this clip plays 6
frames, starting at frame index `2`:

```ts
import { createAtlasAnimationClip } from '@forge-game-engine/forge/animations';

const clip = createAtlasAnimationClip(sheetAtlas, [2, 3, 4, 5, 6, 7]);
```

For a sheet of 2 rows and 5 columns, that selects these frames:

```
[ ][ ][x][x][x]
[x][x][x][ ][ ]
```

The frames are played in the order given, so frames that aren't
consecutive are listed by index (`[4, 5, 12, 13]`), and a frame listed
twice is shown twice.

A clip's frames can have different sizes in the texture and different
[trims](../rendering/sprites.md#drawing-a-trimmed-frame), but they share
one untrimmed frame size and pivot: every frame is drawn inside the
sprite's `width` and `height`, around its `pivot`.

:::caution
`createAtlasAnimationClip` throws if `frames` is empty, a name isn't a
region's (listing every missing name), an index is outside
`atlas.regions`, or the frames' untrimmed sizes or pivots differ. It
compares the frames with each other, not with the sprite that plays them:
a sprite created from a region of another size or pivot draws every frame
of the clip inside its own size and around its own pivot.
`new AnimationClip(texture, frames)` builds a clip from any regions and
checks only that there's at least one frame.
:::

## Clips from a packed atlas

A packed atlas's frames are addressed by name.
[`getAtlasRegionNames(atlas, prefix)`](../rendering/texture-atlases.md#finding-numbered-regions)
lists the regions that start with a prefix in natural order (`run_2`
before `run_10`), and an atlas's
[sequences](../rendering/texture-atlases.md#sequences) are the frame lists
its file names:

```ts
import { createAtlasAnimationClip } from '@forge-game-engine/forge/animations';
import { getAtlasRegionNames } from '@forge-game-engine/forge/rendering';

const runClip = createAtlasAnimationClip(
  heroAtlas,
  getAtlasRegionNames(heroAtlas, 'run_'),
);

const jumpClip = createAtlasAnimationClip(
  heroAtlas,
  heroAtlas.getSequence('jump'),
);
```

## Playing a clip on an entity

Clips are stored in an [`AssetRegistry`](/Forge/docs/api/classes/AssetRegistry).
A [`SpriteAnimationEcsComponent`](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent)
refers to its clip by the handle `register` returns. The entity also needs a
sprite whose size and pivot are those of one frame: create it from one of
the clip's frames with `createAtlasSprite` (see
[Texture Atlases](../rendering/texture-atlases.md#creating-a-sprite-from-a-region)).

```ts
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createAtlasAnimationClip,
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

const idleClip = createAtlasAnimationClip(sheetAtlas, [0, 1, 2, 3, 4]);

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
sprite. Each time a frame's duration has passed, it assigns the clip's
`texture` to the sprite's `texture` and the frame at `animationFrameIndex`
to its `region`, and moves `animationFrameIndex` to the next frame. After
the clip's last frame, it moves back to frame `0`, so a clip loops for as
long as the component is on the entity. While the animation plays, the
system writes the sprite's `texture` and `region`, and a value game code
assigns to either is replaced at the next frame change. The sprite's
`width`, `height`, `pivot` and `emissive` don't change.

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

This is the same for a clip of another atlas: the system writes the new
clip's texture with its first frame. The new clip's first frame is shown
at the next frame change, up to `frameDurationMilliseconds / playbackSpeed`
later; until then the sprite shows the old clip's frame on the old clip's
texture. To show it on the system's next update, also set
`lastFrameChangeTimeInSeconds` to `Number.NEGATIVE_INFINITY`:

```ts
spriteAnimation.animationClipHandle = jumpClipHandle;
spriteAnimation.animationFrameIndex = 0;
spriteAnimation.lastFrameChangeTimeInSeconds = Number.NEGATIVE_INFINITY;
```

When this runs before the sprite animation system in the same update, the
new frame is drawn in that update.

The clips one sprite changes between need the untrimmed frame size and
pivot of the sprite. A sprite with an
[emissive map](../rendering/sprites.md#adding-an-emissive-map) laid out
like its atlas keeps that map when it changes to a clip of another atlas;
set its `emissive` for the new atlas together with the timer reset, so the
map changes in the same update as the texture.

:::caution
The animation system throws if `animationFrameIndex` is past the last frame
of the clip, which happens when the new clip has fewer frames than the old
one and the index isn't reset.
:::

## Stopping an animation

Remove the `SpriteAnimationEcsComponent` with
`world.removeComponent(entity, spriteAnimationId)`. The sprite keeps showing
the last frame and texture the system assigned to its `region` and
`texture`.
