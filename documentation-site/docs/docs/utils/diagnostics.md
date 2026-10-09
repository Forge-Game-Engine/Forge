# Diagnostics

[`Diagnostics`](/Forge/docs/api/classes/Diagnostics) is the one channel the
engine reports warnings and errors through when they don't stop the
caller: a condition the engine works around, such as a geometry attribute a
shader doesn't read, or a failure in an asynchronous task. A game listens
to it to send them to its own logging or telemetry.

## The diagnostic

Each report is a [`ForgeDiagnostic`](/Forge/docs/api/interfaces/ForgeDiagnostic):

- `code`: a stable identifier for the kind of problem, such as
  `'geometry-attribute-not-found'`, to route or filter by.
- `severity`: `'warning'` (something the engine worked around) or `'error'`
  (something that failed).
- `message`: a human-readable description.
- `entity`, `assetUrl` or `label` (optional): what the problem is about.

## Getting the game's diagnostics

[`createGame`](/Forge/docs/api/functions/createGame) creates one
`Diagnostics` and passes it to the world and the render context, and
returns it:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';

const { diagnostics, world, renderContext } = createGame('game');

world.diagnostics === diagnostics; // true
renderContext.diagnostics === diagnostics; // true
```

A world or render context created without one creates its own.

## Listening to warnings and errors

`onWarning` and `onError` are events raised with each diagnostic:

```ts
diagnostics.onWarning.registerListener((diagnostic) => {
  telemetry.send('warning', diagnostic.code, diagnostic.message);
});

diagnostics.onError.registerListener((diagnostic) => {
  telemetry.send('error', diagnostic.code, diagnostic.message);
});
```

While nothing listens to one of them, its diagnostics are written to the
console instead (`console.warn` or `console.error`).

## Reporting from your own code

Systems and services report through the same channel with `warn` and
`error`:

```ts
world.diagnostics.warn({
  code: 'enemy-without-path',
  message: `Enemy ${entity} has no path to the player.`,
  entity,
});
```

Each diagnostic is raised once per `code` and key (its `entity`, `assetUrl`
and `label`), so a condition that recurs every frame reports once, and the
same problem on another entity reports again.
