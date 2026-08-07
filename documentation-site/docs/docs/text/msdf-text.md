---
sidebar_position: 1
---

# MSDF Text

## Generating an atlas

Forge doesn't ship a default font yet (see the
[current limitations](./index.md#current-limitations)), so every project
generates its own atlas with
[`msdf-atlas-gen`](https://github.com/Chlumsky/msdf-atlas-gen):

```sh
msdf-atlas-gen -font Roboto-Regular.ttf -type msdf -format png \
  -imageout roboto-msdf.png -json roboto-msdf.json \
  -charset charset.txt -size 32 -pxrange 4
```

(The [Text demo](/Forge/demos/text)'s own atlas -
`documentation-site/static/fonts/liberation-sans/` - was generated the same
way, from Liberation Sans; see the `README.md` alongside it for the exact
command used.)

Host the resulting `.json` and `.png` as static assets (e.g. next to your
other sprite sheets) and load them with
[`loadFontAtlas`](/Forge/docs/api/functions/loadFontAtlas):

```ts
import { loadFontAtlas } from '@forge-game-engine/forge/asset-loading';

const font = await loadFontAtlas(
  'fonts/roboto-msdf.json',
  'fonts/roboto-msdf.png',
  renderContext.imageCache,
);
```

`-charset` matters: a code point missing from the atlas is silently
skipped by `shapeText` rather than erroring, so leave out a needed
character and text using it will look wrong in a way that's easy to miss
until someone actually types that character. Generate the charset from
every string your game actually displays (including punctuation and any
non-English text) rather than guessing.

Kerning pairs must be present in the JSON (`msdf-atlas-gen` includes them
by default) or text will look subtly wrong - slightly-too-wide gaps
between specific letter pairs like "AV" or "To" - in a way that's hard to
attribute back to "missing kerning data" later.

## Drawing text

[`createMsdfTextRenderable`](/Forge/docs/api/functions/createMsdfTextRenderable)
builds the GPU-side renderable once per `FontAtlas` - share it across every
entity using that font, the same way one `Renderable` is shared across
every sprite using the same spritesheet:

```ts
import { createMsdfTextRenderable } from '@forge-game-engine/forge/rendering';

const renderable = createMsdfTextRenderable(font, renderContext);
```

Then attach a [`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent)
with [`addTextComponent`](/Forge/docs/api/functions/addTextComponent):

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { Color } from '@forge-game-engine/forge/rendering';
import { addTextComponent } from '@forge-game-engine/forge/text';

const score = world.createEntity();
addPositionComponent(world, score, { world: { x: -300, y: 260 } });
addTextComponent(world, score, {
  text: 'Score: 0',
  font,
  renderable,
  fontSize: 24,
  color: new Color(1, 0.9, 0.2, 1),
});
```

Updating `text` (e.g. every time the score changes) is cheap to write -
just assign a new string to `textComponent.text` - and
[`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem)
only re-shapes the entities whose text actually changed that frame; see
[Dirty tracking](#dirty-tracking).

## Wrapping, alignment, and line spacing

```ts
addTextComponent(world, dialogueEntity, {
  text: 'A long line of dialogue that should wrap inside the text box.',
  font,
  renderable,
  fontSize: 18,
  wrapWidth: 280,
  alignment: 'center',
  lineSpacing: 1.2,
});
```

- **`wrapWidth`** (world units) word-wraps `text` to fit, breaking between
  words. Omit it for a single line however long `text` is. A single word
  wider than `wrapWidth` is placed on its own line unbroken - there's no
  character-level breaking yet.
- **`alignment`** (`'left'` | `'center'` | `'right'`, default `'left'`)
  positions each line relative to the text block's own width (the widest
  line, or `wrapWidth` when set).
- **`lineSpacing`** (default `1`) multiplies `font.lineHeight` for the
  vertical gap between line baselines.
- **`pivot`** (default `(0.5, 0.5)`, same convention as
  [`SpriteEcsComponent.pivot`](/Forge/docs/api/interfaces/SpriteEcsComponent))
  is the text block's origin, normalized to its own size: `(0, 0)` anchors
  the block's top-left corner to the entity's position, `(1, 1)` its
  bottom-right.
- Explicit `\n` characters in `text` always start a new line, wrapped or not.

## Registration order

Where `createTextShapingEcsSystem` sits in the tick matters:

- **Before `createRenderEcsSystem`.** The render system reads a
  `TextMeshEcsComponent`'s glyph quads directly - an entity with a
  `TextEcsComponent` but no `TextMeshEcsComponent` yet (never shaped) is
  simply skipped, so register shaping with a lower
  `SystemRegistrationOrder`
  than rendering (`SystemRegistrationOrder.late`, from `@forge-game-engine/forge/ecs`, is a safe default for both).
- **After anything that changes `wrapWidth` at runtime**, if you're
  computing it dynamically (e.g. from a resizable container's width)
  rather than passing a fixed number.

## Dirty tracking

Re-shaping a paragraph - word-wrapping, kerning lookups, one quad per
character - is real cost, unlike most systems in a typical ECS pipeline
that recompute unconditionally every frame. `createTextShapingEcsSystem`
only re-shapes an entity when `text`, `font`, `fontSize`, `wrapWidth`,
`lineSpacing`, `alignment`, or `pivot` changed since its last shape.
Changing `color`, `enabled`, or `layer` never triggers a re-shape - those
only affect how the already-shaped glyphs are drawn.
