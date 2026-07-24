import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { HoldAction } from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addAngularVelocityMotorComponent,
  addPhysicsBodyComponent,
  PolygonShape,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addThrusterComponent } from './_thruster.component';
import { addGustComponent } from './_gust.component';

const flywheelWidth = 160;
const flywheelHeight = 22;

// `block_square.png` is a native 64x64 rounded square with a corner rivet
// near each corner. Nine-sliced with a corner inset around that rivet, it
// keeps every corner a crisp, fixed-size rounded square at any bar
// width/height rather than the ellipse-shaped smear a naive non-uniform
// stretch would leave (this bar's aspect ratio is far from square). Sized
// well under half of `flywheelHeight` (the bar's constraining dimension,
// far smaller than the native 64x64 texture) so the top/bottom insets
// don't consume the whole bar and force every corner to stretch to fill
// it anyway - nine-slice insets are measured in the sprite's *current*
// size, not native pixels.
const cornerInset = 8;
const nativeSize = 64;

const thrusterColor = Color.fromHSLA(25, 95, 55);
const motorColor = Color.fromHSLA(205, 90, 58);

const thrusterTorque = 30_000_000;
const thrusterAngularDrag = 1.5;
const motorTargetVelocity = 6;
const motorMaxTorque = 10_000_000;
const gustStrength = 4;
const gustIntervalSeconds = 3;

async function createFlywheelEntity(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  position: Vector2,
  color: Color,
  angularDrag: number = 0,
): Promise<number> {
  const { imageCache } = renderContext;
  const image = await imageCache.getOrLoad(
    getAssetUrl('img/physics/block_square.png'),
  );
  const sprite = createImageSprite(image, renderContext, renderLayer, {
    slices: {
      left: cornerInset,
      right: cornerInset,
      top: cornerInset,
      bottom: cornerInset,
      nativeWidth: nativeSize,
      nativeHeight: nativeSize,
    },
  });

  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: position.clone(),
    local: position.clone(),
  });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, {
    ...sprite,
    width: flywheelWidth,
    height: flywheelHeight,
    tintColor: color,
  });
  addPhysicsBodyComponent(world, entity, {
    physicsBody: new RigidBody({
      shape: PolygonShape.rectangle(flywheelWidth, flywheelHeight),
      position: position.clone(),
      angularDrag,
    }),
  });

  return entity;
}

/**
 * Builds the thruster scenario: a flywheel carrying a `ThrusterEcsComponent`
 * that `createThrusterEcsSystem` applies directly to the flywheel's
 * `RigidBody` via `applyTorque` while `thrustInput` is held. Releasing it
 * lets `angularDrag` gradually spin the flywheel back down, since nothing
 * else drives it once the torque stops.
 * @param world - The ECS world to add the scenario's entities to.
 * @param renderContext - The render context used to load the flywheel sprite.
 * @param renderLayer - The render layer the flywheel should be drawn on.
 * @param position - Where to place the flywheel.
 * @param thrustInput - The hold action that drives the thruster.
 */
export async function createThrusterScenario(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  position: Vector2,
  thrustInput: HoldAction,
): Promise<void> {
  const entity = await createFlywheelEntity(
    world,
    renderContext,
    renderLayer,
    position,
    thrusterColor,
    thrusterAngularDrag,
  );

  addThrusterComponent(world, entity, {
    holdAction: thrustInput,
    torque: thrusterTorque,
  });
}

/**
 * Builds the motor scenario: a flywheel driven by an
 * `AngularVelocityMotorEcsComponent` that holds a steady
 * `motorTargetVelocity`, spending no more than `motorMaxTorque` per tick to
 * get there. A demo-only `GustEcsComponent` periodically knocks its angular
 * velocity off course, showing the motor correct back towards its target
 * afterwards, entirely on its own.
 * @param world - The ECS world to add the scenario's entities to.
 * @param renderContext - The render context used to load the flywheel sprite.
 * @param renderLayer - The render layer the flywheel should be drawn on.
 * @param position - Where to place the flywheel.
 */
export async function createMotorScenario(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
  position: Vector2,
): Promise<void> {
  const entity = await createFlywheelEntity(
    world,
    renderContext,
    renderLayer,
    position,
    motorColor,
  );

  addAngularVelocityMotorComponent(world, entity, {
    targetVelocity: motorTargetVelocity,
    maxTorque: motorMaxTorque,
  });
  addGustComponent(world, entity, {
    strength: gustStrength,
    intervalSeconds: gustIntervalSeconds,
  });
}
