import { beforeEach, describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';

import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  addTransformInterpolationComponent,
  PositionEcsComponent,
  positionId,
  transformInterpolationId,
} from '../components/index.js';
import { registerFixedUpdate, Time } from '../time/index.js';
import { createTransformInterpolationEcsSystem } from './transform-interpolation-system.js';
import { createTransformEcsSystem } from './transform-system.js';

describe('transform-system', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createTransformEcsSystem(new Time()));
  });

  it('should set world position to local position for a root entity', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: { x: 10, y: 20 },
    });

    world.update();

    expect(position.world.x).toBe(10);
    expect(position.world.y).toBe(20);
  });

  it('should compose a child world position from its parent', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, {
      local: { x: 10, y: 20 },
    });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 5 },
    });

    world.setParent(child, parent);

    world.update();

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.world.y).toBe(25);
  });

  it('should keep recomputing world position for non-static entities after local changes', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: { x: 10, y: 20 },
    });

    world.update();

    position.local.x = 100;
    position.local.y = 200;

    world.update();

    expect(position.world.x).toBe(100);
    expect(position.world.y).toBe(200);
  });

  it('should freeze a root static entity after its first computation', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: { x: 10, y: 20 },
      isStatic: true,
    });

    world.update();

    expect(position.world.x).toBe(10);
    expect(position.world.y).toBe(20);

    position.local.x = 999;
    position.local.y = 999;

    world.update();

    expect(position.world.x).toBe(10);
    expect(position.world.y).toBe(20);
  });

  it('should keep updating a static child whose parent is not static', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentPosition = addPositionComponent(world, parent, {
      local: { x: 10, y: 20 },
    });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 5 },
      isStatic: true,
    });

    world.setParent(child, parent);

    world.update();

    expect(childPosition.world.x).toBe(15);
    expect(childPosition.world.y).toBe(25);

    parentPosition.local.x = 100;
    parentPosition.local.y = 100;

    world.update();

    expect(childPosition.world.x).toBe(105);
    expect(childPosition.world.y).toBe(105);
  });

  it('should freeze a static child once its entire parent chain is also static', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentPosition = addPositionComponent(world, parent, {
      local: { x: 10, y: 20 },
      isStatic: true,
    });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 5 },
      isStatic: true,
    });

    world.setParent(child, parent);

    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(childPosition.world.x).toBe(15);

    parentPosition.local.x = 999;
    childPosition.local.x = 999;

    world.update();

    expect(parentPosition.world.x).toBe(10);
    expect(childPosition.world.x).toBe(15);
  });

  it('should recompute a frozen static child when it is reparented or unparented', () => {
    const first = world.createEntity();
    const second = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, first, {
      local: { x: 10, y: 0 },
      isStatic: true,
    });
    addPositionComponent(world, second, {
      local: { x: 100, y: 0 },
      isStatic: true,
    });
    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 0 },
      isStatic: true,
    });

    world.setParent(child, first);
    world.update();

    expect(childPosition.world.x).toBe(15);

    world.setParent(child, second);
    world.update();

    expect(childPosition.world.x).toBe(105);

    world.removeParent(child);
    world.update();

    expect(childPosition.world.x).toBe(5);
  });

  it("should compute a new entity that reuses a removed static entity's slot", () => {
    const staticEntity = world.createEntity();

    addPositionComponent(world, staticEntity, {
      local: { x: 10, y: 20 },
      isStatic: true,
    });

    world.update();

    world.removeEntity(staticEntity);

    const reusedEntity = world.createEntity();

    const reusedPosition = addPositionComponent(world, reusedEntity, {
      local: { x: 50, y: 60 },
    });

    world.update();

    expect(reusedPosition.world.x).toBe(50);
    expect(reusedPosition.world.y).toBe(60);
  });

  it('should compute a static position re-added to an entity under a parent', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 100, y: 0 } });
    addPositionComponent(world, child, {
      local: { x: 5, y: 0 },
      isStatic: true,
    });

    world.update();

    world.removeComponent(child, positionId);
    world.setParent(child, parent);

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 0 },
      isStatic: true,
    });

    world.update();

    expect(childPosition.world.x).toBe(105);
  });

  it('should recompute an entity whose isStatic has been cleared', () => {
    const entity = world.createEntity();

    const position = addPositionComponent(world, entity, {
      local: { x: 10, y: 0 },
      isStatic: true,
    });

    world.update();

    position.isStatic = false;
    position.local.x = 20;

    world.update();

    expect(position.world.x).toBe(20);
  });

  it('should rotate a child position offset by the parent rotation', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 0, y: 0 } });
    addRotationComponent(world, parent, { local: Math.PI / 2 });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 10, y: 0 },
    });

    world.setParent(child, parent);

    world.update();

    expect(childPosition.world.x).toBeCloseTo(0);
    expect(childPosition.world.y).toBeCloseTo(10);
  });

  it('should scale a child position offset by the parent scale', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 0, y: 0 } });
    addScaleComponent(world, parent, { local: { x: 2, y: 2 } });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 10, y: 0 },
    });

    world.setParent(child, parent);

    world.update();

    expect(childPosition.world.x).toBeCloseTo(20);
    expect(childPosition.world.y).toBeCloseTo(0);
  });

  it('should scale then rotate a child position offset by the parent transform', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 5, y: 5 } });
    addRotationComponent(world, parent, { local: Math.PI / 2 });
    addScaleComponent(world, parent, { local: { x: 2, y: 2 } });

    const childPosition = addPositionComponent(world, child, {
      local: { x: 10, y: 0 },
    });

    world.setParent(child, parent);

    world.update();

    expect(childPosition.world.x).toBeCloseTo(5);
    expect(childPosition.world.y).toBeCloseTo(25);
  });

  it('should compose position, rotation and scale through a three-deep parent chain', () => {
    const grandparent = world.createEntity();
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, grandparent, { local: { x: 0, y: 0 } });
    addRotationComponent(world, grandparent, { local: Math.PI / 2 });
    addScaleComponent(world, grandparent, { local: { x: 2, y: 2 } });

    const parentPosition = addPositionComponent(world, parent, {
      local: { x: 10, y: 0 },
    });
    const parentRotation = addRotationComponent(world, parent, {
      local: Math.PI / 2,
    });
    const parentScale = addScaleComponent(world, parent, {
      local: { x: 1, y: 1 },
    });

    world.setParent(parent, grandparent);

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 0 },
    });

    world.setParent(child, parent);

    world.update();

    // grandparent: position (0, 0), rotation pi/2, scale (2, 2)
    // parent: local offset (10, 0) scaled by (2, 2) -> (20, 0), rotated by pi/2 -> (0, 20)
    expect(parentPosition.world.x).toBeCloseTo(0);
    expect(parentPosition.world.y).toBeCloseTo(20);
    expect(parentRotation.world).toBeCloseTo(Math.PI);
    expect(parentScale.world.x).toBeCloseTo(2);
    expect(parentScale.world.y).toBeCloseTo(2);

    // child: local offset (5, 0) scaled by parent world scale (2, 2) -> (10, 0),
    // rotated by parent world rotation pi -> (-10, 0), plus parent world position (0, 20)
    expect(childPosition.world.x).toBeCloseTo(-10);
    expect(childPosition.world.y).toBeCloseTo(20);
  });

  it('should leave a child unaffected when an ancestor in the chain has no position or rotation component', () => {
    const grandparent = world.createEntity();
    const middle = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, grandparent, { local: { x: 0, y: 0 } });

    const middleRotation = addRotationComponent(world, middle, {
      local: Math.PI / 2,
    });

    world.setParent(middle, grandparent);

    const childPosition = addPositionComponent(world, child, {
      local: { x: 5, y: 5 },
    });

    world.setParent(child, middle);

    world.update();

    // middle has no PositionEcsComponent, so it composes rotation only, and
    // since grandparent has no RotationEcsComponent, middle keeps its local rotation.
    expect(middleRotation.world).toBeCloseTo(Math.PI / 2);

    // child's parent (middle) has no PositionEcsComponent, so child's world
    // position falls back to its local position, untransformed.
    expect(childPosition.world.x).toBe(5);
    expect(childPosition.world.y).toBe(5);
  });

  it('should leave a child scale unaffected when its parent has no scale component', () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent, { local: { x: 0, y: 0 } });

    const childScale = addScaleComponent(world, child, {
      local: { x: 3, y: 4 },
    });

    addPositionComponent(world, child, { local: { x: 0, y: 0 } });
    world.setParent(child, parent);

    world.update();

    expect(childScale.world.x).toBe(3);
    expect(childScale.world.y).toBe(4);
  });

  it("keeps a root entity's world scale separate from its local scale", () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    addPositionComponent(world, parent);
    addScaleComponent(world, parent, { local: { x: 3, y: 3 } });
    addPositionComponent(world, child);

    const childScale = addScaleComponent(world, child, {
      local: { x: 2, y: 2 },
    });

    world.update();
    world.setParent(child, parent);
    world.update();
    world.update();

    expect(childScale.local).toEqual({ x: 2, y: 2 });
    expect(childScale.world).toEqual({ x: 6, y: 6 });
  });
});

// A fixed step of 31.25 ms and frames of 7.8125 ms, both exact in binary: the
// first step runs on the fourth frame, and every fourth frame after it, so
// the frames between steps have overstep fractions of exactly 0.25, 0.5 and
// 0.75.
const fixedDeltaMilliseconds = 1000 / 32;
const frameMilliseconds = 1000 / 128;

interface SteppedWorld {
  world: EcsWorld;
  time: Time;
  /** Runs one frame of `frameMilliseconds`. */
  frame: () => void;
  /** Run in each fixed step, before the step's transform pass. */
  beforeFixedPass: (() => void)[];
  /** Run in each fixed step, after the step's transform pass. */
  inStep: (() => void)[];
}

function createSteppedWorld(withEndRecord = true): SteppedWorld {
  const world = new EcsWorld();
  const time = new Time();
  const beforeFixedPass: (() => void)[] = [];
  const inStep: (() => void)[] = [];

  time.fixedDeltaTimeInMilliseconds = fixedDeltaMilliseconds;

  let now = 0;

  time.update(now);

  const physics = { group: registerFixedUpdate(world, time) };

  world.addSystem(
    {
      query: [],
      update: (): void => {
        for (const callback of beforeFixedPass) {
          callback();
        }
      },
    },
    physics,
  );
  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(
    {
      query: [],
      update: (): void => {
        for (const callback of inStep) {
          callback();
        }
      },
    },
    physics,
  );

  if (withEndRecord) {
    world.addSystem(createTransformInterpolationEcsSystem(), physics);
  }

  world.addSystem(createTransformEcsSystem(time));

  return {
    world,
    time,
    frame: (): void => {
      now += frameMilliseconds;
      time.update(now);
      world.update();
    },
    beforeFixedPass,
    inStep,
  };
}

function frames(stepped: SteppedWorld, count: number): void {
  for (let i = 0; i < count; i++) {
    stepped.frame();
  }
}

const movingEntities = new WeakMap<PositionEcsComponent, number>();

// An entity moved 16 units along `+X` in each fixed step.
function addMovingEntity(
  stepped: SteppedWorld,
  x = 0,
  interpolated = true,
): PositionEcsComponent {
  const entity = stepped.world.createEntity();
  const position = addPositionComponent(stepped.world, entity, {
    local: { x, y: 0 },
  });

  if (interpolated) {
    addTransformInterpolationComponent(stepped.world, entity);
  }

  stepped.inStep.push(() => {
    position.local.x += 16;
  });

  movingEntities.set(position, entity);

  return position;
}

function entityOf(position: PositionEcsComponent): number {
  const entity = movingEntities.get(position);

  if (entity === undefined) {
    throw new Error('The position does not belong to a moving entity.');
  }

  return entity;
}

describe('transform-system interpolation', () => {
  it('should draw an interpolated entity between the start and end of the latest step', () => {
    const stepped = createSteppedWorld();
    const position = addMovingEntity(stepped);
    const drawn: number[] = [];

    for (let i = 0; i < 9; i++) {
      stepped.frame();
      drawn.push(position.world.x);
    }

    // The first step runs on frame 4 (alpha 0), the second on frame 8.
    expect(drawn).toEqual([0, 0, 0, 0, 4, 8, 12, 16, 20]);
    expect(position.local.x).toBe(32);
  });

  it('should draw the end of the step when the overstep fraction reaches 1', () => {
    const world = new EcsWorld();
    const time = new Time();
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x: 16, y: 0 },
    });
    const interpolation = addTransformInterpolationComponent(world, entity);

    interpolation.stepStart.position.x = 0;
    world.addSystem(createTransformEcsSystem(time));
    time.fixedDeltaTimeInMilliseconds = fixedDeltaMilliseconds;
    time.update(0);
    // Nothing takes fixed steps, so the fraction passes 1.
    time.update(fixedDeltaMilliseconds * 1.5);
    world.update();

    expect(time.fixedOverstepFraction).toBe(1.5);
    expect(position.world.x).toBe(16);
  });

  it('should draw an entity without the component at local', () => {
    const stepped = createSteppedWorld();
    const position = addMovingEntity(stepped, 0, false);

    frames(stepped, 5);

    expect(position.world.x).toBe(16);
  });

  it('should blend rotation the shorter way across ±π', () => {
    const stepped = createSteppedWorld();
    const entity = stepped.world.createEntity();

    addPositionComponent(stepped.world, entity);

    const rotation = addRotationComponent(stepped.world, entity, {
      local: 3,
    });

    addTransformInterpolationComponent(stepped.world, entity);
    stepped.inStep.push(() => {
      rotation.local = -3;
    });

    frames(stepped, 6);

    expect(rotation.world).toBeCloseTo(Math.PI);
  });

  it('should compose a child on its interpolated parent', () => {
    const stepped = createSteppedWorld();
    const parentPosition = addMovingEntity(stepped);
    const parent = entityOf(parentPosition);
    const child = stepped.world.createEntity();
    const childPosition = addPositionComponent(stepped.world, child, {
      local: { x: 1, y: 0 },
    });

    stepped.world.setParent(child, parent);

    frames(stepped, 6);

    expect(parentPosition.world.x).toBe(8);
    expect(childPosition.world).toEqual({ x: 9, y: 0 });
  });

  it('should blend an interpolated child and compose it on its interpolated parent', () => {
    const stepped = createSteppedWorld();

    const parent = entityOf(addMovingEntity(stepped));
    const child = stepped.world.createEntity();
    const childPosition = addPositionComponent(stepped.world, child);

    addTransformInterpolationComponent(stepped.world, child);
    stepped.world.setParent(child, parent);
    stepped.inStep.push(() => {
      childPosition.local.y += 8;
    });

    frames(stepped, 6);

    expect(childPosition.world).toEqual({ x: 8, y: 4 });
  });

  it('should compose world from local exactly in the fixed step, and record the step start', () => {
    const stepped = createSteppedWorld();
    const position = addMovingEntity(stepped);
    const interpolation = stepped.world.getComponent(
      entityOf(position),
      transformInterpolationId,
    );
    const seenInStep: { world: number; stepStart: number }[] = [];

    stepped.inStep.unshift(() => {
      seenInStep.push({
        world: position.world.x,
        stepStart: interpolation?.stepStart.position.x ?? Number.NaN,
      });
    });

    frames(stepped, 8);

    // Frame 7 drew the entity at 12, a step behind its local 16.
    expect(seenInStep).toEqual([
      { world: 0, stepStart: 0 },
      { world: 16, stepStart: 16 },
    ]);
  });

  it('should draw a teleport made between frames at once and blend again from it after the next step', () => {
    const stepped = createSteppedWorld();
    const position = addMovingEntity(stepped);
    const drawn: number[] = [];

    frames(stepped, 5);
    position.local.x = 100;

    for (let i = 0; i < 4; i++) {
      stepped.frame();
      drawn.push(position.world.x);
    }

    // Frames 6 and 7 draw the teleport, frame 8 steps from it to 116.
    expect(drawn).toEqual([100, 100, 100, 104]);
  });

  it('should blend from a teleport made in the step before its transform pass without a slide', () => {
    const stepped = createSteppedWorld();
    const position = addMovingEntity(stepped);
    const drawn: number[] = [];
    let teleport = false;

    stepped.beforeFixedPass.push(() => {
      if (teleport) {
        position.local.x = 100;
        teleport = false;
      }
    });

    frames(stepped, 5);
    teleport = true;

    for (let i = 0; i < 4; i++) {
      stepped.frame();
      drawn.push(position.world.x);
    }

    expect(drawn).toEqual([8, 12, 100, 104]);
  });

  it('should draw an entity created between steps at local until its first step', () => {
    const stepped = createSteppedWorld();

    frames(stepped, 5);

    const position = addMovingEntity(stepped, 50);
    const drawn: number[] = [];

    for (let i = 0; i < 4; i++) {
      stepped.frame();
      drawn.push(position.world.x);
    }

    expect(drawn).toEqual([50, 50, 50, 54]);
  });

  it('should draw a moving interpolated entity at local without the end-of-step record', () => {
    const stepped = createSteppedWorld(false);
    const position = addMovingEntity(stepped);

    frames(stepped, 5);

    expect(position.world.x).toBe(16);
  });

  it('should keep freezing a static interpolated entity', () => {
    const stepped = createSteppedWorld();
    const entity = stepped.world.createEntity();
    const position = addPositionComponent(stepped.world, entity, {
      local: { x: 10, y: 20 },
      isStatic: true,
    });

    addTransformInterpolationComponent(stepped.world, entity);

    // Both transform passes have computed it once by the first step.
    frames(stepped, 4);
    position.local.x = 999;
    frames(stepped, 5);

    expect(position.world).toEqual({ x: 10, y: 20 });
  });
});
