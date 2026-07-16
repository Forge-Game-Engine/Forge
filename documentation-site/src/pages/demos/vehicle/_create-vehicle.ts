import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addWheelMotorComponent,
  CircleShape,
  PhysicsBodyId,
  PhysicsWorld,
  PolygonShape,
  RigidBody,
  SpringJoint,
} from '@forge-game-engine/forge/physics';
import {
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

// The chassis's physics collision box. Deliberately kept smaller than the
// car-body.png sprite it's paired with (see chassisSpriteSize below): every
// force in createVehicleControlEcsSystem was tuned against this box's mass
// and moment of inertia, so it's left alone when the sprite changes, and the
// sprite is instead drawn larger than it via a render-only offset.
const chassisWidth = 110;
const chassisHeight = 32;
// Exported so createVehicleControlEcsSystem can derive each wheel's visual
// spin speed from the chassis's actual velocity (rolling without slipping),
// rather than an independent, disconnected spin speed.
export const wheelRadius = 22;
// car-body.png's two wheel arches sit at pixel x=118 and x=572 of its 691px
// width (measured by hand against the source art), 227px either side of the
// image's own center. Scaled by the same pixels-per-world-unit ratio used
// for the wheel (see chassisSpriteSize below, 44 world units / 126px), that
// spacing is ~79 world units, so this is set to match: with any other
// value, the separately-rendered wheelSprite no longer lines up with the
// arch drawn into the chassis sprite. Exported so
// createVehicleControlEcsSystem knows each wheel's intended horizontal
// offset from the chassis, for the positional correction that keeps it from
// drifting sideways (see that system for why).
export const wheelOffsetX = 79;
const wheelDensity = 0.5;
// The distance the SpringJoint targets between each wheel and its chassis
// anchor. Under the chassis's weight the joint settles measurably short of
// this (a soft spring inherently sags under load), so this is deliberately
// set well above chassisHeight / 2 + wheelRadius (the distance at which the
// wheel and chassis body would just touch with no overlap) rather than
// exactly at it. Exported so createVehicleControlEcsSystem's positional
// correction targets the same distance the joint itself is aiming for.
export const suspensionRestLength = 70;
const suspensionStiffness = 100_000;
const suspensionDamping = 16_000;
const wheelFriction = 1;

// car-body.png is drawn much taller (694x194) than the tuned physics
// collision box above, with its wheel arches close to the image's bottom
// edge; a wheel that fills its arch nicely (measured by hand against the
// source art) is ~126px across. Scaling the whole image so that 126px maps
// to the wheel's actual world diameter (2 * wheelRadius) keeps the wheel
// sprite (sized off wheelRadius, below) a snug fit inside the drawn arch.
const chassisSpriteScale = (wheelRadius * 2) / 126;
export const chassisSpriteSize = new Vector2(691, 194).multiply(
  chassisSpriteScale,
);
// The two arches sit ~47px (image-space) below car-body.png's own vertical
// center, which is only ~16 world units once scaled, well short of
// suspensionRestLength (55): the sprite needs to be drawn that much further
// below the chassis's physics position for its arches to land on the
// actual wheels. Purely a render-time offset (see
// createChassisSpriteOffsetEcsSystem): the physics collision box above is
// untouched by it.
export const chassisSpriteRenderOffset = new Vector2(
  0,
  -(suspensionRestLength - 47 * chassisSpriteScale),
);

/**
 * The two motorized wheel bodies driving the vehicle, in creation order
 * (rear, then front). Exposed so a drive-input system can set both wheels'
 * `WheelMotorEcsComponent.targetAngularVelocity` in lockstep.
 */
export interface Vehicle {
  /** The vehicle's body, suspended above its wheels by `SpringJoint`s. */
  chassis: RigidBody;
  /**
   * The chassis's entity id, so a render-only offset system can nudge its
   * sprite into alignment with the wheels below without affecting physics.
   */
  chassisEntity: number;
  /** The vehicle's wheels, in creation order (rear, then front). */
  wheels: RigidBody[];
}

function addRenderedBodyEntity(
  world: EcsWorld,
  rigidBody: RigidBody,
  sprite: SpriteEcsComponent,
  spriteSize: Vector2,
): number {
  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    world: rigidBody.position.clone(),
    local: rigidBody.position.clone(),
  });
  world.addComponent(entity, rotationId, { local: 0, world: 0 });
  world.addComponent(entity, scaleId, {
    local: new Vector2(
      spriteSize.x / sprite.width,
      spriteSize.y / sprite.height,
    ),
    world: new Vector2(
      spriteSize.x / sprite.width,
      spriteSize.y / sprite.height,
    ),
  });
  world.addComponent(entity, spriteId, sprite);
  world.addComponent(entity, PhysicsBodyId, { physicsBody: rigidBody });

  return entity;
}

/**
 * Creates a car: a chassis and two wheels, each wheel attached to the
 * chassis by a single `SpringJoint` and driven by `WheelMotorEcsComponent`.
 * @param world - The ECS world to add the vehicle's entities to.
 * @param physicsWorld - The physics world to register the suspension joints
 * with directly, since joints have no ECS component of their own.
 * @param renderContext - The render context used to load the vehicle's
 * sprites.
 * @param renderLayer - The render layer the vehicle should be drawn on.
 * @param groundY - The ground height, in world units, at the vehicle's
 * starting x position, so it can be dropped in just above the terrain.
 * @returns The vehicle's chassis and wheel bodies.
 */
export async function createVehicle(
  world: EcsWorld,
  physicsWorld: PhysicsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  groundY: number,
): Promise<Vehicle> {
  const [chassisImage, wheelImage] = await Promise.all([
    renderContext.imageCache.getOrLoad(getAssetUrl('img/car/car-body.png')),
    renderContext.imageCache.getOrLoad(getAssetUrl('img/car/car-wheel.png')),
  ]);

  const chassisSprite = createImageSprite(
    chassisImage,
    renderContext,
    renderLayer,
  );

  const wheelSprite = createImageSprite(
    wheelImage,
    renderContext,
    renderLayer,
  );

  const wheelCenterY = groundY + wheelRadius;
  const chassisStartY = wheelCenterY + suspensionRestLength;
  const chassis = new RigidBody({
    shape: PolygonShape.rectangle(chassisWidth, chassisHeight),
    position: new Vector2(0, chassisStartY),
    density: 1,
  });

  const chassisEntity = addRenderedBodyEntity(
    world,
    chassis,
    chassisSprite,
    chassisSpriteSize,
  );

  const wheels: RigidBody[] = [];

  for (const offsetX of [-wheelOffsetX, wheelOffsetX]) {
    const wheel = new RigidBody({
      shape: new CircleShape(wheelRadius),
      position: new Vector2(offsetX, wheelCenterY),
      density: wheelDensity,
      friction: wheelFriction,
    });

    const entity = addRenderedBodyEntity(
      world,
      wheel,
      wheelSprite,
      new Vector2(wheelRadius * 2, wheelRadius * 2),
    );

    // Overridden every tick by createVehicleControlEcsSystem, which grants
    // the motor its full torque budget only while actively driving.
    addWheelMotorComponent(world, entity, {
      targetAngularVelocity: 0,
      maxTorque: 1,
    });

    // A single SpringJoint per wheel: simpler and more stable than the
    // two-joint anti-swing strut described in the Joints guide, at the cost
    // of letting each wheel swing slightly fore-aft on bumps rather than
    // staying strictly vertical, an acceptable trade for this demo's low,
    // wide chassis.
    physicsWorld.addJoint(
      new SpringJoint({
        bodyA: chassis,
        bodyB: wheel,
        anchorA: new Vector2(offsetX, 0),
        restLength: suspensionRestLength,
        stiffness: suspensionStiffness,
        damping: suspensionDamping,
      }),
    );
    wheels.push(wheel);
  }

  return { chassis, chassisEntity, wheels };
}
