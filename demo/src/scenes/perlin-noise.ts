import * as forge from '../../../src';

export async function createPerlinNoiseScene(
  game: forge.Game,
  gameContainer: HTMLElement,
  imageCache: forge.ImageCache,
  shaderStore: forge.ShaderStore,
) {
  const scene = new forge.Scene('title-screen');

  const layerService = new forge.LayerService();

  window.addEventListener('resize', () => {
    layerService.resizeAllLayers();
  });

  const world = new forge.World();

  const inputsEntity = world.buildAndAddEntity('inputs', [
    new forge.InputsComponent(),
  ]);

  const cameraEntity = world.buildAndAddEntity('world camera', [
    new forge.CameraComponent({ allowZooming: false, allowPanning: false }),
    new forge.PositionComponent(0, 0),
  ]);

  const inputSystem = new forge.InputSystem(
    gameContainer,
    cameraEntity,
    window.innerWidth,
    window.innerHeight,
  );

  const cameraSystem = new forge.CameraSystem(inputsEntity, game.time);

  world.addSystem(inputSystem);
  world.addSystem(cameraSystem);

  const foregroundRenderLayer = addRenderLayer(
    forge.DEFAULT_LAYERS.foreground,
    gameContainer,
    layerService,
    world,
    cameraEntity,
  );

  const foregroundBatcher = world.buildAndAddEntity(
    'foreground renderable batcher',
    [new forge.RenderableBatchComponent(foregroundRenderLayer)],
  );

  const foregroundBatchingSystem = new forge.SpriteBatchingSystem(
    foregroundBatcher,
  );

  world.addSystem(foregroundBatchingSystem);

  const material = new forge.GradientMaterial(
    foregroundRenderLayer.context,
    shaderStore,
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

  world.buildAndAddEntity('perlin', [
    new forge.PositionComponent(0, 0),
    new forge.SpriteComponent(sprite),
  ]);

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
