---
sidebar_position: 1
---

# Sprite animations

You can use sprite sheets in forge to create animated characters and objects.

## What is a sprite sheet?

A sprite sheet is a single image that contains multiple frames arranged in a grid. Each frame represents one visual state (for example, a single step in a walk cycle). The animation system slices the sheet into frames based on the number of rows and columns you provide, and uses per-frame UV offsets and sizes to render the correct sub-region every frame.

:::note
Rows and columns are the grid you use to slice the image. `createAnimation` takes `spritesPerColumn` then `spritesPerRow` (columns first, rows second). The product is the total frame count.
:::

## Creating clips

Use `createAnimation(name, spritesPerColumn, spritesPerRow, options?)` to generate an `AnimationClip`.

Parameters

- `animationName` — string name for the clip
- `spritesPerColumn` — number of rows in the sheet (vertical count)
- `spritesPerRow` — number of columns in the sheet (horizontal count)
- `options.startPositionPercentage` — UV start (default 0,0)
- `options.endPositionPercentage` — UV end (default 1,1)

The function computes per-frame UV `offset` and `dimensions` based on the start/end percentages and the row/column counts.

### Visual aid

Given a sprite sheet with 3 rows and 4 columns the frames are indexed left-to-right, top-to-bottom:

```
Row 0: [0] [1] [2] [3]
Row 1: [4] [5] [6] [7]
Row 2: [8] [9] [10] [11]
```

Each frame's UV offset is calculated as:

- offset.x = startX + column * frameWidth
- offset.y = startY + row * frameHeight

where `frameWidth = (endX - startX) / spritesPerRow` and `frameHeight = (endY - startY) / spritesPerColumn`.

### Example

```ts
// 3 rows, 4 columns (12 frames total)
const walk = createAnimation('walk', 3, 4);

// If the sprite sheet only occupies a sub-region of the texture:
const run = createAnimation('run', 2, 6, { startPositionPercentage: new Vector2(0, 0.5), endPositionPercentage: new Vector2(1, 1) });
```

## Adding a sprite to an entity

The animation system drives texture coordinates for rendering, but you must provide a `Sprite` (renderable) on the entity so the renderer can draw the material.

Correct pattern (ECS):

```ts
// create a Sprite via the rendering utilities
const sprite = createSprite(material, renderContext, layer, width, height);

// attach the sprite component
world.addComponent(entity, spriteId, { sprite, enabled: true });

// attach the animation component (controller or single clip)
world.addComponent(entity, spriteAnimationId, {
	animationFrameIndex: 0,
	playbackSpeed: 1,
	frameDurationMilliseconds: 100,
	lastFrameChangeTimeInSeconds: 0,
	animationInputs: new AnimationInputs(),
	stateMachine: new FiniteStateMachine<AnimationInputs, AnimationClip>(idleClip),
});

// register the system once
world.addSystem(createSpriteAnimationEcsSystem(time));
```

:::caution
Do not call `entity.addComponent(...)` — use the `EcsWorld` APIs: `world.addComponent(entity, componentId, data)` and `world.getComponent(...)`.
:::

## Options explained

- `frameDurationMilliseconds` — time per frame in milliseconds. The system converts to seconds internally. If this value is zero or negative the system will skip advancing frames to avoid division by zero; provide a positive value to see frames advance.
- `playbackSpeed` — multiplier applied to clip playback (clip.playbackSpeed * component.playbackSpeed). Use `0` to pause a clip.
- `loop` — `'none' | 'loop' | 'pingpong'` controls repeat behavior when a clip reaches its end.
- `loopCount` — how many times to repeat; `-1` for infinite.

## Common tasks

- Switching clips: set up a controller (FSM) or replace `stateMachine`/`currentClip` on the `spriteAnimation` component. Controllers let you declaratively express transitions using `AnimationTransition` and `AnimationCondition`.
- Pausing an animation: set `playbackSpeed` to `0` on the `spriteAnimation` component.
- Flipping horizontally/vertically: add or update the `flip` component (`flipId`) on the entity with `flipX`/`flipY` booleans; the renderer multiplies scale by -1 when `flipX`/`flipY` are set.

## Admonitions

:::note
Always register any inputs used by an animation controller with `AnimationInputs.register*` before the system evaluates them. Missing inputs throw errors at evaluation time.
:::

:::caution
Use positive `frameDurationMilliseconds`. Zero or negative values prevent frame advancement and are treated as invalid by the system.
:::

