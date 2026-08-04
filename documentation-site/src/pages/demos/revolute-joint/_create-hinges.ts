import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addRevoluteJointComponent,
  addRigidBodyComponent,
  CircleCollider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  calculateVisibleWorldSize,
  createImageSprite,
  NineSliceOptions,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addPushComponent } from './_push.component';

const pivotSize = 14;
const gravity = Vec2.create(0, -600);

// `block_square.png`/`block_narrow.png` are 64x64/32x128 rounded, bolted
// panels; these insets keep their rounded corners and bolt-head detail at a
// fixed size while the center stretches, instead of smearing them across
// whatever size the pivot/door ends up at.
const squareSlices: NineSliceOptions = {
  left: 16,
  right: 16,
  top: 16,
  bottom: 16,
  nativeWidth: 64,
  nativeHeight: 64,
};

interface HingeSprites {
  ball: SpriteEcsComponent;
  door: SpriteEcsComponent;
  pivot: SpriteEcsComponent;
}

async function loadHingeSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<HingeSprites> {
  const { imageCache } = renderContext;

  const [ballImage, doorImage, pivotImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
  ]);

  return {
    ball: createImageSprite(ballImage, renderContext, renderLayer),
    door: createImageSprite(doorImage, renderContext, renderLayer, {
      slices: squareSlices,
    }),
    pivot: createImageSprite(pivotImage, renderContext, renderLayer),
  };
}

function rectangleVertices(width: number, height: number): Vector2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    Vec2.create(-halfWidth, -halfHeight),
    Vec2.create(halfWidth, -halfHeight),
    Vec2.create(halfWidth, halfHeight),
    Vec2.create(-halfWidth, halfHeight),
  ];
}

function createVisualEntity(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  angle: number,
  width: number,
  height: number,
  slices: NineSliceOptions,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: Vec2.clone(position),
    local: Vec2.clone(position),
  });
  addRotationComponent(world, entity, { local: angle, world: angle });
  addSpriteComponent(world, entity, { ...sprite, width, height, slices });
}

/**
 * Creates a static, non-colliding pivot marker entity: since it has no
 * `ColliderEcsComponent`, it never participates in collision detection
 * (matching the old engine's `isStatic + isSensor` pivot bodies), and since
 * it has no `RigidBodyEcsComponent`, every joint system treats it as
 * infinite-mass/static.
 * @param world - The ECS world to add the pivot entity to.
 * @param sprite - The pivot marker's sprite.
 * @param position - Where the pivot sits.
 * @returns The pivot entity.
 */
function createPivotMarker(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
): number {
  createVisualEntity(
    world,
    sprite,
    position,
    0,
    pivotSize,
    pivotSize,
    squareSlices,
  );

  const pivotEntity = world.createEntity();

  addPositionComponent(world, pivotEntity, {
    world: Vec2.clone(position),
    local: Vec2.clone(position),
  });
  addRotationComponent(world, pivotEntity);

  return pivotEntity;
}

/**
 * Builds the door scenario: a hinge fixed to a wall-mounted pivot, limited
 * to swing between closed (hanging straight down, `angle` 0) and open
 * (horizontal, `angle` 90 degrees). Gravity swings it closed; a
 * `PushEcsComponent` periodically shoves it back open near its far edge
 * (revolute joints have no built-in motor).
 * @param world - The ECS world to add the scenario's entities to.
 * @param sprites - The pre-loaded sprites shared across every scenario.
 * @param pivotPosition - Where the door is hinged.
 */
function createDoorScenario(
  world: EcsWorld,
  sprites: HingeSprites,
  pivotPosition: Vector2,
): void {
  const doorWidth = 130;
  const doorHeight = 22;
  // Hanging straight down: the hinge (local origin side) points up, the far
  // (push) edge points down.
  const doorAngle = -Math.PI / 2;
  const localAnchorB = Vec2.create(-doorWidth / 2, 0);
  // clone both: localAnchorB is passed unrotated to the revolute joint below,
  // and pivotPosition is reused as-is for createPivotMarker after this.
  const doorPosition = Vec2.subtract(
    Vec2.clone(pivotPosition),
    Vec2.rotate(Vec2.clone(localAnchorB), doorAngle),
  );

  const pivotEntity = createPivotMarker(world, sprites.pivot, pivotPosition);

  const doorEntity = world.createEntity();
  const doorCollider = new PolygonCollider(
    rectangleVertices(doorWidth, doorHeight),
  );

  addPositionComponent(world, doorEntity, {
    world: Vec2.clone(doorPosition),
    local: Vec2.clone(doorPosition),
  });
  addRotationComponent(world, doorEntity, {
    local: doorAngle,
    world: doorAngle,
  });
  addSpriteComponent(world, doorEntity, {
    ...sprites.door,
    width: doorWidth,
    height: doorHeight,
    slices: squareSlices,
  });
  addColliderComponent(world, doorEntity, {
    collider: doorCollider,
    restitution: 0,
  });
  addRigidBodyComponent(world, doorEntity, {
    mass: doorCollider.mass,
    momentOfInertia: doorCollider.momentOfInertia,
  });
  addAabbComponent(world, doorEntity);
  addGravityComponent(world, doorEntity, { amount: gravity });

  // referenceAngle is captured as doorAngle here, so the joint's own
  // relative angle starts at 0 (closed) and 90 degrees is fully open.
  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, {
    entityA: pivotEntity,
    entityB: doorEntity,
    localAnchorB,
    enableLimit: true,
    lowerAngle: 0,
    upperAngle: Math.PI / 2,
  });
  addPushComponent(world, jointEntity, {
    entity: doorEntity,
    impulse: Vec2.create(260_000, 0),
    localContactPoint: Vec2.create(doorWidth / 2, 0),
    intervalSeconds: 2,
  });
}

/**
 * Builds the pendulum scenario: a bob hinged to a fixed pivot by an arm,
 * released from a displaced angle so gravity alone swings it back and
 * forth, no limit and no push, demonstrating rotation left entirely free.
 * @param world - The ECS world to add the scenario's entities to.
 * @param sprites - The pre-loaded sprites shared across every scenario.
 * @param pivotPosition - Where the pendulum is hinged.
 */
function createPendulumScenario(
  world: EcsWorld,
  sprites: HingeSprites,
  pivotPosition: Vector2,
): void {
  const bobRadius = 22;
  const armLength = 150;
  const startAngle = 0.8;
  // The bob's anchor sits `armLength` above its own center in its local
  // (unrotated) frame, i.e. directly below the pivot at rest (angle 0).
  const localAnchorB = Vec2.create(0, armLength);
  // clone both: localAnchorB is passed unrotated to the revolute joint below,
  // and pivotPosition is reused as-is for createPivotMarker after this.
  const bobPosition = Vec2.subtract(
    Vec2.clone(pivotPosition),
    Vec2.rotate(Vec2.clone(localAnchorB), startAngle),
  );

  const pivotEntity = createPivotMarker(world, sprites.pivot, pivotPosition);

  const bobEntity = world.createEntity();
  const bobCollider = new CircleCollider(bobRadius);

  addPositionComponent(world, bobEntity, {
    world: Vec2.clone(bobPosition),
    local: Vec2.clone(bobPosition),
  });
  addRotationComponent(world, bobEntity, {
    local: startAngle,
    world: startAngle,
  });
  addSpriteComponent(world, bobEntity, {
    ...sprites.ball,
    width: bobRadius * 2,
    height: bobRadius * 2,
  });
  addColliderComponent(world, bobEntity, {
    collider: bobCollider,
    restitution: 0,
  });
  addRigidBodyComponent(world, bobEntity, {
    mass: bobCollider.mass,
    momentOfInertia: bobCollider.momentOfInertia,
  });
  addAabbComponent(world, bobEntity);
  addGravityComponent(world, bobEntity, { amount: gravity });

  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, {
    entityA: pivotEntity,
    entityB: bobEntity,
    localAnchorB,
  });
}

/**
 * Builds the wheel scenario: a wheel hinged directly to its hub (both
 * anchors default to each body's center), given an initial spin instead of
 * a repeating push, since a free-spinning wheel needs no periodic nudge,
 * just an initial angular velocity, and no limit, since it should be able
 * to rotate without bound.
 * @param world - The ECS world to add the scenario's entities to.
 * @param sprites - The pre-loaded sprites shared across every scenario.
 * @param hubPosition - Where the wheel is hinged.
 */
function createWheelScenario(
  world: EcsWorld,
  sprites: HingeSprites,
  hubPosition: Vector2,
): void {
  const wheelRadius = 48;

  const hubEntity = createPivotMarker(world, sprites.pivot, hubPosition);

  const wheelEntity = world.createEntity();
  const wheelCollider = new CircleCollider(wheelRadius);

  addPositionComponent(world, wheelEntity, {
    world: Vec2.clone(hubPosition),
    local: Vec2.clone(hubPosition),
  });
  addRotationComponent(world, wheelEntity);
  addSpriteComponent(world, wheelEntity, {
    ...sprites.ball,
    width: wheelRadius * 2,
    height: wheelRadius * 2,
  });
  addColliderComponent(world, wheelEntity, {
    collider: wheelCollider,
    restitution: 0,
  });
  addRigidBodyComponent(world, wheelEntity, {
    mass: wheelCollider.mass,
    momentOfInertia: wheelCollider.momentOfInertia,
    angularVelocity: 5,
  });
  addAabbComponent(world, wheelEntity);
  addGravityComponent(world, wheelEntity, { amount: gravity });

  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, {
    entityA: hubEntity,
    entityB: wheelEntity,
  });
}

/**
 * Creates three revolute-joint scenarios side by side: a door hinge limited
 * to a 90 degree swing that gravity closes and a periodic push re-opens, a
 * pendulum released to swing freely under gravity, and a wheel spun up once
 * and left to rotate indefinitely.
 * @param world - The ECS world to add the scenarios' entities to.
 * @param renderContext - The render context used to load sprites.
 * @param renderLayer - The render layer the scenarios should be drawn on.
 */
export async function createHinges(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const sprites = await loadHingeSprites(renderContext, renderLayer);
  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const columnWidth = width / 3;
  const columnLeft = -width / 2 + columnWidth / 2;

  createDoorScenario(
    world,
    sprites,
    Vec2.create(columnLeft, height * 0.3),
  );

  createPendulumScenario(
    world,
    sprites,
    Vec2.create(columnLeft + columnWidth, height * 0.35),
  );

  createWheelScenario(
    world,
    sprites,
    Vec2.create(columnLeft + columnWidth * 2, 0),
  );
}
