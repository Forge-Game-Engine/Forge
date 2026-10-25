import {
  addColliderComponent,
  addGravityComponent,
  addPositionComponent,
  addRigidBodyComponent,
  addRotationComponent,
  CircleCollider,
  CollisionManifold,
  CollisionPair,
  Color,
  ContactConstraint,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCamera,
  createCameraEcsSystem,
  createCanvas,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createImageSprite,
  createNarrowPhaseEcsSystem,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  EcsWorld,
  PolygonCollider,
  registerFixedUpdate,
  spriteId,
  Time,
} from '../../../src/index.js';
import {
  matchesColor,
  PixelBounds,
  scanPixelBounds,
} from './input-scene-helpers.js';
import { inputSceneColors } from './input-scene-colors.js';
import { CreateScene, SceneHandle } from './scene.js';

const ballRadius = 15;
const floorWidth = 400;
const floorHeight = 40;
const floorY = 200;
// The ball's bottom starts 200 px above the floor's top. Under 2000 px/s²
// it first lands after about 0.45 s, and is still bouncing at 0.5 s.
const ballStartY = floorY - floorHeight / 2 - 200 - ballRadius;
const gravity = 2000;
// A multiple of 1/128 ms, like every frame length the spec steps, so the
// clock and the fixed-step accumulator add up exactly.
const fixedDeltaTimeInMilliseconds = 1000 / 64;

/** Converts a plain 0-255 RGB triple (see `input-scene-colors.ts`) to a `Color`. */
function toColor(rgb: { r: number; g: number; b: number }): Color {
  return new Color(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1);
}

/** The ball's pose and motion, as the physics systems left it. */
export interface BallState {
  readonly localX: number;
  readonly localY: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly rotation: number;
  readonly velocityX: number;
  readonly velocityY: number;
}

/** The handle `fixed-timestep-physics.spec.ts` drives and asserts against. */
export interface FixedTimestepPhysicsSceneHandle extends SceneHandle {
  /** How many fixed steps have run since the scene was created. */
  readonly fixedSteps: number;
  /** The ball's current state. */
  readonly ball: BallState;
  /**
   * Scans the rendered canvas for the ball's blue pixels. Must be called in
   * the same `page.evaluate` task as the preceding `step()`.
   */
  measureBallBounds(): PixelBounds | null;
}

/**
 * Builds a scene where a ball falls under gravity onto a static floor and
 * bounces, with the physics systems registered in the `registerFixedUpdate`
 * group behind a transform system (the fixed pass) and ahead of the system
 * that records where each step ended, and a second transform system in the
 * default group before rendering (the frame pass), which draws the ball
 * between its last two steps. Frames of
 * any length that add up to the same time run the same fixed steps, so the
 * ball ends in the same pose.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): FixedTimestepPhysicsSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  time.fixedDeltaTimeInMilliseconds = fixedDeltaTimeInMilliseconds;

  createCamera(world, {
    isStatic: true,
    clearColor: toColor(inputSceneColors.clear),
    // 1 world unit == 1 screen pixel, see camera-pan-zoom.ts's identical use.
    verticalWorldUnits: canvas.height,
  });

  const floor = world.createEntity();

  addPositionComponent(world, floor, { local: { x: 0, y: floorY } });
  addRotationComponent(world, floor, { local: 0 });
  world.addComponent(floor, spriteId, {
    ...createImageSprite(renderContext.whiteTexture),
    width: floorWidth,
    height: floorHeight,
    tintColor: toColor(inputSceneColors.green),
  });
  addColliderComponent(world, floor, {
    collider: new PolygonCollider([
      { x: -floorWidth / 2, y: -floorHeight / 2 },
      { x: floorWidth / 2, y: -floorHeight / 2 },
      { x: floorWidth / 2, y: floorHeight / 2 },
      { x: -floorWidth / 2, y: floorHeight / 2 },
    ]),
    // Combined with the ball's 0.5 (their geometric mean, about 0.7), so the
    // ball is still rising from its first bounce at 0.5 s.
    restitution: 1,
  });

  const ball = world.createEntity();
  const ballPosition = addPositionComponent(world, ball, {
    local: { x: 0, y: ballStartY },
  });
  const ballRotation = addRotationComponent(world, ball, { local: 0 });

  world.addComponent(ball, spriteId, {
    ...createImageSprite(renderContext.whiteTexture),
    width: ballRadius * 2,
    height: ballRadius * 2,
    tintColor: toColor(inputSceneColors.blue),
  });
  addGravityComponent(world, ball, { amount: { x: 0, y: gravity } });

  const ballRigidBody = addRigidBodyComponent(world, ball, {
    canSleep: false,
  });

  addColliderComponent(world, ball, {
    collider: new CircleCollider(ballRadius),
    restitution: 0.5,
  });

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  let fixedSteps = 0;

  // Once per fixed step.
  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(
    {
      name: 'fixed-step-counter',
      query: [],
      update: (): void => {
        fixedSteps++;
      },
    },
    physics,
  );
  world.addSystem(createGravityEcsSystem(time), physics);
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
    physics,
  );
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the fixed steps.
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  time.update(clockInMilliseconds);

  return {
    step(deltaMilliseconds: number = fixedDeltaTimeInMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get fixedSteps(): number {
      return fixedSteps;
    },

    get ball(): BallState {
      return {
        localX: ballPosition.local.x,
        localY: ballPosition.local.y,
        worldX: ballPosition.world.x,
        worldY: ballPosition.world.y,
        rotation: ballRotation.local,
        velocityX: ballRigidBody.velocity.x,
        velocityY: ballRigidBody.velocity.y,
      };
    },

    measureBallBounds(): PixelBounds | null {
      return scanPixelBounds(canvas, matchesColor(inputSceneColors.blue));
    },
  };
};
