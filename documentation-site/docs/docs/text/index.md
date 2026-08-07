# Text

`@forge-game-engine/forge/text` renders text using
[MSDF](https://github.com/Chlumsky/msdf-atlas-gen) (multi-channel signed
distance field) font atlases: a pre-generated texture plus a JSON metrics
file, sampled by a small fragment shader that reconstructs crisp glyph
edges at any scale. Unlike drawing text to a `<canvas>` and uploading it as
a texture, MSDF text batches into the same instanced draw call as sprites
and never re-uploads a texture when the string changes - the glyph
quads it draws are ordinary `SpriteEcsComponent`-shaped render commands
under the hood, so a label interleaves correctly with sprites in the same
depth-sorted draw order (see
[`createRenderEcsSystem`](/Forge/docs/api/functions/createRenderEcsSystem)).

Three pieces work together:

- [`loadFontAtlas`](/Forge/docs/api/functions/loadFontAtlas)
  (`/asset-loading`) parses an `msdf-atlas-gen` JSON metrics file and loads
  its atlas PNG into a [`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas) -
  glyph advances, kerning pairs, and line metrics, all normalized to em
  units.
- [`createMsdfTextRenderable`](/Forge/docs/api/functions/createMsdfTextRenderable)
  (`/rendering`) builds the GPU-side `Renderable` (the MSDF shader bound to
  the atlas texture) for a `FontAtlas`. Call this once per font, not once
  per label - every entity sharing the same `Renderable` batches together.
- [`addTextComponent`](/Forge/docs/api/functions/addTextComponent) and
  [`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem)
  (`/text`) turn a string into glyph quads: attach a
  [`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent) to an
  entity, and the shaping system dirty-tracks it into a
  [`TextMeshEcsComponent`](/Forge/docs/api/interfaces/TextMeshEcsComponent)
  the render system draws.

Try it in the [Text demo](/Forge/demos/text), which renders word-wrapped,
aligned paragraphs from a real generated Open Sans MSDF atlas,
including a live per-frame-updated label showing the shaping system's dirty
tracking in action.

Guides in this section:

- [MSDF Text](./msdf-text.md): generating a font atlas, loading it, and
  configuring wrapping, alignment, and line spacing.

## Quick Start

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { loadFontAtlas } from '@forge-game-engine/forge/asset-loading';
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';
import { createMsdfTextRenderable } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  createTextShapingEcsSystem,
} from '@forge-game-engine/forge/text';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, renderContext } = createGame('game-container');

const font = await loadFontAtlas(
  'fonts/roboto-msdf.json',
  'fonts/roboto-msdf.png',
  renderContext.imageCache,
);
const renderable = createMsdfTextRenderable(font, renderContext);

// Shape before render, so the render system always sees this frame's glyphs.
world.addSystem(createTextShapingEcsSystem(), SystemRegistrationOrder.late);

const label = world.createEntity();
addPositionComponent(world, label, { world: { x: 0, y: 0 } });
addTextComponent(world, label, {
  text: 'Hello, Forge!',
  font,
  renderable,
  fontSize: 32,
});
```

See [MSDF Text](./msdf-text.md#registration-order) for why shaping needs to
run before `createRenderEcsSystem`.

## Current limitations

This is the initial MSDF rendering path from
[issue #584](https://github.com/Forge-Game-Engine/Forge/issues/584). Not
yet implemented:

- **No font shipped with the engine.** Every project currently generates
  and hosts its own atlas (see [MSDF Text](./msdf-text.md#generating-an-atlas)).
- **No Canvas2D prototyping escape hatch.** `msdf-atlas-gen` is a real
  toolchain step; a documented `fillText`-to-texture fallback for quick
  prototyping is planned but not yet built.
- **No text effects** (outline, drop shadow, glow) - these fall out as
  extra MSDF shader parameters later.
- **Word wrap only, not character wrap.** A single word wider than
  `wrapWidth` is placed on its own line unbroken; see
  [`shapeText`](/Forge/docs/api/functions/shapeText).
