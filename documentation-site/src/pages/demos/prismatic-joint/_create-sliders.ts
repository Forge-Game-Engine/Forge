import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
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
  calculateVisibleWorldSize,
  createImageSprite,
  NineSliceOptions,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { addPumpComponent } from './_pump.component';

const railDotCount = 15;
const railDotSize = 10;
const anchorSize = 14;

// `block_square.png` is a 64x64 rounded, bolted panel; these insets keep its
// rounded corners and bolt-head detail at a fixed size while the center
// stretches, instead of smearing them across the anchor/slider's shape.
const squareSlices: NineSliceOptions = {
  left: 16,
  right: 16,
  top: 16,
  bottom: 16,
  nativeWidth: 64,
  nativeHeight: 64,
};

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
    imageCache.getOrLoad(getAssetUrl('img/space-shooter/meteor_small.png')),
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
  slices?: NineSliceOptions,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    world: position.clone(),
    local: position.clone(),
  });
  addRotationComponent(world, entity);
  addSpriteComponent(world, entity, { ...sprite, width, height, slices });
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

    createVisualEntity(world, dotSprite, position, railDotSize, railDotSize);
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
    squareSlices,
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

  addSpriteComponent(world, sliderEntity, {
    ...sprite,
    width: sliderWidth,
    height: sliderHeight,
    slices: sliderSprite === 'block' ? squareSlices : undefined,
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
  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const columnWidth = width / 3;
  const columnLeft = -width / 2 + columnWidth / 2;

  // Piston: alternates direction every trigger, bouncing between the ends
  // of a level rail. The rail length is a fixed world-unit constant, not
  // derived from columnWidth (which tracks the viewport's aspect ratio) -
  // otherwise the piston's travel distance would grow or shrink with the
  // window's aspect ratio while the other two scenarios' travel distances
  // (tied to the camera's fixed vertical world units) stayed constant.
  createSliderScenario(world, sprites, {
    anchorPosition: new Vector2(columnLeft - columnWidth * 0.3, 0),
    axis: Vector2.right,
    lowerTranslation: 0,
    upperTranslation: 180,
    startTranslation: 0,
    sliderShape: PolygonShape.rectangle(44, 32),
    sliderWidth: 32,
    sliderHeight: 32,
    sliderSprite: 'ball',
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
    sliderWidth: 32,
    sliderHeight: 32,
    sliderSprite: 'ball',
    pumpImpulse: new Vector2(0, 950_000),
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
    sliderWidth: 32,
    sliderHeight: 32,
    sliderSprite: 'ball',
    pumpImpulse: inclineAxis.negate().multiply(400_000),
    pumpIntervalSeconds: 2.5,
    pumpAlternate: false,
  });
}
