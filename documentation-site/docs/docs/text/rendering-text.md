---
sidebar_position: 3
---

# Rendering Text

[`addTextComponent`](/Forge/docs/api/functions/addTextComponent) draws a
string through the same instanced, batched draw path sprites already use,
crisp at any size, using a loaded
[`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas) (see
[Loading a Font Atlas](./loading-a-font-atlas.md)):

```ts
import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import { createRenderEcsSystem } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache();
const fontAtlas = await fontAtlasCache.getOrLoad({
  metricsUrl: 'assets/fonts/body.json',
  imageUrl: 'assets/fonts/body.png',
});

const label = world.createEntity();
addPositionComponent(world, label, { local: { x: 400, y: 300 } });
addTextComponent(world, label, {
  text: 'Score: 0',
  fontAtlas,
  size: 24,
});

world.addSystem(createTransformEcsSystem());
world.addSystem(createTextShapingEcsSystem(renderContext));
world.addSystem(createRenderEcsSystem(renderContext));
```

Two systems cooperate here, and both are required:
[`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem)
turns a `TextEcsComponent` into glyph geometry, and
[`createRenderEcsSystem`](/Forge/docs/api/functions/createRenderEcsSystem)
draws that geometry. A `TextEcsComponent` with no shaping system registered
never renders, since it has nothing for the render system to draw yet.
`createTransformEcsSystem` is the same one every positioned entity needs:
it turns the label's `local` position into the `world` position the
render system draws it at (see [Transforms](../common/transforms.md)).

## Letter spacing

`letterSpacing` (default `0`) adds extra space between adjacent letters, in
ems: it's multiplied by `size`, so `letterSpacing: 0.1` at `size: 20` adds 2
world units between letters, and the tracking scales along with the text.
Negative values pull letters closer together.

```ts
addTextComponent(world, title, {
  text: 'MAIN MENU',
  fontAtlas,
  size: 32,
  letterSpacing: 0.12,
});
```

The space goes between every pair of adjacent letters on a line. A gap
between words gets one letter space on top of the whitespace's own width,
so tracked words stay clearly apart. Nothing is added after a line's last
letter, so letter-spaced text still centers and right-aligns exactly,
without needing a manual offset.

## Updating text later

`text`, `size`, and every other field on the returned
[`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent) can be
written directly, the same as any other component:

```ts
const scoreText = addTextComponent(world, label, {
  text: 'Score: 0',
  fontAtlas,
  size: 24,
});

// Later, e.g. inside a system's update():
scoreText.text = `Score: ${score}`;
```

The shaping system only re-walks the string (kerning, glyph positions,
wrapping, alignment) when `text`, `fontAtlas`, `size`, `letterSpacing`,
`lineHeight`, `horizontalAlign`, `verticalAlign`, `maxWidth`, or
`horizontalAlignPivot` actually changed since the last tick it ran against
this entity. Changing `color`, `layer`, or `enabled` alone never triggers a
re-shape, they're read directly by the render system each frame. A
`<color>` tag is part of `text`, so changing one re-shapes the string.

## Multi-line layout

Setting `maxWidth` (in world units) wraps text at word boundaries instead of
drawing it as one continuous line:

```ts
addTextComponent(world, label, {
  text: 'A longer line of dialogue that needs to wrap across a few lines.',
  fontAtlas,
  size: 20,
  maxWidth: 400,
  lineHeight: 1.2,
  horizontalAlign: 'center',
  verticalAlign: 'middle',
});
```

- `horizontalAlign` (`'left'` | `'center'` | `'right'` | `'justify'`, default
  `'left'`) positions each wrapped line within the shaped block's own width.
  It's ignored when `maxWidth` is unset, since an unwrapped string is always
  exactly one line and therefore already exactly as wide as the block.
  `'justify'` stretches the gaps between words to fill `maxWidth` on every
  line except the last (a fully-justified last line of one or two words
  reads as visibly, unintentionally stretched) and except lines with only
  one word (nothing to stretch) - both cases fall back to left-aligned.
- `horizontalAlignPivot` (default `0`) - where the entity's own local
  `x = 0` sits within the `horizontalAlign` box, as a fraction of
  `maxWidth` from the box's left edge. `horizontalAlign` positions each
  line by measuring from `x = 0`, so this only needs setting when
  something _other_ than `x = 0` positions the entity's left edge - e.g. a
  `RectTransformEcsComponent` whose `pivot.x` isn't `0` (see
  [UI: Labels and Text](../ui/labels-and-text.md), which sets this
  automatically for its own stretch-anchored labels).
- `verticalAlign` (`'top'` | `'middle'` | `'bottom'` | `'baseline'` |
  `'capline'`, default `'top'`) positions the shaped block relative to the
  entity's position. Every value anchors to the font's metrics and the
  number of lines, never to the glyphs the string happens to contain, so a
  label doesn't move when its text changes, and two labels aligned to the
  same point share a baseline.
  - `'top'` anchors the first line's ascender (the top of the font's
    tallest glyphs, such as "b"/"d"/"h"), so text hangs _below_ the
    entity's position.
  - `'bottom'` anchors the last line's descender, so text sits _above_ it.
  - `'capline'` anchors the first line's cap height, the top of a capital
    letter like "H", so the top of a title set in caps touches the
    position.
  - `'baseline'` anchors the first line's baseline.
  - `'middle'` centers the band from the first line's cap height to the last
    line's baseline on the position. That's where a designer centers a
    label in a button: capitals and digits sit exactly in the middle, and
    descenders like "g"/"y" hang below the band. `createButton`,
    `createDropdown` and `createTooltip` center their labels this way.
- `lineHeight` (default `1`) multiplies the font atlas's own authored line
  height to control the vertical distance between line baselines.

A single word wider than `maxWidth` on its own is never split mid-word - it
simply overflows its own line, the same as any other greedy word-wrapping
implementation.

## Rich text tags

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

Tags nest. When colors nest, the innermost one wins. `<b>` and `<color>`
are independent, so their ranges can overlap without nesting cleanly.

Tags are stripped before the string is shaped. Kerning, wrapping and
alignment see only the visible text, so a tagged string lays out exactly as
the same string without tags would. Bold glyphs are the one exception: they
take up a little more room (see below). `shapeText` parses tags too, so
bounds you measure with it match what's drawn.

### Bold without a bold font

A font atlas holds one weight. `<b>` draws a synthetic bold, the same thing
a browser does when a page asks for bold and only the regular font is
installed: each glyph's edge is pushed out by
[`FAUX_BOLD_EMBOLDEN`](/Forge/docs/api/variables/FAUX_BOLD_EMBOLDEN) ems on
every side, and its advance grows by the added width so bold letters don't
run into each other. It reads well at body and heading sizes, but it isn't a
real bold cut: letter shapes are only thickened, not redrawn. An outline on
bold text wraps the thickened ink (see [Text Effects](./text-effects.md)).

### Literal `<`

A `<` only starts a tag when it begins a complete `<b>`, `</b>`,
`<color=...>` or `</color>` tag. Anything else is drawn as written, never
an error, since text often comes from players or translations:

- a `<` that doesn't start a complete tag: `HP < 50%`, `a<3`
- an unknown tag, such as `<i>`
- a tag with an invalid value, such as `<color=red>`
- a closing tag with no matching open tag

A tag that's never closed runs to the end of the string. There's no escape
syntax inside tagged text. To draw a string exactly as written, tags
included, set `richText: false`:

```ts
addTextComponent(world, label, {
  text: playerName,
  fontAtlas,
  size: 24,
  richText: false,
});
```

A [text field](../ui/text-input.md)'s labels have `richText` set to
`false`.

## Positioning and scale

`size` is the rendered em height in world units, positioned the same way as
[`SpriteEcsComponent`](/Forge/docs/api/interfaces/SpriteEcsComponent):
world position comes from the entity's
[`PositionEcsComponent`](/Forge/docs/api/interfaces/PositionEcsComponent),
and a [`ScaleEcsComponent`](/Forge/docs/api/interfaces/ScaleEcsComponent)
on the entity scales every glyph. A
[`RotationEcsComponent`](/Forge/docs/api/interfaces/RotationEcsComponent)
spins each glyph quad in place, but does not orbit the glyphs themselves
around the entity's origin the way a rotated multi-region sprite does, so
rotating multi-character text does not yet produce a rigid, correctly
orbiting block. Prefer un-rotated text (UI labels, HUD readouts,
world-space signage) until this is addressed in a later phase.

## Batching

Every `TextEcsComponent` sharing the same `FontAtlas` shares one
[`Renderable`](/Forge/docs/api/classes/Renderable), built and cached the
first time `createTextShapingEcsSystem` sees that atlas. Any number of text
entities drawing from the same atlas, plus every glyph within each of them,
batch into a single instanced draw call per camera, the same way sprites
sharing a texture do.

## Outline and soft-shadow effects

`TextEcsComponent` also has `outlineColor`/`outlineWidth` and
`shadowColor`/`shadowOffset`/`shadowSoftness` fields, drawn with no extra
draw call - see [Text Effects](./text-effects.md) for the full guide,
including the safe value range and how adjacent glyphs are kept from
visually overlapping.

## What's not supported yet

A literal `\n` in `text` is not treated as a forced line break - only
`maxWidth`-driven word wrapping produces multiple lines. `TextEcsComponent`
grows more capabilities in later phases without changing how
`addTextComponent`/`createTextShapingEcsSystem` are used today.
