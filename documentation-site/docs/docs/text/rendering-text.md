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
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { createRenderEcsSystem } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache();
const fontAtlas = await fontAtlasCache.getOrLoad('assets/fonts/body.json');

const label = world.createEntity();
addPositionComponent(world, label, { world: { x: 400, y: 300 } });
addTextComponent(world, label, {
  text: 'Score: 0',
  fontAtlas,
  size: 24,
});

world.addSystem(createTextShapingEcsSystem(renderContext));
world.addSystem(createRenderEcsSystem(renderContext));
```

Two systems cooperate here, and both are required:
[`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem)
turns a `TextEcsComponent` into glyph geometry, and
[`createRenderEcsSystem`](/Forge/docs/api/functions/createRenderEcsSystem)
draws that geometry. A `TextEcsComponent` with no shaping system registered
never renders, since it has nothing for the render system to draw yet.

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
`lineHeight`, `horizontalAlign`, `verticalAlign`, or `maxWidth` actually
changed since the last tick it ran against this entity. Changing `color`,
`layer`, or `enabled` alone never triggers a re-shape, they're read directly
by the render system each frame.

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
- `verticalAlign` (`'top'` | `'middle'` | `'bottom'`, default `'top'`)
  positions the whole shaped block relative to the entity's position: `'top'`
  is the default and matches single-line text's existing behavior (the
  block's top edge sits at the entity's position); `'middle'`/`'bottom'`
  shift the block up so its center/bottom sits there instead.
- `lineHeight` (default `1`) multiplies the font atlas's own authored line
  height to control the vertical distance between line baselines.

A single word wider than `maxWidth` on its own is never split mid-word - it
simply overflows its own line, the same as any other greedy word-wrapping
implementation.

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

## What's not supported yet

A literal `\n` in `text` is not treated as a forced line break - only
`maxWidth`-driven word wrapping produces multiple lines. There is no
outline, glow, or shadow effect yet. `TextEcsComponent` grows these in later
phases without changing how `addTextComponent`/`createTextShapingEcsSystem`
are used today.
