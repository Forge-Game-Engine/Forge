# Forge

![logo](assets/forge-banner.png)

Forge is a browser-based, code-only game engine. It has everything you'd
expect from an engine, including rendering, audio, input, animations, an
Entity-Component-System (ECS) core, physics, and more.

[Documentation](https://forge-game-engine.github.io/Forge/)

## Getting started

```sh
npm install @forge-game-engine/forge
```

Follow the [Getting Started guide](https://forge-game-engine.github.io/Forge/docs/intro)
to set up a `Game`, an ECS `World`, and render your first sprite. The
[ECS demo](https://forge-game-engine.github.io/Forge/demos/ecs) shows a
complete runnable example.

Want to contribute? See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup,
verification steps, and commit/changelog conventions.

## What the engine is

The engine is where all the code is stored that is usable for most types of games. For example: the renderer, audio systems, animations, mouse pointer, etc.

## What the engine is not

The engine is not a place to store code that is hyper-specific to a game. For example: a system for collecting coins.

## What if my system is specific to a particular genre?

You can make a separate folder or package outside of the engine.

## Acknowledgements

- [Howler.js](https://howlerjs.com/)
- [Vite](https://vite.dev/)
- [Kenny](https://www.kenney.nl/)
