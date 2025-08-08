import {
  createImageNameSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  ParticleEmitter,
  ParticleEmitterSystem,
  ParticleUpdateSystem,
  registerCamera,
  registerInputs,
  registerRendering,
  registerSpriteAnimationManager,
  SpriteAnimationSystem,
} from '../../src';
import { AgeSystem } from '../../src/animations/systems/age-system';
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

const shipSprite = await createImageNameSprite(
  'ship_spritesheet.png',
  imageCache,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const adventureSprite = await createImageNameSprite(
  'adventurer_spritesheet.png',
  imageCache,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const blueCircleSprite = await createImageNameSprite(
  'blue-circle.png',
  imageCache,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const starSprite = await createImageNameSprite(
  'star_small.png',
  imageCache,
  renderLayers[0],
  shaderStore,
  cameraEntity,
);

const attackParticleEmitter = new ParticleEmitter(starSprite, renderLayers[0], {
  speedRange: {
    min: 250,
    max: 300,
  },
  scaleRange: {
    min: 0.6,
    max: 1,
  },
  rotationSpeedRange: {
    min: -0.5,
    max: 0.5,
  },
  numParticlesRange: { min: 60, max: 80 },
  lifetimeSecondsRange: {
    min: 0.2,
    max: 0.3,
  },
  emitDurationSeconds: 0.3,
  lifetimeScaleReduction: 0,
});

const jumpParticleEmitter = new ParticleEmitter(
  blueCircleSprite,
  renderLayers[0],
  {
    speedRange: {
      min: 150,
      max: 200,
    },
    scaleRange: {
      min: 0.1,
      max: 0.1,
    },
    rotationRange: {
      min: 135,
      max: 225,
    },
    numParticlesRange: { min: 20, max: 30 },
    lifetimeSecondsRange: {
      min: 0.2,
      max: 0.4,
    },
    emitDurationSeconds: 0,
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
  new SpriteAnimationSystem(world.time, spriteAnimationManager),
  new ControlAdventurerSystem(inputsManager),
  new ParticleEmitterSystem(world),
  new ParticleUpdateSystem(world.time),
  new AgeSystem(world),
);

game.run();
