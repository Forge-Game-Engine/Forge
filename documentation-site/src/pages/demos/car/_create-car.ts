import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction, TriggerAction } from '@forge-game-engine/forge/input';
import { degreesToRadians, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAngularVelocityMotorComponent,
  addColliderComponent,
  addContactsComponent,
  addGravityComponent,
  addLinearDamperComponent,
  addLinearSpringComponent,
  addPrismaticJointComponent,
  addRevoluteJointComponent,
  addRigidBodyComponent,
  CircleCollider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addAirControlComponent } from './_air-control.component';
import { addCarResetComponent, CarResetBody } from './_car-reset.component';
import { addChassisStabilizerComponent } from './_chassis-stabilizer.component';
import {
  addGroundContactComponent,
  GroundContactEcsComponent,
} from './_ground-contact.component';
import { addWheelDriveComponent } from './_wheel-drive.component';

const gravity = { x: 0, y: -600 };

// The chassis is the heaviest body in the car, so it has enough rotational
// inertia to absorb the wheels' drive torque instead of flipping forward.
const chassisWidth = 450;
const chassisHeight = 150;
const chassisDensity = 0.5;

const wheelRadius = 100;
const wheelDensity = 0.2;
const wheelFriction = 1;

// Each wheel hangs from a small, invisible "upright" (a wheel hub). Its mass
// is kept close to the wheel's: a near-massless body between two heavy ones
// makes the joint solvers unstable.
const uprightRadius = 8;
const uprightDensity = 80;

// Suspension anchors, in the chassis's local space.
const frontAnchor = { x: chassisWidth / 2 - 115, y: -chassisHeight / 2 };
const rearAnchor = { x: -(chassisWidth / 2 - 115), y: -chassisHeight / 2 };

// The suspension axes splay outwards like a monster truck's, so a head-on
// impact is partly absorbed by the spring instead of the rigid joint.
const frontSuspensionAxis = Vec2.rotate(Vec2.up, degreesToRadians(35));
const rearSuspensionAxis = Vec2.rotate(Vec2.up, degreesToRadians(-35));

// How far below its anchor a wheel starts. This becomes the springs' rest
// length.
const wheelDropHeight = 25;

// Soft enough that the joints, not the spring, hold the wheel in line. A
// stiffer spring fights the joints and can launch the car on hard landings.
const suspensionStiffness = 1_000_000;
const suspensionDamping = 165_000;

// More torque than the tires can use, so grip (friction) is what limits
// acceleration. `maxWheelSpeed` means "as fast as grip allows";
// `maxSlipAngularSpeed` stops an airborne wheel from spinning up uselessly.
const motorMaxTorque = 25_500_000_000;
const maxWheelSpeed = 350;
const maxSlipAngularSpeed = 6;

// Pulls the chassis back to level on the ground, but far weaker than the
// lean from accelerating or braking.
const chassisLevelingStiffness = 300_000_000;
const chassisLevelingDamping = 40_000_000;

// Mid-air pitch control: the chassis's target spin speed at full throttle,
// and the torque spent reaching it.
const airControlMaxAngularSpeed = 3.5;
const airControlMaxTorque = 8_000_000_000;

interface CarSprites {
  chassis: SpriteEcsComponent;
  wheel: SpriteEcsComponent;
}

/**
 * A wheel's entity and its ground contact, which the chassis's stabilizer
 * and air control read to know whether the car is airborne.
 */
interface Wheel {
  entity: number;
  groundContact: GroundContactEcsComponent;
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

async function loadCarSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<CarSprites> {
  const { textureCache } = renderContext;

  const [chassisTexture, wheelTexture] = await Promise.all([
    textureCache.getOrLoad(getAssetUrl('img/car/car-body.png')),
    textureCache.getOrLoad(getAssetUrl('img/car/car-wheel.png')),
  ]);

  return {
    chassis: {
      ...createImageSprite(chassisTexture, {
        pixelsPerUnit: 1,
      }),
      category: renderLayer,
    },
    wheel: {
      ...createImageSprite(wheelTexture, {
        pixelsPerUnit: 1,
      }),
      category: renderLayer,
    },
  };
}

/**
 * Creates a motor-driven wheel that tracks what it's touching.
 */
function createWheel(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  throttleInput: Axis1dAction,
  chassisEntity: number,
  maxTorqueMultiplier: number = 1,
): Wheel {
  const entity = world.createEntity();
  const wheelCollider = new CircleCollider(wheelRadius, wheelDensity);

  addPositionComponent(world, entity, {
    local: Vec2.clone(position),
  });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, {
    ...sprite,
    width: wheelRadius * 2,
    height: wheelRadius * 2,
    layer: 1,
  });
  addColliderComponent(world, entity, {
    collider: wheelCollider,
    friction: wheelFriction,
    restitution: 0.1,
  });
  addRigidBodyComponent(world, entity);
  addGravityComponent(world, entity, { amount: gravity });
  addAngularVelocityMotorComponent(world, entity, {
    targetVelocity: 0,
    maxTorque: motorMaxTorque * maxTorqueMultiplier,
  });
  addWheelDriveComponent(world, entity, {
    throttleInput,
    chassisEntity,
    wheelRadius,
    maxWheelSpeed,
    maxSlipAngularSpeed,
    maxTorque: motorMaxTorque * maxTorqueMultiplier,
  });

  // Lets the ground-contact system see what this wheel is touching.
  addContactsComponent(world, entity);
  const groundContact = addGroundContactComponent(world, entity);

  return { entity, groundContact };
}

/**
 * Mounts a wheel to the chassis through an invisible upright:
 * - a prismatic joint lets the upright slide only along `suspensionAxis`,
 * - a revolute joint pins the wheel to the upright but leaves it free to
 *   spin,
 * - a spring and damper along the same axis are the suspension.
 *
 * Joining the wheel to the chassis directly doesn't work: a revolute joint
 * alone has no suspension travel, and a prismatic joint alone would stop
 * the wheel from spinning.
 * @returns The upright's entity, so the car reset can move it too.
 */
function createWheelMount(
  world: EcsWorld,
  chassisEntity: number,
  wheelEntity: number,
  chassisAnchor: Vector2,
  uprightPosition: Vector2,
  suspensionAxis: Vector2 = Vec2.up,
): number {
  const uprightEntity = world.createEntity();
  const uprightCollider = new CircleCollider(uprightRadius, uprightDensity);

  addPositionComponent(world, uprightEntity, {
    local: Vec2.clone(uprightPosition),
  });
  addRotationComponent(world, uprightEntity);
  // The upright takes its mass from this collider, whose mask of 0 keeps it
  // from colliding with anything.
  addColliderComponent(world, uprightEntity, {
    collider: uprightCollider,
    mask: 0,
  });
  addRigidBodyComponent(world, uprightEntity);
  addGravityComponent(world, uprightEntity, { amount: gravity });

  const prismaticEntity = world.createEntity();

  addPrismaticJointComponent(world, prismaticEntity, {
    entityA: chassisEntity,
    entityB: uprightEntity,
    localAnchorA: chassisAnchor,
    axis: suspensionAxis,
  });

  const revoluteEntity = world.createEntity();

  addRevoluteJointComponent(world, revoluteEntity, {
    entityA: uprightEntity,
    entityB: wheelEntity,
  });

  const springEntity = world.createEntity();

  addLinearSpringComponent(world, springEntity, {
    entityA: chassisEntity,
    entityB: uprightEntity,
    localAnchorA: chassisAnchor,
    stiffness: suspensionStiffness,
  });
  addLinearDamperComponent(world, springEntity, {
    entityA: chassisEntity,
    entityB: uprightEntity,
    localAnchorA: chassisAnchor,
    dampingCoefficient: suspensionDamping,
  });

  return uprightEntity;
}

/**
 * Builds the car: a chassis with two motor-driven wheels on spring
 * suspension, plus the components that keep it level, steer it in mid-air
 * and reset it.
 * @param world - The ECS world to add the car's entities to.
 * @param renderContext - The render context used to load sprites.
 * @param renderLayer - The render layer the car is drawn on.
 * @param groundPosition - A point on the ground to spawn the car above.
 * @param throttleInput - Positive drives forward, negative brakes/reverses.
 * @param restartInput - Moves the car back to its spawn point.
 * @returns The chassis's entity, for the camera to follow.
 */
export async function createCar(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  groundPosition: Vector2,
  throttleInput: Axis1dAction,
  restartInput: TriggerAction,
): Promise<number> {
  const sprites = await loadCarSprites(renderContext, renderLayer);

  // Spawn slightly above ride height so the car visibly settles onto its
  // suspension.
  const wheelSpawnDrop = wheelDropHeight - 8;
  const chassisPosition = Vec2.add(Vec2.clone(groundPosition), {
    x: 0,
    y: wheelRadius + wheelDropHeight + chassisHeight / 2 + 100,
  });

  const chassisEntity = world.createEntity();
  const chassisCollider = new PolygonCollider(
    rectangleVertices(chassisWidth, chassisHeight),
    chassisDensity,
  );

  addPositionComponent(world, chassisEntity, {
    local: Vec2.clone(chassisPosition),
  });
  addRotationComponent(world, chassisEntity);
  addSpriteComponent(world, chassisEntity, {
    ...sprites.chassis,
    width: chassisWidth,
    height: chassisHeight,
  });
  addColliderComponent(world, chassisEntity, {
    collider: chassisCollider,
    friction: 0,
    restitution: 0.1,
  });
  addRigidBodyComponent(world, chassisEntity, {
    // A little drag so pitch from landings dies out over time.
    angularDrag: 0.5,
  });
  addGravityComponent(world, chassisEntity, { amount: gravity });

  // Each wheel spawns on its tilted suspension axis, so the joint doesn't
  // yank it sideways in the first frames.
  const frontWheelPosition = Vec2.add(
    Vec2.add(
      Vec2.add(Vec2.clone(chassisPosition), frontAnchor),
      Vec2.multiply(Vec2.clone(frontSuspensionAxis), -wheelSpawnDrop),
    ),
    { x: 0, y: -wheelRadius },
  );
  const rearWheelPosition = Vec2.add(
    Vec2.add(
      Vec2.add(Vec2.clone(chassisPosition), rearAnchor),
      Vec2.multiply(Vec2.clone(rearSuspensionAxis), -wheelSpawnDrop),
    ),
    { x: 0, y: -wheelRadius },
  );

  // Rear-wheel biased: the front wheel gets half the torque.
  const frontWheel = createWheel(
    world,
    sprites.wheel,
    frontWheelPosition,
    throttleInput,
    chassisEntity,
    0.5,
  );
  const rearWheel = createWheel(
    world,
    sprites.wheel,
    rearWheelPosition,
    throttleInput,
    chassisEntity,
    1,
  );

  const frontUprightEntity = createWheelMount(
    world,
    chassisEntity,
    frontWheel.entity,
    frontAnchor,
    frontWheelPosition,
    frontSuspensionAxis,
  );
  const rearUprightEntity = createWheelMount(
    world,
    chassisEntity,
    rearWheel.entity,
    rearAnchor,
    rearWheelPosition,
    rearSuspensionAxis,
  );

  // Both need to know whether either wheel is on the ground, so they hold
  // the wheels' ground-contact components directly.
  const chassisControlEntity = world.createEntity();

  addChassisStabilizerComponent(world, chassisControlEntity, {
    chassisEntity,
    frontWheelGroundContact: frontWheel.groundContact,
    rearWheelGroundContact: rearWheel.groundContact,
    levelingStiffness: chassisLevelingStiffness,
    levelingDamping: chassisLevelingDamping,
  });

  addAirControlComponent(world, chassisControlEntity, {
    chassisEntity,
    throttleInput,
    frontWheelGroundContact: frontWheel.groundContact,
    rearWheelGroundContact: rearWheel.groundContact,
    maxAngularSpeed: airControlMaxAngularSpeed,
    maxTorque: airControlMaxTorque,
  });

  const resetBodies: CarResetBody[] = [
    {
      entity: chassisEntity,
      initialPosition: Vec2.clone(chassisPosition),
      initialAngle: 0,
    },
    {
      entity: frontWheel.entity,
      initialPosition: Vec2.clone(frontWheelPosition),
      initialAngle: 0,
    },
    {
      entity: rearWheel.entity,
      initialPosition: Vec2.clone(rearWheelPosition),
      initialAngle: 0,
    },
    {
      entity: frontUprightEntity,
      initialPosition: Vec2.clone(frontWheelPosition),
      initialAngle: 0,
    },
    {
      entity: rearUprightEntity,
      initialPosition: Vec2.clone(rearWheelPosition),
      initialAngle: 0,
    },
  ];

  const resetEntity = world.createEntity();

  addCarResetComponent(world, resetEntity, {
    restartInput,
    bodies: resetBodies,
  });

  return chassisEntity;
}
