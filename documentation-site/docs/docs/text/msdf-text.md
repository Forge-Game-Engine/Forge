---
sidebar_position: 1
---

# MSDF Text

## Generating an atlas

Generate a font atlas with
[`msdf-atlas-gen`](https://github.com/Chlumsky/msdf-atlas-gen):

```sh
msdf-atlas-gen -font Roboto-Regular.ttf -type msdf -format png \
  -imageout roboto-msdf.png -json roboto-msdf.json \
  -charset charset.txt -size 32 -pxrange 4
```

Host the resulting `.json` and `.png` as static assets (e.g. next to your
other sprite sheets).

Generate `charset.txt` from every string your game actually displays,
including punctuation and any non-English text - a character missing from
the atlas is silently skipped when drawn, rather than erroring, so it's
easy to miss until someone types it. Leave the default kerning table
enabled (`msdf-atlas-gen` includes it unless you pass `-nokerning`), or
letter pairs like "AV" or "To" will look subtly too far apart.

## Loading and drawing text

Load the atlas with
[`loadFontAtlas`](/Forge/docs/api/functions/loadFontAtlas):

```ts
import { loadFontAtlas } from '@forge-game-engine/forge/asset-loading';

const font = await loadFontAtlas(
  'fonts/roboto-msdf.json',
  'fonts/roboto-msdf.png',
  renderContext.imageCache,
);
```

Build a renderable for it with
[`createMsdfTextRenderable`](/Forge/docs/api/functions/createMsdfTextRenderable) -
once per font, not once per label:

```ts
import { createMsdfTextRenderable } from '@forge-game-engine/forge/rendering';

const renderable = createMsdfTextRenderable(font, renderContext);
```

Then attach a text component to any entity with a position:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { Color } from '@forge-game-engine/forge/rendering';
import { addTextComponent } from '@forge-game-engine/forge/text';

const score = world.createEntity();
addPositionComponent(world, score, { world: { x: -300, y: 260 } });
const scoreText = addTextComponent(world, score, {
  text: 'Score: 0',
  font,
  renderable,
  fontSize: 24,
  color: new Color(1, 0.9, 0.2, 1),
});
```

Update the score later just by assigning a new string:

```ts
scoreText.text = `Score: ${points}`;
```

That's cheap to do every frame - only `text`, `font`, `fontSize`,
`wrapWidth`, `lineSpacing`, `alignment`, or `pivot` changing triggers a
re-shape. Changing `color`, `enabled`, or `layer` doesn't.

See [Options](./index.md#options) for the full list of settings, including
wrapping, alignment, and line spacing.

## Setup

Register the shaping system before the render system, so text always
shows this frame's glyphs:

```ts
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';
import { createTextShapingEcsSystem } from '@forge-game-engine/forge/text';
import { createRenderEcsSystem } from '@forge-game-engine/forge/rendering';

world.addSystem(createTextShapingEcsSystem(), SystemRegistrationOrder.early);
world.addSystem(createRenderEcsSystem(renderContext));
```
