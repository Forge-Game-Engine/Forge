---
sidebar_position: 4
---

# Clipping and Masking

[`createUiClip`](/Forge/docs/api/functions/createUiClip) turns any UI
element with a transform into a rectangular mask: descendants are clipped
to its `resolvedRect`, and the default shader discards fragments outside
that rect. This is the primitive [Scroll Groups](./scroll-groups.md) are
built on, but it's also useful directly for things like a fixed-size
notification panel that shouldn't let overflowing text bleed outside its
border.

```ts
import { createUiClip, createUiPanel } from '@forge-game-engine/forge/ui';

const { entity } = createUiPanel(world, {
  renderable,
  rect: { x: 0, y: 0, width: 240, height: 80 },
  parent: canvasEntity,
});

createUiClip(world, entity, { enabled: true });
```

## How clip rects propagate

The layout system computes each element's effective `clipRect` as it walks
down the hierarchy: if an ancestor has an enabled `UiClipEcsComponent`, the
child's clip rect becomes the intersection of that ancestor's
`resolvedRect` and whatever clip rect the ancestor itself inherited. Nested
clips only ever shrink the visible region, never grow it, there's no way to
"clip to the union" of two regions.

## Gotchas

- **`createUiClip` throws if the entity has no `UiTransformEcsComponent`
  yet.** Add the transform first (every `createUiX` factory already has
  one), then call `createUiClip`, not the other way around.
- **Clipping is an axis-aligned rectangle test**, even if the clipped
  element is rotated or scaled. Don't rely on it for a rotated mask or a
  non-rectangular shape; you'd need a custom shader for that (see
  [Custom Materials](./custom-materials.md)).
- **Disabling clipping (`enabled: false`) doesn't remove the component**, it
  just makes the layout system treat it as absent for that frame. Toggle it
  this way rather than adding/removing the component if you expect to flip
  it often, since the component lookup is cheaper than the hierarchy
  restructuring an add/remove would otherwise need to settle.
- **Custom shaders don't get clipping for free.** The default shader reads
  the `a_clipRect` instance attribute and discards outside it; a custom
  shader built with `createCustomUiRenderable` only honours `clipRect` if
  you add the same attribute and discard test yourself.

## Performance

The render system culls instances that are **fully** outside their
inherited clip rect before they're packed into a draw call, not just
visually hidden by the discard test in the fragment shader. A scroll list
with a thousand off-screen rows only pays the per-instance packing and
upload cost for the rows actually within (or partially within) the visible
clip rect. See [UI Performance](./ui-performance.md) for how this interacts
with batching.
