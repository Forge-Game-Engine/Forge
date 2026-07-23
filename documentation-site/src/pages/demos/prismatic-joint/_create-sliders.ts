import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { lerp, Vector2 } from '@forge-game-engine/forge/math';
import {
  addPhysicsBodyComponent,
  addPrismaticJointComponent,
  CircleShape,
  PolygonShape,
  PrismaticJoint,
  RigidBody,
  Shape,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addPumpComponent } from './_pump.component';

const railDotCount = 6;
const railDotSize = 6;
const anchorSize = 14;

const anchorColor = Color.fromHSLA(215, 25, 45);
const railColor = Color.fromHSLA(215, 20, 55);
const pistonColor = Color.fromHSLA(15, 90, 55);
const elevatorColor = Color.fromHSLA(265, 75, 62);
const inclineColor = Color.fromHSLA(45, 95, 58);

export interface SliderScenarioOptions {
  /**
   * Where the joint's static anchor sits, and where `lowerTranslation` is
   * measured from.
   */
  anchorPosition: Vector2;

  /**
   * The (unnormalized) direction the slider is free to move along. World
   * space here has positive Y pointing up the screen (gravity is negative
   * Y), matching how the boundaries in the main physics demo are laid out.
   */
  axis: Vector2;

  lowerTranslation: number;
  upperTranslation: number;

  /**
   * `joint.translation` the slider starts at, between `lowerTranslation` and
   * `upperTranslation`.
   */
  startTranslation: number;

  sliderShape: Shape;
  sliderWidth: number;
  sliderHeight: number;
  sliderSprite: 'ball' | 'block';
  sliderColor: Color;

  /**
   * The impulse periodically applied to the slider (see `_pump.system.ts`).
   */
  pumpImpulse: Vector2;
  pumpIntervalSeconds: number;
  pumpAlternate: boolean;
}

interface SliderSprites {
  ball: SpriteEcsComponent;
  block: SpriteEcsComponent;
  dot: SpriteEcsComponent;
}

async function loadSliderSprites(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<SliderSprites> {
  const { imageCache } = renderContext;

  const [ballImage, blockImage, dotImage] = await Promise.all([
    imageCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    imageCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
    imageCache.getOrLoad(getAssetUrl('img/White.png')),
  ]);

  return {
    ball: createImageSprite(ballImage, renderContext, renderLayer),
    block: createImageSprite(blockImage, renderContext, renderLayer),
    dot: createImageSprite(dotImage, renderContext, renderLayer),
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

function createRailDots(
  world: EcsWorld,
  dotSprite: SpriteEcsComponent,
  fromPosition: Vector2,
  toPosition: Vector2,
): void {
  for (let i = 0; i <= railDotCount; i++) {
    const t = i / railDotCount;
    const position = new Vector2(
      lerp(fromPosition.x, toPosition.x, t),
      lerp(fromPosition.y, toPosition.y, t),
    );

    createVisualEntity(
      world,
      dotSprite,
      position,
      railDotSize,
      railDotSize,
      railColor,
    );
  }
}

/**
 * Builds one prismatic-joint scenario: a static anchor, a dotted rail
 * spanning `lowerTranslation` to `upperTranslation`, a dynamic slider
 * jointed to the anchor, and a `PumpEcsComponent` that periodically nudges
 * the slider (since `PrismaticJoint` has no built-in motor).
 * @param world - The ECS world to add the scenario's entities to.
 * @param sprites - The pre-loaded sprites shared across every scenario.
 * @param options - The scenario's geometry, appearance, and pump behavior.
 */
function createSliderScenario(
  world: EcsWorld,
  sprites: SliderSprites,
  options: SliderScenarioOptions,
): void {
  const {
    anchorPosition,
    axis,
    lowerTranslation,
    upperTranslation,
    startTranslation,
    sliderShape,
    sliderWidth,
    sliderHeight,
    sliderSprite,
    sliderColor,
    pumpImpulse,
    pumpIntervalSeconds,
    pumpAlternate,
  } = options;

  const normalizedAxis = axis.normalize();
  const lowerPoint = anchorPosition.add(
    normalizedAxis.multiply(lowerTranslation),
  );
  const upperPoint = anchorPosition.add(
    normalizedAxis.multiply(upperTranslation),
  );
  const startPosition = anchorPosition.add(
    normalizedAxis.multiply(startTranslation),
  );

  createRailDots(world, sprites.dot, lowerPoint, upperPoint);
  createVisualEntity(
    world,
    sprites.block,
    anchorPosition,
    anchorSize,
    anchorSize,
    anchorColor,
  );

  const anchorEntity = world.createEntity();
  const anchorBody = new RigidBody({
    shape: new CircleShape(anchorSize / 2),
    position: anchorPosition.clone(),
    isStatic: true,
    isSensor: true,
  });

  addPositionComponent(world, anchorEntity, {
    world: anchorPosition.clone(),
    local: anchorPosition.clone(),
  });
  addRotationComponent(world, anchorEntity);
  addPhysicsBodyComponent(world, anchorEntity, {
    physicsBody: anchorBody,
  });

  const sliderEntity = world.createEntity();
  const sliderBody = new RigidBody({
    shape: sliderShape,
    position: startPosition.clone(),
    restitution: 0,
  });

  addPositionComponent(world, sliderEntity, {
    world: startPosition.clone(),
    local: startPosition.clone(),
  });
  addRotationComponent(world, sliderEntity);

  const sprite = sprites[sliderSprite];

  addScaleComponent(world, sliderEntity, {
    local: new Vector2(
      sliderWidth / sprite.width,
      sliderHeight / sprite.height,
    ),
    world: new Vector2(
      sliderWidth / sprite.width,
      sliderHeight / sprite.height,
    ),
  });
  addSpriteComponent(world, sliderEntity, {
    ...sprite,
    tintColor: sliderColor,
  });
  addPhysicsBodyComponent(world, sliderEntity, {
    physicsBody: sliderBody,
  });

  const joint = new PrismaticJoint({
    bodyA: anchorBody,
    bodyB: sliderBody,
    axis: normalizedAxis,
    enableLimit: true,
    lowerTranslation,
    upperTranslation,
  });

  const jointEntity = world.createEntity();

  addPrismaticJointComponent(world, jointEntity, { joint });
  addPumpComponent(world, jointEntity, {
    joint,
    impulse: pumpImpulse,
    intervalSeconds: pumpIntervalSeconds,
    alternate: pumpAlternate,
  });
}

/**
 * Creates three prismatic-joint scenarios side by side: a piston that pumps
 * back and forth along a level rail, an elevator that gravity pulls back
 * down a vertical rail after each upward pump, and a ball that gravity pulls
 * down a diagonal incline after each pump back up it.
 * @param world - The ECS world to add the scenarios' entities to.
 * @param renderContext - The render context used to load sprites.
 * @param renderLayer - The render layer the scenarios should be drawn on.
 */
export async function createSliders(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const sprites = await loadSliderSprites(renderContext, renderLayer);
  const { width, height } = renderContext.canvas;
  const columnWidth = width / 3;
  const columnLeft = -width / 2 + columnWidth / 2;

  // Piston: alternates direction every trigger, bouncing between the ends
  // of a level rail.
  createSliderScenario(world, sprites, {
    anchorPosition: new Vector2(columnLeft - columnWidth * 0.3, 0),
    axis: Vector2.right,
    lowerTranslation: 0,
    upperTranslation: columnWidth * 0.6,
    startTranslation: 0,
    sliderShape: PolygonShape.rectangle(44, 32),
    sliderWidth: 44,
    sliderHeight: 32,
    sliderSprite: 'block',
    sliderColor: pistonColor,
    pumpImpulse: new Vector2(200_000, 0),
    pumpIntervalSeconds: 1.4,
    pumpAlternate: true,
  });

  // Elevator: always pumped upward (positive Y); gravity (negative Y) brings
  // it back down to the lower limit in between pumps.
  createSliderScenario(world, sprites, {
    anchorPosition: new Vector2(columnLeft + columnWidth, -height * 0.32),
    axis: new Vector2(0, 1),
    lowerTranslation: 0,
    upperTranslation: height * 0.55,
    startTranslation: 0,
    sliderShape: PolygonShape.rectangle(80, 20),
    sliderWidth: 80,
    sliderHeight: 20,
    sliderSprite: 'block',
    sliderColor: elevatorColor,
    pumpImpulse: new Vector2(0, 700_000),
    pumpIntervalSeconds: 2.5,
    pumpAlternate: false,
  });

  // Incline: a ball pumped back up a diagonal rail (anchored near the top),
  // then released to roll back down it under gravity.
  const inclineAxis = new Vector2(0.5, -1).normalize();

  createSliderScenario(world, sprites, {
    anchorPosition: new Vector2(
      columnLeft + columnWidth * 2 - columnWidth * 0.35,
      height * 0.3,
    ),
    axis: inclineAxis,
    lowerTranslation: 0,
    upperTranslation: height * 0.5,
    startTranslation: 0,
    sliderShape: new CircleShape(18),
    sliderWidth: 36,
    sliderHeight: 36,
    sliderSprite: 'ball',
    sliderColor: inclineColor,
    pumpImpulse: inclineAxis.negate().multiply(400_000),
    pumpIntervalSeconds: 2.5,
    pumpAlternate: false,
  });
}
