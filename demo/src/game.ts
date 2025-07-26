import {
  createImageRenderable,
  createImageSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageAnimationSystem,
  ImageCache,
  ParticleEmitter,
  ParticleManagerSystem,
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

const blueCircleRenderable = await createImageRenderable(
  'blue-circle.png',
  imageCache,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const starRenderable = await createImageRenderable(
  'star_small.png',
  imageCache,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const attackParticleEmitter = new ParticleEmitter(
  starRenderable,
  renderLayers[0],
  {
    speed: {
      min: 250,
      max: 300,
    },
    scale: {
      min: 3,
      max: 5,
    },
    rotationSpeed: {
      min: -0.5,
      max: 0.5,
    },
    numParticles: { min: 20, max: 30 },
    lifetime: {
      min: 0.1,
      max: 0.2,
    },
    emitDuration: 0.1,
    lifetimeScaleReduction: 0,
  },
);

const jumpParticleEmitter = new ParticleEmitter(
  blueCircleRenderable,
  renderLayers[0],
  {
    speed: {
      min: 150,
      max: 200,
    },
    scale: {
      min: 2,
      max: 2,
    },
    rotation: {
      min: (3 * Math.PI) / 4,
      max: (5 * Math.PI) / 4,
    },
    numParticles: { min: 20, max: 30 },
    lifetime: {
      min: 0.2,
      max: 0.4,
    },
    emitDuration: 0,
  },
);

// The controllable character on the right runs with 'a' or 'd', jumps with 'w', and attacks with 'space'.
animationDemo.setupAnimationsDemo(
  spriteAnimationManager,
  world,
  shipSprite,
  adventureSprite,
  inputsManager,
  attackParticleEmitter,
  jumpParticleEmitter,
);
// animationDemo.setupAnimationsStressTest(spriteAnimationManager, world, shipSprite, 10000);

world.addSystems(
  new ImageAnimationSystem(world.time, spriteAnimationManager),
  new ControlAdventurerSystem(inputsManager),
  new ParticleManagerSystem(world.time),
);

game.run();
