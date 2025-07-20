import {
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageAnimationSystem,
  ImageCache,
} from '../../src';
import { setupAnimationsDemo, setupAnimationsStressTest } from './animationDemo';
import { ControlAdventurerSystem } from './control-adventurer-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const { world, renderLayers, cameraEntity, animationManager, inputsEntity } =
  createWorld('world', game, {
    camera: {
      allowZooming: false,
      allowPanning: false,
    },
  });

const shipSpriteSheet = await imageCache.getOrLoad('ship_spritesheet.png');
const adventurerSpriteSheet = await imageCache.getOrLoad(
  'adventurer_spritesheet.png',
);

const shipSprite = createImageSprite(
  shipSpriteSheet,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const adventureSprite = createImageSprite(
  adventurerSpriteSheet,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

// The controllable character on the right runs with 'a' or 'd', jumps with 'w', and attacks with 'space'.
// setupAnimationsDemo(animationManager, world, shipSprite, adventureSprite);
setupAnimationsStressTest(animationManager, world, shipSprite, 10000);

world.addSystems(
  new ImageAnimationSystem(world.time, animationManager),
  new ControlAdventurerSystem(inputsEntity),
);

game.run();
