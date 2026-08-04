import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addLinearDamperComponent,
  addLinearSpringComponent,
  addRigidBodyComponent,
  CircleCollider,
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
import { addResetComponent } from './_reset.component';
import { addSpringLineComponent } from './_spring-line.component';

const mountSize = 24;
const wheelRadius = 30;
const wheelDensity = 0.6;
const lineWidth = 10;
const gravity = { x: 0, y: -600 };

// `block_square.png`/`block_narrow.png` are 64x64/32x128 rounded, bolted
// panels; these insets keep their rounded corners and bolt-head detail at a
// fixed size while the center stretches, instead of smearing them across
// whatever size the mount/line ends up at.
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
  slices: NineSliceOptions,
): number {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: Vec2.clone(position),
    local: Vec2.clone(position),
  });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, { ...sprite, width, height, slices });

  return entity;
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
    bumpVelocity,
    resetIntervalSeconds,
  } = options;

  const mountEntity = createVisualEntity(
    world,
    sprites.mount,
    mountPosition,
    mountSize,
    mountSize,
    squareSlices,
  );

  // clone: mountPosition is reused below (unchanged) for the mount/line entities.
  const wheelPosition = Vec2.add(
    Vec2.clone(mountPosition),
    { x: 0, y: -wheelDropHeight },
  );
  const wheelCollider = new CircleCollider(wheelRadius, wheelDensity);

  const wheelEntity = world.createEntity();

  addPositionComponent(world, wheelEntity, {
    world: Vec2.clone(wheelPosition),
    local: Vec2.clone(wheelPosition),
  });
  addRotationComponent(world, wheelEntity);
  addSpriteComponent(world, wheelEntity, {
    ...sprites.wheel,
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
    velocity: Vec2.clone(bumpVelocity),
  });
  addAabbComponent(world, wheelEntity);
  addGravityComponent(world, wheelEntity, { amount: gravity });
  addResetComponent(world, wheelEntity, {
    entity: wheelEntity,
    initialPosition: Vec2.clone(wheelPosition),
    initialVelocity: Vec2.clone(bumpVelocity),
    intervalSeconds: resetIntervalSeconds,
  });

  const forceEntity = world.createEntity();

  addLinearSpringComponent(world, forceEntity, {
    entityA: mountEntity,
    entityB: wheelEntity,
    stiffness,
  });

  if (dampingCoefficient !== undefined) {
    addLinearDamperComponent(world, forceEntity, {
      entityA: mountEntity,
      entityB: wheelEntity,
      dampingCoefficient,
    });
  }

  const lineEntity = world.createEntity();

  addPositionComponent(world, lineEntity, {
    world: Vec2.clone(mountPosition),
    local: Vec2.clone(mountPosition),
  });
  addRotationComponent(world, lineEntity);
  addSpriteComponent(world, lineEntity, {
    ...sprites.line,
    width: lineWidth,
    slices: narrowSlices,
  });
  addSpringLineComponent(world, lineEntity, {
    anchorPosition: Vec2.clone(mountPosition),
    entity: wheelEntity,
    lineWidth,
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
  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const columnWidth = width / 2;
  const mountY = height * 0.25;
  const stiffness = 30_000;
  const bumpVelocity = { x: 0, y: 180 };
  const resetIntervalSeconds = 6;

  // Spring only: nothing dissipates the energy of the bump, so the wheel
  // keeps oscillating until the next reset.
  createSuspensionScenario(world, sprites, {
    mountPosition: { x: -columnWidth / 2, y: mountY },
    wheelDropHeight: 120,
    stiffness,
    bumpVelocity,
    resetIntervalSeconds,
  });

  // Spring and damper: the damper resists the compression/extension speed,
  // so the wheel settles back to rest well before the next reset.
  createSuspensionScenario(world, sprites, {
    mountPosition: { x: columnWidth / 2, y: mountY },
    wheelDropHeight: 120,
    stiffness,
    dampingCoefficient: 15_000,
    bumpVelocity,
    resetIntervalSeconds,
  });
}
