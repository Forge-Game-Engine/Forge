import {
  addPositionComponent,
  addRotationComponent,
  transformInterpolationId,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  addGravityComponent,
  addRevoluteJointComponent,
  addRigidBodyComponent,
  CircleCollider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  NineSliceOptions,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';

const gravity = { x: 0, y: 600 };
const rodLength = 150;
const rodWidth = 14;
const bobRadius = 18;
const pivotSize = 14;
const startAngle = -1;
const ballRadius = 20;
const ballSpeed = 360;
const wallWidth = 16;
const wallHeight = 110;

// `block_square.png` is a 64x64 rounded, bolted panel; these insets keep its
// corners at a fixed size while the center stretches to the rod and walls.
const squareSlices: NineSliceOptions = {
  left: 16,
  right: 16,
  top: 16,
  bottom: 16,
  nativeWidth: 64,
  nativeHeight: 64,
};

/** The sprites a row is drawn with, loaded once and shared by both rows. */
export interface RowSprites {
  ball: SpriteEcsComponent;
  block: SpriteEcsComponent;
}

/** The area of the view a row is laid out in, in world units. */
export interface RowBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function rectangleVertices(width: number, height: number): Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ];
}

function createLabel(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  text: string,
  position: Vector2,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: Vec2.clone(position) });
  addTextComponent(world, entity, {
    text,
    fontAtlas,
    size: 22,
    maxWidth: 600,
    horizontalAlign: textHorizontalAlignments.center,
    horizontalAlignPivot: 0.5,
    verticalAlign: textVerticalAlignments.middle,
  });
}

/**
 * Creates a rod hinged at its top end to a fixed pivot, released at
 * `startAngle` so gravity swings it. The bob at its lower end is a child
 * sprite, drawn on the rod's pose. The rod's collider gives it its mass and
 * collides with nothing.
 * @returns The rod's entity.
 */
function createPendulum(
  world: EcsWorld,
  sprites: RowSprites,
  pivotPosition: Vector2,
): number {
  const pivot = world.createEntity();

  addPositionComponent(world, pivot, { local: Vec2.clone(pivotPosition) });
  addRotationComponent(world, pivot);
  addSpriteComponent(world, pivot, {
    ...sprites.block,
    width: pivotSize,
    height: pivotSize,
    layer: 1,
  });

  // The rod's anchor is its top end, half its length above its center.
  const localAnchorB = { x: 0, y: -rodLength / 2 };
  const rod = world.createEntity();

  addPositionComponent(world, rod, {
    local: Vec2.subtract(
      Vec2.clone(pivotPosition),
      Vec2.rotate(Vec2.clone(localAnchorB), startAngle),
    ),
  });
  addRotationComponent(world, rod, { local: startAngle });
  addSpriteComponent(world, rod, {
    ...sprites.block,
    width: rodWidth,
    height: rodLength,
    slices: squareSlices,
  });
  addColliderComponent(world, rod, {
    collider: new PolygonCollider(rectangleVertices(rodWidth, rodLength)),
    mask: 0,
  });
  addRigidBodyComponent(world, rod);
  addGravityComponent(world, rod, { amount: gravity });

  const bob = world.createEntity();

  addPositionComponent(world, bob, { local: { x: 0, y: rodLength / 2 } });
  addSpriteComponent(world, bob, {
    ...sprites.ball,
    width: bobRadius * 2,
    height: bobRadius * 2,
  });
  world.setParent(bob, rod);

  const joint = world.createEntity();

  addRevoluteJointComponent(world, joint, {
    entityA: pivot,
    entityB: rod,
    localAnchorB,
  });

  return rod;
}

function createWall(
  world: EcsWorld,
  sprites: RowSprites,
  position: Vector2,
): void {
  const wall = world.createEntity();

  addPositionComponent(world, wall, { local: Vec2.clone(position) });
  addSpriteComponent(world, wall, {
    ...sprites.block,
    width: wallWidth,
    height: wallHeight,
    slices: squareSlices,
  });
  addColliderComponent(world, wall, {
    collider: new PolygonCollider(rectangleVertices(wallWidth, wallHeight)),
    friction: 0,
    restitution: 1,
  });
}

/**
 * Creates a ball moving sideways between two walls, with no gravity and no
 * friction, so it bounces from wall to wall at a constant speed.
 * @returns The ball's entity.
 */
function createBouncingBall(
  world: EcsWorld,
  sprites: RowSprites,
  left: number,
  right: number,
  y: number,
): number {
  createWall(world, sprites, { x: left, y });
  createWall(world, sprites, { x: right, y });

  const ball = world.createEntity();

  addPositionComponent(world, ball, { local: { x: (left + right) / 2, y } });
  addRotationComponent(world, ball);
  addSpriteComponent(world, ball, {
    ...sprites.ball,
    width: ballRadius * 2,
    height: ballRadius * 2,
  });
  addColliderComponent(world, ball, {
    collider: new CircleCollider(ballRadius),
    friction: 0,
    restitution: 1,
  });
  addRigidBodyComponent(world, ball, { velocity: { x: ballSpeed, y: 0 } });

  return ball;
}

/**
 * Creates one row of the demo: a label, a pendulum and a ball bouncing
 * between two walls. Both rows are built from the same values, so they
 * simulate the same motion; they differ only in how they're drawn.
 * @param world - The ECS world to add the row's entities to.
 * @param sprites - The sprites the row is drawn with.
 * @param fontAtlas - The font the row's label is drawn with.
 * @param bounds - The area of the view the row is laid out in.
 * @param interpolated - Whether the row's bodies keep the
 * `TransformInterpolationEcsComponent` `addRigidBodyComponent` gives them.
 * Without it, a body is drawn where the latest fixed step left it.
 */
export function createRow(
  world: EcsWorld,
  sprites: RowSprites,
  fontAtlas: FontAtlas,
  bounds: RowBounds,
  interpolated: boolean,
): void {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  createLabel(
    world,
    fontAtlas,
    interpolated ? 'Interpolated' : 'Not interpolated',
    { x: (bounds.left + bounds.right) / 2, y: bounds.top + 28 },
  );

  const pendulum = createPendulum(world, sprites, {
    x: bounds.left + width * 0.18,
    y: bounds.top + height * 0.2,
  });
  const ball = createBouncingBall(
    world,
    sprites,
    bounds.left + width * 0.4,
    bounds.right - width * 0.05,
    bounds.top + height * 0.6,
  );

  if (!interpolated) {
    world.removeComponent(pendulum, transformInterpolationId);
    world.removeComponent(ball, transformInterpolationId);
  }
}
