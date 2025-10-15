import {
  createImageNameSprite,
  createShaderStore,
  createWorld,
  Entity,
  Game,
  ImageCache,
  LifetimeComponent,
  LifetimeTrackingSystem,
  ObjectPool,
  PositionComponent,
  registerCamera,
  registerRendering,
  RemoveFromWorldLifecycleSystem,
  ReturnToPoolLifecycleSystem,
  ReturnToPoolStrategyComponent,
  SpriteComponent,
} from '../../src';

export const game = new Game(document.getElementById('demo-container')!);

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);

const cameraEntity = registerCamera(world, {});
const { renderLayers } = registerRendering(game, world);

const blueCircleSprite = await createImageNameSprite(
  'blue-circle.png',
  imageCache,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const pool = new ObjectPool<Entity>({
  createCallback: (): Entity =>
    world.buildAndAddEntity('blue-circle', [
      new PositionComponent(0, 0),
      new SpriteComponent(blueCircleSprite),
      new LifetimeComponent(1),
      new ReturnToPoolStrategyComponent(pool),
    ]),
  disposeCallback: (entity: Entity) => {
    entity.enabled = false;
  },
  hydrateCallback: (entity: Entity) => {
    entity.enabled = true;
    const lifetimeComponent = entity.getComponentRequired<LifetimeComponent>(
      LifetimeComponent.symbol,
    );
    lifetimeComponent.reset(1);
  },
});

setInterval(() => {
  pool.getOrCreate();
}, 500);

world.addSystems(
  new LifetimeTrackingSystem(world),
  new RemoveFromWorldLifecycleSystem(world),
  new ReturnToPoolLifecycleSystem(),
);

game.run();
