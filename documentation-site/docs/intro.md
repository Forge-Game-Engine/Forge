---
sidebar_position: 1
---

# Introduction

Forge is a browser-based, code only game engine. It has everything you would expect from an engine, including rendering, audio, input, animations, ECS, etc.

Let's begin with setting up a new project.

## Getting Started

### Installing Forge in your project

Forge is published to the public npm registry. Install it like any other
package:

```bash title="shell"
npm install @forge-game-engine/forge
```

### Creating the game instance

You will need to initialize the game in the entry point of your app.
This will differ depending on the toolchain you use. For example, if you use [vite](https://vite.dev/guide/) with the `vanilla-ts` template. You will have an `index.html` file in the root of your app and a `src/main.ts` file. This file will be the "entry point" of your app.

Once you have identified where to initialize your game, use the
[`createGame`](./api/functions/createGame.md) helper. It builds a
[`Game`](./api/classes/Game.md), an [`EcsWorld`](./api/classes/EcsWorld.md),
a [`RenderContext`](./api/classes/RenderContext.md), and a
[`Time`](./api/classes/Time.md) instance for you from a container element's
ID, and returns all four so you can wire up your game:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';

const { game, world, renderContext } = createGame('game-container');

game.run();
```

Although this won't do anything just yet, `world` and `renderContext` are
what we'll use next to get something rendering on screen.

### Render a sprite in your scene

#### Load a texture

A sprite draws a texture: an image on the GPU. `renderContext` carries a
[`TextureCache`](./api/classes/TextureCache.md) that loads an image file
into a texture, once per file.

```ts
import { createGame } from '@forge-game-engine/forge/utilities';

const { game, world, renderContext } = createGame('game-container');

// diff-add
const texture = await renderContext.textureCache.getOrLoad('sprite.png');

game.run();
```

#### Create a sprite

We then need to create a sprite that draws the texture:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';
// diff-add
import { createImageSprite } from '@forge-game-engine/forge/rendering';

const { game, world, renderContext } = createGame('game-container');

const texture = await renderContext.textureCache.getOrLoad('sprite.png');
// diff-add
const sprite = createImageSprite(texture);

game.run();
```

Finally we need to add an entity to our world with a position and that
sprite:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';
import {
  createImageSprite,
  // diff-add
  addSpriteComponent,
} from '@forge-game-engine/forge/rendering';
// diff-add
import { addPositionComponent } from '@forge-game-engine/forge/common';

const { game, world, renderContext } = createGame('game-container');

const texture = await renderContext.textureCache.getOrLoad('sprite.png');
const sprite = createImageSprite(texture);

// diff-add-start
const entity = world.createEntity();
addPositionComponent(world, entity);
addSpriteComponent(world, entity, sprite);
// diff-add-end

game.run();
```

Congratulations, you should now see something rendered to your screen! 🎉
