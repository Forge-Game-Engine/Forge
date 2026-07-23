import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addLinearDamperComponent,
  addLinearSpringComponent,
  addPhysicsBodyComponent,
  CircleShape,
  RigidBody,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addResetComponent } from './_reset.component';
import { addSpringLineComponent } from './_spring-line.component';

const mountSize = 24;
const wheelRadius = 30;
const wheelDensity = 0.6;
const lineWidth = 10;

const mountColor = Color.fromHSLA(215, 15, 45);
const lineColor = Color.fromHSLA(215, 20, 65);

interface SuspensionSprites {
  mount: SpriteEcsComponent;
  wheel: SpriteEcsComponent;
  line: SpriteEcsComponent;
}

async function loadSuspensionSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<SuspensionSprites> {
  const { imageCache } = renderContext;

  const [mountImage, wheelImage, lineImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_narrow.png')),
  ]);

  return {
    mount: createImageSprite(mountImage, renderContext, renderLayer),
    wheel: createImageSprite(wheelImage, renderContext, renderLayer),
    line: createImageSprite(lineImage, renderContext, renderLayer),
  };
}

function createVisualEntity(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  width: number,
  height: number,
  color: Color,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: position.clone(),
    local: position.clone(),
  });
  addRotationComponent(world, entity);
  addScaleComponent(world, entity, {
    local: new Vector2(width / sprite.width, height / sprite.height),
    world: new Vector2(width / sprite.width, height / sprite.height),
  });
  addSpriteComponent(world, entity, { ...sprite, tintColor: color });
}

export interface SuspensionScenarioOptions {
  /**
   * Where the fixed end of the spring/damper sits, representing the point
   * on the vehicle frame the suspension mounts to.
   */
  mountPosition: Vector2;

  /**
   * How far below `mountPosition` the wheel hangs at rest. Since
   * `addLinearSpringComponent` defaults `restLength` to the anchors'
   * distance at attach time, this also becomes the spring's `restLength`,
   * so the wheel visibly sags further under gravity to a new equilibrium as
   * soon as the demo starts.
   */
  wheelDropHeight: number;

  stiffness: number;

  /**
   * Omit to demonstrate an undamped spring, which (visibly) keeps
   * oscillating long after being disturbed.
   */
  dampingCoefficient?: number;

  wheelColor: Color;

  /**
   * The upward velocity the wheel is released with, simulating the jolt of
   * just having hit a bump: the bump kicks the wheel up towards the mount
   * (compressing the gap), then the spring pulls it back down towards
   * `restLength`.
   */
  bumpVelocity: Vector2;

  /**
   * How often the wheel is teleported back to `wheelDropHeight` below the
   * mount with `bumpVelocity`, replaying the same disturbance on a loop
   * (see `ResetEcsComponent` for why this is a hard reset rather than a
   * repeated impulse).
   */
  resetIntervalSeconds: number;
}

/**
 * Builds one suspension scenario: a static mount (the attachment point on
 * the vehicle frame), a dynamic wheel hanging below it via a
 * `LinearSpringEcsComponent` (and optionally a `LinearDamperEcsComponent`),
 * a `SpringLineEcsComponent` visualizing the connection, and a
 * `ResetEcsComponent` that periodically replays the same bump over and
 * over.
 * @param world - The ECS world to add the scenario's entities to.
 * @param sprites - The pre-loaded sprites shared across every scenario.
 * @param options - The scenario's geometry, spring/damper tuning, and reset
 * behavior.
 */
function createSuspensionScenario(
  world: EcsWorld,
  sprites: SuspensionSprites,
  options: SuspensionScenarioOptions,
): void {
  const {
    mountPosition,
    wheelDropHeight,
    stiffness,
    dampingCoefficient,
    wheelColor,
    bumpVelocity,
    resetIntervalSeconds,
  } = options;

  createVisualEntity(
    world,
    sprites.mount,
    mountPosition,
    mountSize,
    mountSize,
    mountColor,
  );

  const mountBody = new RigidBody({
    shape: new CircleShape(mountSize / 2),
    position: mountPosition.clone(),
    isStatic: true,
    isSensor: true,
  });

  const wheelPosition = mountPosition.add(new Vector2(0, -wheelDropHeight));
  const wheelBody = new RigidBody({
    shape: new CircleShape(wheelRadius),
    position: wheelPosition,
    density: wheelDensity,
    restitution: 0,
  });
  wheelBody.velocity = bumpVelocity.clone();

  const wheelEntity = world.createEntity();

  addPositionComponent(world, wheelEntity, {
    world: wheelPosition.clone(),
    local: wheelPosition.clone(),
  });
  addRotationComponent(world, wheelEntity);
  addScaleComponent(world, wheelEntity, {
    local: new Vector2(
      (wheelRadius * 2) / sprites.wheel.width,
      (wheelRadius * 2) / sprites.wheel.height,
    ),
    world: new Vector2(
      (wheelRadius * 2) / sprites.wheel.width,
      (wheelRadius * 2) / sprites.wheel.height,
    ),
  });
  addSpriteComponent(world, wheelEntity, {
    ...sprites.wheel,
    tintColor: wheelColor,
  });
  addPhysicsBodyComponent(world, wheelEntity, {
    physicsBody: wheelBody,
  });
  addResetComponent(world, wheelEntity, {
    body: wheelBody,
    initialPosition: wheelPosition.clone(),
    initialVelocity: bumpVelocity.clone(),
    intervalSeconds: resetIntervalSeconds,
  });

  const forceEntity = world.createEntity();

  addLinearSpringComponent(world, forceEntity, {
    bodyA: mountBody,
    bodyB: wheelBody,
    stiffness,
  });

  if (dampingCoefficient !== undefined) {
    addLinearDamperComponent(world, forceEntity, {
      bodyA: mountBody,
      bodyB: wheelBody,
      dampingCoefficient,
    });
  }

  const lineEntity = world.createEntity();

  addPositionComponent(world, lineEntity, {
    world: mountPosition.clone(),
    local: mountPosition.clone(),
  });
  addRotationComponent(world, lineEntity);
  addScaleComponent(world, lineEntity);
  addSpriteComponent(world, lineEntity, {
    ...sprites.line,
    tintColor: lineColor,
  });
  addSpringLineComponent(world, lineEntity, {
    anchorPosition: mountPosition.clone(),
    body: wheelBody,
    lineWidth,
    spriteWidth: sprites.line.width,
    spriteHeight: sprites.line.height,
  });
}

/**
 * Creates two suspension scenarios side by side, sharing the same spring
 * stiffness and reset schedule: the left has only a
 * `LinearSpringEcsComponent`, the right pairs it with a
 * `LinearDamperEcsComponent`.
 * @param world - The ECS world to add the scenarios' entities to.
 * @param renderContext - The render context used to load sprites.
 * @param renderLayer - The render layer the scenarios should be drawn on.
 */
export async function createSuspensions(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const sprites = await loadSuspensionSprites(renderContext, renderLayer);
  const { width, height } = renderContext.canvas;
  const columnWidth = width / 2;
  const mountY = height * 0.25;
  const stiffness = 30_000;
  const bumpVelocity = new Vector2(0, 180);
  const resetIntervalSeconds = 6;

  // Spring only: nothing dissipates the energy of the bump, so the wheel
  // keeps oscillating until the next reset.
  createSuspensionScenario(world, sprites, {
    mountPosition: new Vector2(-columnWidth / 2, mountY),
    wheelDropHeight: 120,
    stiffness,
    wheelColor: Color.fromHSLA(15, 90, 55),
    bumpVelocity,
    resetIntervalSeconds,
  });

  // Spring and damper: the damper resists the compression/extension speed,
  // so the wheel settles back to rest well before the next reset.
  createSuspensionScenario(world, sprites, {
    mountPosition: new Vector2(columnWidth / 2, mountY),
    wheelDropHeight: 120,
    stiffness,
    dampingCoefficient: 15_000,
    wheelColor: Color.fromHSLA(150, 60, 45),
    bumpVelocity,
    resetIntervalSeconds,
  });
}
