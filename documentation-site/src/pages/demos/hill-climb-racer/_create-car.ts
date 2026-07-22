import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction, TriggerAction } from '@forge-game-engine/forge/input';
import { degreesToRadians, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAngularVelocityMotorComponent,
  addLinearDamperComponent,
  addLinearSpringComponent,
  addPrismaticJointComponent,
  addRevoluteJointComponent,
  CircleShape,
  PhysicsBodyId,
  PolygonShape,
  PrismaticJoint,
  RevoluteJoint,
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
import { addAirControlComponent } from './_air-control.component';
import { addCarResetComponent, CarResetBody } from './_car-reset.component';
import { addChassisStabilizerComponent } from './_chassis-stabilizer.component';
import {
  addGroundContactComponent,
  GroundContactEcsComponent,
} from './_ground-contact.component';
import { addWheelDriveComponent } from './_wheel-drive.component';

const chassisWidth = 450;
const chassisHeight = 150;

// With the wheel/upright mass this rig needs for stable joints (see
// `uprightDensity` below), a chassis this light ends up the *lightest*
// individual body in the car - `chassisWidth * chassisHeight *
// chassisDensity` is only ~23,600 against ~15,700 per wheel and ~16,100 per
// upright, i.e. under a third of the car's total mass, when in a real car
// the body (chassis + engine) dwarfs the wheels. A chassis that light has
// little rotational inertia to resist the torque the drive wheels'
// ground-friction reaction transmits back through the suspension anchors
// (see `createWheelMount`'s comment on that coupling) - accelerating hard,
// especially uphill, could tip it into an uncontrolled forward pitch
// (front digging in, the opposite of the intended throttle-lean) that then
// only compounded once it went airborne. Raising `chassisDensity` so the
// chassis is comfortably the heaviest single body (now ~56% of total mass)
// gives it enough of its own rotational inertia to absorb that reaction
// smoothly instead of snapping into it - confirmed empirically (accelerate
// from a stop, sustain it uphill, brake hard) that this removes the
// unwanted forward pitch while still leaving the deliberately weaker
// stoppie-under-hard-braking-at-speed rotation clearly intact, and barely
// changes resting suspension sag.
const chassisDensity = 1.2;
const chassisColor = Color.fromHSLA(8, 85, 55);

const wheelRadius = 100;
const wheelDensity = 0.5;

// Slightly below the wheel-ground friction a bare tire/asphalt pairing
// would use (`1`, still the historical default here) - the peak transient
// slip right as full throttle is first requested (before the wheel's spin
// catches up to the car's speed) briefly demands close to this much
// friction force at the contact patch, and with `chassisDensity` this low
// used to translate a chunk of that force into unwanted chassis rotation
// via the tilted suspension anchors. A little less peak grip there,
// combined with the heavier chassis above, was enough (empirically) to
// keep that transient from reaching the chassis at all, without making the
// car noticeably harder to accelerate or climb with once rolling.
const wheelFriction = 0.8;
const wheelColor = Color.fromHSLA(220, 15, 20);

// The wheel doesn't mount to the chassis directly. A single LinearSpring
// only constrains a wheel's *distance* from its anchor, leaving it free to
// swing around that anchor like a pendulum - and a plain RevoluteJoint or
// PrismaticJoint wired straight to the wheel isn't right either: a
// RevoluteJoint would pin the wheel rigidly in place (no suspension travel
// at all), and a PrismaticJoint locks the two bodies' *relative rotation*
// (it captures a referenceAngle and holds it), which would lock the
// wheel's spin to the chassis and make driving impossible.
//
// Instead each wheel gets a small intermediate "upright" body (a real car's
// wheel hub/knuckle) invisible and non-colliding (`isSensor: true`),
// connected two different ways:
//  - A PrismaticJoint pins the upright to the chassis, free to slide only
//    along `suspensionAxis` (in the chassis's local space) - this is the
//    suspension's travel, and it's fine that the joint locks the upright's
//    rotation to the chassis's, since the upright itself never needs to
//    spin.
//  - A RevoluteJoint pins the wheel's position to the upright (coincident
//    centers) while leaving rotation completely free, so the wheel can
//    still spin for driving.
// A LinearSpring/LinearDamper pair along the same axis, between the
// chassis and the upright, then provides the suspension's actual force.
// Unlike a spring alone, both joints are hard, iteratively-solved
// constraints (solved every physics solver iteration, the same as collision
// contacts) with no lateral give of their own - so the wheel only ever
// moves along `suspensionAxis` relative to the chassis, no swinging.
// A tiny, near-massless upright (relative to the wheel and chassis it sits
// between) makes both joint solvers badly ill-conditioned: resolving a
// wheel-ground collision impulse through a light body sandwiched between
// two much heavier ones (the wheel at one joint, the chassis at the other)
// blows up within a couple of iterations. Keeping the upright's mass close
// to the wheel's (`wheelRadius * wheelRadius * Math.PI * wheelDensity`,
// currently ~15,700) keeps both joints' effective mass ratios reasonable -
// `uprightDensity` has to scale with `wheelRadius`/`wheelDensity` to hold
// that, since the upright's own radius stays small and unnoticeable.
const uprightRadius = 8;
const uprightDensity = 80;

// Anchors are in the chassis's local space: roughly at the bottom corners,
// inset a bit so the wheels sit under the body rather than past its edges.
const frontAnchor = new Vector2(chassisWidth / 2 - 115, -chassisHeight / 2);
const rearAnchor = new Vector2(-(chassisWidth / 2 - 115), -chassisHeight / 2);

// Each wheel is constrained (via its mount's PrismaticJoint - see
// `createWheelMount`) to slide only along this axis relative to its
// anchor, so tilting it away from straight-up/down carries the wheel
// itself further out from the chassis than its anchor: the line connecting
// each anchor to its wheel splays outward into a trapezoid rather than a
// rectangle, like a monster truck's lifted suspension. This also means an
// impact that's perpendicular to the chassis (hitting a wall or ledge
// face-on) now has a component along the suspension axis for the spring to
// absorb, instead of landing entirely on the joint's hard, unsprung
// constraint.
const frontSuspensionAxis = Vector2.up.rotate(degreesToRadians(35));
const rearSuspensionAxis = Vector2.up.rotate(degreesToRadians(-35));

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
const wheelDropHeight = 65;

// Chosen so the car's weight compresses each suspension by a small fraction
// of `wheelDropHeight` at rest (leaving visible, but bounded, suspension
// travel) rather than anywhere close to all the way to the chassis anchor.
// Kept well below the stiffness a spring-only mount would want: the
// PrismaticJoint/RevoluteJoint pair already hard-constrains everything but
// the vertical travel every solver iteration, so a stiffer spring on top of
// that mostly ends up fighting the joints instead of damping out - a wheel
// slamming into the ground can end up launching the whole car into the air
// instead of just compressing the suspension.
//
// Being stable *at rest* isn't enough to verify this against: with
// `frontSuspensionAxis`/`rearSuspensionAxis` tilted rather than vertical,
// each wheel's ground-friction reaction force has a component along that
// wheel's own axis, so accelerating or braking couples horizontal force
// into each suspension corner's loading, not just vertical weight. The two
// corners have no shared geometry (no anti-roll bar, no rigid axle) tying
// their loading together, only independent springs - so under hard
// driving torque this coupling is enough for one corner to unload faster
// than the other can compensate, letting that wheel lift off entirely and
// the chassis pitch hard, without player input, while still grounded. Raising
// stiffness to shrink the *resting* sag (as this was previously tuned to
// do) only pushes that dynamic imbalance further out of the range this
// rig's independent-spring, no-shared-axle suspension can absorb - the
// resting sag it leaves is a real trade-off, not a leftover to tune away.
// Verify empirically against *driving* stability (accelerate from a stop,
// sustain it, brake hard), not just resting stability, before changing
// this.
const suspensionStiffness = 1_000_000;
const suspensionDamping = 165_000;

// A hill-climb-racer engine is meant to feel overpowered enough to punch
// through bumps and keep climbing rather than stalling on them.
// `motorMaxTorque` is scaled up to match the car's current total mass:
// raising `uprightDensity` to fix the wheel-mount mass ratio (see its
// comment above) added a lot of mass that wasn't here when this was last
// tuned - each upright went from ~1,200 to ~16,000, roughly a 50% increase
// in the whole car's mass - and without a matching torque increase the
// drivetrain no longer had enough force to meaningfully accelerate it.
// Confirmed empirically that the car was still torque-limited (not just
// grip-limited) at that scaled-up value - doubling it again visibly sped up
// both the wheels' own spin-up and the chassis's acceleration, rather than
// just wasting the extra torque as more wheel spin, so it was raised
// further. Tested up to 3x this value too: that made launches snappier
// still, but also made hard braking's chassis dive noticeably harder
// (pushing back towards the exaggerated flip a previous fix addressed) for
// only a marginal further gain in sustained speed - this is the point
// past which more torque stops being "more power" and starts being "less
// control."
//
// Raising `chassisDensity` (see its comment above, fixing an unwanted
// forward-pitch-under-throttle bug) added roughly another 66% to the car's
// total mass on top of that - scaled up again by the same ratio to keep
// the previously-tuned acceleration feel rather than let the extra weight
// quietly turn "overpowered" back into "sluggish."
//
// `maxWheelSpeed` is deliberately far higher than the car could ever
// actually roll at - `WheelDriveEcsComponent.maxSlipAngularSpeed` is what
// actually keeps a wheel grounded in reality (see its comment), by
// clamping the target this produces to a bounded slip band around the
// wheel's *current* rolling speed. That clamp is what matters; this is
// just "go as fast as grip allows", not a speed the wheel is meant to
// reach unassisted.
const motorMaxTorque = 20_300_000_000;
const maxWheelSpeed = 350;

// How far past a wheel's current rolling speed its target is allowed to
// stray (see `WheelDriveEcsComponent.maxSlipAngularSpeed`) - generous
// enough for a deliberate wheel spin launch from a stop, bounded enough that
// a wheel briefly unloaded by the chassis's throttle-lean can't run away to
// `maxWheelSpeed` and waste torque spinning uselessly fast instead of
// quickly regaining grip once it lands.
const maxSlipAngularSpeed = 6;

// See `ChassisStabilizerEcsComponent` for why this exists. Strong enough to
// pull the chassis back to (roughly) level within a second or two of
// nothing else disturbing it, but still far weaker than the pitch torque a
// hard acceleration or brake produces, so the car still visibly leans under
// throttle.
const chassisLevelingStiffness = 300_000_000;
const chassisLevelingDamping = 40_000_000;

// The chassis's target angular speed at full throttle while airborne, and
// the torque budget `AirControlEcsComponent` spends chasing it - the
// classic Hill Climb Racer "tilt in mid-air" control, gas pitching the nose
// up and back, brake pitching it down and forward. Targeting a speed
// (rather than just applying a constant torque) gives the player direct,
// bounded control: releasing the input targets zero rotation and actively
// cancels existing spin instead of coasting on whatever momentum was built
// up. `airControlMaxTorque` is high enough (matching the chassis's
// `chassisDensity`-driven moment of inertia) to reach `airControlMaxAngularSpeed`
// within a few tenths of a second, so input reads as immediate rather than
// a slow wind-up.
const airControlMaxAngularSpeed = 3.5;
const airControlMaxTorque = 8_000_000_000;

interface CarSprites {
  chassis: SpriteEcsComponent;
  wheel: SpriteEcsComponent;
}

/**
 * A driven wheel's `RigidBody` alongside the `GroundContactEcsComponent`
 * tracking its own grounded state - `createWheel` attaches the latter
 * directly to the wheel's entity (so `WheelDriveEcsSystem` can query it
 * jointly), and returns it too so `createCar` can hand the same object by
 * reference to `AirControlEcsComponent`/`ChassisStabilizerEcsComponent`,
 * which live on the chassis's entity and need to read both wheels' grounded
 * state.
 */
interface Wheel {
  body: RigidBody;
  groundContact: GroundContactEcsComponent;
}

async function loadCarSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<CarSprites> {
  const { imageCache } = renderContext;

  const [chassisImage, wheelImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/car/car-body.png')),
    imageCache.getOrLoad(getAssetUrl('img/car/car-wheel.png')),
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
  chassisBody: RigidBody,
): Wheel {
  const body = new RigidBody({
    shape: new CircleShape(wheelRadius),
    position,
    density: wheelDensity,
    friction: wheelFriction,
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
  addWheelDriveComponent(world, entity, {
    throttleInput,
    chassisBody,
    wheelRadius,
    maxWheelSpeed,
    maxSlipAngularSpeed,
    maxTorque: motorMaxTorque,
  });

  const groundContact = addGroundContactComponent(world, entity, { body });

  return { body, groundContact };
}

/**
 * Mounts `wheelBody` to `chassisBody` at `chassisAnchor` through an
 * intermediate "upright" body (see the module doc comment above for why:
 * a PrismaticJoint constrains the upright to slide only along
 * `suspensionAxis` relative to the chassis, a RevoluteJoint pins the wheel
 * to that upright with its rotation left free, and a LinearSpring/
 * LinearDamper pair along the same axis supplies the suspension force).
 * @param world - The ECS world to add the mount's entities to.
 * @param chassisBody - The chassis the wheel mounts to.
 * @param wheelBody - The wheel being mounted.
 * @param chassisAnchor - Where on the chassis (in its local space) the
 * upright's PrismaticJoint and the spring/damper attach.
 * @param uprightPosition - The upright's initial world-space position,
 * directly below `chassisAnchor` by the suspension's rest length.
 * @returns The upright's `RigidBody`, so it can be included alongside the
 * chassis and wheel in `CarResetEcsComponent.bodies`.
 */
function createWheelMount(
  world: EcsWorld,
  chassisBody: RigidBody,
  wheelBody: RigidBody,
  chassisAnchor: Vector2,
  uprightPosition: Vector2,
  suspensionAxis: Vector2 = Vector2.up,
): RigidBody {
  const uprightBody = new RigidBody({
    shape: new CircleShape(uprightRadius),
    position: uprightPosition,
    density: uprightDensity,
    isSensor: true,
  });

  const uprightEntity = world.createEntity();

  world.addComponent(uprightEntity, positionId, {
    world: uprightPosition.clone(),
    local: uprightPosition.clone(),
  });
  world.addComponent(uprightEntity, rotationId, { local: 0, world: 0 });
  world.addComponent(uprightEntity, PhysicsBodyId, {
    physicsBody: uprightBody,
  });

  const prismaticJoint = new PrismaticJoint({
    bodyA: chassisBody,
    bodyB: uprightBody,
    anchorA: chassisAnchor,
    axis: suspensionAxis,
  });

  const prismaticEntity = world.createEntity();

  addPrismaticJointComponent(world, prismaticEntity, {
    joint: prismaticJoint,
  });

  const revoluteJoint = new RevoluteJoint({
    bodyA: uprightBody,
    bodyB: wheelBody,
  });

  const revoluteEntity = world.createEntity();

  addRevoluteJointComponent(world, revoluteEntity, { joint: revoluteJoint });

  const springEntity = world.createEntity();

  addLinearSpringComponent(world, springEntity, {
    bodyA: chassisBody,
    bodyB: uprightBody,
    anchorA: chassisAnchor,
    stiffness: suspensionStiffness,
  });
  addLinearDamperComponent(world, springEntity, {
    bodyA: chassisBody,
    bodyB: uprightBody,
    anchorA: chassisAnchor,
    dampingCoefficient: suspensionDamping,
  });

  return uprightBody;
}

/**
 * Builds a hill-climb-racer-style car: a chassis with two wheels mounted
 * beneath it (see `createWheelMount`), each driven by an
 * `AngularVelocityMotorEcsComponent` whose target speed tracks
 * `throttleInput`. The mount constrains a wheel to only slide vertically
 * relative to the chassis - it's the LinearSpring/LinearDamper providing
 * that mount's force (not a rigid frame) that lets the chassis pitch under
 * acceleration and braking, the same "leaning" feel the genre is named for
 * - a light `ChassisStabilizerEcsComponent` only pulls it back level once
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
    // Each wheel mount's PrismaticJoint hard-constrains it against
    // swinging (see the module doc comment above), so this isn't
    // compensating for that the way it originally was - it's just a
    // small amount of drag so any pitch imparted while settling onto the
    // suspension (or while landing after a jump) damps out over time
    // instead of persisting indefinitely.
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

  // Offset along the same tilted axis each wheel's mount constrains it to
  // (see `frontSuspensionAxis`/`rearSuspensionAxis`), not straight down, so
  // the wheel spawns already on its PrismaticJoint's constraint line
  // instead of being yanked sideways onto it over the first few frames.
  const frontWheelPosition = chassisPosition
    .add(frontAnchor)
    .add(frontSuspensionAxis.multiply(-wheelSpawnDrop));
  const rearWheelPosition = chassisPosition
    .add(rearAnchor)
    .add(rearSuspensionAxis.multiply(-wheelSpawnDrop));

  const frontWheel = createWheel(
    world,
    sprites.wheel,
    frontWheelPosition,
    throttleInput,
    chassisBody,
  );
  const rearWheel = createWheel(
    world,
    sprites.wheel,
    rearWheelPosition,
    throttleInput,
    chassisBody,
  );
  const frontWheelBody = frontWheel.body;
  const rearWheelBody = rearWheel.body;

  const frontUprightBody = createWheelMount(
    world,
    chassisBody,
    frontWheelBody,
    frontAnchor,
    frontWheelPosition,
    frontSuspensionAxis,
  );
  const rearUprightBody = createWheelMount(
    world,
    chassisBody,
    rearWheelBody,
    rearAnchor,
    rearWheelPosition,
    rearSuspensionAxis,
  );

  // Both live on this one entity so they're easy to find alongside each
  // other, though neither is queried jointly with the other - each just
  // holds direct references to `frontWheel.groundContact`/
  // `rearWheel.groundContact` (see `AirControlEcsComponent`/
  // `ChassisStabilizerEcsComponent`'s doc comments for why: those
  // components live on the chassis's entity, not either wheel's, so an ECS
  // query can't join them the way `WheelDriveEcsSystem` joins a wheel with
  // its own `GroundContactEcsComponent`).
  const chassisControlEntity = world.createEntity();

  addChassisStabilizerComponent(world, chassisControlEntity, {
    body: chassisBody,
    frontWheelGroundContact: frontWheel.groundContact,
    rearWheelGroundContact: rearWheel.groundContact,
    levelingStiffness: chassisLevelingStiffness,
    levelingDamping: chassisLevelingDamping,
  });

  addAirControlComponent(world, chassisControlEntity, {
    chassisBody,
    throttleInput,
    frontWheelGroundContact: frontWheel.groundContact,
    rearWheelGroundContact: rearWheel.groundContact,
    maxAngularSpeed: airControlMaxAngularSpeed,
    maxTorque: airControlMaxTorque,
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
    {
      body: frontUprightBody,
      initialPosition: frontWheelPosition.clone(),
      initialAngle: 0,
    },
    {
      body: rearUprightBody,
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
