# Forge game

A starter game made with [Forge](https://forge-game-engine.github.io/Forge/),
a browser-based, code-only game engine. Move the logo with WASD or the arrow
keys.

## Commands

```sh
npm install     # install the engine and the build tools
npm run dev     # start a dev server that reloads when you save
npm run build   # type-check and build the game into dist/
```

`npm run preview` serves the built `dist/` folder, to check a build before
you publish it.

## What's in `src/`

- `main.ts` creates the game, a camera and the player entity, sets up
  keyboard input and adds the systems that run every frame.
- `components/player-component.ts` is the data that marks the entity the
  player moves, and how fast it moves.
- `systems/player-movement-system.ts` moves every player entity in the
  direction the keys point.

Images and other files in `public/` are served from the site's root, so
`public/sprite.png` loads as `'sprite.png'`.

## Learn more

- [Documentation](https://forge-game-engine.github.io/Forge/docs/intro): the
  guides to each part of the engine.
- [Demos](https://forge-game-engine.github.io/Forge/demos): complete,
  runnable examples of each feature, with their source code.
- [API reference](https://forge-game-engine.github.io/Forge/docs/api):
  every class and function.
