# Text

`@forge-game-engine/forge/text` draws text - labels, scores, dialogue,
damage numbers - using MSDF font atlases, so it stays crisp at any size and
draws in the same batched pass as your sprites.

Guides in this section:

- [MSDF Text](./msdf-text.md): generating a font atlas and configuring
  wrapping, alignment, color, and line spacing.

Try it in the [Text demo](/Forge/demos/text).

## Quick Start

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { loadFontAtlas } from '@forge-game-engine/forge/asset-loading';
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';
import {
  createMsdfTextRenderable,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
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

// Register shaping before rendering, so text always shows this frame's glyphs.
world.addSystem(createTextShapingEcsSystem(), SystemRegistrationOrder.early);
world.addSystem(createRenderEcsSystem(renderContext));

const label = world.createEntity();
addPositionComponent(world, label, { world: { x: 0, y: 0 } });
addTextComponent(world, label, {
  text: 'Hello, Forge!',
  font,
  renderable,
  fontSize: 32,
});
```

See [MSDF Text](./msdf-text.md) for generating the font atlas this example
loads.

## Options

Pass these to [`addTextComponent`](/Forge/docs/api/functions/addTextComponent):

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | `string` | *(required)* | The string to display. Assign a new value any time to update it. |
| `font` | `FontAtlas` | *(required)* | The loaded font atlas, from [`loadFontAtlas`](./msdf-text.md). |
| `renderable` | `Renderable` | *(required)* | From [`createMsdfTextRenderable`](./msdf-text.md#loading-and-drawing-text) - share one per font across every label using it. |
| `fontSize` | `number` | *(required)* | The text size, in world units. |
| `color` | `Color` | `Color.white` | The text's color. |
| `alignment` | `'left'` \| `'center'` \| `'right'` | `'left'` | How lines are positioned relative to each other. |
| `wrapWidth` | `number` | *(none)* | Wraps `text` between words to fit this width, in world units. Omit for a single unwrapped line. |
| `lineSpacing` | `number` | `1` | Multiplier for the gap between lines. |
| `pivot` | `{ x, y }` | `(0.5, 0.5)` | The text block's origin, normalized to its own size - `(0, 0)` is bottom-left, `(1, 1)` is top-right. |
| `enabled` | `boolean` | `true` | Set `false` to hide the text. |
| `layer` | `number` | `0` | Draw order relative to other sprites/text. |

Explicit `\n` characters in `text` always start a new line.

## Good to know

- Forge doesn't ship a bundled font - see [MSDF Text](./msdf-text.md) for
  generating your own atlas.
- Wrapping breaks between words, not mid-word: a single word wider than
  `wrapWidth` is placed on its own line unbroken.
- There's no built-in outline, glow, or drop shadow yet.
