import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { lerp, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addAabbComponent,
  addColliderComponent,
  addGravityComponent,
  addPrismaticJointComponent,
  addRigidBodyComponent,
  CircleCollider,
  Collider,
  PolygonCollider,
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
const gravity = { x: 0, y: -600 };

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
   * The translation along `axis` the slider starts at, between
   * `lowerTranslation` and `upperTranslation`.
   */
  startTranslation: number;

  sliderCollider: Collider;
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
    world: Vec2.clone(position),
    local: Vec2.clone(position),
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
    const position = { x: lerp(fromPosition.x, toPosition.x, t), y: lerp(fromPosition.y, toPosition.y, t) };

    createVisualEntity(world, dotSprite, position, railDotSize, railDotSize);
  }
}

/**
 * Builds one prismatic-joint scenario: a static anchor, a dotted rail
 * spanning `lowerTranslation` to `upperTranslation`, a dynamic slider
 * jointed to the anchor, and a `PumpEcsComponent` that periodically nudges
 * the slider (prismatic joints have no built-in motor).
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
    sliderCollider,
    sliderWidth,
    sliderHeight,
    sliderSprite,
    pumpImpulse,
    pumpIntervalSeconds,
    pumpAlternate,
  } = options;

  // clone: axis/anchorPosition are caller-owned and reused below (anchorPosition
  // for the anchor entity, normalizedAxis for the joint component).
  const normalizedAxis = Vec2.normalize(Vec2.clone(axis));
  const lowerPoint = Vec2.add(
    Vec2.clone(anchorPosition),
    Vec2.multiply(Vec2.clone(normalizedAxis), lowerTranslation),
  );
  const upperPoint = Vec2.add(
    Vec2.clone(anchorPosition),
    Vec2.multiply(Vec2.clone(normalizedAxis), upperTranslation),
  );
  const startPosition = Vec2.add(
    Vec2.clone(anchorPosition),
    Vec2.multiply(Vec2.clone(normalizedAxis), startTranslation),
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

  addPositionComponent(world, anchorEntity, {
    world: Vec2.clone(anchorPosition),
    local: Vec2.clone(anchorPosition),
  });
  addRotationComponent(world, anchorEntity);

  const sliderEntity = world.createEntity();

  addPositionComponent(world, sliderEntity, {
    world: Vec2.clone(startPosition),
    local: Vec2.clone(startPosition),
  });
  addRotationComponent(world, sliderEntity);

  const sprite = sprites[sliderSprite];

  addSpriteComponent(world, sliderEntity, {
    ...sprite,
    width: sliderWidth,
    height: sliderHeight,
    slices: sliderSprite === 'block' ? squareSlices : undefined,
  });
  addColliderComponent(world, sliderEntity, {
    collider: sliderCollider,
    restitution: 0,
  });
  addRigidBodyComponent(world, sliderEntity, {
    mass: sliderCollider.mass,
    momentOfInertia: sliderCollider.momentOfInertia,
  });
  addAabbComponent(world, sliderEntity);
  addGravityComponent(world, sliderEntity, { amount: gravity });

  const jointEntity = world.createEntity();

  addPrismaticJointComponent(world, jointEntity, {
    entityA: anchorEntity,
    entityB: sliderEntity,
    axis: normalizedAxis,
    enableLimit: true,
    lowerTranslation,
    upperTranslation,
  });
  addPumpComponent(world, jointEntity, {
    entity: sliderEntity,
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
    anchorPosition: { x: columnLeft - columnWidth * 0.3, y: 0 },
    axis: Vec2.right,
    lowerTranslation: 0,
    upperTranslation: 180,
    startTranslation: 0,
    sliderCollider: new PolygonCollider(rectangleVertices(44, 32)),
    sliderWidth: 32,
    sliderHeight: 32,
    sliderSprite: 'ball',
    pumpImpulse: { x: 200_000, y: 0 },
    pumpIntervalSeconds: 1.4,
    pumpAlternate: true,
  });

  // Elevator: always pumped upward (positive Y); gravity (negative Y) brings
  // it back down to the lower limit in between pumps.
  createSliderScenario(world, sprites, {
    anchorPosition: { x: columnLeft + columnWidth, y: -height * 0.32 },
    axis: { x: 0, y: 1 },
    lowerTranslation: 0,
    upperTranslation: height * 0.55,
    startTranslation: 0,
    sliderCollider: new PolygonCollider(rectangleVertices(80, 20)),
    sliderWidth: 32,
    sliderHeight: 32,
    sliderSprite: 'ball',
    pumpImpulse: { x: 0, y: 950_000 },
    pumpIntervalSeconds: 2.5,
    pumpAlternate: false,
  });

  // Incline: a ball pumped back up a diagonal rail (anchored near the top),
  // then released to roll back down it under gravity.
  const inclineAxis = Vec2.normalize({ x: 0.5, y: -1 });

  createSliderScenario(world, sprites, {
    anchorPosition: { x: columnLeft + columnWidth * 2 - columnWidth * 0.35, y: height * 0.3 },
    axis: inclineAxis,
    lowerTranslation: 0,
    upperTranslation: height * 0.5,
    startTranslation: 0,
    sliderCollider: new CircleCollider(18),
    sliderWidth: 32,
    sliderHeight: 32,
    sliderSprite: 'ball',
    // clone: inclineAxis is also passed as `axis` above (same object); must
    // not be mutated by this negate/multiply.
    pumpImpulse: Vec2.multiply(
      Vec2.negate(Vec2.clone(inclineAxis)),
      400_000,
    ),
    pumpIntervalSeconds: 2.5,
    pumpAlternate: false,
  });
}
