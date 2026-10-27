# @forge-game-engine/create

Creates a new game project for [Forge](https://forge-game-engine.github.io/Forge/), a browser-based, code-only game engine. It copies a starter project into a new directory, names its `package.json` after the directory, makes it depend on the matching `@forge-game-engine/forge` release, and prints the commands to install and run it.

```bash
npm create @forge-game-engine@latest my-game
```

`pnpm create @forge-game-engine`, `yarn create @forge-game-engine` and `bun create @forge-game-engine` work too. Leave out the directory to be asked for one (the default is `forge-game`), or pass `.` to create the project in the current directory.
