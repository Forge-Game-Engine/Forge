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

Once you have identified where to initialize your game, you can simply create a new instance of the `Game` class and invoke the `run` method.

```ts title="src/main.ts"
import { Game } from '@forge-game-engine/forge';

const container = createContainer('game');
const game = new Game(container);

game.run();
```

Although this won't do anything just yet, we'll first need to add a scene.

### Creating a scene

Create a new file adjacent to you `main.ts` file, named `create-demo-scene.ts`.

In this file, you can create a scene.

```ts title="src/create-demo-scene.ts"
import { createScene, type Game } from '@forge-game-engine/forge';

export function createDemoScene(game: Game) {
  const { world, scene, layerService, cameraEntity, inputsEntity } =
    createScene('demo', game);

  return scene;
}
```

Then you can register your scene in your game:

```ts title="src/main.ts"
import { Game } from '@forge-game-engine/forge';

const container = createContainer('game');
const game = new Game(container);

// diff-add
game.registerScene(createDemoScene(game));

game.run();
```

### Render a sprite in your scene

#### Create a render layer

Before we can render a sprite, we need to create a render layer. By using multiple render layers, you can control the draw order of groups of renderables.
For now we'll just add a single layer.

```ts title="src/create-demo-scene.ts"
import { 
  createScene, 
  type Game,
  // diff-add-start
  addForgeRenderLayers, 
  DEFAULT_LAYERS
  // diff-add-end
} from '@forge-game-engine/forge';

export function createDemoScene(game: Game) {
  const { world, scene, layerService, cameraEntity, inputsEntity } =
    createScene('demo', game);

  // diff-add-start
  const [foregroundRenderLayer] = addForgeRenderLayers(
    [DEFAULT_LAYERS.foreground],
    game.container,
    layerService,
    world,
    cameraEntity,
  );
  // diff-add-end

  return scene;
}
```

#### Load an image

We need to fetch an image for our sprite. Any [HTMLImageElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement) will do. 
The easiest way to load and cache images is to use the [ImageCache](#).

```ts title="src/create-demo-scene.ts"
import { 
  createScene, 
  type Game,
  addForgeRenderLayers, 
  DEFAULT_LAYERS,
  // diff-add
  ImageCache
} from '@forge-game-engine/forge';

// diff-remove
export function createDemoScene(game: Game) {
// diff-add
export async function createDemoScene(game: Game) {
  const { world, scene, layerService, cameraEntity, inputsEntity } =
    createScene('demo', game);

  const [foregroundRenderLayer] = addForgeRenderLayers(
    [DEFAULT_LAYERS.foreground],
    game.container,
    layerService,
    world,
    cameraEntity,
  );

  // diff-add-start
  const imageCache = new ImageCache();

  const image = await imageCache.getOrLoad('sprite.png'); 
  // diff-add-end

  return scene;
}
```

#### Add a sprite to the world

```ts title="src/create-demo-scene.ts"
import { 
  createScene, 
  type Game,
  addForgeRenderLayers, 
  DEFAULT_LAYERS,
  ImageCache,
  // diff-add-start
  createShaderStore,
  PositionComponent,
  SpriteComponent,
  createImageSprite
  // diff-add-end
} from '@forge-game-engine/forge';

export async function createDemoScene(game: Game) {
  const { world, scene, layerService, cameraEntity, inputsEntity } =
    createScene('demo', game);

  const [foregroundRenderLayer] = addForgeRenderLayers(
    [DEFAULT_LAYERS.foreground],
    game.container,
    layerService,
    world,
    cameraEntity,
  );

  const imageCache = new ImageCache();

  const image = await imageCache.getOrLoad('sprite.png');

  // diff-add-start
  const shaderStore = createShaderStore();

  const sprite = createImageSprite(
    image,
    foregroundRenderLayer.layer,
    shaderStore,
  );

  world.buildAndAddEntity('sprite', [
    new PositionComponent(),
    new SpriteComponent(sprite)
  ]);
  // diff-add-end

  return scene;
}
```
