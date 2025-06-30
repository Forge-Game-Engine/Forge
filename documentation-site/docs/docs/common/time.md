---
sidebar_position: 1
---

# Time

The `Time` class manages and tracks time-related information for your ECS world. It is responsible for frame counting, delta time calculation, time scaling, and FPS measurement.

## Accessing Time

A `Time` instance is available on every `World` instance as the `time` property:

```ts
const world = new World('main');
const time = world.time;
```

## Milliseconds vs. seconds API

The `Time` instance provides a milliseconds and seconds API.

### Milliseconds API

- `rawTimeInMilliseconds`: The current raw time in milliseconds.
- `rawDeltaTimeInMilliseconds`: The time difference (delta) between the current and previous frame in milliseconds.
- `deltaTimeInMilliseconds`: The scaled delta time in milliseconds (affected by `timeScale`).
- `timeInMilliseconds`: The accumulated scaled time in milliseconds (affected by `timeScale`).
- `previousTimeInMilliseconds`: The raw time of the previous frame in milliseconds.

### Seconds API

- `rawTimeInSeconds`: The current raw time in seconds (not affected by `timeScale`).
- `rawDeltaTimeInSeconds`: The time difference (delta) between the current and previous frame in seconds (not affected by `timeScale`).
- `deltaTimeInSeconds`: The scaled delta time in seconds (affected by `timeScale`).
- `timeInSeconds`: The accumulated scaled time in seconds (affected by `timeScale`).
- `previousTimeInSeconds`: The raw time of the previous frame in seconds.

## Other Properties

- `frames`: The number of frames since the `Time` instance was created.
- `timeScale`: A multiplier for scaling the passage of time (e.g., for slow motion or pausing) (Default: 1).
- `fps`: The current frames per second, calculated as the number of frames in the last second.
- `times`: An array of timestamps (in milliseconds) for recent frames, used for FPS calculation.

## Examples

### Using deltaTime to make your game frame independent

If you have an entity (let's call it the "player") that you wanted to move at rate of 10 units per second on the x-axis. You wouldn't be able to simply add the speed to the position in a system. 
This would introduce 2 issues:

1) The entity would move 10 units per frame not per second. This is because the `run` method on the system executes *every frame*. That's way too fast!
2) The player's hardware (including the monitor's refresh rate) would cause the number of frames executed in a second (frames-per-second or FPS) to vary. Meaning that the entity would change speed as the FPS changes!

The solution is to use deltaTime (the time it took to render the last frame)

❌ You should not do this: 

```ts 
...
public void run(entity: Entity) {
  const positionComponent = entity.getComponentRequired<PositionComponent>(PositionComponent.symbol);
  const playerComponent = entity.getComponentRequired<PlayerComponent>(PlayerComponent.symbol);

  positionComponent.x += playerComponent.speed;
}
...
```

✅ The correct way would be to use the delta time to smooth the movement:

```ts
...
public void run(entity: Entity) {
  const positionComponent = entity.getComponentRequired<PositionComponent>(PositionComponent.symbol);
  const playerComponent = entity.getComponentRequired<PlayerComponent>(PlayerComponent.symbol);

  positionComponent.x += playerComponent.speed * time.deltaTimeInSeconds;
}
...
```

### Slow motion

You can achieve a slow motion effect by setting the `timeScale` to a number below `1`.

```ts
world.time.timeScale = 0.5;
```

### Pausing the world

You can implement features like a game pause menu by setting the `timeScale` to `0`.

```ts
world.time.timeScale = 0;
```


