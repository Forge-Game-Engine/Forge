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
Layout (anchors, canvases, panels, labels) and interaction (buttons,
hover/press/drag, gamepad/keyboard focus navigation, color transitions) are
implemented. Toggles/sliders/scroll views and layout groups aren't yet -
see [`design/ui-system.md`](https://github.com/Forge-Game-Engine/Forge/blob/dev/design/ui-system.md)
for the full plan.
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

// createUiCanvas registers the UI layout (and, unconditionally, navigation/
// transition) systems itself - call it before registering the transform/
// render systems, so layout runs first each frame. `time` drives its color
// transition tweens.
const canvas = createUiCanvas(world, renderContext, time);

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

Text works the same way: `TextEcsComponent.category` defaults to
`TEXT_RENDER_CATEGORY`, shared by every text entity that doesn't override
it - not a value the engine reserves or forces, just an ordinary default,
the same way `defaultUiRenderCategory` is one for UI sprites.
[`createLabel`](/Forge/docs/api/functions/createLabel) defaults its own
`category` to `defaultUiRenderCategory` instead, matching
`createUiCanvas`'s default `cullingMask` automatically, so a label is
visible without you having to think about categories at all for the common
case. Building a `TextEcsComponent` by hand (via `addTextComponent`
directly) for use inside a UI canvas needs `category: defaultUiRenderCategory`
set explicitly, the same way a hand-built sprite does.

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

## Interaction

Two calls put a working, clickable, gamepad/keyboard-navigable button on
screen:

```ts
const canvas = createUiCanvas(world, renderContext, time, {
  // Pointer interaction needs a MouseInputSource; omit it for a
  // gamepad/keyboard-only canvas.
  mouseInputSource: new MouseInputSource(inputManager, game.container),
  // Optional - both InputActions the same way CameraEcsComponent takes
  // zoomInput/panInput. Omitted, the canvas is still fully clickable, just
  // not focus-navigable.
  submitInput: inputManager.getTriggerAction('ui-submit'),
  navigateInput: inputManager.getAxis2dAction('ui-navigate'),
});

const play = createButton(world, canvas, {
  sprite: panelSprite,
  label: 'Play',
  fontAtlas,
  labelSize: 32,
});

play.onActivate.registerListener(startGame);
```

`createButton` assembles a panel (`createPanel`) with a
[`UiInteractableEcsComponent`](/Forge/docs/api/interfaces/UiInteractableEcsComponent)
and a
[`UiColorTransitionEcsComponent`](/Forge/docs/api/interfaces/UiColorTransitionEcsComponent)
added, plus a centered child label - there's no `ButtonEcsComponent`. Every
piece is independently useful: add `UiInteractableEcsComponent` to any rect
(a toggle, a list row, a close icon) to make it clickable, hoverable, and
focus-navigable without it being a "button" at all.

### Source-agnostic activation

`onActivate` is raised the same way whether a pointer click, a gamepad/
keyboard submit, or a script (`interactable.onActivate.raise()`, or
triggering `submitInput` directly) caused it - the listener can't tell
which. `isHovered` (pointer-only) and `isFocused` (source-agnostic - set by
directional navigation, and by the pointer hovering an element, so the
highlight follows the mouse) stay deliberately distinct; a `wasActivatedThisFrame`
flag is available for polling instead of registering a listener.

### Focus navigation

Every `interactable: true` element is automatically focus-navigable: on the
tick `navigateInput`'s magnitude first crosses a threshold, focus moves to
the nearest candidate on the same canvas in that direction. Add a
[`UiFocusEcsComponent`](/Forge/docs/api/interfaces/UiFocusEcsComponent) to
override the search on specific sides (e.g. to wrap focus from the last
item in a row back to the first). `cancelInput` clears focus; register your
own listener on `cancelInput.triggerEvent` for "close this menu" behavior.

### Hit testing and drag

`createUiRaycastEcsSystem` scans interactables topmost-first (reverse
hierarchy order) each tick, publishing `CanvasEcsComponent.hoveredEntity`/
`isPointerOverUi` - read the latter to gate world interaction ("don't fire
the weapon when the click landed on the pause button"). An element with
`blocksRaycasts: false` is transparent to the scan. A captured press that
moves beyond `dragThreshold` (measured in reference pixels) raises
`onBeginDrag`/`onDrag`/`onEndDrag` instead of `onActivate` - useful for
building a slider handle or a scrollbar thumb.

## Known limitations

- **No toggles/sliders/scroll views yet.** `UiInteractableEcsComponent` and
  the pointer/focus interaction systems are the building blocks; the
  higher-level controls aren't built yet.
- **No clipping.** Content isn't clipped to its parent's rect - a scroll
  view isn't buildable yet.
