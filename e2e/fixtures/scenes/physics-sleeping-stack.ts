import {
  addCameraComponent,
  addColliderComponent,
  addGravityComponent,
  addPositionComponent,
  addRigidBodyComponent,
  addRotationComponent,
  addSpriteComponent,
  Color,
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCanvas,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createImageSprite,
  createNarrowPhaseEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createSleepEcsSystem,
  createTransformEcsSystem,
  EcsWorld,
  PolygonCollider,
  PositionEcsComponent,
  RigidBodyEcsComponent,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 1000 / 60;
// 600 CSS pixels tall, so one world unit (one box) is 40 pixels.
const verticalWorldUnits = 15;
const boxCount = 3;
const boxSize = 1;
// The floor's top face, `+Y` being down the screen.
const floorTop = 4;
const floorHeight = 2;

/** The column of boxes' vertical extent on the canvas, in canvas pixels. */
export interface ColumnBounds {
  /** The topmost canvas row a box was found on. */
  top: number;
  /** The bottommost canvas row a box was found on. */
  bottom: number;
}

/** What `physics-sleeping-stack.spec.ts` asserts against, from one frame. */
export interface SleepingStackMeasurement {
  /** Each box's `RigidBodyEcsComponent.isSleeping`, bottom box first. */
  sleeping: boolean[];
  /** Each box's `position.world.y`, what the frame drew it at. */
  worldY: number[];
  /** Each box's `velocity.y`. */
  velocityY: number[];
  /** The rendered column's bounds, or `null` if no box is on screen. */
  bounds: ColumnBounds | null;
}

/** The handle `physics-sleeping-stack.spec.ts` drives and asserts against. */
export interface SleepingStackSceneHandle extends SceneHandle {
  /**
   * Steps until every box is asleep, at most `maxSteps` times.
   * @returns How many steps it took, or `-1` if the boxes didn't all fall
   * asleep.
   */
  stepUntilAsleep(maxSteps: number): number;

  /**
   * Moves the static floor by `dy` (positive is down) through its
   * `position.local`, as game code moves a lift.
   */
  moveFloor(dy: number): void;

  /** Removes the floor entity. */
  removeFloor(): void;

  /**
   * Reads the boxes' state and scans the canvas's displayed bitmap for the
   * column. Must be called in the same `page.evaluate` task as the
   * preceding `step()`.
   */
  measure(): SleepingStackMeasurement;
}

function boxCollider(width: number, height: number): PolygonCollider {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return new PolygonCollider([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ]);
}

// Generous thresholds: antialiased edges blend toward the background, and
// this only needs to tell the green boxes from the blue floor and the white
// background.
function isGreenish(r: number, g: number, b: number): boolean {
  return g > 150 && r < 100 && b < 100;
}

/**
 * Builds a column of green boxes resting on a blue static floor (a
 * collider-only entity), simulated by the whole physics pipeline including
 * `createSleepEcsSystem`, and drawn by a static camera centred on the
 * origin. Once the column sleeps, the narrow phase reuses its contacts and
 * nothing moves it, so it only falls again if the sleep system notices that
 * the floor moved or went away.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SleepingStackSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 800;
  canvas.height = 600;

  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: Color.white,
    verticalWorldUnits,
  });

  const squareSprite = createImageSprite(renderContext.whiteTexture);

  const floor = world.createEntity();
  const floorPosition = addPositionComponent(world, floor, {
    local: { x: 0, y: floorTop + floorHeight / 2 },
  });

  addRotationComponent(world, floor);
  addColliderComponent(world, floor, {
    collider: boxCollider(12, floorHeight),
    restitution: 0,
  });
  addSpriteComponent(world, floor, {
    ...squareSprite,
    width: 12,
    height: floorHeight,
    tintColor: new Color(0, 0, 1, 1),
  });

  const boxes: {
    body: RigidBodyEcsComponent;
    position: PositionEcsComponent;
  }[] = [];

  for (let i = 0; i < boxCount; i++) {
    const entity = world.createEntity();
    // Dropped from a small gap above the floor and each other.
    const position = addPositionComponent(world, entity, {
      local: { x: 0, y: floorTop - boxSize / 2 - 0.05 - i * (boxSize + 0.1) },
    });

    addRotationComponent(world, entity);
    addColliderComponent(world, entity, {
      collider: boxCollider(boxSize, boxSize),
      restitution: 0,
    });

    const body = addRigidBodyComponent(world, entity);

    addGravityComponent(world, entity);
    addSpriteComponent(world, entity, {
      ...squareSprite,
      width: boxSize,
      height: boxSize,
      tintColor: new Color(0, 1, 0, 1),
    });

    boxes.push({ body, position });
  }

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  world.addSystem(createTransformEcsSystem());
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(createSleepEcsSystem(collisionManifolds, time));
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
  );
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  const step = (
    deltaMilliseconds: number = defaultStepDeltaMilliseconds,
  ): void => {
    clockInMilliseconds += deltaMilliseconds;
    time.update(clockInMilliseconds);
    world.update();
  };

  const measureColumn = (): ColumnBounds | null => {
    const sampleCanvas = document.createElement('canvas');

    sampleCanvas.width = canvas.width;
    sampleCanvas.height = canvas.height;

    const context2d = sampleCanvas.getContext('2d');

    if (!context2d) {
      throw new Error('2D canvas context not available');
    }

    context2d.drawImage(canvas, 0, 0);

    // The column is centred on `x = 0`, the middle of the canvas.
    const x = Math.floor(canvas.width / 2);
    const { data } = context2d.getImageData(x, 0, 1, canvas.height);

    let top = -1;
    let bottom = -1;

    for (let y = 0; y < canvas.height; y++) {
      const offset = y * 4;

      if (isGreenish(data[offset], data[offset + 1], data[offset + 2])) {
        if (top === -1) {
          top = y;
        }

        bottom = y;
      }
    }

    return top === -1 ? null : { top, bottom };
  };

  return {
    step,

    stepUntilAsleep(maxSteps: number): number {
      for (let i = 1; i <= maxSteps; i++) {
        step();

        if (boxes.every(({ body }) => body.isSleeping)) {
          return i;
        }
      }

      return -1;
    },

    moveFloor(dy: number): void {
      floorPosition.local.y += dy;
    },

    removeFloor(): void {
      world.removeEntity(floor);
    },

    measure(): SleepingStackMeasurement {
      return {
        sleeping: boxes.map(({ body }) => body.isSleeping),
        worldY: boxes.map(({ position }) => position.world.y),
        velocityY: boxes.map(({ body }) => body.velocity.y),
        bounds: measureColumn(),
      };
    },
  };
};
