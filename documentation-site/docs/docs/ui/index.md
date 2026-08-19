---
sidebar_position: 12
---

# UI

The `ui` module is a retained-mode, ECS-native UI system built on an
**anchored rect tree**: a hierarchy of rectangle-shaped elements, each
anchored and pivoted against its parent's rectangle, resolved once per
frame by a layout pass, and drawn through the existing sprite/text
rendering pipeline. There's no immediate-mode API and no markup/stylesheet
language - a UI is a plain ECS entity hierarchy, assembled with factory
functions the same way any other composite entity in Forge is.

:::info Current scope
This is the module's **layout core**: anchors, canvases, panels, and
labels. Pointer/gamepad interaction (buttons, hover, focus navigation),
toggles/sliders/scroll views, and layout groups aren't implemented yet -
see [`design/ui-system.md`](https://github.com/Forge-Game-Engine/Forge/blob/dev/design/ui-system.md)
for the full plan. Today, a UI element is something you look at, not
something you click.
:::

## Quick start

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createPanel,
  createUiCanvas,
  defaultUiRenderCategory,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

// createUiCanvas registers the UI layout system itself - call it before
// registering the transform/render systems, so layout runs first each frame.
const canvas = createUiCanvas(world, renderContext);

const panelSprite = createImageSprite(panelImage, renderContext, {
  slices: { left: 12, right: 12, top: 12, bottom: 12 },
  layer: defaultUiRenderCategory, // matches the UI camera's default cullingMask
});

createPanel(world, canvas, {
  anchor: UiAnchor.topLeft,
  anchoredPosition: { x: 20, y: -20 },
  sizeDelta: { x: 240, y: 96 },
  sprite: panelSprite,
});

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
// The UI camera renders into its own off-screen RenderTarget (see below) -
// createPresentEcsSystem is what actually composites it onto the canvas.
world.addSystem(createPresentEcsSystem(renderContext));
```

`createUiCanvas` creates a canvas root entity and a dedicated, static UI
camera - a transparent-cleared, off-screen `RenderTarget` composited onto
the canvas by `createPresentEcsSystem`, isolated from the world by
`cullingMask`/`Renderable.category` (see
[Multipass Rendering](../rendering/multipass-rendering.md) for how the
camera/render-target/present-pass pieces fit together generally). Give a
panel's sprite the same category the canvas's `cullingMask` expects
(`defaultUiRenderCategory` unless you passed a different `cullingMask` to
`createUiCanvas`) - `createImageSprite`'s `layer` option sets a sprite's
`Renderable.category`, confusingly by that name (see
`SpriteEcsComponent.layer`, a *different*, draw-order-only field, for the
usual meaning of "layer"). Without a matching category, a world camera
whose own `cullingMask` still matches everything would draw the panel a
second time wherever its UI-space position happens to land in the world.

The canvas's default `cullingMask` also includes text's own render
category unconditionally, so `createLabel` text is visible without any
extra setup - every `FontAtlas`'s glyphs share one fixed category
regardless of context, so there's no separate "UI text" category to give
`defaultUiRenderCategory` credit for. In practice, avoid also using that
same category for a *world* sprite (as opposed to world-space text, which
is fine) if you don't want it incidentally visible through the UI camera
too.

## RectTransform: anchors, pivots, and stretching

Every UI element - including a canvas's own root entity - has a
[`RectTransformEcsComponent`](/Forge/docs/api/type-aliases/RectTransformEcsComponent).
`createUiLayoutEcsSystem` resolves it against its parent's rect once per
frame (top-down, in hierarchy order) and writes the result to
`rectTransform.rect`, the entity's `PositionEcsComponent.local` (so the
existing `createTransformEcsSystem` composes the right
`position.world`), and - for elements with a `SpriteEcsComponent` - the
sprite's `width`/`height`/`pivot`.

Five fields drive resolution:

- **`anchorMin`/`anchorMax`** - normalized points within the parent's rect,
  `(0, 0)` its bottom-left corner and `(1, 1)` its top-right. Equal to each
  other, the element is **point-anchored**: it keeps its own size
  (`sizeDelta`) and moves with the anchor. Different, it's
  **stretch-anchored**: it resizes with the parent, and `sizeDelta` acts as
  a margin added to the anchor rect instead of a literal size.
- **`pivot`** - the point within the element's own rect that sits at the
  anchor (and that sprites/text position around).
- **`anchoredPosition`** - an offset from the anchor, in reference pixels.
- **`sizeDelta`** - the element's literal size when point-anchored, or a
  margin when stretched.

[`UiAnchor`](/Forge/docs/api/variables/UiAnchor) has presets for the common
cases, each setting `anchorMin`/`anchorMax`/`pivot` together: the nine point
anchors (`topLeft`, `topCenter`, `topRight`, `middleLeft`, `center`,
`middleRight`, `bottomLeft`, `bottomCenter`, `bottomRight`), edge-pinned
bands (`stretchTop`, `stretchBottom`, `stretchLeft`, `stretchRight` - the
common "HUD bar" and "side panel" anchors, where `sizeDelta` sets the
band's thickness), center bands (`stretchHorizontal`, `stretchVertical`),
and `stretchAll`. Spread one into `addRectTransformComponent`'s options, or
into `createPanel`/`createLabel`'s `anchor` option:

```ts
addRectTransformComponent(world, entity, {
  ...UiAnchor.stretchTop,
  sizeDelta: { x: 0, y: 64 }, // a 64-unit-tall bar spanning the full width
});
```

A HUD top bar and a corner-anchored panel that both hold their layout
correctly across a resize (window resize, aspect ratio change) is the
module's own definition of done for this phase - `createUiLayoutEcsSystem`
does a full recompute every frame rather than tracking dirty state, so
there's no separate resize hook to wire up.

## Coordinate spaces and scale modes

UI world space uses **reference pixels**: author against a fixed
`referenceResolution` (`1920x1080` by default), and the same layout reads
correctly at any actual resolution. `CanvasEcsComponent.scaleMode`
controls how the canvas's root rect - and its camera's
`verticalWorldUnits` - responds to the destination's live size:

- `scaleWithScreenSize` (default) - height stays pinned to
  `referenceResolution.y`; width follows the destination's aspect ratio.
- `matchWidth` - width stays pinned to `referenceResolution.x`; height
  follows the aspect ratio instead.
- `constantPixelSize` - the root rect matches the destination's actual
  pixel size one-to-one (`referenceResolution` is ignored); UI elements
  keep a constant on-screen size at the cost of covering a different
  fraction of the screen on different displays.

## Labels

[`createLabel`](/Forge/docs/api/functions/createLabel) creates a
`RectTransformEcsComponent` + `TextEcsComponent` pair, accepting every
`addTextComponent` option directly (see [Text](../text/index.md) for
`fontAtlas`/shaping details, and its "Quick start" for the shipped default
atlas):

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';
import { createLabel, UiAnchor } from '@forge-game-engine/forge/ui';

const fontAtlas = await new FontAtlasCache().getOrLoad(
  'assets/fonts/default.json',
);

createLabel(world, panel, {
  text: 'Play',
  fontAtlas,
  size: 32,
  anchor: UiAnchor.center,
  // A center anchor only centers the *entity* on the panel - it doesn't
  // change how the text itself is shaped relative to that point.
  // horizontalAlign/verticalAlign (both default to 'left'/'top', i.e. the
  // entity's position is the text's top-left corner) need to match.
  horizontalAlign: 'center',
  verticalAlign: 'middle',
  // horizontalAlign only takes effect once maxWidth is set - with no box
  // to align within, a single unwrapped line always starts exactly at the
  // entity's position regardless of horizontalAlign. verticalAlign has no
  // such caveat.
  maxWidth: 200,
});
```

A label's `sizeDelta` sizes its *rect* (for anchoring purposes only) -
`createUiLayoutEcsSystem` doesn't yet sync it with `TextEcsComponent.maxWidth`,
so a label's own `maxWidth` (both for wrapping and, per above, for
`horizontalAlign` to take effect at all) needs to be set explicitly to
match, rather than being inferred from `sizeDelta`.

## Known limitations

- **No interaction yet.** No hover/click/focus, no `UiInteractableEcsComponent`.
  A UI built today is presentational only.
- **No clipping.** Content isn't clipped to its parent's rect - a scroll
  view isn't buildable yet.
