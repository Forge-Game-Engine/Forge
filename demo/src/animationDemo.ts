import {
  actionResetTypes,
  AnimationClip,
  AnimationExitTimeCondition,
  AnimationInputs,
  AnimationToggleCondition,
  AnimationTriggerCondition,
  Axis1dAction,
  Axis2dAction,
  buttonMoments,
  createAnimation,
  FlipComponent,
  Game,
  KeyboardAxis1dBinding,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  MouseAxis2dBinding,
  MouseInputSource,
  PositionComponent,
  registerInputs,
  ScaleComponent,
  Sprite,
  SpriteAnimationComponent,
  SpriteComponent,
  TriggerAction,
  Vector2,
  World,
} from '../../src';
import { FiniteStateMachine } from '../../src/finite-state-machine/finite-state-machine';
import { Transition } from '../../src/finite-state-machine/transition';
import { ADVENTURER_ANIMATIONS, SHIP_ANIMATIONS } from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export function setupAnimationsDemo(
  world: World,
  game: Game,
  shipSprite: Sprite,
  adventurerSprite: Sprite,
): ReturnType<typeof setupInputs> {
  const inputs = setupInputs(world, game);

  const ShipController = createShipAnimationController();
  buildShipEntities(world, shipSprite, ShipController);

  const controller = createAdventurerControllableController();
  const animationInputs = createAdventurerControllableInputs();
  buildAdventurerControllableEntities(
    world,
    adventurerSprite,
    controller,
    animationInputs,
  );

  return inputs;
}

function setupInputs(world: World, game: Game) {
  const gameInputGroup = 'game';

  const attackInput = new TriggerAction('attack', gameInputGroup);
  const runRInput = new TriggerAction('runR', gameInputGroup);
  const runLInput = new TriggerAction('runL', gameInputGroup);
  const jumpInput = new TriggerAction('jump', gameInputGroup);
  const takeDamageInput = new TriggerAction('takeDamage', gameInputGroup);
  const axis2dInput = new Axis2dAction(
    'move',
    gameInputGroup,
    actionResetTypes.noReset,
  );

  const axis1dInput = new Axis1dAction(
    'move1',
    gameInputGroup,
    actionResetTypes.noReset,
  );

  const { inputsManager } = registerInputs(world, {
    triggerActions: [
      attackInput,
      runRInput,
      runLInput,
      jumpInput,
      takeDamageInput,
    ],
    axis2dActions: [axis2dInput],
    axis1dActions: [axis1dInput],
  });

  inputsManager.setActiveGroup(gameInputGroup);

  const keyboardInputSource = new KeyboardInputSource(inputsManager);
  const mouseInputSource = new MouseInputSource(inputsManager, game);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      axis2dInput,
      keyCodes.w,
      keyCodes.s,
      keyCodes.d,
      keyCodes.a,
    ),
  );

  mouseInputSource.axis2dBindings.add(
    new MouseAxis2dBinding(axis2dInput, {
      cursorOrigin: new Vector2(0.25, 0.25),
    }),
  );

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(axis1dInput, keyCodes.k, keyCodes.l),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(attackInput, keyCodes.space, buttonMoments.down),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(runRInput, keyCodes.d, buttonMoments.down),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(runLInput, keyCodes.a, buttonMoments.down),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(jumpInput, keyCodes.w, buttonMoments.down),
  );

  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(takeDamageInput, keyCodes.p, buttonMoments.down),
  );

  return {
    inputsManager,
    attackInput,
    runRInput,
    runLInput,
    jumpInput,
    takeDamageInput,
    axis2dInput,
    axis1dInput,
  };
}

function createShipAnimationController() {
  const shipSpinRandomAnimation = createAnimation(
    SHIP_ANIMATIONS.spinRandom,
    6,
    6,
  );

  const shipSpinAnimation = createAnimation(SHIP_ANIMATIONS.spin, 6, 6);

  const stateMachine = new FiniteStateMachine<AnimationInputs, AnimationClip>([
    shipSpinAnimation,
    shipSpinRandomAnimation,
  ]);

  return stateMachine;
}

function createAdventurerControllableController() {
  // create idle animation
  const idle = createAnimation(ADVENTURER_ANIMATIONS.idle, 1, 13, {
    endPositionPercentage: new Vector2(1, 1 / 8),
  });

  // create run animation and callback
  const run = createAnimation(ADVENTURER_ANIMATIONS.run, 1, 8, {
    startPositionPercentage: new Vector2(0, 1 / 8),
    endPositionPercentage: new Vector2(8 / 13, 2 / 8),
  });

  // create jump animation and callbacks
  const jump = createAnimation(ADVENTURER_ANIMATIONS.jump, 1, 6, {
    startPositionPercentage: new Vector2(0, 5 / 8),
    endPositionPercentage: new Vector2(6 / 13, 6 / 8),
  });

  // create animation conditions
  const runCondition = new AnimationToggleCondition('run');
  const jumpCondition = new AnimationTriggerCondition('jump');

  const fullExitTimeCondition = new AnimationExitTimeCondition(
    'animationClipPlaybackPercentage',
  );

  // create animation controller and transitions
  const stateMachine = new FiniteStateMachine<AnimationInputs, AnimationClip>([
    idle,
    run,
    jump,
  ]);

  stateMachine.addTransition(
    idle,
    run,
    new Transition((input) => runCondition.satisfies(input)),
  );

  stateMachine.addTransition(
    idle,
    jump,
    new Transition((input) => jumpCondition.satisfies(input)),
  );

  stateMachine.addTransition(
    jump,
    idle,
    new Transition((input) => fullExitTimeCondition.satisfies(input)),
  );
  stateMachine.addTransition(
    run,
    idle,
    new Transition((input) => fullExitTimeCondition.satisfies(input)),
  );

  return stateMachine;
}

function createAdventurerControllableInputs() {
  const animationInputs = new AnimationInputs();
  animationInputs.registerTrigger('jump');
  animationInputs.registerToggle('run');
  animationInputs.registerText('attack');
  animationInputs.registerNumber('health', 100);

  return animationInputs;
}

function buildShipEntities( 
  world: World,
  shipSprite: Sprite,
  stateMachine: FiniteStateMachine<AnimationInputs, AnimationClip>,
) {
  const animationInputs = new AnimationInputs();

  world.buildAndAddEntity('ship-animation-spin', [
    new PositionComponent(-500, -150),
    new SpriteComponent(shipSprite),
    new ScaleComponent(0.5, 0.5),
    new SpriteAnimationComponent(stateMachine, animationInputs),
  ]);
}

function buildAdventurerControllableEntities(
  world: World,
  adventurerSprite: Sprite,
  stateMachine: FiniteStateMachine<AnimationInputs, AnimationClip>,
  animationInputs: AnimationInputs,
) {
  world.buildAndAddEntity('adventurer-controllable', [
    new PositionComponent(400, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(stateMachine, animationInputs, 33.3333, 0.3),
    new ControlAdventurerComponent(),
    new FlipComponent(),
  ]);
}
