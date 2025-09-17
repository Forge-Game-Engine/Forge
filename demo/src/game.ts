import {
  AgeScaleSystem,
  AgeSystem,
  createImageNameSprite,
  createShaderStore,
  createWorld,
  Game,
  ImageCache,
  ParticleEmitter,
  ParticleEmitterComponent,
  ParticleEmitterSystem,
  ParticlePositionSystem,
  registerAnimationSetManager,
  registerCamera,
  registerRendering,
  SpriteAnimationSystem,
} from '../../src';
import * as animationDemo from './animationDemo';
import { ControlAdventurerSystem } from './control-adventurer-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);

const cameraEntity = registerCamera(world, {});
const animationSetManager = registerAnimationSetManager();
const { renderLayers } = registerRendering(game, world);

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

const smileEmitter = new ParticleEmitter(starSprite, renderLayers[0], {
  speedRange: {
    min: 80,
    max: 200,
  },
  rotationRange: {
    min: 180,
    max: 180,
  },
  numParticlesRange: { min: 200, max: 200 },
  lifetimeSecondsRange: {
    min: 1,
    max: 8,
  },
  emitDurationSeconds: 2,
  lifetimeScaleReduction: 0,
});

world.buildAndAddEntity('smile', [
  new ParticleEmitterComponent(new Map([['smile', smileEmitter]])),
]);

smileEmitter.setOptions({
  spawnPosition: () => {
    const point =
      (smileEmitter.currentEmitDuration ?? 0) /
      smileEmitter.emitDurationSeconds;

    const x = point * 1200 - 600;
    const y = x ** 2 * 0.003 - x ** 4 * 0.1 ** 8;

    return { x, y };
  },
});

setTimeout(() => {
  smileEmitter.emit();
}, 1000);

// The controllable character on the right runs with 'a' or 'd', jumps with 'w', and attacks with 'space'.
const { attackInput, jumpInput, runLInput, runRInput } =
  animationDemo.setupAnimationsDemo(
    animationSetManager,
    world,
    shipSprite,
    adventureSprite,
    attackParticleEmitter,
    jumpParticleEmitter,
  );

world.addSystems(
  new SpriteAnimationSystem(world.time, animationSetManager),
  new ControlAdventurerSystem(
    attackInput,
    runRInput,
    runLInput,
    jumpInput,
    animationSetManager,
  ),
  new ParticleEmitterSystem(world),
  new ParticlePositionSystem(world.time),
  new AgeSystem(world),
  new AgeScaleSystem(),
);

game.run();
