import {
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageAnimationSystem,
  ImageCache,
  registerCamera,
  registerInputs,
  registerRendering,
  registerSpriteAnimationManager,
} from '../../src';
import * as animationDemo from './animationDemo';
import { ControlAdventurerSystem } from './control-adventurer-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);
const { inputsManager } = registerInputs(world);
const cameraEntity = registerCamera(world, {});
const spriteAnimationManager = registerSpriteAnimationManager();
const { renderLayers } = registerRendering(game, world, spriteAnimationManager);

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
animationDemo.setupAnimationsDemo(
  spriteAnimationManager,
  world,
  shipSprite,
  adventureSprite,
  inputsManager,
);
// animationDemo.setupAnimationsStressTest(animationManager, world, shipSprite, 10000);

world.addSystems(
  new ImageAnimationSystem(world.time, spriteAnimationManager),
  new ControlAdventurerSystem(inputsManager),
);

game.run();
