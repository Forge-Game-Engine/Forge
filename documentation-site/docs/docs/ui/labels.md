---
sidebar_position: 3
---

# Labels

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
  category: uiRenderCategory,
  // horizontalAlign/verticalAlign (both default to 'left'/'top', i.e. the
  // entity's position is the text's top-left corner) only take effect once
  // maxWidth is set - with no box to align within, a single unwrapped line
  // always starts exactly at the entity's position regardless of
  // horizontalAlign. verticalAlign has no such caveat.
  horizontalAlign: 'center',
  verticalAlign: 'middle',
  // `UiAnchor.middleLeft` is point-anchored on both axes, so its `x` carries
  // a literal size - `maxWidth` needs to be set to match it explicitly.
  anchor: UiAnchor.middleLeft({ x: 200, y: 40 }),
  maxWidth: 200,
});
```

`horizontalAlign`'s alignment box is measured from the entity's own local
`x = 0` - which only lands on the resolved rect's actual left edge for a
`pivot.x: 0` anchor like `middleLeft`. A center-pivoted anchor (`center`,
`topCenter`, `stretchAll`, ...) would offset that box away from the rect's
real bounds, _except_ `createUiLayoutEcsSystem` compensates for this
automatically for any stretch-x anchor (`x.kind === 'stretch'`, e.g.
`stretchAll`, `stretchHorizontal`) - it syncs both
`TextEcsComponent.maxWidth` and `horizontalAlignPivot` from the resolved
rect and its pivot every frame, so `horizontalAlign` works correctly under
any pivot for those anchors, with no `maxWidth` to set at all:

```ts
createLabel(world, topBar, {
  text: 'Forge UI Demo',
  fontAtlas,
  size: 40,
  category: uiRenderCategory,
  // `stretchAll`'s default margin is zero on both axes, so maxWidth ends up
  // matching topBar's actual width rather than being widened past it.
  anchor: UiAnchor.stretchAll(),
  horizontalAlign: 'center',
  verticalAlign: 'middle',
  // No maxWidth - createUiLayoutEcsSystem derives it (and the pivot
  // correction) from topBar's own resolved rect every frame, so the label
  // stays centered even if topBar itself resizes, and even if the label's
  // own text changes later (e.g. a dropdown header showing a newly-selected
  // option).
});
```

A **point** axis doesn't get this automatic sync (there's no per-frame
resolved rect to derive it from beyond what its own `size` already gives you
statically), so a point-anchored label centering against an explicit
`maxWidth` still needs a `pivot.x: 0` anchor - `middleLeft`,
`topLeft`/`bottomLeft` - as in the example above.
`stretchHorizontalLeft`/`stretchTopLeft`/`stretchTopRight` remain available
for when you specifically want a stretch rect's own local origin pinned to
a particular edge for some other reason (manual position math, a non-text
child), but they're no longer necessary just to make `horizontalAlign`
work.

## Sizing a label to its own text

`createLabel`'s `sizeToText` option attaches a
[`LayoutElementEcsComponent`](/Forge/docs/api/interfaces/LayoutElementEcsComponent)
with `sizeToText: true`, so a parent layout group (see
[Layout Groups](./layout-groups.md)) measures the label by its own shaped
`TextMeshEcsComponent.bounds` instead of its own hand-set rect size:

```ts
createLabel(world, optionsRow, {
  text: 'Music',
  fontAtlas,
  size: 20,
  sizeToText: true,
});
```

This re-reads the shaped bounds every frame, the same full-recompute model
the rest of this module uses - a label whose text changes at runtime (a
localized string, a live volume percentage) keeps sizing correctly with no
extra work. `sizeToText` requires a `TextEcsComponent` on the same entity
(throwing otherwise - it only applies to text entities). Its shaped
`TextMeshEcsComponent`, added by `createTextShapingEcsSystem` (registered by
`createUiCanvas`) once it actually shapes the label's text, may not exist yet
on the very first tick a brand-new label is created - that tick measures as
zero-width instead of throwing, the same one-frame lag every freshly-created
layout group child already has. An explicit
`LayoutElementEcsComponent.preferredWidth`/`preferredHeight` still overrides
`sizeToText`, the same precedence every other field on that component
already has.

`sizeToText` also defaults `verticalAlign` to `'bottom'` (unless you pass
your own): a layout-arranged child is always forced to a bottom-left pivot
(see [Layout Groups](./layout-groups.md)), and `verticalAlign`'s own
default (`'top'`) assumes a top pivot instead - without this, the text
renders a full line-height below its own `sizeToText`-measured box rather
than inside it. Pass an explicit `verticalAlign` to opt out (e.g. if you've
overridden the label's own pivot to something other than bottom-anchored).
