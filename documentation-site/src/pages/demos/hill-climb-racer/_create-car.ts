import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction, TriggerAction } from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addAngularVelocityMotorComponent,
  addLinearDamperComponent,
  addLinearSpringComponent,
  CircleShape,
  PhysicsBodyId,
  PolygonShape,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addCarResetComponent, CarResetBody } from './_car-reset.component';
import { addChassisStabilizerComponent } from './_chassis-stabilizer.component';
import { addWheelDriveComponent } from './_wheel-drive.component';

const chassisWidth = 170;
const chassisHeight = 36;
const chassisDensity = 0.35;
const chassisColor = Color.fromHSLA(8, 85, 55);

const wheelRadius = 28;
const wheelDensity = 0.5;
const wheelColor = Color.fromHSLA(220, 15, 20);

// Anchors are in the chassis's local space: roughly at the bottom corners,
// inset a bit so the wheels sit under the body rather than past its edges.
const frontAnchor = new Vector2(chassisWidth / 2 - 25, -chassisHeight / 2);
const rearAnchor = new Vector2(-(chassisWidth / 2 - 25), -chassisHeight / 2);

// How far below each anchor a wheel starts, on top of the anchor's own
// offset. Since `addLinearSpringComponent` defaults `restLength` to the
// anchors' distance at attach time, this becomes the suspension's rest
// length, and starting the wheel slightly higher than that (see
// `wheelSpawnDrop` in `createCar`) lets the car visibly settle onto its
// suspension as soon as the demo starts, the same way the Linear Spring and
// Damper demo's wheels do. Kept just large enough that the wheels tuck in
// close under the chassis (rather than dangling below it with an
// unrealistic gap) while still leaving several times the equilibrium sag
// of margin, so the wheel never has to cross (or come numerically close
// to) the chassis anchor itself, where `createLinearSpringEcsSystem`'s
// direction normalization becomes unstable as the anchor-to-wheel distance
// approaches zero.
const wheelDropHeight = 56;

// Chosen so the car's weight compresses each suspension by a small fraction
// of `wheelDropHeight` at rest (leaving visible, but bounded, suspension
// travel) rather than anywhere close to all the way to the chassis anchor.
const suspensionStiffness = 300_000;
const suspensionDamping = 35_000;

// A hill-climb-racer engine is meant to feel overpowered enough to punch
// through bumps and keep climbing rather than stalling on them.
const motorMaxTorque = 60_000_000;
const maxWheelSpeed = 16;

// See `ChassisStabilizerEcsComponent` for why this exists. Strong enough to
// pull the chassis back to (roughly) level within a second or two of
// nothing else disturbing it, but still far weaker than the pitch torque a
// hard acceleration or brake produces, so the car still visibly leans under
// throttle.
const chassisLevelingStiffness = 300_000_000;
const chassisLevelingDamping = 40_000_000;

interface CarSprites {
  chassis: SpriteEcsComponent;
  wheel: SpriteEcsComponent;
}

async function loadCarSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<CarSprites> {
  const { imageCache } = renderContext;

  const [chassisImage, wheelImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/block_narrow.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
  ]);

  return {
    chassis: createImageSprite(chassisImage, renderContext, renderLayer),
    wheel: createImageSprite(wheelImage, renderContext, renderLayer),
  };
}

function createWheel(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  throttleInput: Axis1dAction,
): RigidBody {
  const body = new RigidBody({
    shape: new CircleShape(wheelRadius),
    position,
    density: wheelDensity,
    friction: 1,
    restitution: 0.1,
  });

  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });
  world.addComponent(entity, rotationId, { local: 0, world: 0 });
  world.addComponent(entity, scaleId, {
    local: new Vector2(
      (wheelRadius * 2) / sprite.width,
      (wheelRadius * 2) / sprite.height,
    ),
    world: new Vector2(
      (wheelRadius * 2) / sprite.width,
      (wheelRadius * 2) / sprite.height,
    ),
  });
  world.addComponent(entity, spriteId, { ...sprite, tintColor: wheelColor });
  world.addComponent(entity, PhysicsBodyId, { physicsBody: body });
  addAngularVelocityMotorComponent(world, entity, {
    targetVelocity: 0,
    maxTorque: motorMaxTorque,
  });
  addWheelDriveComponent(world, entity, { throttleInput, maxWheelSpeed });

  return body;
}

function createSuspension(
  world: EcsWorld,
  chassisBody: RigidBody,
  wheelBody: RigidBody,
  chassisAnchor: Vector2,
): void {
  const entity = world.createEntity();

  addLinearSpringComponent(world, entity, {
    bodyA: chassisBody,
    bodyB: wheelBody,
    anchorA: chassisAnchor,
    stiffness: suspensionStiffness,
  });
  addLinearDamperComponent(world, entity, {
    bodyA: chassisBody,
    bodyB: wheelBody,
    anchorA: chassisAnchor,
    dampingCoefficient: suspensionDamping,
  });
}

/**
 * Builds a hill-climb-racer-style car: a chassis with two wheels hung
 * beneath it by `LinearSpring`/`LinearDamper` suspension (see the Linear
 * Spring and Damper demo), each wheel driven by an
 * `AngularVelocityMotorEcsComponent` whose target speed tracks
 * `throttleInput`. There's no rigid connection between the chassis and the
 * wheels beyond the springs, so the chassis is free to pitch under
 * acceleration and braking, the same "leaning" feel the genre is named for -
 * a light `ChassisStabilizerEcsComponent` only pulls it back level once
 * nothing else is actively tipping it.
 * @param world - The ECS world to add the car's entities to.
 * @param renderContext - The render context used to load sprites.
 * @param renderLayer - The render layer the car should be drawn on.
 * @param groundPosition - A point on the ground the car should spawn above.
 * @param throttleInput - Drives both wheels' motors: positive accelerates
 * forward, negative reverses/brakes.
 * @param restartInput - Teleports the car back to its spawn transform when
 * triggered (see `createCarResetEcsSystem`).
 * @returns The chassis's `RigidBody`, for the camera to follow.
 */
export async function createCar(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  groundPosition: Vector2,
  throttleInput: Axis1dAction,
  restartInput: TriggerAction,
): Promise<RigidBody> {
  const sprites = await loadCarSprites(renderContext, renderLayer);

  // Spawn the chassis slightly above its resting ride height so the car
  // visibly settles onto its suspension as the demo starts, without
  // starting so high that the initial impact injects a lot of energy into
  // the springs.
  const wheelSpawnDrop = wheelDropHeight - 8;
  const chassisPosition = groundPosition.add(
    new Vector2(0, wheelRadius + wheelDropHeight + chassisHeight / 2 + 10),
  );

  const chassisBody = new RigidBody({
    shape: PolygonShape.rectangle(chassisWidth, chassisHeight),
    position: chassisPosition,
    density: chassisDensity,
    friction: 0.4,
    restitution: 0.1,
    // The chassis is only ever connected to the ground through two
    // independently-solved springs (see the class doc), which converges
    // towards - but doesn't exactly enforce - a level chassis. Without any
    // angular drag, a small pitch imparted while settling onto the
    // suspension (or while landing after a jump) has nothing to bleed it
    // off and can persist indefinitely; a light drag lets the chassis
    // settle level again once nothing is actively pitching it.
    angularDrag: 1.5,
  });

  const chassisEntity = world.createEntity();

  world.addComponent(chassisEntity, positionId, {
    world: chassisPosition.clone(),
    local: chassisPosition.clone(),
  });
  world.addComponent(chassisEntity, rotationId, { local: 0, world: 0 });
  world.addComponent(chassisEntity, scaleId, {
    local: new Vector2(
      chassisWidth / sprites.chassis.width,
      chassisHeight / sprites.chassis.height,
    ),
    world: new Vector2(
      chassisWidth / sprites.chassis.width,
      chassisHeight / sprites.chassis.height,
    ),
  });
  world.addComponent(chassisEntity, spriteId, {
    ...sprites.chassis,
    tintColor: chassisColor,
  });
  world.addComponent(chassisEntity, PhysicsBodyId, {
    physicsBody: chassisBody,
  });

  const frontWheelPosition = chassisPosition
    .add(frontAnchor)
    .add(new Vector2(0, -wheelSpawnDrop));
  const rearWheelPosition = chassisPosition
    .add(rearAnchor)
    .add(new Vector2(0, -wheelSpawnDrop));

  const frontWheelBody = createWheel(
    world,
    sprites.wheel,
    frontWheelPosition,
    throttleInput,
  );
  const rearWheelBody = createWheel(
    world,
    sprites.wheel,
    rearWheelPosition,
    throttleInput,
  );

  createSuspension(world, chassisBody, frontWheelBody, frontAnchor);
  createSuspension(world, chassisBody, rearWheelBody, rearAnchor);

  const stabilizerEntity = world.createEntity();

  addChassisStabilizerComponent(world, stabilizerEntity, {
    body: chassisBody,
    levelingStiffness: chassisLevelingStiffness,
    levelingDamping: chassisLevelingDamping,
  });

  const resetBodies: CarResetBody[] = [
    {
      body: chassisBody,
      initialPosition: chassisPosition.clone(),
      initialAngle: 0,
    },
    {
      body: frontWheelBody,
      initialPosition: frontWheelPosition.clone(),
      initialAngle: 0,
    },
    {
      body: rearWheelBody,
      initialPosition: rearWheelPosition.clone(),
      initialAngle: 0,
    },
  ];

  const resetEntity = world.createEntity();

  addCarResetComponent(world, resetEntity, {
    restartInput,
    bodies: resetBodies,
  });

  return chassisBody;
}
