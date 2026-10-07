---
sidebar_position: 4
---

# Labels and Text

A label is a UI element that draws text: an entity with a
`RectTransformEcsComponent` and a
[`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent). Its
text is laid out and drawn by the text module (see
[Rendering Text](../text/rendering-text.md)), so a game with labels also
registers `createTextShapingEcsSystem`.

## Creating a label

[`createLabel`](/Forge/docs/api/functions/createLabel) creates a label
under a parent element. It takes every `addTextComponent` option, plus
`anchor` and `anchoredPosition`:

```ts
import { createLabel, UiAnchor } from '@forge-game-engine/forge/ui';

const scoreLabel = createLabel(world, panel, {
  text: 'Score: 0',
  fontAtlas,
  size: 32,
  category: uiRenderCategory,
  anchor: UiAnchor.stretchAll(),
  horizontalAlign: 'center',
  verticalAlign: 'middle',
});
```

`fontAtlas` is a loaded font atlas (see
[Loading a Font Atlas](../text/loading-a-font-atlas.md)). `category` is
the canvas's render category: a label's category defaults to
`TEXT_RENDER_CATEGORY`, which the canvas's camera doesn't draw unless its
`cullingMask` includes it (see
[Choosing a render category](creating-a-canvas.md#choosing-a-render-category)).

To change the text later, write the label's `TextEcsComponent.text`.

## Aligning text in a label

The label's text is placed from its entity's position, which is the
rectangle's pivot. How `horizontalAlign` lines the text up depends on the
label's horizontal axis:

- With a **stretch** `x` axis (`stretchAll`, `stretchHorizontal`, ...),
  the layout system sets the text's `maxWidth` to the rectangle's width,
  and its `horizontalAlignPivot` to the axis's pivot, every frame. The text
  is aligned within the rectangle, and wraps at its width.
- With a **point** `x` axis, the layout system doesn't change the text.
  `horizontalAlign` only has an effect when `maxWidth` is set, and aligns
  the text within a box of that width that starts at the entity's
  position. Use an anchor whose pivot is on the left edge (`topLeft`,
  `middleLeft`, `bottomLeft`), and set `maxWidth` to the axis's size:

```ts
createLabel(world, panel, {
  text: 'Play',
  fontAtlas,
  size: 32,
  category: uiRenderCategory,
  anchor: UiAnchor.middleLeft({ x: 200, y: 40 }),
  maxWidth: 200,
  horizontalAlign: 'center',
  verticalAlign: 'middle',
});
```

`verticalAlign` places the text vertically around the entity's position
on either kind of axis.

## Sizing a label to its text

A [layout group](layout-groups.md) sizes a child from its rect
transform. Pass `sizeToText: true` to size a label from its shaped text
instead:

```ts
createLabel(world, optionsRow, {
  text: 'Music',
  fontAtlas,
  size: 20,
  category: uiRenderCategory,
  sizeToText: true,
});
```

This adds a
[`LayoutElementEcsComponent`](/Forge/docs/api/interfaces/LayoutElementEcsComponent)
with `sizeToText: true`, so the label is measured from its
`TextMeshEcsComponent.bounds` every frame, and follows changes to its
text. It also sets `verticalAlign` to `'bottom'` unless you pass one,
because a layout group places each child's pivot at its bottom-left
corner.
