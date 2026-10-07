---
sidebar_position: 3
---

# Rendering Text

A [`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent) draws a
string from a loaded [`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas)
(see [Loading a Font Atlas](./loading-a-font-atlas.md)) at its entity's
position. Two systems draw it:
[`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem)
lays the string out into glyph quads, and
[`createRenderEcsSystem`](/Forge/docs/api/functions/createRenderEcsSystem)
draws those quads with the sprites.

## Drawing text

Add a position and a text component to an entity with
[`addTextComponent`](/Forge/docs/api/functions/addTextComponent), and
register the shaping system before the render system:

```ts
import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import { createRenderEcsSystem } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  createTextShapingEcsSystem,
} from '@forge-game-engine/forge/text';

const label = world.createEntity();
addPositionComponent(world, label, { local: { x: 400, y: 300 } });
addTextComponent(world, label, {
  text: 'Score: 0',
  fontAtlas,
  size: 24,
});

world.addSystem(createTransformEcsSystem());
world.addSystem(createTextShapingEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
```

`size` is the height of one em in world units. The shaping system adds a
[`TextMeshEcsComponent`](/Forge/docs/api/interfaces/TextMeshEcsComponent)
with the glyph quads and the text's `bounds` to the entity, and the render
system draws entities that have both components. Text on an entity
without a text mesh isn't drawn. The render system draws the text at the
entity's `position.world` (see [Transforms](../common/transforms.md)).

## Changing text

The fields of the returned `TextEcsComponent` can be written at any time:

```ts
const scoreText = addTextComponent(world, label, {
  text: 'Score: 0',
  fontAtlas,
  size: 24,
});

scoreText.text = `Score: ${score}`;
```

The shaping system lays the string out again on its next update when
`text`, `fontAtlas`, `size`, `letterSpacing`, `lineHeight`,
`horizontalAlign`, `verticalAlign`, `maxWidth`, `horizontalAlignPivot` or
`richText` has changed. The render system reads the other fields, such as
`color` and `layer`, every frame.

## Aligning text to its position

`verticalAlign` sets which line of the text is placed at the entity's
position. Each value is measured from the font's metrics and the number of
lines, not from the characters in the string, so a label doesn't move when
its text changes:

- `'top'` (the default): the first line's ascender, so the text is below
  the position.
- `'capline'`: the first line's cap height (the top of a capital such as
  "H").
- `'middle'`: the middle of the band from the first line's cap height to
  the last line's baseline. Capitals and digits are centered on the
  position, and descenders such as "g" and "y" extend below it.
- `'baseline'`: the first line's baseline.
- `'bottom'`: the last line's descender, so the text is above the
  position.

```ts
addTextComponent(world, title, {
  text: 'Paused',
  fontAtlas,
  size: 48,
  verticalAlign: 'middle',
});
```

Horizontally, a line starts at the entity's position. `horizontalAlign`
aligns lines within `maxWidth` (see
[Wrapping text into lines](#wrapping-text-into-lines)), and has no effect
on text without one.

## Wrapping text into lines

`maxWidth`, in world units, wraps the text at spaces so no line is wider
than it:

```ts
addTextComponent(world, label, {
  text: 'A longer line of text that wraps across a few lines.',
  fontAtlas,
  size: 20,
  maxWidth: 400,
  horizontalAlign: 'center',
});
```

- `horizontalAlign` (`'left'`, `'center'`, `'right'` or `'justify'`)
  aligns each line within `maxWidth`. `'justify'` widens the gaps between
  words to fill `maxWidth`, except on the last line and on lines with one
  word, which are left-aligned.
- `lineHeight` multiplies the font's line height, the distance between the
  baselines of two lines.
- A word wider than `maxWidth` isn't split. It's placed on a line of its
  own and extends past `maxWidth`.

:::note
A newline character (`\n`) in `text` doesn't start a new line. Text
without a `maxWidth` is drawn as one line.
:::

## Spacing letters

`letterSpacing` adds space between adjacent letters, in ems: it's
multiplied by `size`, so `letterSpacing: 0.1` at `size: 20` adds 2 world
units. Negative values move letters closer together.

```ts
addTextComponent(world, title, {
  text: 'MAIN MENU',
  fontAtlas,
  size: 32,
  letterSpacing: 0.12,
});
```

No space is added after the last letter of a line, so letter-spaced text
centers and right-aligns on the same point as text without it.

## Styling part of a string with rich text tags

Tags inside `text` style part of a string. Two are supported:

- `<b>...</b>` draws its text bold.
- `<color=#rrggbb>...</color>` draws its text in a color. `#rgb`, `#rgba`
  and `#rrggbbaa` work too. The color replaces `color` for those
  characters, alpha included, so `<color=#ff000080>` is half transparent.

```ts
addTextComponent(world, label, {
  text: 'Press <b>A</b> to <color=#ffcc00>continue</color>',
  fontAtlas,
  size: 24,
});
```

Tags nest. When colors nest, the innermost one is used. `<b>` and
`<color>` ranges can overlap without nesting.

Tags are removed before the string is laid out, so kerning, wrapping and
alignment use only the visible text. Bold glyphs are wider than regular
ones. [`shapeText`](/Forge/docs/api/functions/shapeText) parses tags the
same way, so bounds measured with it match the drawn text.

### Bold text

An atlas holds one weight of a font, so `<b>` draws a synthetic bold: each
glyph's edge is moved outwards by
[`FAUX_BOLD_EMBOLDEN`](/Forge/docs/api/variables/FAUX_BOLD_EMBOLDEN) ems on
every side, and its advance grows by the added width. The letter shapes
are thickened, not redrawn as a bold typeface would draw them.

### Drawing `<` and tags as written

A `<` starts a tag only when it begins a complete `<b>`, `</b>`,
`<color=...>` or `</color>` tag. Everything else is drawn as written,
without an error:

- a `<` that doesn't start a complete tag: `HP < 50%`, `a<3`
- an unknown tag, such as `<i>`
- a tag with an invalid value, such as `<color=red>`
- a closing tag with no matching open tag

A tag that's never closed applies to the end of the string. There's no
escape syntax. To draw a string exactly as written, tags included, set
`richText` to `false`, for example for text a player typed:

```ts
addTextComponent(world, label, {
  text: playerName,
  fontAtlas,
  size: 24,
  richText: false,
});
```

## Scaling and rotating text

To change the size of text, set `size`.

:::caution
A [`ScaleEcsComponent`](/Forge/docs/api/interfaces/ScaleEcsComponent) or
[`RotationEcsComponent`](/Forge/docs/api/interfaces/RotationEcsComponent)
on a text entity scales or turns each glyph about its own center. The
positions of the glyphs relative to the entity aren't scaled or turned,
so text with more than one character doesn't keep its shape.
:::

## Draw order and cameras

Text uses the same `layer` and `category` fields as a sprite: a camera
draws text whose `category` shares a bit with its `cullingMask`, sorted by
`layer` together with the sprites (see
[Sprites](../rendering/sprites.md#setting-the-draw-order)). An entity's
sprite is drawn before its text.

Glyphs from the same `FontAtlas` share its texture, so glyphs that are
consecutive in a camera's draw order are drawn in one instanced draw call,
across any number of text entities, as
[sprites with the same texture](../rendering/sprites.md#batching) are.

## Hiding and removing text

To stop drawing the text and keep its component, hide its entity with a
`VisibilityEcsComponent` (see [Visibility](../rendering/visibility.md)).
Removing the `TextEcsComponent` from the entity stops it
being drawn.
