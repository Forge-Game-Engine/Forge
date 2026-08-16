---
sidebar_position: 1
---

# Introduction

Forge is a browser-based, code only game engine. It has everything you would expect from an engine, including rendering, audio, input, animations, ECS, etc.

Let's begin with setting up a new project.

## Getting Started

### Installing Forge in your project

1. The Forge npm package is hosted on GitHub Packages, so you will need to authenticate npm against it before you can install the package.

   a. [Create a classic personal access token](https://github.com/settings/tokens/new) with the `read:packages` scope.

   :::info

   The Forge-Game-Engine organization requires personal access tokens to expire in 60 days or fewer, so you will need to set an expiration of 60 days or less and regenerate the token periodically.

   :::

   b. Log in to the GitHub npm registry with that token, scoped to the `@forge-game-engine` package scope. When prompted, enter your GitHub username, the personal access token as your password, and any email address.

   ```bash title="shell"
   npm login --scope=@forge-game-engine --registry=https://npm.pkg.github.com
   ```

   This adds an `.npmrc` file adjacent to your `package.json` file that points the `@forge-game-engine` scope at the GitHub npm registry and stores your auth token, equivalent to running:

   ```bash title="shell"
   echo '@forge-game-engine:registry=https://npm.pkg.github.com' >> .npmrc
   echo '//npm.pkg.github.com/:_authToken=<YOUR_PERSONAL_ACCESS_TOKEN>' >> .npmrc
   ```

   :::warning

   Don't commit your personal access token. If you write the token into `.npmrc` directly, add `.npmrc` to your `.gitignore`, or reference an environment variable (e.g. `_authToken=${GITHUB_TOKEN}`) instead.

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

Although this won't do anything just yet, we need to add a world and a
render context to our game. [`createGame`](./api/functions/createGame.md)
sets both up for you from a container element's ID, along with a
[`Time`](./api/classes/Time.md) instance for the game loop.

### Creating a world

```ts
// diff-remove
import { Game } from '@forge-game-engine/forge';
// diff-add
import { createGame } from '@forge-game-engine/forge';

// diff-remove
const game = new Game();
// diff-add
const { game, world, renderContext } = createGame('game-container');

game.run();
```

### Render a sprite in your scene

#### Load an image

We need to fetch an image for our sprite. Any [HTMLImageElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement) will do.
`renderContext` already carries an [`ImageCache`](./api/classes/ImageCache.md) for loading and caching images.

```ts
import { createGame } from '@forge-game-engine/forge';

const { game, world, renderContext } = createGame('game-container');

// diff-add-start
const { imageCache } = renderContext;
const image = await imageCache.getOrLoad('sprite.png');
// diff-add-end

game.run();
```

#### Create a sprite

We then need to create a sprite from that image, on render layer `0`:

```ts
import {
  createGame,
  // diff-add
  createImageSprite,
} from '@forge-game-engine/forge';

const { game, world, renderContext } = createGame('game-container');

const { imageCache } = renderContext;
const image = await imageCache.getOrLoad('sprite.png');

// diff-add
const sprite = createImageSprite(image, renderContext, 0);

game.run();
```

Finally we need to add an entity to our world with a position and that
sprite:

```ts
import {
  createGame,
  createImageSprite,
  // diff-add-start
  addPositionComponent,
  addSpriteComponent,
  // diff-add-end
} from '@forge-game-engine/forge';

const { game, world, renderContext } = createGame('game-container');

const { imageCache } = renderContext;
const image = await imageCache.getOrLoad('sprite.png');

const sprite = createImageSprite(image, renderContext, 0);

// diff-add-start
const entity = world.createEntity();
addPositionComponent(world, entity);
addSpriteComponent(world, entity, sprite);
// diff-add-end

game.run();
```

Congratulations, you should now see something rendered to your screen! 🎉
