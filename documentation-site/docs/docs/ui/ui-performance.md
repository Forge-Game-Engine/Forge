---
sidebar_position: 18
---

# UI Performance

The UI render system batches by `Renderable` identity, sorts by `zIndex`,
and culls instances that are fully clipped before they're packed into a
draw call. Most of the cost model comes down to two questions: how many
distinct `Renderable`s are in play, and how many elements survive clip
culling each frame.

## Batching

All elements sharing the same `Renderable` instance (built once via
`createUiRenderable` or `createCustomUiRenderable`) are merged into a single
`drawArraysInstanced` call, as long as they end up adjacent after the
render system sorts by `zIndex`. This means a screen with a thousand panels
can render in one or two draw calls if they share a renderable and use
coarse z-ordering, see [Default Styling](./default-styling.md) for the
`zIndex`-per-element mistake that defeats this.

```ts
import { getUiRenderMetrics } from '@forge-game-engine/forge/ui';

const { batchCount, instanceCount } = getUiRenderMetrics();
```

`getUiRenderMetrics()` reads a snapshot taken at the start of the previous
frame's render pass, useful for a profiling overlay or an automated
regression guard in a stress test (assert `batchCount` stays at 1 or 2 as
`instanceCount` grows into the hundreds).

## Clip culling

The render system skips packing any instance whose `resolvedRect` is
entirely outside its inherited `clipRect`, before it ever reaches the
instance buffer. This is what makes [scroll groups](./scroll-groups.md)
affordable: a list with hundreds of rows only pays the per-frame packing
and upload cost for the rows currently within (or partially within) the
visible viewport, not the full list. The cull check is a cheap rect
comparison, not a full draw-then-discard, so it's worth keeping scroll
content as plain panels/text rather than custom shaders if the list is
large, since culled custom-shader instances still skip packing the same way,
but every visible one still costs its own batch unless it shares a
renderable with the rest of the list.

## The static layout optimisation

Setting `UiTransformEcsComponent.isStatic = true` lets the layout system
skip recomputing that element's `resolvedRect`/`worldMatrix` every frame,
as long as its entire parent chain is also static. This is a real win for
HUD chrome that never moves (a persistent score panel, a fixed toolbar),
but it does nothing for content whose parent is still being recomputed each
frame (for example, anything inside an active scroll group's content
entity), since the optimisation requires the *whole* ancestor chain to be
frozen, not just the element itself. See
[Layout and Anchors](./layout-and-anchors.md#gotchas) for the `isDirty`
flag you need to set after mutating a static element at runtime.

## Animations at scale

Each `animateUiProperty` call (including the typed wrappers and presets in
[Animating UI](./animating-ui.md)) adds one entry to the entity's
`AnimationEcsComponent.animations` array. Finished, non-looping animations
are spliced out of that array automatically once they complete, including
when hundreds finish on the same frame, so a staggered entrance animation
across a large list doesn't accumulate dead entries. The per-frame cost is
a linear scan of each animated entity's own animation list, not a global
list, so many entities animating independently scales fine; many
animations stacked on the *same* field of the *same* entity is the case
`animateUiProperty`'s tag-based cancel/replace exists to prevent.

## Robustness under churn

A few behaviours worth knowing if you're building anything with rapid
state changes (drag-to-reorder, a fast-clicking user, a resize storm):

- Repeated `setFocus` calls to the same entity do not re-fire `onFocus`;
  focus events only fire on an actual change of the focused entity.
- Rapid focus changes across many entities still result in exactly one
  focused entity and a matching, non-duplicated sequence of
  `onFocus`/`onBlur` events.
- `destroyUiSubtree` on a large subtree (hundreds of descendants) removes
  every entity and component in it; it's recursive, not depth-limited, so
  avoid calling it from inside a hot per-frame loop on very deep trees.

## Measuring

`demo/ui-stress-test.html` (run via `npm run dev` from the repo root) is a
standalone scene built specifically to validate batching and frame budget
under load. It accepts URL parameters to vary the conditions:

- `?count=N`, default 200, total panel count.
- `?animations=0-10`, default 3, fraction of panels with an active
  ping-pong opacity or scale animation.
- `?clipping`, adds a scroll group with 100 list rows extending well
  beyond the visible viewport, to exercise clip culling.
- `?customShader`, swaps a portion of the panels onto a custom renderable
  to show the batch-count cost of mixing renderables.

It overlays FPS, frame time, `batchCount`/`instanceCount` from
`getUiRenderMetrics()`, and JS heap delta per frame. Use it as a starting
point for measuring your own scene's UI cost: a healthy default-shader
scene of a few hundred elements should hold 1 to 2 batches; if you see
batch counts climbing roughly linearly with element count, look for either
unshared `Renderable`s or fine-grained unique `zIndex` values breaking up
the sort order.
