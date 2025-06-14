---
sidebar_position: 1
---

# Game

When creating a game, we need to create an instance of the [Game](../../api/classes/Game.md) class.

The game instance is responsible for hosting [worlds](../ecs/world.md) and the main [game loop](https://gamedev.stackexchange.com/questions/651/what-should-a-main-game-loop-do).

## Creating a game instance

Generally you will only have one single game instance, although you can have more.

The constructor accepts an [HTMLDivElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDivElement) or string as an optional argument. If one is not provided, a new div is appended to the document with an id of `forge-demo-game`.

```ts
// new div appended with id "forge-demo-game"
const game = new Game();

// new div appended with id "game-container"
const game = new Game('game-container');

// use existing element
const myCustomElement = createContainer('bring-your-own-element');
const game = new Game(myCustomElement);
```

## World management

### Adding a world

You can add a world to your game by using the [registerWorld](../../api/classes/Game.md#registerworld) method.

```ts
const world = new World('home-town');

game.registerWorld(world);
```

:::tip 

If you're using the [`createWorld`](../../api/functions/createWorld.md) utility, it will automatically add the world to your game.

:::

You can register multiple worlds in a single game. It is common to only use one world.

### Removing a world

You can remove a world from your game by using the [deregisterWorld](../../api/classes/Game.md#deregisterworld) method.

```ts
const world = new World('home-town');

game.registerWorld(world);
... 
// later based on some event (e.g. clicking the "exit to main menu" button)
game.deregisterWorld(world);
```

### Swapping a world

You might find that you often want to deregister a world and register a new one. You could do these using the methods described above, or you could use the [swapToWorld](../../api/classes/Game.md#swaptoworld)

```ts
const homeTownWorld = new World('home-town');
const arenaWorld = new World('arena');

game.registerWorld(homeTownWorld);
...
game.swapToWorld(arenaWorld); // This will deregister the "home-town" world and register the "arena" world
```

:::info

The [swapToWorld](../../api/classes/Game.md#swaptoworld) method will deregister **all** currently registered worlds on a game.

:::

## Game life cycles

### Running the game

Once you have added your worlds, you can start the game loop by calling the [`run`](../../api/classes/Game.md#run) method.

```ts
const game = new Game();

const world = new World('home-town');
game.registerWorld(world);

game.run();
```

### Stopping the game

You can stop the game by calling the [`stop`](../../api/classes/Game.md#stop) which is an implementation of the [`Stoppable`](../../api/interfaces/Stoppable.md) interface.

```ts
const game = new Game();

...

game.run();
...
game.stop(); // also stops all worlds
```

## Handling a window resize

When creating a game, a new [`ForgeEvent`](../../api/classes/ForgeEvent.md) is created that gets raised when the window resizes. 

```ts
const game = new Game();

game.onWindowResize.registerListener(() => {
  console.log('window resized!');
})
```
