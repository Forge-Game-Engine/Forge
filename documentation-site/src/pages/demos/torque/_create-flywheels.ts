import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
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
    getAssetUrl('img/physics/block_narrow.png'),
  );
  const sprite = createImageSprite(image, renderContext, renderLayer);

  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: position.clone(),
    local: position.clone(),
  });
  addRotationComponent(world, entity);
  addScaleComponent(world, entity, {
    local: new Vector2(
      flywheelWidth / sprite.width,
      flywheelHeight / sprite.height,
    ),
    world: new Vector2(
      flywheelWidth / sprite.width,
      flywheelHeight / sprite.height,
    ),
  });
  addSpriteComponent(world, entity, { ...sprite, tintColor: color });
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
