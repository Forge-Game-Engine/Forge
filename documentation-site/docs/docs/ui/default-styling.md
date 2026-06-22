---
sidebar_position: 2
---

# Default Styling

Every UI element with a [`UiRenderableEcsComponent`](/Forge/docs/api/interfaces/UiRenderableEcsComponent)
renders through the default UI shader, which exposes the common knobs you'd
expect from any UI toolkit: fill tint, border colour/width, corner radius,
and opacity. These are per-instance values, packed into the GPU instance
buffer every frame, so changing them at runtime never triggers a shader or
material swap.

```ts
import { createUiPanel, createUiRenderable } from '@forge-game-engine/forge/ui';
import { Color } from '@forge-game-engine/forge/rendering';

const panelRenderable = createUiRenderable(renderContext);

const { entity } = createUiPanel(world, {
  renderable: panelRenderable,
  rect: { x: 0, y: 0, width: 200, height: 120 },
  parent: canvasEntity,
  tintColor: new Color(0.12, 0.12, 0.16, 1),
  borderColor: Color.white,
  borderWidth: 2,
  cornerRadius: 8,
  opacity: 1,
});
```

## Sharing a renderable for batching

[`createUiRenderable`](/Forge/docs/api/functions/createUiRenderable) builds a
`Renderable`, the object the GPU batches by. Call it once per visual "layer"
(for example, once for all your menu panels) and pass the same instance to
every `createUiPanel`/`createUiButton`/etc. call that should share a draw
call, rather than calling it once per widget:

```ts
// Wrong: every panel gets its own Renderable, so every panel is its own draw call.
for (const item of items) {
  createUiPanel(world, { renderable: createUiRenderable(renderContext), ... });
}

// Right: one Renderable, shared across all panels that use the default shader.
const renderable = createUiRenderable(renderContext);
for (const item of items) {
  createUiPanel(world, { renderable, ... });
}
```

See [UI Performance](./ui-performance.md) for how batching interacts with
`zIndex` and clipping at scale.

## Gotchas

- **`enabled` on `UiRenderableEcsComponent` only controls drawing.** Setting
  it to `false` hides the element but does not disable layout, hit-testing,
  or focus. To make a widget non-interactive, use the `disabled` option on
  the widget factory (or `UiStateEcsComponent.disabled` directly), which
  also updates the visual state via `stateStyles`. The two are easy to
  confuse because of the similar names but they're independent flags.
- **`cornerRadius` is clamped to half the shortest side** by the shader, so
  a 40x20 element can never render fully pill-shaped from a single corner
  radius value beyond `10`. If you need a true pill/capsule shape, set
  `cornerRadius` to half the height explicitly rather than guessing a large
  number.
- **`opacity` multiplies the tint's existing alpha**, it doesn't replace it.
  A `tintColor` with `a: 0.5` and `opacity: 0.5` renders at an effective
  alpha of `0.25`.
- **Keep `zIndex` coarse.** The render system sorts all visible elements by
  `zIndex` once per frame and merges *consecutive* entries that share a
  `Renderable` into one instanced draw call. Giving every element in a list
  its own unique `zIndex` for fine stacking control defeats batching, even
  though they all use the same `Renderable`, because it interleaves them
  with elements from other renderables in sort order. Use one `zIndex` per
  logical layer (background, content, overlay, tooltip), not per element.

## Per-state styling

Hover, press, and focus visuals are layered on top of these base style
fields by `applyUiStateStyle`, not by swapping the renderable. See
[Interaction and Events](./interaction-and-events.md#per-state-style) for the
`stateStyles` option shared by every interactive widget factory.
