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
Layout (anchors, canvases, panels, labels), interaction (buttons,
hover/press/drag, gamepad/keyboard focus navigation, color transitions),
controls (toggles, sliders, progress bars, dropdowns), layout groups
(horizontal/vertical/grid, content size fitting, aspect ratio fitting),
world-space (diegetic) canvases, tooltips, and safe-area support for
notched displays are implemented. Scroll views, text input, and rect
clipping aren't yet.
:::

Guides in this section:

- [RectTransform](./rect-transform.md): anchors, pivots, stretching, and
  coordinate spaces/scale modes.
- [World-Space Canvases](./world-space-canvases.md): diegetic UI that lives
  in the game world instead of overlaid on the screen.
- [Labels](./labels.md): text elements, alignment, and sizing a label to
  its own text.
- [Interaction](./interaction.md): buttons, source-agnostic invocation,
  focus navigation, hit testing, and drag.
- [Controls](./controls.md): toggles, sliders, progress bars, and
  dropdowns.
- [Layout Groups](./layout-groups.md): automatic child arrangement,
  content size fitting, and aspect ratio fitting.
- [Canvas Groups](./canvas-groups.md): fading, disabling, or making a
  whole subtree click-through in one write.
- [Tooltips](./tooltips.md): floating panels shown on hover/focus.
- [Safe Area](./safe-area.md): keeping content clear of notches and
  cutouts.

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
  UiAnchor,
} from '@forge-game-engine/forge/ui';

// Forge doesn't reserve or ship a "UI" render category - pick any bit your
// game isn't already using for another camera, and reuse it everywhere UI
// content needs to match this canvas's cullingMask.
const uiRenderCategory = 1 << 1;

// createUiCanvas registers the UI layout (and, unconditionally, navigation/
// transition) systems itself - call it before registering the transform/
// render systems, so layout runs first each frame. `time` drives its color
// transition tweens.
const canvas = createUiCanvas(world, renderContext, time, {
  cullingMask: uiRenderCategory,
});

const panelSprite = createImageSprite(panelImage, renderContext, {
  slices: { left: 12, right: 12, top: 12, bottom: 12 },
  layer: uiRenderCategory, // matches the UI camera's cullingMask above
});

createPanel(world, canvas, {
  anchor: UiAnchor.topLeft({ x: 240, y: 96 }),
  anchoredPosition: { x: 20, y: -20 },
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
camera/render-target/present-pass pieces fit together generally).
`cullingMask` has no default - `createUiCanvas` requires it explicitly,
since Forge has no reserved "this bit means UI" value: pick one your game
isn't already using for another camera, and reuse that exact value for
every UI visual's own category. Give a panel's sprite that same category -
`createImageSprite`'s `layer` option sets a sprite's `Renderable.category`,
confusingly by that name (see `SpriteEcsComponent.layer`, a _different_,
draw-order-only field, for the usual meaning of "layer"). Without a
matching category, a world camera whose own `cullingMask` still matches
everything would draw the panel a second time wherever its UI-space
position happens to land in the world.

Text works the same way: `TextEcsComponent.category` defaults to
`TEXT_RENDER_CATEGORY`, shared by every text entity that doesn't override
it - not a value the engine reserves or forces, just an ordinary default,
and one that has nothing to do with any particular UI canvas's
`cullingMask`. [`createLabel`](/Forge/docs/api/functions/createLabel)
doesn't override it either, so a label needs its own `category` passed
explicitly - the same value you gave that canvas's `cullingMask` - to be
visible through it; `createButton`'s `labelCategory` option forwards the
same value to its own child label.

See [RectTransform](./rect-transform.md) next for how anchors, pivots, and
stretching resolve a panel's actual on-screen rect.

## Known limitations

- **No scroll views or text input yet.** Both are blocked on rect clipping
  ([#583](https://github.com/Forge-Game-Engine/Forge/issues/583)).
- **No clipping.** Content isn't clipped to its parent's rect - a scroll
  view isn't buildable yet.
- **No radial/clock-wipe progress fill.** Only the linear fill
  `createProgressBar` builds is supported; see
  [Controls: Progress bars](./controls.md#progress-bars).
- **A dropdown doesn't close on an outside click.** See
  [Controls: Dropdowns](./controls.md#dropdowns).
- **No per-column/row `cellAlignment` on a content-sized grid.** One
  `cellAlignment` applies to every column/row in the grid - there's no way to,
  say, left-align a label column while centering a control column in the same
  grid.
- **A tooltip's draw order follows its hierarchy position, not always-on-top.**
  See [Tooltips](./tooltips.md) for the workaround (create it last).
