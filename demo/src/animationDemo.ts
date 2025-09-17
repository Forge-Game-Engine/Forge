import {
  AnimationEventData,
  AnimationSetManager,
  buttonMoments,
  Entity,
  FlipComponent,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  ParameterizedForgeEvent,
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
import {
  ADVENTURER_ANIMATIONS,
  ENTITY_TYPES,
  SHIP_ANIMATIONS,
} from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export function setupAnimationsDemo(
  animationSetManager: AnimationSetManager,
  world: World,
  shipSprite: Sprite,
  adventurerSprite: Sprite,
  attackParticleEmitter: ParticleEmitter,
  jumpParticleEmitter: ParticleEmitter,
) {
  const inputs = setupInputs(world);
  //left column
  createShipAnimations(animationSetManager);
  buildShipEntities(world, shipSprite, animationSetManager);

  //middle column
  createAdventurerAnimations(animationSetManager);
  buildAdventurerEntities(world, adventurerSprite, animationSetManager);

  //right column
  createAdventurerControllableAnimations(animationSetManager);
  buildAdventurerControllableEntities(
    world,
    adventurerSprite,
    attackParticleEmitter,
    jumpParticleEmitter,
    animationSetManager,
  );

  return inputs;
}

export function setupAnimationsStressTest(
  animationSetManager: AnimationSetManager,
  world: World,
  shipSprite: Sprite,
  repeats: number,
) {
  //left column
  createShipAnimations(animationSetManager);
  buildShipEntitiesMultiple(world, shipSprite, repeats, animationSetManager);
}

function setupInputs(world: World) {
  const gameInputGroup = 'game';

  const attackInput = new TriggerAction('attack', gameInputGroup);
  const runRInput = new TriggerAction('runR', gameInputGroup);
  const runLInput = new TriggerAction('runL', gameInputGroup);
  const jumpInput = new TriggerAction('jump', gameInputGroup);

  const { inputsManager } = registerInputs(world, {
    triggerActions: [attackInput, runRInput, runLInput, jumpInput],
  });

  inputsManager.setActiveGroup(gameInputGroup);

  const keyboardInputSource = new KeyboardInputSource(inputsManager);

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

  return {
    inputsManager,
    attackInput,
    runRInput,
    runLInput,
    jumpInput,
  };
}

function createShipAnimations(animationSetManager: AnimationSetManager) {
  animationSetManager.createAnimation(
    ENTITY_TYPES.ship,
    SHIP_ANIMATIONS.spinRandom,
    6,
    6,
    [
      1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
      0.1, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1,
      0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    ],
  );
  animationSetManager.createAnimation(
    ENTITY_TYPES.ship,
    SHIP_ANIMATIONS.spin,
    6,
    6,
    0.1,
  );
}

function createAdventurerAnimations(animationSetManager: AnimationSetManager) {
  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.idle,
    1,
    13,
    0.1,
    {
      endPositionPercentage: new Vector2(1, 1 / 8),
    },
  );

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.idleHalf,
    1,
    13,
    0.1,
    {
      endPositionPercentage: new Vector2(1, 1 / 8),
      numFrames: 6, // even though we are limiting this to 6 frames, the end position and sprites per row is still the same
    },
  );

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.run,
    1,
    8,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 1 / 8), // start at second row
      endPositionPercentage: new Vector2(8 / 13, 2 / 8), // end at the top end of the second row
      // the second row has 8 frames, with space for 13 frames, so we end at 8/13
    },
  );

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.attack1,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 2 / 8),
      endPositionPercentage: new Vector2(10 / 13, 3 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.attack2, // next animation after this one
    },
  );
  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.attack2,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 3 / 8),
      endPositionPercentage: new Vector2(10 / 13, 4 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.attack1, // cycle back to the first animation
    },
  );
  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.attack3,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 4 / 8),
      endPositionPercentage: new Vector2(10 / 13, 5 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.jump, // go to jump after attacking
    },
  );

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.jump,
    1,
    6,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 5 / 8),
      endPositionPercentage: new Vector2(6 / 13, 6 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.damage, // go to damage after jumping
    },
  );

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.damage,
    1,
    4,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 6 / 8),
      endPositionPercentage: new Vector2(4 / 13, 7 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.attack3, // go to attack3 after damaging
    },
  );

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.die,
    1,
    7,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 7 / 8),
      endPositionPercentage: new Vector2(7 / 13, 1),
      nextAnimationName: ADVENTURER_ANIMATIONS.idle, // go back to idle after dying
    },
  );
}

function createAdventurerControllableAnimations(
  animationSetManager: AnimationSetManager,
) {
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

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.idle,
    1,
    13,
    0.1,
    {
      endPositionPercentage: new Vector2(1, 1 / 8),
    },
  );

  const runMovementAnimationEvents: AnimationEventData = new Map();
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((i) => {
    const event = new ParameterizedForgeEvent<Entity>('run');

    event.registerListener(runMovement(5, 0));
    runMovementAnimationEvents.set(i, event);
  });

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.run,
    1,
    8,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 1 / 8),
      endPositionPercentage: new Vector2(8 / 13, 2 / 8),
      // Create a callback for each of the 8 frames
      animationEvents: runMovementAnimationEvents,
    },
  );

  const attackEvent1 = new ParameterizedForgeEvent<Entity>('attack1');
  attackEvent1.registerListener(attackParticles(-60, -30));

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.attack1,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 2 / 8),
      endPositionPercentage: new Vector2(10 / 13, 3 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.attack2,
      animationEvents: new Map([[2, attackEvent1]]),
    },
  );

  const attackEvent2 = new ParameterizedForgeEvent<Entity>('attack2');
  attackEvent2.registerListener(attackParticles(60, 30));

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.attack2,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 3 / 8),
      endPositionPercentage: new Vector2(10 / 13, 4 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.attack3,
      animationEvents: new Map([[0, attackEvent2]]),
    },
  );

  const attackEvent3 = new ParameterizedForgeEvent<Entity>('attack3');
  attackEvent3.registerListener(attackParticles(0, 0));

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.attack3,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 4 / 8),
      endPositionPercentage: new Vector2(10 / 13, 5 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.idle,
      animationEvents: new Map([[2, attackEvent3]]),
    },
  );

  const jumpEvent = new ParameterizedForgeEvent<Entity>('jump');
  jumpEvent.registerListener(jumpParticles);

  animationSetManager.createAnimation(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.jump,
    1,
    6,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 5 / 8),
      endPositionPercentage: new Vector2(6 / 13, 6 / 8),
      nextAnimationName: ADVENTURER_ANIMATIONS.idle,
      animationEvents: new Map([
        [0, jumpEvent],
        [5, jumpEvent],
      ]),
    },
  );
}

function buildShipEntities(
  world: World,
  shipSprite: Sprite,
  animationSetManager: AnimationSetManager,
) {
  world.buildAndAddEntity('ship-animation-spin', [
    new PositionComponent(-500, -150),
    new SpriteComponent(shipSprite),
    new ScaleComponent(0.5, 0.5),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(ENTITY_TYPES.ship, SHIP_ANIMATIONS.spin),
    ),
  ]);
  world.buildAndAddEntity('ship-animation-spin-random', [
    new PositionComponent(-500, 150),
    new SpriteComponent(shipSprite),
    new ScaleComponent(0.5, 0.5),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.ship,
        SHIP_ANIMATIONS.spinRandom,
      ),
    ),
  ]);
}

function buildShipEntitiesMultiple(
  world: World,
  shipSprite: Sprite,
  repeats: number,
  animationSetManager: AnimationSetManager,
) {
  for (let i = 0; i < repeats; i++) {
    world.buildAndAddEntity('ship-animation-spin', [
      new PositionComponent(
        Math.random() * 1000 - 500,
        Math.random() * 1000 - 500,
      ),
      new SpriteComponent(shipSprite),
      new ScaleComponent(0.5, 0.5),
      new SpriteAnimationComponent(
        animationSetManager.getAnimation(
          ENTITY_TYPES.ship,
          SHIP_ANIMATIONS.spin,
        ),
        {
          animationSpeedFactor: 1 + Math.random() * 2,
        },
      ),
      new FlipComponent(Math.random() < 0.5),
    ]);
  }
}

function buildAdventurerEntities(
  world: World,
  adventurerSprite: Sprite,
  animationSetManager: AnimationSetManager,
) {
  world.buildAndAddEntity('adventurer-animation-idle', [
    new PositionComponent(-200, -200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.adventurer,
        ADVENTURER_ANIMATIONS.idle,
      ),
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-idle-half', [
    new PositionComponent(-200, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.adventurer,
        ADVENTURER_ANIMATIONS.idleHalf,
      ),
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-run', [
    new PositionComponent(-200, 200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.adventurer,
        ADVENTURER_ANIMATIONS.run,
      ),
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-attack1', [
    new PositionComponent(0, -200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.adventurer,
        ADVENTURER_ANIMATIONS.attack1,
      ),
      {
        animationSpeedFactor: 4,
      },
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-attack3', [
    new PositionComponent(0, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.adventurer,
        ADVENTURER_ANIMATIONS.attack3,
      ),
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-die', [
    new PositionComponent(0, 200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.adventurer,
        ADVENTURER_ANIMATIONS.die,
      ),
    ),
  ]);
}

function buildAdventurerControllableEntities(
  world: World,
  adventurerSprite: Sprite,
  attackParticleEmitter: ParticleEmitter,
  jumpParticleEmitter: ParticleEmitter,
  animationSetManager: AnimationSetManager,
) {
  world.buildAndAddEntity('adventurer-controllable', [
    new PositionComponent(400, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new SpriteAnimationComponent(
      animationSetManager.getAnimation(
        ENTITY_TYPES.adventurerControllable,
        ADVENTURER_ANIMATIONS.idle,
      ),
    ),
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
