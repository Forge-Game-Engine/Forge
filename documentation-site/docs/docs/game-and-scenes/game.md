---
sidebar_position: 1
---

# Game

When creating a game, we need to create an instance of the [Game](../../api/classes/Game.md) class.

The game instance is responsible for hosting [scenes](../game/scene.md), the [time](../common/time.md) instance, and the main [game loop](https://gamedev.stackexchange.com/questions/651/what-should-a-main-game-loop-do).

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

## Time instance

To get the [time](../common/time.md) instance, you can use the [time accessor](../../api/classes/Game.md#time).

```ts
const game = new Game();
...
position.x = speed * game.time.deltaTime;
```

## Scene management

### Adding a scene

You can add a scene to your game by using the [registerScene](../../api/classes/Game.md#registerscene) method.

```ts
const scene = new Scene('home-town');

// or using the createScene utility
const { scene } = createScene('home-town', game);

game.registerScene(scene);
```

You can register multiple scenes at once as a way to compose your game.

### Removing a scene

You can remove a scene to your game by using the [deregisterScene](../../api/classes/Game.md#deregisterscene) method.

```ts
const scene = new Scene(name);

// or using the createScene utility
const { scene } = createScene('home-town', game);

game.registerScene(scene);
... 
// later based on some event (e.g. clicking the "exit to main menu" button)
game.deregisterScene(scene);
```

### Swapping a scene

You might find that you often want to deregister a scene and register a new one. You could do these using the methods described above, or you could use the [swapToScene](../../api/classes/Game.md#swaptoscene)

```ts
const { scene: homeTownScene } = createScene('home-town', game);
const { scene: arenaScene } = createScene('arena', game);

game.registerScene(homeTownScene);
...
game.swapToScene(arenaScene); // This will deregister the "home-town" scene and register the "arena" scene
```

:::info

The [swapToScene](../../api/classes/Game.md#swaptoscene) method will deregister **all** currently registered scenes on a game.

:::

## Game life cycles

### Running the game

Once you have added your scenes, you can start the game loop by calling the [`run`](../../api/classes/Game.md#run) method.

```ts
const game = new Game();

const { scene } = createScene('home-town', game);
game.registerScene(scene);

game.run();
```

### Stopping the game

You can stop the game by calling the [`stop`](../../api/classes/Game.md#stop) which is an implementation of the [`Stoppable`](../../api/interfaces/Stoppable.md) interface.

```ts
const game = new Game();

const { scene } = createScene('home-town', game);
game.registerScene(scene);

game.run();
...
game.stop(); // also stops all scenes
```

## Handling a window resize

When creating a game, a new [`ForgeEvent`](../../api/classes/ForgeEvent.md) is created that gets raised when the window resizes. 

```ts
const game = new Game();

game.onWindowResize.registerListener(() => {
  console.log('window resized!');
})
```
