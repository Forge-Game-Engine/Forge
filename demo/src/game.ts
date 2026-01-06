import {
  createGame,
  createImageSprite,
  createRenderEcsSystem,
  positionId,
  Random,
  Rect,
  registerCamera,
  spriteId,
  Vector2,
} from '../../src';
import { moveId } from './move-component';
import { createMoveEcsSystem } from './move-system';

enum RenderLayer {
  background = 1 << 0,
  default = 1 << 1,
  foreground = 1 << 2,
}

const { game, world, renderContext, time } = createGame('demo-container');

registerCamera(world, time, {
  scissorRect: new Rect(Vector2.zero, new Vector2(0.5, 1)),
  layerMask: RenderLayer.default | RenderLayer.foreground,
});

const planetSprite = await createImageSprite(
  'planet.png',
  renderContext,
  RenderLayer.foreground,
);
const rand = new Random();

const planetEntity = world.createEntity();

world.addComponent(planetEntity, positionId, {
  world: Vector2.zero,
  local: Vector2.zero,
});

world.addComponent(planetEntity, spriteId, {
  sprite: planetSprite,
  enabled: true,
});

world.addComponent(planetEntity, moveId, {
  center: new Vector2(
    rand.randomInt(-window.innerWidth / 2, window.innerWidth / 2),
    rand.randomInt(-window.innerHeight / 2, window.innerHeight / 2),
  ),
  amount: 100,
  offset: 0,
});

let x = 0;
const batch = 1000;

setInterval(() => {
  console.log(`fps: ${time.fps} - entities: ${x}`);

  for (let i = 0; i < batch; i++) {
    const planetEntity = world.createEntity();

    world.addComponent(planetEntity, positionId, {
      world: Vector2.zero,
      local: Vector2.zero,
    });

    world.addComponent(planetEntity, spriteId, {
      sprite: planetSprite,
      enabled: true,
    });

    world.addComponent(planetEntity, moveId, {
      center: new Vector2(
        rand.randomInt(-window.innerWidth / 2, window.innerWidth / 2),
        rand.randomInt(-window.innerHeight / 2, window.innerHeight / 2),
      ),
      amount: rand.randomInt(50, 150),
      offset: rand.randomInt(0, 360),
    });
  }

  x += batch;
}, 1000);

world.addSystem(createMoveEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));

game.run();
