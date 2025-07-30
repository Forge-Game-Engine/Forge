import {
  buttonMoments,
  Entity,
  FlipComponent,
  InputGroup,
  InputManager,
  KeyboardInputSource,
  KeyboardTriggerInteraction,
  keyCodes,
  PositionComponent,
  ScaleComponent,
  Sprite,
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
import {
  ImageAnimationComponent,
  ParticleEmitter,
  ParticleEmitterComponent,
  SpriteAnimationManager,
} from '../../src/animations';
import { ControlAdventurerComponent } from './control-adventurer-component';

export function setupAnimationsDemo(
  animationManager: SpriteAnimationManager,
  world: World,
  shipSprite: Sprite,
  adventurerSprite: Sprite,
  inputsManager: InputManager,
  attackParticleEmitter: ParticleEmitter,
  jumpParticleEmitter: ParticleEmitter,
) {
  setupInputs(inputsManager);
  //left column
  createShipAnimationSets(animationManager);
  buildShipEntities(world, shipSprite);

  //middle column
  createAdventurerAnimationSets(animationManager);
  buildAdventurerEntities(world, adventurerSprite);

  //right column
  createAdventurerControllableAnimationSets(animationManager);
  buildAdventurerControllableEntities(
    world,
    adventurerSprite,
    attackParticleEmitter,
    jumpParticleEmitter,
  );
}

export function setupAnimationsStressTest(
  spriteAnimationManager: SpriteAnimationManager,
  world: World,
  shipSprite: Sprite,
  repeats: number,
) {
  //left column
  createShipAnimationSets(spriteAnimationManager);
  buildShipEntitiesMultiple(world, shipSprite, repeats);
}

function setupInputs(inputsManager: InputManager) {
  const defaultInputGroup = new InputGroup('default');

  const keyboardInputSource = new KeyboardInputSource(inputsManager);

  const attackInput = new TriggerAction('attack');
  const runRInput = new TriggerAction('runR');
  const runLInput = new TriggerAction('runL');
  const jumpInput = new TriggerAction('jump');

  inputsManager.addSources(keyboardInputSource);
  inputsManager.addActions(attackInput, runRInput, runLInput, jumpInput);
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
}

function createShipAnimationSets(animationManager: SpriteAnimationManager) {
  animationManager.createAnimationSet(
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
  animationManager.createAnimationSet(
    ENTITY_TYPES.ship,
    SHIP_ANIMATIONS.spin,
    6,
    6,
    0.1,
  );
}

function createAdventurerAnimationSets(
  animationManager: SpriteAnimationManager,
) {
  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.idle,
    1,
    13,
    0.1,
    {
      endPositionPercentage: new Vector2(1, 1 / 8),
    },
  );

  animationManager.createAnimationSet(
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

  animationManager.createAnimationSet(
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

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.attack1,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 2 / 8),
      endPositionPercentage: new Vector2(10 / 13, 3 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.attack2, // next animation after this one
    },
  );
  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.attack2,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 3 / 8),
      endPositionPercentage: new Vector2(10 / 13, 4 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.attack1, // cycle back to the first animation
    },
  );
  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.attack3,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 4 / 8),
      endPositionPercentage: new Vector2(10 / 13, 5 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.jump, // go to jump after attacking
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.jump,
    1,
    6,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 5 / 8),
      endPositionPercentage: new Vector2(6 / 13, 6 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.damage, // go to damage after jumping
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.damage,
    1,
    4,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 6 / 8),
      endPositionPercentage: new Vector2(4 / 13, 7 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.attack3, // go to attack3 after damaging
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurer,
    ADVENTURER_ANIMATIONS.die,
    1,
    7,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 7 / 8),
      endPositionPercentage: new Vector2(7 / 13, 1),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.idle, // go back to idle after dying
    },
  );
}

function createAdventurerControllableAnimationSets(
  animationManager: SpriteAnimationManager,
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
        rotation: {
          min: flipComponent.flipX ? -rotationAdd - 120 : rotationAdd + 60,
          max: flipComponent.flipX ? -rotationAdd - 60 : rotationAdd + 120,
        },
        positionX: () =>
          positionComponent.x +
          (flipComponent.flipX ? -1 : 1) *
            (30 +
              (20 * emitter?.currentEmitDuration) /
                emitter?.emitDurationSeconds),
        positionY: () =>
          positionComponent.y +
          20 +
          (heightChange * emitter?.currentEmitDuration) /
            emitter?.emitDurationSeconds,
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
      positionX: () => positionComponent.x - 15 + Math.random() * 30,
      positionY: () => positionComponent.y + 70,
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

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.idle,
    1,
    13,
    0.1,
    {
      endPositionPercentage: new Vector2(1, 1 / 8),
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.run,
    1,
    8,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 1 / 8),
      endPositionPercentage: new Vector2(8 / 13, 2 / 8),
      // Create a callback for each of the 8 frames
      animationCallbacks: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
        percentage: i / 7,
        callback: runMovement(5, 0),
      })),
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.attack1,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 2 / 8),
      endPositionPercentage: new Vector2(10 / 13, 3 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.attack2,
      animationCallbacks: [
        {
          percentage: 0.2,
          callback: attackParticles(-60, -30),
        },
      ],
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.attack2,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 3 / 8),
      endPositionPercentage: new Vector2(10 / 13, 4 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.attack3,
      animationCallbacks: [
        {
          percentage: 0,
          callback: attackParticles(60, 30),
        },
      ],
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.attack3,
    1,
    10,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 4 / 8),
      endPositionPercentage: new Vector2(10 / 13, 5 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.idle,
      animationCallbacks: [
        {
          percentage: 0.2,
          callback: attackParticles(0, 0),
        },
      ],
    },
  );

  animationManager.createAnimationSet(
    ENTITY_TYPES.adventurerControllable,
    ADVENTURER_ANIMATIONS.jump,
    1,
    6,
    0.1,
    {
      startPositionPercentage: new Vector2(0, 5 / 8),
      endPositionPercentage: new Vector2(6 / 13, 6 / 8),
      nextAnimationSetName: ADVENTURER_ANIMATIONS.idle,
      animationCallbacks: [
        {
          percentage: 0,
          callback: jumpParticles,
        },
        {
          percentage: 1,
          callback: jumpParticles,
        },
      ],
    },
  );
}

function buildShipEntities(world: World, shipSprite: Sprite) {
  world.buildAndAddEntity('ship-animation-spin', [
    new PositionComponent(-500, -150),
    new SpriteComponent(shipSprite),
    new ScaleComponent(0.5, 0.5),
    new ImageAnimationComponent(ENTITY_TYPES.ship, SHIP_ANIMATIONS.spin),
  ]);
  world.buildAndAddEntity('ship-animation-spin-random', [
    new PositionComponent(-500, 150),
    new SpriteComponent(shipSprite),
    new ScaleComponent(0.5, 0.5),
    new ImageAnimationComponent(ENTITY_TYPES.ship, SHIP_ANIMATIONS.spinRandom),
  ]);
}

function buildShipEntitiesMultiple(
  world: World,
  shipSprite: Sprite,
  repeats: number,
) {
  for (let i = 0; i < repeats; i++) {
    world.buildAndAddEntity('ship-animation-spin', [
      new PositionComponent(
        Math.random() * 1000 - 500,
        Math.random() * 1000 - 500,
      ),
      new SpriteComponent(shipSprite),
      new ScaleComponent(0.5, 0.5),
      new ImageAnimationComponent(ENTITY_TYPES.ship, SHIP_ANIMATIONS.spin, {
        animationSpeedFactor: 1 + Math.random() * 2,
      }),
      new FlipComponent(Math.random() < 0.5),
    ]);
  }
}

function buildAdventurerEntities(world: World, adventurerSprite: Sprite) {
  world.buildAndAddEntity('adventurer-animation-idle', [
    new PositionComponent(-200, -200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new ImageAnimationComponent(
      ENTITY_TYPES.adventurer,
      ADVENTURER_ANIMATIONS.idle,
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-idle-half', [
    new PositionComponent(-200, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new ImageAnimationComponent(
      ENTITY_TYPES.adventurer,
      ADVENTURER_ANIMATIONS.idleHalf,
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-run', [
    new PositionComponent(-200, 200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new ImageAnimationComponent(
      ENTITY_TYPES.adventurer,
      ADVENTURER_ANIMATIONS.run,
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-attack1', [
    new PositionComponent(0, -200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new ImageAnimationComponent(
      ENTITY_TYPES.adventurer,
      ADVENTURER_ANIMATIONS.attack1,
      {
        animationSpeedFactor: 4,
      },
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-attack3', [
    new PositionComponent(0, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new ImageAnimationComponent(
      ENTITY_TYPES.adventurer,
      ADVENTURER_ANIMATIONS.attack3,
    ),
  ]);

  world.buildAndAddEntity('adventurer-animation-die', [
    new PositionComponent(0, 200),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new ImageAnimationComponent(
      ENTITY_TYPES.adventurer,
      ADVENTURER_ANIMATIONS.die,
    ),
  ]);
}

function buildAdventurerControllableEntities(
  world: World,
  adventurerSprite: Sprite,
  attackParticleEmitter: ParticleEmitter,
  jumpParticleEmitter: ParticleEmitter,
) {
  world.buildAndAddEntity('adventurer-controllable', [
    new PositionComponent(400, 0),
    new SpriteComponent(adventurerSprite),
    new ScaleComponent(0.3, 0.6),
    new ImageAnimationComponent(
      ENTITY_TYPES.adventurerControllable,
      ADVENTURER_ANIMATIONS.idle,
    ),
    new ControlAdventurerComponent(),
    new FlipComponent(),
    new ParticleEmitterComponent([
      {
        name: 'attack',
        emitter: attackParticleEmitter,
      },
      {
        name: 'jump',
        emitter: jumpParticleEmitter,
      },
    ]),
  ]);
}
