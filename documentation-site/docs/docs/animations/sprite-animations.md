---
sidebar_position: 1
---

import SpriteSheetStandard from '../../../static/img/Human_Soldier_Sword_Shield_Jump_Fall-Sheet.png';

import SpriteSheetWithGap from '../../../static/img/Human_Soldier_Sword_Shield_Jump_Fall-Sheet_w_gap.png';

# Sprite animations

You can use sprite sheets in forge to create animated characters and objects.

## Sprite sheets

<img src={SpriteSheetStandard} alt="Sprite sheet" width="1000" />

A sprite sheet is a single image that contains multiple frames arranged in a grid. Each frame represents one visual state (for example, a single step in a walk cycle). The sprite sheet could contain multiple animations and their frames (for example, walk, run, jump, etc.) The animation system slices the sheet into frames based on the number of rows and columns you provide, and uses per-frame UV offsets and sizes to render the correct sub-region every frame.

### Creating a sprite sheet

In forge a sprite sheet is represented as a row-major 2D array of animation frames. To create a sprite sheet you can use the `createSpriteSheet` utility.

All you need is an image (your sprite sheet) and number of rows + columns there are in the sheet.

```ts
const image = await imageCache.getOrLoad('sprite_sheet.png');

const spriteSheet = createSpriteSheet(image, 1, 6); // 1 row and 6 columns
```

## Animation Clips

An animation clip is a collection of related animation frames (for example, 6 frames for a jump animation) and a name. And a sprite sheet will contain frames that can be used to create one or more animations clips.

### Creating animation clips

You can use the `selectAnimationFrames` utility to select the animation frames from a sprite sheet.

If your sprite sheet has ten frame (5x2), and you select 6 frames it would look something like this:

```ts
const jumpAnimation = new AnimationClip(
  'jump',
  selectAnimationFrames(spriteSheet, 6), // selects 6 frames,
);

// [x][x][x][x][x]
// [x][ ][ ][ ][ ]
```

you can also pass in an offset:

```ts
const jumpAnimation = new AnimationClip(
  'jump',
  selectAnimationFrames(spriteSheet, 6, 2), // selects 6 frames, starts at index 2
);

// [ ][ ][x][x][x]
// [x][x][x][ ][ ]
```

## Animation controllers

An animation controller lets you control which animation clip is playing for an entity. Under the hood it is a [finite state machine](https://en.wikipedia.org/wiki/Finite-state_machine).

### Creating an animation controller

You can create an animation controller by using the `AnimationController` class and passing in an array of animation clips.

```ts
const characterAnimationController = new AnimationController([
  idleAnimation,
  jumpAnimation,
  runAnimation,
]);
```

### Transitioning between animations



## Creating an animated entity

To include an animated sprite in your game, your entity must include both a sprite component and a sprite animation component.

```ts
const image = await imageCache.getOrLoad('character_sprite_sheet_32_32.png');

const sprite = createImageSprite(
  image,
  renderContext,
  RenderLayer.foreground,
  new Vector2(32, 32),
);

// attach the sprite component
world.addComponent(entity, spriteId, { sprite, enabled: true });

const spriteSheet = createSpriteSheet(image, 1, 6);

const idleAnimation = new AnimationClip(
  'idle',
  selectAnimationFrames(spriteSheet, 6),
);

// create an animation controller
const characterAnimationController = new AnimationController([idleAnimation]);

// attach the animation component
world.addComponent(entity, spriteAnimationId, {
  animationFrameIndex: 0,
  playbackSpeed: 1,
  frameDurationMilliseconds: 100,
  lastFrameChangeTimeInSeconds: 0,
  controller: characterAnimationController,
});

// register the systems
world.addSystem(createCameraEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createSpriteAnimationEcsSystem(time));
```