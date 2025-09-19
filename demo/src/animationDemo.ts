import {
  actionResetTypes,
  AnimationController,
  AnimationInputs,
  AnimationNumberCondition,
  AnimationTextCondition,
  AnimationToggleCondition,
  AnimationTransition,
  Axis1dAction,
  Axis2dAction,
  buttonMoments,
  createAnimation,
  DEFAULT_ANIMATION_STATES,
  Entity,
  FlipComponent,
  Game,
  KeyboardAxis1dBinding,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  MouseAxis2dBinding,
  MouseInputSource,
  ParticleEmitter,
  ParticleEmitterComponent,
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
import { ADVENTURER_ANIMATIONS, SHIP_ANIMATIONS } from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export function setupAnimationsDemo(
  world: World,
  game: Game,
  shipSprite: Sprite,
  adventurerSprite: Sprite,
  attackParticleEmitter: ParticleEmitter,
  jumpParticleEmitter: ParticleEmitter,
) {
  const inputs = setupInputs(world, game);

  const ShipController = createShipAnimationController();
  buildShipEntities(world, shipSprite, ShipController);

  const controller = createAdventurerControllableController();
  const animationInputs = createAdventurerControllableInputs();
  buildAdventurerControllableEntities(
    world,
    adventurerSprite,
    attackParticleEmitter,
    jumpParticleEmitter,
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
    [
      0.1, 0.1, 0.1, 0.5, 0.5, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
      0.1, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1,
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    ],
  );

  const shipSpinAnimation = createAnimation(SHIP_ANIMATIONS.spin, 6, 6, 0.1);

  const animationController = new AnimationController(
    new AnimationTransition(
      [DEFAULT_ANIMATION_STATES.entry],
      shipSpinAnimation,
      [],
    ),
    new AnimationTransition(
      [shipSpinAnimation.name],
      shipSpinRandomAnimation,
      [],
    ),
    new AnimationTransition(
      [shipSpinRandomAnimation.name],
      shipSpinAnimation,
      [],
    ),
  );

  return animationController;
}

function createAdventurerControllableController() {
  // **** Create Callbacks ****
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

  const runMovement = (xChange: number, yChange: number, entity: Entity) => {
    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );
    const flipComponent = entity.getComponentRequired<FlipComponent>(
      FlipComponent.symbol,
    );
    positionComponent.x += xChange * (flipComponent.flipX ? -1 : 1);
    positionComponent.y += yChange;
  };

  // **** Create Animations ****

  // create idle animation
  const idle = createAnimation(ADVENTURER_ANIMATIONS.idle, 1, 13, 0.1, {
    endPositionPercentage: new Vector2(1, 1 / 8),
  });

  // create run animation and callback
  const run = createAnimation(ADVENTURER_ANIMATIONS.run, 1, 8, 0.1, {
    startPositionPercentage: new Vector2(0, 1 / 8),
    endPositionPercentage: new Vector2(8 / 13, 2 / 8),
  });

  run.onAnimationFrameChangeEvent.registerListener(
    ({ entity, animationFrame }) => {
      const frameIndex = animationFrame.frameIndex;
      const upOrDown = frameIndex % 4 === 1 ? -5 : 5;
      const yChange = frameIndex % 2 === 0 ? 0 : upOrDown;
      runMovement(5, yChange, entity);
    },
  );

  // create attack1 animations and callbacks
  const attack1 = createAnimation(ADVENTURER_ANIMATIONS.attack1, 1, 10, 0.1, {
    startPositionPercentage: new Vector2(0, 2 / 8),
    endPositionPercentage: new Vector2(10 / 13, 3 / 8),
  });

  attack1.onAnimationFrameChangeEvent.registerListener(
    ({ entity, animationFrame }) => {
      if (animationFrame.frameIndex === 2) {
        attackParticles(-60, -30)(entity);
      }
    },
  );

  // create attack2 animation and callbacks
  const attack2 = createAnimation(ADVENTURER_ANIMATIONS.attack2, 1, 10, 0.1, {
    startPositionPercentage: new Vector2(0, 3 / 8),
    endPositionPercentage: new Vector2(10 / 13, 4 / 8),
  });

  attack2.onAnimationFrameChangeEvent.registerListener(
    ({ entity, animationFrame }) => {
      if (animationFrame.frameIndex === 0) {
        attackParticles(60, 30)(entity);
      }
    },
  );

  // create attack3 animation and callbacks
  const attack3 = createAnimation(ADVENTURER_ANIMATIONS.attack3, 1, 10, 0.1, {
    startPositionPercentage: new Vector2(0, 4 / 8),
    endPositionPercentage: new Vector2(10 / 13, 5 / 8),
  });

  attack3.onAnimationFrameChangeEvent.registerListener(
    ({ entity, animationFrame }) => {
      if (animationFrame.frameIndex === 2) {
        attackParticles(0, 0)(entity);
      }
    },
  );

  // create jump animation and callbacks
  const jump = createAnimation(ADVENTURER_ANIMATIONS.jump, 1, 6, 0.1, {
    startPositionPercentage: new Vector2(0, 5 / 8),
    endPositionPercentage: new Vector2(6 / 13, 6 / 8),
  });
  jump.onAnimationStartEvent.registerListener(jumpParticles);
  jump.onAnimationEndEvent.registerListener(jumpParticles);

  // create animation conditions
  const runCondition = new AnimationToggleCondition('run');
  const attackCondition = new AnimationTextCondition(
    'attack',
    'startsWith',
    'attack',
  ); // if my input starts with "attack"
  const jumpCondition = new AnimationToggleCondition('jump');
  const maxHealthCondition = new AnimationNumberCondition(
    'health',
    'greaterThanOrEqual',
    100,
  );
  const midHealthCondition = new AnimationNumberCondition(
    'health',
    'greaterThanOrEqual',
    50,
  );

  const runToAttackTransition = new AnimationTransition([run.name], attack1, [
    attackCondition,
  ]);

  // create animation controller and transitions
  const controller = new AnimationController(
    // at any time we can jump
    new AnimationTransition(
      [DEFAULT_ANIMATION_STATES.any],
      jump,
      [jumpCondition],
      { finishCurrentAnimationBeforeTransitioning: false }, // we can interrupt any animation to jump
    ),
    // we can run or attack from idle, jump, or run
    new AnimationTransition([idle.name, jump.name], run, [runCondition]),
    new AnimationTransition([idle.name, jump.name], attack1, [attackCondition]),
    runToAttackTransition,
    // attacks follow other attacks if we have enough health...
    new AnimationTransition(
      [attack1.name],
      attack2,
      [midHealthCondition],
      { conditionMustBeTrueAtTheEndOfTheAnimation: true }, // the health must be enough at the end of the animation
    ),
    new AnimationTransition([attack2.name], attack3, [maxHealthCondition], {
      conditionMustBeTrueAtTheEndOfTheAnimation: true,
    }),
    // ...if not, it goes to run, then idle
    new AnimationTransition([attack1.name, attack2.name, attack3.name], run, [
      runCondition,
    ]),
    new AnimationTransition(
      [attack1.name, attack2.name, attack3.name],
      idle,
      [],
    ),
    // after a jump, we can go to idle. Because this has no conditions, it must be last (or it would take priority over the run and attack transitions from jump)
    new AnimationTransition(
      [DEFAULT_ANIMATION_STATES.entry, jump.name],
      idle,
      [],
    ),
  );

  return controller;
}

function createAdventurerControllableInputs() {
  const animationInputs = new AnimationInputs();
  animationInputs.registerToggle('jump', {
    resetOnFrameEnd: true,
  }); // should reset every frame
  animationInputs.registerToggle('run', {
    resetOnFrameEnd: true,
  });
  animationInputs.registerText('attack', {
    resetOnFrameEnd: true,
  });
  animationInputs.registerNumber('health', {
    defaultValue: 100,
  });

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
