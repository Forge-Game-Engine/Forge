import * as forge from '../../../src';

export async function createPerlinNoiseScene(
  game: forge.Game,
  gameContainer: HTMLElement,
  imageCache: forge.ImageCache,
) {
  const scene = new forge.Scene('title-screen');

  const layerService = new forge.LayerService();

  window.addEventListener('resize', () => {
    layerService.resizeAllLayers();
  });

  const world = new forge.World();

  const inputsEntity = new forge.Entity('inputs', [
    new forge.InputsComponent(),
  ]);

  const inputSystem = new forge.InputSystem(gameContainer);

  world.addEntity(inputsEntity);
  world.addSystem(inputSystem);

  const cameraEntity = new forge.Entity('world camera', [
    new forge.CameraComponent({ allowZooming: false, allowPanning: false }),
    new forge.PositionComponent(0, 0),
  ]);

  const cameraSystem = new forge.CameraSystem(inputsEntity, game.time);

  world.addEntity(cameraEntity);
  world.addSystem(cameraSystem);

  const foregroundRenderLayer = addRenderLayer(
    forge.DEFAULT_LAYERS.foreground,
    gameContainer,
    layerService,
    world,
    cameraEntity,
  );

  const foregroundBatcher = new forge.Entity('foreground renderable batcher', [
    new forge.RenderableBatchComponent(foregroundRenderLayer),
  ]);

  const foregroundBatchingSystem = new forge.SpriteBatchingSystem(
    foregroundBatcher,
  );

  world.addEntity(foregroundBatcher);
  world.addSystem(foregroundBatchingSystem);

  const material = new forge.GradientMaterial(
    foregroundRenderLayer.context,
    new forge.Vector2(window.innerWidth, window.innerHeight),
    await imageCache.getOrLoad('gradient.png'),
    new forge.Vector2(0.1, 0.8),
  );

  const renderable = new forge.Renderable(
    forge.createQuadGeometry(foregroundRenderLayer.context),
    material,
  );

  const sprite = new forge.Sprite({
    renderable,
    renderLayer: foregroundRenderLayer,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const bg = new forge.Entity('perlin', [
    new forge.PositionComponent(0, 0),
    new forge.SpriteComponent(sprite),
  ]);

  world.addEntity(bg);

  scene.registerUpdatable(world);
  scene.registerStoppable(world);

  return scene;
}

function addRenderLayer(
  layerName: string,
  gameContainer: HTMLElement,
  layerService: forge.LayerService,
  world: forge.World,
  cameraEntity: forge.Entity,
) {
  const canvas = forge.createCanvas(`$forge-layer-${layerName}`, gameContainer);
  const layer = new forge.ForgeRenderLayer(layerName, canvas);

  layerService.registerLayer(layer);

  const layerRenderSystem = new forge.RenderSystem({
    layer,
    cameraEntity,
  });

  world.addSystem(layerRenderSystem);

  return layer;
}
