import {
  addPositionComponent,
  createAgeScaleEcsSystem,
  createTransformEcsSystem,
  PositionEcsComponent,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '../../../src/lifecycle/index.js';
import {
  degreesToRadians,
  Random,
  Vec2,
  Vector2,
} from '../../../src/math/index.js';
import {
  addParticleEmitterComponent,
  createParticleEcsSystem,
  createParticleOpacityEcsSystem,
  createParticlePositionEcsSystem,
  ParticleEmitter,
  ParticleId,
} from '../../../src/particles/index.js';
import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createImageSprite,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  RenderContext,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';
import { drawSoftCircle, drawStar } from './stress-scene-textures.js';

const defaultStepDeltaMilliseconds = 16.6666;

const renderLayers = {
  foreground: 1 << 0,
};

const verticalWorldUnits = 600;

// Height, in world units, up from the bottom edge of the view that the
// ember fountain sits at.
const fountainHeightFromBottom = verticalWorldUnits * 0.12;

const emberColor = new Color(1, 0.55, 0.15);
const emberConeSpread = degreesToRadians(20);
const sparkColor = new Color(1, 0.85, 0.3);
const smokeColor = new Color(0.55, 0.55, 0.6);
const smokeConeSpread = degreesToRadians(45);
const smokeParticlesPerSecond = 30;

// The docs-site demo drives the cursor's effects with the mouse: a press
// fires a spark burst and starts the smoke trail, and dragging moves both.
// Here the cursor circles the view with its smoke trail on, firing a burst
// every second, so every frame does the same work without input events.
const cursorOrbitRadius = 150;
const cursorOrbitSeconds = 4;
const framesBetweenSparkBursts = 60;

/**
 * Creates a fountain of embers that streams upward from a fixed point,
 * slowing as it rises, then fading away, forever.
 */
function createEmberFountain(
  world: EcsWorld,
  renderContext: RenderContext,
  position: Vector2,
): void {
  const emberSprite = {
    ...createImageSprite(
      createTexture(renderContext, drawSoftCircle(64, 0.6)),
      {
        pixelsPerUnit: 1,
      },
    ),
    category: renderLayers.foreground,
  };

  emberSprite.tintColor = emberColor;

  const emberEmitter = new ParticleEmitter(emberSprite, {
    emissionRate: 40,
    spawnShape: { type: 'box', width: 30, height: 0 },
    speedRange: { min: 160, max: 260 },
    // Math.PI / 2 points straight up, so this sprays a narrow upward cone.
    directionRange: {
      min: Math.PI / 2 - emberConeSpread,
      max: Math.PI / 2 + emberConeSpread,
    },
    drag: 0.5,
    scaleRange: { min: 0.04, max: 0.1 },
    lifetimeSecondsRange: { min: 1.2, max: 2 },
    lifetimeScaleReduction: 0,
    lifetimeOpacity: { start: 1, end: 0 },
  });

  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: Vec2.clone(position) });
  addParticleEmitterComponent(world, entity, {
    emitters: new Map([['embers', emberEmitter]]),
  });
}

interface CursorEffects {
  position: PositionEcsComponent;
  sparkEmitter: ParticleEmitter;
}

/**
 * Creates the cursor: one entity with two emitters, a spark burst and a
 * smoke trail, that both spawn around its position.
 */
function createCursorEffects(
  world: EcsWorld,
  renderContext: RenderContext,
): CursorEffects {
  const sparkSprite = {
    ...createImageSprite(createTexture(renderContext, drawStar(64)), {
      pixelsPerUnit: 1,
    }),
    category: renderLayers.foreground,
  };

  sparkSprite.tintColor = sparkColor;

  const smokeSprite = {
    ...createImageSprite(createTexture(renderContext, drawSoftCircle(128, 0)), {
      pixelsPerUnit: 1,
    }),
    category: renderLayers.foreground,
  };

  smokeSprite.tintColor = smokeColor;

  // Sparks fly outward from a small ring around the cursor, slow down
  // quickly with drag, and fall under gravity as they fade out.
  const sparkEmitter = new ParticleEmitter(sparkSprite, {
    numParticlesRange: { min: 24, max: 36 },
    spawnShape: { type: 'ring', radius: 10 },
    emitOutward: true,
    speedRange: { min: 300, max: 600 },
    drag: 0.05,
    acceleration: { x: 0, y: -400 },
    scaleRange: { min: 0.1, max: 0.26 },
    rotationRange: { min: 0, max: Math.PI * 2 },
    rotationSpeedRange: { min: -4, max: 4 },
    lifetimeSecondsRange: { min: 0.4, max: 0.8 },
    lifetimeScaleReduction: 0.3,
    lifetimeOpacity: { start: 1, end: 0 },
  });

  // Smoke drifts upward, spreads out and grows as it fades.
  const smokeEmitter = new ParticleEmitter(smokeSprite, {
    emissionRate: smokeParticlesPerSecond,
    spawnShape: { type: 'circle', radius: 8 },
    speedRange: { min: 15, max: 35 },
    directionRange: {
      min: Math.PI / 2 - smokeConeSpread,
      max: Math.PI / 2 + smokeConeSpread,
    },
    acceleration: { x: 0, y: 40 },
    scaleRange: { min: 0.12, max: 0.22 },
    rotationRange: { min: 0, max: Math.PI * 2 },
    rotationSpeedRange: { min: -0.4, max: 0.4 },
    lifetimeSecondsRange: { min: 0.6, max: 1 },
    lifetimeScaleReduction: 2,
    lifetimeOpacity: { start: 0.8, end: 0 },
  });

  const entity = world.createEntity();
  const position = addPositionComponent(world, entity);

  addParticleEmitterComponent(world, entity, {
    emitters: new Map([
      ['spark', sparkEmitter],
      ['smoke', smokeEmitter],
    ]),
  });

  return { position, sparkEmitter };
}

/** The particle scene's handle. */
export interface ParticlesSceneHandle extends SceneHandle {
  /** How many particles are alive. */
  readonly particleCount: number;
}

/**
 * The docs site's particle demo: an ember fountain that runs on its own,
 * and a cursor with a spark burst and a smoke trail, here moved by the
 * scene instead of the mouse.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): ParticlesSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas);

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits,
  });

  const random = new Random();
  const cursor = createCursorEffects(world, renderContext);

  createEmberFountain(world, renderContext, {
    x: 0,
    y: -verticalWorldUnits / 2 + fountainHeightFromBottom,
  });

  world.addSystem(createParticleEcsSystem(time, random));
  world.addSystem(createParticlePositionEcsSystem(time));
  world.addSystem(createLifetimeTrackingEcsSystem(time));
  world.addSystem(createAgeScaleEcsSystem());
  world.addSystem(createParticleOpacityEcsSystem());
  world.addSystem(createRemoveFromWorldEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  // Particles (like every entity) only update their local transform, so the
  // transform system runs after every system above and before the render
  // system, resolving it to the world transform the renderer reads.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;
  let frame = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);

      const angle =
        (2 * Math.PI * clockInMilliseconds) / (cursorOrbitSeconds * 1000);

      // The transform system turns this into the world position the
      // emitters read.
      cursor.position.local.x = cursorOrbitRadius * Math.cos(angle);
      cursor.position.local.y = cursorOrbitRadius * Math.sin(angle);

      if (frame % framesBetweenSparkBursts === 0) {
        cursor.sparkEmitter.emit();
      }

      frame++;
      world.update();
    },

    get particleCount(): number {
      return world.query([ParticleId]).entities.length;
    },
  };
};
