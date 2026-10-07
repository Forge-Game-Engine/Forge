---
sidebar_position: 1
---

# Creating a Canvas

A canvas is the root entity of a UI tree. Every panel, label, button and
control is a descendant of a canvas, and is laid out against it. There are
two kinds of canvas: a **screen-space** canvas is drawn over the screen by
a camera of its own, and a **world-space** canvas is drawn in the game
world by a camera you choose.

## Registering the UI systems

[`registerUiSystems`](/Forge/docs/api/functions/registerUiSystems)
registers the systems every canvas in a world uses: layout, layout groups,
focus navigation, interaction, color transitions, controls, tooltips and
text inputs. Call it once per `EcsWorld`, before creating canvases:

```ts
import { MouseInputSource } from '@forge-game-engine/forge/input';
import { registerUiSystems } from '@forge-game-engine/forge/ui';

registerUiSystems(world, renderContext, time, {
  pointerSource: new MouseInputSource(inputManager, game.container),
});
```

`pointerSource` is the pointer the UI is hit-tested against. Without one,
the pointer systems (hover, click, drag and sliders) aren't registered, and
the UI is used through
[focus navigation](buttons-and-interaction.md#focus-navigation) only.

Calling `registerUiSystems` a second time for the same world registers
every system a second time, so each canvas is processed twice per tick.

Register `createTransformEcsSystem` and `createRenderEcsSystem` after
`registerUiSystems`. The layout system writes each element's
`position.local`, and the [transform system](../common/transforms.md)
computes `position.world` from it, so layout has to run first.

## Creating a screen-space canvas

[`createUiCanvas`](/Forge/docs/api/functions/createUiCanvas) creates a
canvas entity and returns it. A screen-space canvas (the default
`renderMode`) needs a `cullingMask`:

```ts
import { createUiCanvas } from '@forge-game-engine/forge/ui';

const uiRenderCategory = 1 << 1;

const canvas = createUiCanvas(world, renderContext, {
  cullingMask: uiRenderCategory,
});
```

`createUiCanvas` also creates a static camera for the canvas. The camera
renders into its own canvas-sized
[render target](../rendering/multipass-rendering.md), cleared to
transparent, so register `createPresentEcsSystem` to composite it onto the
screen. The camera's `layer` is `1000` by default, which composites it over
world cameras at the default layer `0`. A UI sprite tinted to 50% alpha
covers 50% of the world behind it.

The canvas's root rectangle is the area its camera shows, resized every
frame from the screen size. [Responsive UI](responsive-ui.md) covers how it
scales.

### Choosing a render category

The canvas's camera draws only the sprites and text whose `category`
shares a bit with its `cullingMask`. Forge reserves no bit for UI: pick one
no other camera uses (bits `0` to `30`), give it to every UI sprite and
label, and leave it out of your world cameras' `cullingMask`. A camera's
`cullingMask` defaults to every bit, so a world camera left at the default
also draws the UI's sprites, at their UI positions in the world.

A sprite's `category` defaults to `1` and a label's to
`TEXT_RENDER_CATEGORY`, neither of which is the UI's category, so set it
on each one (see [Sprites](../rendering/sprites.md)).
`createButton`, `createDropdown`, `createTooltip` and `createTextInput`
take the label's category as an option.

## Adding elements to a canvas

The element factories (`createPanel`, `createLabel`, `createButton` and
the [controls](controls.md)) take the parent entity as their second
argument: the canvas, or another element. A panel is an element that draws
one sprite:

```ts
import {
  createImageSprite,
  createTexture,
} from '@forge-game-engine/forge/rendering';
import { createPanel, UiAnchor } from '@forge-game-engine/forge/ui';

const panelSprite = {
  ...createImageSprite(createTexture(renderContext, panelImage), {
    pixelsPerUnit: 1,
    slices: { left: 12, right: 12, top: 12, bottom: 12 },
  }),
  category: uiRenderCategory,
};

const panel = createPanel(world, canvas, {
  anchor: UiAnchor.topLeft({ x: 240, y: 96 }),
  anchoredPosition: { x: 20, y: -20 },
  sprite: panelSprite,
});
```

[`createPanel`](/Forge/docs/api/functions/createPanel) copies `sprite`, so
one sprite can be passed to many panels. The layout system sets the
panel's sprite size to its rectangle every frame, so the sprite's imported
size doesn't change how big the panel is drawn. For a
[nine-slice sprite](../rendering/nine-slice-sprites.md), the imported size
is the size the insets are measured against: importing UI sprites with
`pixelsPerUnit: 1` puts the insets in reference pixels, so the `12` above
is 12 pixels of border art. [Anchors and Layout](anchors-and-layout.md)
covers `anchor` and `anchoredPosition`.

The factories parent each element with `world.setParent`. An element's
children are laid out and drawn in the order they were parented, and a
click hits the interactable element drawn on top (see
[Draw Order](../rendering/draw-order.md)).

## Creating a world-space canvas

A world-space canvas is drawn by the `camera` you pass, usually the game's
world camera, so it moves and zooms with the world. Use one for UI that
belongs to something in the world, for example a health bar or a name tag:

```ts
const healthBarCanvas = createUiCanvas(world, renderContext, {
  renderMode: 'worldSpace',
  camera: worldCamera,
  anchor: UiAnchor.center({ x: 80, y: 10 }),
  anchoredPosition: { x: 0, y: 40 },
});

world.setParent(healthBarCanvas, target);

createPanel(world, healthBarCanvas, {
  anchor: UiAnchor.stretchAll(),
  sprite: fillSprite,
});
```

A world-space canvas's root rectangle is sized by `anchor` (a
`100` by `100` box by default) instead of the screen. Its position relative
to its parent is `anchoredPosition`: the layout system writes the canvas's
`position.local` every frame, so set `anchoredPosition` rather than the
position. Parented to an entity, the canvas follows that entity's
position, rotation and scale.

The UI's sprites and labels need a `category` that `camera`'s
`cullingMask` matches. `createUiCanvas` rejects `cullingMask`,
`referenceResolution`, `scaleMode` and `layer` for a world-space canvas at
compile time, and `camera`, `anchor` and `anchoredPosition` for a
screen-space one.

### Keeping a world-space canvas upright

To follow an entity without turning or scaling with it, leave the canvas
unparented and write its `anchoredPosition` from the entity's position
every frame, in a system registered before `registerUiSystems`:

```ts
import { positionId } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { rectTransformId } from '@forge-game-engine/forge/ui';

const followTargetSystem: EcsSystem<[]> = {
  query: [],
  update: (world) => {
    const targetPosition = world.getComponentRequired(target, positionId);
    const canvasRect = world.getComponentRequired(
      healthBarCanvas,
      rectTransformId,
    );

    // target has no parent, so its local position is its world position.
    canvasRect.anchoredPosition.x = targetPosition.local.x;
    canvasRect.anchoredPosition.y = targetPosition.local.y + 40;
  },
};
```

## Removing a canvas

Removing the canvas entity with `world.removeEntity` also removes every
element under it (see [World](../ecs/world.md)). A screen-space canvas's
camera is a separate entity: its id is the canvas's
`CanvasEcsComponent.camera`, and it's removed separately.
