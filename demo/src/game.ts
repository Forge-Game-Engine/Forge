import {
  actionResetTypes,
  AgeScaleSystem,
  AgeSystem,
  Axis1dAction,
  Axis2dAction,
  buttonMoments,
  createImageNameSprite,
  createShaderStore,
  createWorld,
  Game,
  HoldAction,
  ImageCache,
  KeyboardHoldBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  MouseAxis1dBinding,
  mouseButtons,
  MouseInputSource,
  MouseTriggerBinding,
  ParticleEmitter,
  ParticleEmitterComponent,
  ParticleEmitterSystem,
  ParticlePositionSystem,
  registerAnimationSetManager,
  registerCamera,
  registerInputs,
  registerRendering,
  SpriteAnimationSystem,
  TriggerAction,
} from '../../src';
import * as animationDemo from './animationDemo';
import { ControlAdventurerSystem } from './control-adventurer-system';
import { FireSystem } from './fire-system';

export const game = new Game();

const imageCache = new ImageCache();
const shaderStore = createShaderStore();

const world = createWorld('world', game);

const gameInputGroup = 'game';

const zoomInput = new Axis1dAction(
  'zoom',
  gameInputGroup,
  actionResetTypes.zero,
);
const panInput = new Axis2dAction(
  'pan',
  gameInputGroup,
  actionResetTypes.noReset,
);
const fireAction = new TriggerAction('fire', gameInputGroup);
const runAction = new HoldAction('run', gameInputGroup);

const { inputsManager } = registerInputs(world, {
  triggerActions: [fireAction],
  axis1dActions: [zoomInput],
  axis2dActions: [panInput],
});

const keyboardInputSource = new KeyboardInputSource(inputsManager);
const mouseInputSource = new MouseInputSource(inputsManager, game);

inputsManager.setActiveGroup(gameInputGroup);

mouseInputSource.triggerBindings.add(
  new MouseTriggerBinding(fireAction, mouseButtons.left, buttonMoments.down),
);

keyboardInputSource.triggerBindings.add(
  new KeyboardTriggerBinding(fireAction, keyCodes.space, buttonMoments.down),
);

mouseInputSource.axis1dBindings.add(new MouseAxis1dBinding(zoomInput));

mouseInputSource.triggerBindings.add(
  new MouseTriggerBinding(fireAction, mouseButtons.left, buttonMoments.down),
);

keyboardInputSource.holdBindings.add(
  new KeyboardHoldBinding(runAction, keyCodes.shiftLeft),
);

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

world.addSystems(new FireSystem(fireAction, runAction));

zoomInput.valueChangeEvent.registerListener((value) => {
  console.log(value);
});

runAction.holdStartEvent.registerListener(() => {
  console.log('Starting run');
});

runAction.holdEndEvent.registerListener(() => {
  console.log('Ending run');
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
animationDemo.setupAnimationsDemo(
  animationSetManager,
  world,
  shipSprite,
  adventureSprite,
  inputsManager,
  attackParticleEmitter,
  jumpParticleEmitter,
);

world.addSystems(
  new SpriteAnimationSystem(world.time, animationSetManager),
  new ControlAdventurerSystem(inputsManager, animationSetManager),
  new ParticleEmitterSystem(world),
  new ParticlePositionSystem(world.time),
  new AgeSystem(world),
  new AgeScaleSystem(),
);

game.run();
