import {
  Axis1dAction,
  createGame,
  createImageSprite,
  MouseAxis1dBinding,
  MouseInputSource,
  PositionComponent,
  Rect,
  registerCamera,
  registerInputs,
  RenderLayer,
  RenderLayerComponent,
  RenderSystem,
  ScaleComponent,
  SpriteComponent,
  Vector2,
} from '../../src';

const { game, world, renderContext, time } = createGame('demo-container');

const zoomInput = new Axis1dAction('zoom');

const { inputsManager } = registerInputs(world, time, {
  axis1dActions: [zoomInput],
});

const mouseInputSource = new MouseInputSource(inputsManager, game);

mouseInputSource.axis1dBindings.add(new MouseAxis1dBinding(zoomInput));

const leftCameraEntity = registerCamera(world, time, {
  zoomInput,
  scissorRect: new Rect(Vector2.zero, new Vector2(0.5, 1)),
});

const rightCameraEntity = registerCamera(world, time, {
  zoomInput,
  scissorRect: new Rect(new Vector2(0.5, 0), new Vector2(0.5, 1)),
});

const planetSprite = await createImageSprite(
  'planet.png',
  renderContext,
  leftCameraEntity,
);

const shipSprite = await createImageSprite(
  'planet02.png',
  renderContext,
  rightCameraEntity,
);

const renderLayer = new RenderLayer();

for (let i = 0; i < 1000; i++) {
  const planetEntity = world.buildAndAddEntity([
    new SpriteComponent(planetSprite),
    new PositionComponent(0, 0),
    new ScaleComponent(0.1, 0.1),
  ]);

  renderLayer.addEntity(planetSprite.renderable, planetEntity);
}

for (let i = 0; i < 1000; i++) {
  const shipEntity = world.buildAndAddEntity([
    new SpriteComponent(shipSprite),
    new PositionComponent(0, 0),
    new ScaleComponent(0.1, 0.1),
  ]);

  renderLayer.addEntity(shipSprite.renderable, shipEntity);
}

world.buildAndAddEntity([new RenderLayerComponent(renderLayer)]);

world.addSystem(new RenderSystem(renderContext));

game.run();
