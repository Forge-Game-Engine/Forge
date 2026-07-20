import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addLinearDamperComponent,
  addLinearSpringComponent,
  CircleShape,
  LinearDamper,
  LinearSpring,
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
import { addResetComponent } from './_reset.component';
import { addSpringLineComponent } from './_spring-line.component';

const anchorSize = 24;
const chassisWidth = 90;
const chassisHeight = 40;
const chassisDensity = 0.6;
const lineWidth = 10;

const anchorColor = Color.fromHSLA(215, 15, 45);
const lineColor = Color.fromHSLA(215, 20, 65);

interface SuspensionSprites {
  block: SpriteEcsComponent;
  line: SpriteEcsComponent;
}

async function loadSuspensionSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<SuspensionSprites> {
  const { imageCache } = renderContext;

  const [blockImage, lineImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_narrow.png')),
  ]);

  return {
    block: createImageSprite(blockImage, renderContext, renderLayer),
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

  world.addComponent(entity, positionId, {
    world: position.clone(),
    local: position.clone(),
  });
  world.addComponent(entity, rotationId, { local: 0, world: 0 });
  world.addComponent(entity, scaleId, {
    local: new Vector2(width / sprite.width, height / sprite.height),
    world: new Vector2(width / sprite.width, height / sprite.height),
  });
  world.addComponent(entity, spriteId, { ...sprite, tintColor: color });
}

export interface SuspensionScenarioOptions {
  /**
   * Where the fixed end of the spring/damper sits, representing the wheel's
   * contact point with the road.
   */
  anchorPosition: Vector2;

  /**
   * How far above `anchorPosition` the chassis starts. Since `LinearSpring`
   * defaults `restLength` to the anchors' distance at construction time,
   * this also becomes the spring's `restLength`, so the chassis visibly
   * sags under gravity to a new equilibrium as soon as the demo starts.
   */
  chassisStartHeight: number;

  stiffness: number;

  /**
   * Omit to demonstrate an undamped spring, which (visibly) keeps
   * oscillating long after being disturbed.
   */
  dampingCoefficient?: number;

  chassisColor: Color;

  /**
   * The downward velocity the chassis is released with, simulating the jolt
   * of just having hit a bump.
   */
  dropVelocity: Vector2;

  /**
   * How often the chassis is teleported back to `chassisStartHeight` with
   * `dropVelocity`, replaying the same disturbance on a loop (see
   * `ResetEcsComponent` for why this is a hard reset rather than a repeated
   * impulse).
   */
  resetIntervalSeconds: number;
}

/**
 * Builds one suspension scenario: a static anchor (the wheel's road
 * contact), a dynamic chassis hanging from it via a `LinearSpring` (and
 * optionally a `LinearDamper`), a `SpringLineEcsComponent` visualizing the
 * connection, and a `ResetEcsComponent` that periodically replays the same
 * drop, simulating hitting a bump over and over.
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
    anchorPosition,
    chassisStartHeight,
    stiffness,
    dampingCoefficient,
    chassisColor,
    dropVelocity,
    resetIntervalSeconds,
  } = options;

  createVisualEntity(
    world,
    sprites.block,
    anchorPosition,
    anchorSize,
    anchorSize,
    anchorColor,
  );

  const anchorBody = new RigidBody({
    shape: new CircleShape(anchorSize / 2),
    position: anchorPosition.clone(),
    isStatic: true,
    isSensor: true,
  });

  const chassisPosition = anchorPosition.add(
    new Vector2(0, chassisStartHeight),
  );
  const chassisBody = new RigidBody({
    shape: PolygonShape.rectangle(chassisWidth, chassisHeight),
    position: chassisPosition,
    density: chassisDensity,
    restitution: 0,
  });
  chassisBody.velocity = dropVelocity.clone();

  const chassisEntity = world.createEntity();

  world.addComponent(chassisEntity, positionId, {
    world: chassisPosition.clone(),
    local: chassisPosition.clone(),
  });
  world.addComponent(chassisEntity, rotationId, { local: 0, world: 0 });
  world.addComponent(chassisEntity, scaleId, {
    local: new Vector2(
      chassisWidth / sprites.block.width,
      chassisHeight / sprites.block.height,
    ),
    world: new Vector2(
      chassisWidth / sprites.block.width,
      chassisHeight / sprites.block.height,
    ),
  });
  world.addComponent(chassisEntity, spriteId, {
    ...sprites.block,
    tintColor: chassisColor,
  });
  world.addComponent(chassisEntity, PhysicsBodyId, {
    physicsBody: chassisBody,
  });
  addResetComponent(world, chassisEntity, {
    body: chassisBody,
    initialPosition: chassisPosition.clone(),
    initialVelocity: dropVelocity.clone(),
    intervalSeconds: resetIntervalSeconds,
  });

  const forceEntity = world.createEntity();

  addLinearSpringComponent(world, forceEntity, {
    spring: new LinearSpring({
      bodyA: anchorBody,
      bodyB: chassisBody,
      stiffness,
    }),
  });

  if (dampingCoefficient !== undefined) {
    addLinearDamperComponent(world, forceEntity, {
      damper: new LinearDamper({
        bodyA: anchorBody,
        bodyB: chassisBody,
        dampingCoefficient,
      }),
    });
  }

  const lineEntity = world.createEntity();

  world.addComponent(lineEntity, positionId, {
    world: anchorPosition.clone(),
    local: anchorPosition.clone(),
  });
  world.addComponent(lineEntity, rotationId, { local: 0, world: 0 });
  world.addComponent(lineEntity, scaleId, {
    local: Vector2.one,
    world: Vector2.one,
  });
  world.addComponent(lineEntity, spriteId, {
    ...sprites.line,
    tintColor: lineColor,
  });
  addSpringLineComponent(world, lineEntity, {
    anchorPosition: anchorPosition.clone(),
    body: chassisBody,
    lineWidth,
    spriteWidth: sprites.line.width,
    spriteHeight: sprites.line.height,
  });
}

/**
 * Creates two suspension scenarios side by side, sharing the same spring
 * stiffness and reset schedule: the left has only a `LinearSpring`, the
 * right pairs it with a `LinearDamper`.
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
  const anchorY = -height * 0.25;
  const stiffness = 30_000;
  const dropVelocity = new Vector2(0, -180);
  const resetIntervalSeconds = 6;

  // Spring only: nothing dissipates the energy of the drop, so the chassis
  // keeps oscillating until the next reset.
  createSuspensionScenario(world, sprites, {
    anchorPosition: new Vector2(-columnWidth / 2, anchorY),
    chassisStartHeight: 120,
    stiffness,
    chassisColor: Color.fromHSLA(15, 90, 55),
    dropVelocity,
    resetIntervalSeconds,
  });

  // Spring and damper: the damper resists the compression/extension speed,
  // so the chassis settles back to rest well before the next reset.
  createSuspensionScenario(world, sprites, {
    anchorPosition: new Vector2(columnWidth / 2, anchorY),
    chassisStartHeight: 120,
    stiffness,
    dampingCoefficient: 15_000,
    chassisColor: Color.fromHSLA(150, 60, 45),
    dropVelocity,
    resetIntervalSeconds,
  });
}
