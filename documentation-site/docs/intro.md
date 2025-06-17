---
sidebar_position: 1
---

# Introduction

Forge is a browser-based, code only game engine. It has everything you would expect from an engine, including rendering, audio, input, animations, ECS, etc.

Let's begin with setting up a new project.

## Getting Started

### Installing Forge in your project

1. The Forge npm package is hosted on github, you will need to add an `.npmrc` file adjacent to your `package.json` file.

```bash title="shell"
echo '@forge-game-engine:registry=https://npm.pkg.github.com' > .npmrc
```

:::info

You may need to [create a personal access token](https://github.com/settings/tokens) and use it to login to the github npm package manager.

:::

2. Install the forge package

```bash title="shell"
npm i @forge-game-engine/forge@latest
```

### Creating the game instance

You will need to initialize the game in the entry point of your app.
This will differ depending on the toolchain you use. For example, if you use [vite](https://vite.dev/guide/) with the `vanilla-ts` template. You will have an `index.html` file in the root of your app and a `src/main.ts` file. This file will be the "entry point" of your app.

Once you have identified where to initialize your game, you can simply create a new instance of the `Game` class and invoke the `run` method.`

```ts
import { Game } from '@forge-game-engine/forge';

const game = new Game();

game.run();
```

Although this won't do anything just yet, we need to add a world to our game.

### Creating a world

```ts
import {
  Game,
  // diff-add
  createWorld,
} from '@forge-game-engine/forge';

const game = new Game();
// diff-add
createWorld('world', game);

game.run();
```

### Render a sprite in your scene

#### Load an image

We need to fetch an image for our sprite. Any [HTMLImageElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement) will do.
The easiest way to load and cache images is to use the [ImageCache](./api/classes/ImageCache.md).

```ts
import {
  Game,
  createWorld,
  // diff-add
  ImageCache,
} from '@forge-game-engine/forge';

const game = new Game();
createWorld('world', game);

// diff-add-start
const imageCache = new ImageCache();
const image = await imageCache.getOrLoad('sprite.png');
// diff-add-end

game.run();
```

#### Add a sprite to the world

We then need to create a sprite.

```ts
import {
  Game,
  createWorld,
  ImageCache,
  // diff-add-start
  createShaderStore,
  createImageSprite,
  // diff-add-end
} from '@forge-game-engine/forge';

const game = new Game();

// diff-remove
createWorld('world', game);
// diff-add
const { renderLayers } = createWorld('world', game);

const imageCache = new ImageCache();
const image = await imageCache.getOrLoad('sprite.png');

// diff-add-start
const shaderStore = createShaderStore();

const sprite = createImageSprite(
  image,
  renderLayers[0],
  shaderStore,
);
// diff-add-end

game.run();
```

Finally we need to add an entity to our world

```ts
import {
  Game,
  createWorld,
  ImageCache,
  createShaderStore,
  createImageSprite,
  // diff-add-start
  PositionComponent,
  SpriteComponent,
  // diff-add-end
} from '@forge-game-engine/forge';

const game = new Game();
// diff-remove
const { renderLayers } = createWorld('world', game);
// diff-add
const { renderLayers, world } = createWorld('world', game);

const imageCache = new ImageCache();
const image = await imageCache.getOrLoad('sprite.png');

const shaderStore = createShaderStore();

const sprite = createImageSprite(
  image,
  renderLayers[0],
  shaderStore,
);

// diff-add-start
world.buildAndAddEntity('sprite', [
  new PositionComponent(),
  new SpriteComponent(sprite),
]);
// diff-add-end

game.run();
```

Congratulations, you should now see something rendered to your screen! 🎉
