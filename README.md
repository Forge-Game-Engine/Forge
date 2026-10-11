<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/forge-logo-dark.png" />
    <img src="assets/forge-logo-light.png" alt="Forge" width="160" />
  </picture>
</p>

# Forge

Forge is a browser-based, code-only game engine. It has everything you'd
expect from an engine, including rendering, audio, input, animations, an
Entity-Component-System (ECS) core, physics, and more.

[![codecov](https://codecov.io/gh/Forge-Game-Engine/Forge/branch/dev/graph/badge.svg)](https://codecov.io/gh/Forge-Game-Engine/Forge)

[Documentation](https://forge-game-engine.github.io/Forge/) ·
[Demos](https://forge-game-engine.github.io/Forge/demos)

## Getting started

### Install

Forge is published to GitHub Packages, so npm needs a GitHub token before it
can install it:

1. [Create a classic personal access token](https://github.com/settings/tokens/new)
   with the `read:packages` scope.
2. Log in to the GitHub npm registry for the `@forge-game-engine` scope.
   Enter your GitHub username, and the token as the password:

   ```sh
   npm login --scope=@forge-game-engine --registry=https://npm.pkg.github.com
   ```

3. Install the package:

   ```sh
   npm install @forge-game-engine/forge
   ```

### Draw a sprite

Add a `<div id="game-container"></div>` to your page, then create a game, a
camera and an entity with a sprite, and register the systems that draw it:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';
import {
  addSpriteComponent,
  createCamera,
  createImageSprite,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';

const { game, world, renderContext } = createGame('game-container');

createCamera(world);

const texture = await renderContext.textureCache.getOrLoad('sprite.png');
const sprite = createImageSprite(texture);

const entity = world.createEntity();

addPositionComponent(world, entity);
addSpriteComponent(world, entity, sprite);

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));

game.run();
```

The [Getting Started guide](https://forge-game-engine.github.io/Forge/docs/intro)
walks through setup in more detail, and the
[demos](https://forge-game-engine.github.io/Forge/demos) are complete,
runnable examples of each feature.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, verification steps, and
commit and changelog conventions.

## Acknowledgements

Forge's demos and website use art, audio and fonts by many creators. See
[Credits and attributions](https://forge-game-engine.github.io/Forge/docs/credits).
