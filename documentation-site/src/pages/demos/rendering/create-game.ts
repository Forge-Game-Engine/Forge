import { ImageCache } from '@forge-game-engine/forge/asset-loading';
import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  Time,
} from '@forge-game-engine/forge/common';
import {
  createWorld,
  Game,
  registerCamera,
  registerInputs,
  registerRendering,
} from '@forge-game-engine/forge/ecs';
import { Axis1dAction, MouseInputSource } from '@forge-game-engine/forge/input';
import { Random } from '@forge-game-engine/forge/math';
import {
  createImageSprite,
  createShaderStore,
  SpriteComponent,
} from '@forge-game-engine/forge/rendering';
import { getImageUrl } from '@site/src/utils/get-image-url';

export const createGame = async (): Promise<Game> => {
  const game = new Game(document.getElementById('demo-game'));

  const imageCache = new ImageCache();
  const shaderStore = createShaderStore();

  const world = createWorld('world', game);

  const zoomInput = new Axis1dAction('zoom', 'game');

  const { inputsManager } = registerInputs(world, {
    axis1dActions: [zoomInput],
  });

  const mouseInputSource = new MouseInputSource(inputsManager, game);

  mouseInputSource.axis1dBindings.add({
    action: zoomInput,
    displayText: 'Zoom',
  });

  const cameraEntity = registerCamera(world, {
    zoomInput,
    maxZoom: 50,
  });

  const { renderLayers } = registerRendering(game, world);

  const shipImage = await imageCache.getOrLoad(getImageUrl('star_medium.png'));

  const shipSprite = createImageSprite(
    shipImage,
    renderLayers[0],
    shaderStore,
    cameraEntity,
  );

  const random = new Random();

  const margin = 100;
  const halfWidth = (game.container.clientWidth - margin) / 2;
  const halfHeight = (game.container.clientHeight - margin) / 2;

  for (let i = 0; i < 8_000; i++) {
    const scale = random.randomFloat(0.01, 0.1);

    world.buildAndAddEntity(`star ${i}`, [
      new PositionComponent(
        random.randomInt(-halfWidth, halfWidth),
        random.randomInt(-halfHeight, halfHeight),
      ),
      new RotationComponent(random.randomFloat(0, Math.PI * 2)),
      new ScaleComponent(scale, scale),
      new SpriteComponent(shipSprite),
    ]);
  }

  return game;
};
