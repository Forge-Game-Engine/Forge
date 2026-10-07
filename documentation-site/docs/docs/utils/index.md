# Utilities

The `@forge-game-engine/forge/utilities` module holds the code that sets up
a game on a web page, and general-purpose helpers the rest of the engine is
built on.

The module is made of:

- The game loop: [`Game`](/Forge/docs/api/classes/Game) updates a `Time` and
  one or more worlds every animation frame, and
  [`createGame`](/Forge/docs/api/functions/createGame) creates a `Game`, a
  world, a `Time` and a render context in one call (see
  [Game](../ecs/game.md)).
- [Page containers](./create-container.md):
  [`createContainer`](/Forge/docs/api/functions/createContainer) adds the
  element a game's canvas is placed in, and
  [`createContainerResizeSync`](/Forge/docs/api/functions/createContainerResizeSync)
  resizes render contexts when that element changes size.
- General-purpose helpers, documented in the API reference:
  - type checks: [`isNumber`](/Forge/docs/api/functions/isNumber),
    [`isString`](/Forge/docs/api/functions/isString) and
    [`assertNever`](/Forge/docs/api/functions/assertNever);
  - arrays and bit masks:
    [`enforceArray`](/Forge/docs/api/functions/enforceArray),
    [`shallowArraysEqual`](/Forge/docs/api/functions/shallowArraysEqual) and
    [`matchesMask`](/Forge/docs/api/functions/matchesMask);
  - data structures: [`SparseSet`](/Forge/docs/api/classes/SparseSet),
    [`DirectedAcyclicGraph`](/Forge/docs/api/classes/DirectedAcyclicGraph)
    and [`Chain`](/Forge/docs/api/classes/Chain), a sequence of functions run
    in order on a value;
  - types: [`AtLeastOne`](/Forge/docs/api/type-aliases/AtLeastOne),
    [`Brand`](/Forge/docs/api/type-aliases/Brand),
    [`Predicate`](/Forge/docs/api/type-aliases/Predicate) and
    [`AsyncPredicate`](/Forge/docs/api/type-aliases/AsyncPredicate).
