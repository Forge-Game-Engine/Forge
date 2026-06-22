# UI

Forge's UI stack is ECS-native: a button is an entity with a transform, a
renderable, and a state component, not a separate retained-mode widget tree.
UI elements render through the same instanced WebGL2 batch pipeline as
sprites, react to the same Forge input actions and events as gameplay code,
and animate through the same property animation system used for everything
else in the engine. If you already know Forge's ECS, rendering, input, and
animation systems, you already know most of what you need to build UI; this
section covers the parts that are specific to UI: anchor-based layout,
hit-testing and focus, text, and the primitive and composite widgets built on
top of them.

Core concepts:

- [`createUiCanvas`](/Forge/docs/api/functions/createUiCanvas): creates the
  root entity of a UI hierarchy. All other UI entities are descendants of a
  canvas, found via the existing `ParentEcsComponent` hierarchy.
- [`UiTransformEcsComponent`](/Forge/docs/api/interfaces/UiTransformEcsComponent):
  anchor/offset/pivot layout, resolved into a screen-space rect and world
  matrix every frame by `createUiLayoutEcsSystem`.
- [`UiRenderableEcsComponent`](/Forge/docs/api/interfaces/UiRenderableEcsComponent):
  the default-shader visual style (tint, border, corner radius, opacity), or
  a fully custom `Renderable`.
- [`UiStateEcsComponent`](/Forge/docs/api/interfaces/UiStateEcsComponent): the
  shared hover/press/focus/disabled state machine and its events, driven by
  `createUiHitTestEcsSystem` and `createUiStateEcsSystem`.

Guides in this section:

- [Layout and Anchors](./layout-and-anchors.md): the anchor/pivot/offset model,
  presets, and resize behaviour.
- [Default Styling](./default-styling.md): tint, border, corner radius, and
  opacity via the built-in shader.
- [Custom Materials](./custom-materials.md): supplying a fully custom
  shader/material for a UI element.
- [Clipping and Masking](./clipping-and-masking.md): clipping descendants to a
  container's rect.
- [Text Rendering](./text-rendering.md): SDF text, font atlas generation, and
  text layout options.
- [Interaction and Events](./interaction-and-events.md): hit-testing, the
  hover/press/click state machine, and Forge event integration.
- [Focus and Keyboard Navigation](./focus-and-keyboard-navigation.md): tab
  order, arrow-key navigation, and activation shortcuts.
- [Defocus and Blur Behaviour](./defocus-and-blur.md): what happens to focus
  on element blur, container blur, tab blur, and resize.
- [Panels](./panels.md), [Buttons](./buttons.md), [Checkboxes](./checkboxes.md),
  and [Sliders](./sliders.md): the primitive widgets.
- [Composing Widgets](./composing-widgets.md): the `UiWidgetHandle`
  convention for building your own composite widgets.
- [Scroll Groups](./scroll-groups.md), [Input Boxes](./input-boxes.md), and
  [Dropdowns](./dropdowns.md): the container and advanced widgets.
- [Animating UI](./animating-ui.md): driving UI motion through the property
  animation system.
- [UI Performance](./ui-performance.md): batching, clip culling, and render
  metrics.

## Quick Start

Every UI scene needs, at minimum, a canvas, the layout system, and the render
system. Interactive elements additionally need pointer-state and focus
tracking on the canvas, the hit-test and state systems, and registered input
actions. This example creates a canvas and a single clickable button:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';
import { registerInputs, MouseInputSource } from '@forge-game-engine/forge/input';
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createUiCanvas,
  createUiLayoutEcsSystem,
  createUiRenderEcsSystem,
  createUiRenderable,
  createUiHitTestEcsSystem,
  uiHitTestSystemOrder,
  createUiStateEcsSystem,
  registerUiInputActions,
  createUiButton,
  uiPointerStateId,
  uiFocusId,
  loadFontAsset,
  anchorPresets,
} from '@forge-game-engine/forge/ui';

const { game, world, renderContext, time } = createGame('game-container');

// Input: one InputManager drives both gameplay and UI actions.
const inputManager = registerInputs(world, time);
const mouseSource = new MouseInputSource(inputManager, renderContext.canvas);
registerUiInputActions(inputManager, { mouseSource });

// Canvas: the root of the UI hierarchy.
const canvasEntity = createUiCanvas(world, {
  width: renderContext.canvas.width,
  height: renderContext.canvas.height,
});

// `createUiCanvas` only wires up layout. Pointer hit-testing and focus
// tracking are opt-in, since a purely decorative canvas doesn't need them.
world.addComponent(canvasEntity, uiPointerStateId, {
  hovered: null,
  pressed: null,
  pointer: Vector2.zero,
});
world.addComponent(canvasEntity, uiFocusId, { focused: null, focusRing: false });

// Systems: layout before hit-test/state, render after everything (`late`).
world.addSystem(createUiLayoutEcsSystem());
world.addSystem(createUiHitTestEcsSystem(inputManager), uiHitTestSystemOrder);
world.addSystem(createUiStateEcsSystem(inputManager));
world.addSystem(createUiRenderEcsSystem(renderContext), SystemRegistrationOrder.late);

// Font: see Text Rendering for generating your own atlas with `generate:font`.
const font = await loadFontAsset(
  renderContext,
  '/fonts/inter-regular.json',
  '/fonts/inter-regular.png',
);

const buttonRenderable = createUiRenderable(renderContext);

createUiButton(world, {
  renderable: buttonRenderable,
  renderContext,
  font,
  rect: { x: -80, y: -24, width: 160, height: 48 },
  anchorMin: anchorPresets.center.anchorMin,
  anchorMax: anchorPresets.center.anchorMax,
  pivot: anchorPresets.center.pivot,
  parent: canvasEntity,
  label: 'Click me',
  onClick: () => console.log('clicked!'),
});

game.run();
```

A few things to note about this example, expanded on in the linked guides:

- `createUiCanvas` does not add `UiPointerStateEcsComponent` or
  `UiFocusEcsComponent`. Forgetting them is the most common reason a panel or
  button renders correctly but never responds to clicks: the hit-test and
  state systems silently find no canvas to write results to.
- Widgets are plain functions (`createUiButton`, `createUiPanel`, ...) that
  create one or more entities and return a
  [`UiWidgetHandle`](/Forge/docs/api/interfaces/UiWidgetHandle). Call
  `destroy()` on the handle when removing a widget, rather than removing the
  entity directly, so owned event listeners are cleared too.
- All panels/buttons that share the same `Renderable` (from
  `createUiRenderable`) batch into a single draw call regardless of how many
  there are; see [UI Performance](./ui-performance.md).
