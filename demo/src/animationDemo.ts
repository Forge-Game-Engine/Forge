import {
  AnimationController,
  AnimationInputs,
  buttonMoments,
  createAnimation,
  DEFAULT_ANIMATION_STATES,
  Entity,
  FlipComponent,
  InputGroup,
  InputManager,
  KeyboardInputSource,
  KeyboardTriggerInteraction,
  keyCodes,
  ParticleEmitter,
  ParameterizedForgeEvent,
  PositionComponent,
  ScaleComponent,
  Sprite,
  SpriteComponent,
  TriggerAction,
  ParticleEmitterComponent,
  SpriteAnimationComponent,
  AnimationTransition,
  World,
  Vector2,
  AnimationCondition,
} from '../../src';
import {
  ADVENTURER_ANIMATIONS,
  ENTITY_TYPES,
  SHIP_ANIMATIONS,
} from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export function setupAnimationsDemo(
  world: World,
  shipSprite: Sprite,
  adventurerSprite: Sprite,
  inputsManager: InputManager,
  attackParticleEmitter: ParticleEmitter,
  jumpParticleEmitter: ParticleEmitter,
) {
  setupInputs(inputsManager);

  // const ShipController = createShipAnimationController();
  // buildShipEntities(world, shipSprite, ShipController);

  const controller = createAdventurerControllableController();
  const inputs = createAdventurerControllableInputs();
  buildAdventurerControllableEntities(
    world,
    adventurerSprite,
    attackParticleEmitter,
    jumpParticleEmitter,
    controller,
    inputs,
  );
}

function setupInputs(inputsManager: InputManager) {
  const defaultInputGroup = new InputGroup('default');

  const keyboardInputSource = new KeyboardInputSource(inputsManager);

  const attackInput = new TriggerAction('attack');
  const runRInput = new TriggerAction('runR');
  const runLInput = new TriggerAction('runL');
  const jumpInput = new TriggerAction('jump');
  const takeDamageInput = new TriggerAction('takeDamage');

  inputsManager.addSources(keyboardInputSource);
  inputsManager.addActions(
    attackInput,
    runRInput,
    runLInput,
    jumpInput,
    takeDamageInput,
  );
  inputsManager.setActiveGroup(defaultInputGroup);

  attackInput.bind(
    new KeyboardTriggerInteraction(
      { keyCode: keyCodes.space, moment: buttonMoments.down },
      keyboardInputSource,
    ),
    defaultInputGroup,
  );

  runRInput.bind(
    new KeyboardTriggerInteraction(
      { keyCode: keyCodes.d, moment: buttonMoments.down },
      keyboardInputSource,
    ),
    defaultInputGroup,
  );

  runLInput.bind(
    new KeyboardTriggerInteraction(
      { keyCode: keyCodes.a, moment: buttonMoments.down },
      keyboardInputSource,
    ),
    defaultInputGroup,
  );

  jumpInput.bind(
    new KeyboardTriggerInteraction(
      { keyCode: keyCodes.w, moment: buttonMoments.down },
      keyboardInputSource,
    ),
    defaultInputGroup,
  );

  takeDamageInput.bind(
    new KeyboardTriggerInteraction(
      { keyCode: keyCodes.p, moment: buttonMoments.down },
      keyboardInputSource,
    ),
    defaultInputGroup,
  );
}

function createShipAnimationController() {
  const shipSpinRandomAnimation = createAnimation(
    SHIP_ANIMATIONS.spinRandom,
    6,
    6,
    [
      0.1, 0.1, 0.1, 0.5, 0.5, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
      0.1, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1,
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    ],
  );

  const shipSpinAnimation = createAnimation(SHIP_ANIMATIONS.spin, 6, 6, 0.1);

  const animationController = new AnimationController(
    new AnimationTransition(
      DEFAULT_ANIMATION_STATES.entry,
      shipSpinAnimation,
      [],
    ),
    new AnimationTransition(
      shipSpinAnimation.name,
      shipSpinRandomAnimation,
      [],
    ),
    new AnimationTransition(
      shipSpinRandomAnimation.name,
      shipSpinAnimation,
      [],
    ),
  );

  return animationController;
}

function createAdventurerControllableController() {
  const attackParticles =
    (rotationAdd: number, heightChange: number) => (entity: Entity) => {
      const positionComponent = entity.getComponentRequired<PositionComponent>(
        PositionComponent.symbol,
      );
      const flipComponent = entity.getComponentRequired<FlipComponent>(
        FlipComponent.symbol,
      );
      const emitter = entity
        .getComponentRequired<ParticleEmitterComponent>(
          ParticleEmitterComponent.symbol,
        )
        .emitters.get('attack');

      emitter?.setOptions({
        rotationRange: {
          min: flipComponent.flipX ? -rotationAdd - 120 : rotationAdd + 60,
          max: flipComponent.flipX ? -rotationAdd - 60 : rotationAdd + 120,
        },
        spawnPosition: () => {
          const x =
            positionComponent.x +
            (flipComponent.flipX ? -1 : 1) *
              (30 +
                (20 * emitter?.currentEmitDuration) /
                  emitter?.emitDurationSeconds);
          const y =
            positionComponent.y +
            20 +
            (heightChange * emitter?.currentEmitDuration) /
              emitter?.emitDurationSeconds;

          return { x, y };
        },
      });
      emitter?.emit();
    };

  const jumpParticles = (entity: Entity) => {
    // Emit particles when the jump animation starts
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const emitter = entity
      .getComponentRequired<ParticleEmitterComponent>(
        ParticleEmitterComponent.symbol,
      )
      .emitters.get('jump');
    emitter?.setOptions({
      spawnPosition: () => {
        return {
          x: positionComponent.x - 15 + Math.random() * 30,
          y: positionComponent.y + 70,
        };
      },
    });
    emitter?.emitIfNotEmitting();
  };

  const runMovement =
    (xChange: number, yChange: number) => (entity: Entity) => {
      const positionComponent = entity.getComponentRequired<PositionComponent>(
        PositionComponent.symbol,
      );
      const flipComponent = entity.getComponentRequired<FlipComponent>(
        FlipComponent.symbol,
      );
      positionComponent.x += xChange * (flipComponent.flipX ? -1 : 1);
      positionComponent.y += yChange;
    };

  const idle = createAnimation(ADVENTURER_ANIMATIONS.idle, 1, 13, 0.1, {
    endPositionPercentage: new Vector2(1, 1 / 8),
  });

  // const runMovementAnimationEvents: AnimationEventData = new Map();
  // [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => {
  //   const event = new ParameterizedForgeEvent<Entity>('run');

  //   event.registerListener(runMovement(5, 0));
  //   runMovementAnimationEvents.set(i, event);
  // });

  const run = createAnimation(ADVENTURER_ANIMATIONS.run, 1, 8, 0.1, {
    startPositionPercentage: new Vector2(0, 1 / 8),
    endPositionPercentage: new Vector2(8 / 13, 2 / 8),
    // Create a callback for each of the 8 frames
    // animationEvents: runMovementAnimationEvents,
  });

  // const attackEvent1 = new ParameterizedForgeEvent<Entity>('attack1');
  // attackEvent1.registerListener(attackParticles(-60, -30));

  const attack1 = createAnimation(ADVENTURER_ANIMATIONS.attack1, 1, 10, 0.1, {
    startPositionPercentage: new Vector2(0, 2 / 8),
    endPositionPercentage: new Vector2(10 / 13, 3 / 8),
    // animationEvents: new Map([[2, attackEvent1]]),
  });

  // const attackEvent2 = new ParameterizedForgeEvent<Entity>('attack2');
  // attackEvent2.registerListener(attackParticles(60, 30));

  const attack2 = createAnimation(ADVENTURER_ANIMATIONS.attack2, 1, 10, 0.1, {
    startPositionPercentage: new Vector2(0, 3 / 8),
    endPositionPercentage: new Vector2(10 / 13, 4 / 8),
    // animationEvents: new Map([[0, attackEvent2]]),
  });

  // const attackEvent3 = new ParameterizedForgeEvent<Entity>('attack3');
  // attackEvent3.registerListener(attackParticles(0, 0));

  const attack3 = createAnimation(ADVENTURER_ANIMATIONS.attack3, 1, 10, 0.1, {
    startPositionPercentage: new Vector2(0, 4 / 8),
    endPositionPercentage: new Vector2(10 / 13, 5 / 8),
    // animationEvents: new Map([[2, attackEvent3]]),
  });

  // const jumpEvent = new ParameterizedForgeEvent<Entity>('jump');
  // jumpEvent.registerListener(jumpParticles);

  const jump = createAnimation(ADVENTURER_ANIMATIONS.jump, 1, 6, 0.1, {
    startPositionPercentage: new Vector2(0, 5 / 8),
    endPositionPercentage: new Vector2(6 / 13, 6 / 8),
    // animationEvents: new Map([
    //   [0, jumpEvent],
    //   [5, jumpEvent],
    // ]),
  });

  const runCondition = new AnimationCondition('run', 'boolean');
  const attackCondition = new AnimationCondition('attack', 'string', 'attack');
  const jumpCondition = new AnimationCondition('jump', 'boolean');
  const maxHealthCondition = new AnimationCondition(
    'health',
    'number',
    100,
    '>=',
  );
  const midHealthCondition = new AnimationCondition(
    'health',
    'number',
    50,
    '>=',
  );

  const controller = new AnimationController(
    new AnimationTransition(DEFAULT_ANIMATION_STATES.entry, idle, []),
    // at any time we can jump
    new AnimationTransition(
      DEFAULT_ANIMATION_STATES.any,
      jump,
      [jumpCondition],
      { finishCurrentAnimationBeforeTransitioning: false }, // we can interrupt any animation to jump
    ),
    // we can run or attack from idle, jump, or run
    new AnimationTransition(idle.name, run, [runCondition]),
    new AnimationTransition(idle.name, attack1, [attackCondition]),
    new AnimationTransition(jump.name, run, [runCondition]),
    new AnimationTransition(jump.name, attack1, [attackCondition]),
    new AnimationTransition(run.name, attack1, [attackCondition]),
    // attacks follow other attacks if we have enough health...
    new AnimationTransition(
      attack1.name,
      attack2,
      [midHealthCondition],
      // { conditionMustBeTrueAtTheEndOfTheAnimation: true }, // the health must be enough at the end of the animation
    ),
    new AnimationTransition(attack2.name, attack3, [maxHealthCondition], {
      // conditionMustBeTrueAtTheEndOfTheAnimation: true,
    }),
    // ...if not, it goes to run, then idle
    new AnimationTransition(attack1.name, run, [runCondition]),
    new AnimationTransition(attack2.name, run, [runCondition]),
    new AnimationTransition(attack3.name, run, [runCondition]),
    new AnimationTransition(attack1.name, idle, []),
    new AnimationTransition(attack2.name, idle, []),
    new AnimationTransition(attack3.name, idle, []),
    // after a jump, we can go to idle. Because this has no conditions, it must be last (or it would take priority over the run and attack transitions from jump)
    new AnimationTransition(jump.name, idle, []),
  );

  return controller;
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
  animationController: AnimationController,
) {
  const animationInputs = new AnimationInputs();
  world.buildAndAddEntity('ship-animation-spin', [
    new PositionComponent(-500, -150),
    new SpriteComponent(shipSprite),
    new ScaleComponent(0.5, 0.5),
    new SpriteAnimationComponent(animationController, animationInputs),
  ]);
}

function buildAdventurerControllableEntities(
  world: World,
  adventurerSprite: Sprite,
  attackParticleEmitter: ParticleEmitter,
  jumpParticleEmitter: ParticleEmitter,
  animationController: AnimationController,
  animationInputs: AnimationInputs,
) {
  world.buildAndAddEntity('adventurer-controllable', [
    new PositionComponent(400, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(animationController, animationInputs),
    new ControlAdventurerComponent(),
    new FlipComponent(),
    new ParticleEmitterComponent(
      new Map<string, ParticleEmitter>([
        ['attack', attackParticleEmitter],
        ['jump', jumpParticleEmitter],
      ]),
    ),
  ]);
}
