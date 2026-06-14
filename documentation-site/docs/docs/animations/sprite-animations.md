---
sidebar_position: 1
---

import SpriteSheetStandard from '../../../static/img/Human_Soldier_Sword_Shield_Jump_Fall-Sheet.png';

import SpriteSheetWithGap from '../../../static/img/Human_Soldier_Sword_Shield_Jump_Fall-Sheet_w_gap.png';

# Sprite Animations

You can use sprite sheets in forge to create animated characters and objects.

## Sprite sheets

<img src={SpriteSheetStandard} alt="Sprite sheet" width="1000" />

A sprite sheet is a single image that contains multiple frames arranged in a grid. Each frame represents one visual state (for example, a single step in a walk cycle). The sprite sheet could contain multiple animations and their frames (for example, walk, run, jump, etc.) The animation system slices the sheet into frames based on the number of rows and columns you provide, and uses per-frame UV offsets and sizes to render the correct sub-region every frame.

### Creating a sprite sheet

In forge a sprite sheet ([`SpriteSheet`](/Forge/docs/api/interfaces/SpriteSheet)) is represented as a row-major 2D array of animation frames. To create a sprite sheet you can use the [`createSpriteSheet`](/Forge/docs/api/functions/createSpriteSheet) utility.

All you need is an image (your sprite sheet) and the number of rows and columns in the sheet.

```ts
const { imageCache } = renderContext;

const image = await imageCache.getOrLoad('sprite_sheet.png');

const spriteSheet = createSpriteSheet(image, 1, 6); // 1 row and 6 columns
```

## Animation Clips

An [`AnimationClip`](/Forge/docs/api/classes/AnimationClip) is a collection of related animation frames (for example, 6 frames for a jump animation). A sprite sheet will contain frames that can be used to create one or more animation clips.

### Creating animation clips

You can use the [`selectAnimationFrames`](/Forge/docs/api/functions/selectAnimationFrames) utility to select the animation frames from a sprite sheet.

If your sprite sheet has ten frames (5x2), and you select 6 frames it would look something like this:

```ts
const jumpAnimation = new AnimationClip(
  selectAnimationFrames(spriteSheet, 6), // selects 6 frames,
);

// [x][x][x][x][x]
// [x][ ][ ][ ][ ]
```

you can also pass in a starting frame:

```ts
const jumpAnimation = new AnimationClip(
  selectAnimationFrames(spriteSheet, 6, 2), // selects 6 frames, starts at index 2
);

// [ ][ ][x][x][x]
// [x][x][x][ ][ ]
```

## Creating an animated entity

To include an animated sprite in your game, your entity must include both a sprite component and a [sprite animation](/Forge/docs/api/interfaces/SpriteAnimationEcsComponent) component. Animation clips are stored in an
[`AssetRegistry`](/Forge/docs/api/classes/AssetRegistry) and referenced from the component by handle, so the same registry (and clips) can be shared across every animated entity.

```ts
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  AnimationClip,
  createSpriteAnimationEcsSystem,
  createSpriteSheet,
  selectAnimationFrames,
  spriteAnimationId,
} from '@forge-game-engine/forge/animations';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createCameraEcsSystem,
  createImageSprite,
  createRenderEcsSystem,
  spriteId,
} from '@forge-game-engine/forge/rendering';

const { imageCache } = renderContext;

// 1. create the entity
const spriteEntity = world.createEntity();

// 2. load the sprite sheet
const image = await imageCache.getOrLoad('character_sprite_sheet_32_32.png');

// 3. create a sprite and add it to the entity
world.addComponent(
  spriteEntity,
  spriteId,
  createImageSprite(
    image,
    renderContext,
    1, // 3.1 render layer
    new Vector2(32, 32), // 3.2 define the dimensions of a frame
  ),
);

// 4. create a sprite sheet
const spriteSheet = createSpriteSheet(image, 2, 5); // 4.1 define the rows and columns (2x5 = 10 frames in total)

// 5. create an animation clip
const idleAnimation = new AnimationClip(
  selectAnimationFrames(spriteSheet, 5), // 5.1 select the first 5 frames for this clip
);

// 6. create an asset registry for your animation clips
// (usually you only need a shared one for all clips in your game)
const animationRegistry = new AssetRegistry<AnimationClip>();

// 7. add the animation clip to the registry and receive a handle
const idleAnimationHandle = animationRegistry.register('idle', idleAnimation);

// 8. add a sprite animation component to your entity
world.addComponent(spriteEntity, spriteAnimationId, {
  animationFrameIndex: 0, // start playing the animation clip at the first frame
  playbackSpeed: 1,
  frameDurationMilliseconds: 100,
  lastFrameChangeTimeInSeconds: 0,
  animationClipHandle: idleAnimationHandle,
});

// 9. register the systems
world.addSystem(createCameraEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createSpriteAnimationEcsSystem(time, animationRegistry));
```

[`createSpriteAnimationEcsSystem`](/Forge/docs/api/functions/createSpriteAnimationEcsSystem)
takes the `animationRegistry` so it can look up the clip referenced by
`animationClipHandle`. Every `frameDurationMilliseconds` (scaled by
`playbackSpeed`), it advances `animationFrameIndex` and writes that frame's
`offset` onto the sprite's `uvOffset`, wrapping back to frame `0` once the
clip ends.

## Notes and troubleshooting

- `frameDurationMilliseconds` and `playbackSpeed` must both be greater than
  `0`. If `frameDurationMilliseconds / playbackSpeed` is `0` or negative, the
  system throws rather than dividing by zero or running the animation
  backwards.
- Sprite animation clips always loop back to frame `0` at the end; there's
  currently no built-in way to stop after one play-through or to get
  notified when a clip finishes.
- Switching `animationClipHandle` to a different clip keeps the current
  `animationFrameIndex`. If the new clip has fewer frames than the old one,
  the next update can throw `Frame index is out of bounds`. Reset
  `animationFrameIndex` to `0` whenever you change `animationClipHandle`.
- `lastFrameChangeTimeInSeconds` is normally initialized to `0`, which makes
  the component advance to its second frame on the very first update (since
  `time.timeInSeconds` is already greater than `0`). If you need the first
  frame to hold for a full `frameDurationMilliseconds`, initialize it to
  `time.timeInSeconds` instead.
