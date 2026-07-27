import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addPhysicsBodyComponent,
  addRevoluteJointComponent,
  CircleShape,
  PolygonShape,
  RevoluteJoint,
  RigidBody,
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
const narrowSlices: NineSliceOptions = {
  left: 8,
  right: 8,
  top: 28,
  bottom: 28,
  nativeWidth: 32,
  nativeHeight: 128,
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
    imageCache.getOrLoad(getAssetUrl('img/physics/block_narrow.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
  ]);

  return {
    ball: createImageSprite(ballImage, renderContext, renderLayer),
    door: createImageSprite(doorImage, renderContext, renderLayer),
    pivot: createImageSprite(pivotImage, renderContext, renderLayer),
  };
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
    world: position.clone(),
    local: position.clone(),
  });
  addRotationComponent(world, entity, { local: angle, world: angle });
  addSpriteComponent(world, entity, { ...sprite, width, height, slices });
}

function createPivotMarker(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
): RigidBody {
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
  const pivotBody = new RigidBody({
    shape: new CircleShape(pivotSize / 2),
    position: position.clone(),
    isStatic: true,
    isSensor: true,
  });

  addPositionComponent(world, pivotEntity, {
    world: position.clone(),
    local: position.clone(),
  });
  addRotationComponent(world, pivotEntity);
  addPhysicsBodyComponent(world, pivotEntity, { physicsBody: pivotBody });

  return pivotBody;
}

/**
 * Builds the door scenario: a hinge fixed to a wall-mounted pivot, limited
 * to swing between closed (hanging straight down, `angle` 0) and open
 * (horizontal, `angle` 90 degrees). Gravity swings it closed; a
 * `PushEcsComponent` periodically shoves it back open near its far edge
 * (since `RevoluteJoint` has no built-in motor).
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
  const localAnchorB = new Vector2(-doorWidth / 2, 0);
  const doorPosition = pivotPosition.subtract(localAnchorB.rotate(doorAngle));

  const pivotBody = createPivotMarker(world, sprites.pivot, pivotPosition);

  const doorEntity = world.createEntity();
  const doorBody = new RigidBody({
    shape: PolygonShape.rectangle(doorWidth, doorHeight),
    position: doorPosition,
    angle: doorAngle,
    restitution: 0,
  });

  addPositionComponent(world, doorEntity, {
    world: doorPosition.clone(),
    local: doorPosition.clone(),
  });
  addRotationComponent(world, doorEntity, {
    local: doorAngle,
    world: doorAngle,
  });
  addSpriteComponent(world, doorEntity, {
    ...sprites.door,
    width: doorWidth,
    height: doorHeight,
    slices: narrowSlices,
  });
  addPhysicsBodyComponent(world, doorEntity, { physicsBody: doorBody });

  // referenceAngle is captured as doorAngle here, so the joint's own
  // `angle` starts at 0 (closed) and 90 degrees is fully open.
  const joint = new RevoluteJoint({
    bodyA: pivotBody,
    bodyB: doorBody,
    anchorB: localAnchorB,
    enableLimit: true,
    lowerAngle: 0,
    upperAngle: Math.PI / 2,
  });

  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, { joint });
  addPushComponent(world, jointEntity, {
    body: doorBody,
    impulse: new Vector2(260_000, 0),
    localContactPoint: new Vector2(doorWidth / 2, 0),
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
  const localAnchorB = new Vector2(0, armLength);
  const bobPosition = pivotPosition.subtract(localAnchorB.rotate(startAngle));

  const pivotBody = createPivotMarker(world, sprites.pivot, pivotPosition);

  const bobEntity = world.createEntity();
  const bobBody = new RigidBody({
    shape: new CircleShape(bobRadius),
    position: bobPosition,
    angle: startAngle,
    restitution: 0,
  });

  addPositionComponent(world, bobEntity, {
    world: bobPosition.clone(),
    local: bobPosition.clone(),
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
  addPhysicsBodyComponent(world, bobEntity, { physicsBody: bobBody });

  const joint = new RevoluteJoint({
    bodyA: pivotBody,
    bodyB: bobBody,
    anchorB: localAnchorB,
  });

  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, { joint });
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

  const hubBody = createPivotMarker(world, sprites.pivot, hubPosition);

  const wheelEntity = world.createEntity();
  const wheelBody = new RigidBody({
    shape: new CircleShape(wheelRadius),
    position: hubPosition.clone(),
    restitution: 0,
  });

  wheelBody.angularVelocity = 5;

  addPositionComponent(world, wheelEntity, {
    world: hubPosition.clone(),
    local: hubPosition.clone(),
  });
  addRotationComponent(world, wheelEntity);
  addSpriteComponent(world, wheelEntity, {
    ...sprites.ball,
    width: wheelRadius * 2,
    height: wheelRadius * 2,
  });
  addPhysicsBodyComponent(world, wheelEntity, { physicsBody: wheelBody });

  const joint = new RevoluteJoint({ bodyA: hubBody, bodyB: wheelBody });

  const jointEntity = world.createEntity();

  addRevoluteJointComponent(world, jointEntity, { joint });
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

  createDoorScenario(world, sprites, new Vector2(columnLeft, height * 0.3));

  createPendulumScenario(
    world,
    sprites,
    new Vector2(columnLeft + columnWidth, height * 0.35),
  );

  createWheelScenario(
    world,
    sprites,
    new Vector2(columnLeft + columnWidth * 2, 0),
  );
}
