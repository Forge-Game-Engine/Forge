# UI

The `ui` module is a retained-mode, ECS-native UI system built on an
**anchored rect tree**: a hierarchy of rectangle-shaped elements, each
anchored and pivoted against its parent's rectangle, resolved once per
frame by a layout pass, and drawn through the existing sprite/text
rendering pipeline. There's no immediate-mode API and no markup/stylesheet
language - a UI is a plain ECS entity hierarchy, assembled with factory
functions the same way any other composite entity in Forge is.

Core concepts:

- `CanvasEcsComponent`: a UI tree's root - screen-space (its own dedicated
  camera) or world-space (draws through your own camera, for diegetic UI
  like a health bar).
- `RectTransformEcsComponent`: every element's anchored position/size,
  resolved against its parent's rect each frame.
- `UiInteractableEcsComponent`: makes a rect clickable, hoverable, and
  focus-navigable.
- `registerUiSystems`: registers the systems that drive layout and
  interaction - called once per `EcsWorld`.

Guides in this section:

- [Creating a Canvas](./creating-a-canvas.md): `registerUiSystems`,
  `createUiCanvas`, screen-space vs. world-space canvases, and render
  categories.
- [Anchors and Layout](./anchors-and-layout.md): `RectTransformEcsComponent`,
  point vs. stretch axes, and the `UiAnchor` presets.
- [Responsive UI](./responsive-ui.md): scale modes for different screen
  sizes, and safe-area support for notched displays.
- [Labels and Text](./labels-and-text.md): `createLabel`, text alignment,
  and sizing a label to its own text.
- [Buttons and Interaction](./buttons-and-interaction.md): `createButton`,
  source-agnostic invocation, focus navigation, and hit testing/drag.
- [Controls](./controls.md): toggles, sliders, progress bars, and
  dropdowns.
- [Layout Groups](./layout-groups.md): automatic horizontal/vertical/grid
  arrangement, content-size fitting, and aspect-ratio fitting.
- [Canvas Groups and Tooltips](./canvas-groups-and-tooltips.md): fading or
  disabling a whole subtree at once, and hover/focus tooltips.

:::info[Current scope]
Layout (anchors, canvases, panels, labels), interaction (buttons,
hover/press/drag, gamepad/keyboard focus navigation, color transitions),
controls (toggles, sliders, progress bars, dropdowns), layout groups
(horizontal/vertical/grid, content size fitting, aspect ratio fitting),
world-space (diegetic) canvases, tooltips, and safe-area support for
notched displays are implemented. Scroll views, text input, and rect
clipping aren't yet - all three depend on clipping support, which hasn't
been built.
:::

## Quick Start

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
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

// Forge doesn't reserve or ship a "UI" render category - pick any bit your
// game isn't already using for another camera, and reuse it everywhere UI
// content needs to match this canvas's cullingMask.
const uiRenderCategory = 1 << 1;

// Registers the UI layout/interaction systems - call this once per world,
// before registering the transform/render systems, so layout runs first
// each frame. `time` drives its color transition tweens.
registerUiSystems(world, renderContext, time);

// createUiCanvas only creates the canvas entity itself, so it's safe to
// call as many times as you have canvases.
const canvas = createUiCanvas(world, renderContext, {
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

See [Creating a Canvas](./creating-a-canvas.md) for what `createUiCanvas`
builds and how render categories keep UI content separate from the world.
