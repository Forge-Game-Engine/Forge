import {
  Axis1dAction,
  createCanvas,
  createImageSprite,
  createWorld,
  Game,
  MouseInputSource,
  PositionComponent,
  Rect,
  registerCamera,
  registerInputs,
  RenderLayerComponent,
  RenderSystem,
  ScaleComponent,
  SpriteComponent,
  Vector2,
} from '../../src';
import { createRenderContext } from '../../src/rendering/render-context';

export const game = new Game(document.getElementById('demo-container')!);
const world = createWorld('world', game);

const canvas = createCanvas('forge', game.container);

const renderContext = createRenderContext({ canvas });

const zoomInput = new Axis1dAction('zoom', 'game');

const { inputsManager } = registerInputs(world, {
  axis1dActions: [zoomInput],
});

const mouseInputSource = new MouseInputSource(inputsManager, game);

mouseInputSource.axis1dBindings.add({
  action: zoomInput,
  displayText: 'Zoom',
});

const leftCameraEntity = registerCamera(world, {
  zoomInput,
  scissorRect: new Rect(Vector2.zero, new Vector2(0.5, 1)),
});

const rightCameraEntity = registerCamera(world, {
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

const renderLayerComponent = new RenderLayerComponent();

for (let i = 0; i < 1000; i++) {
  const planetEntity = world.buildAndAddEntity('planet', [
    new SpriteComponent(planetSprite),
    new PositionComponent(0, 0),
    new ScaleComponent(0.1, 0.1),
  ]);

  renderLayerComponent.addEntity(planetSprite.renderable, planetEntity);
}

for (let i = 0; i < 1000; i++) {
  const shipEntity = world.buildAndAddEntity('ship', [
    new SpriteComponent(shipSprite),
    new PositionComponent(0, 0),
    new ScaleComponent(0.1, 0.1),
  ]);

  renderLayerComponent.addEntity(shipSprite.renderable, shipEntity);
}

world.buildAndAddEntity('foreground render layer', [renderLayerComponent]);

world.addSystem(new RenderSystem(renderContext));

game.run();
