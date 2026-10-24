import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  PolygonCollider,
  TerrainCollider,
} from '@forge-game-engine/forge/physics';
import {
  addMeshComponent,
  addSpriteComponent,
  buildTerrainCurve,
  Color,
  createImageSprite,
  createTerrainMesh,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const wallThickness = 40;

// How far above the bottom of the view the floor's surface sits, and how
// far its gentle waves rise and fall around that.
const floorHeight = 60;
const floorWaveHeight = 12;
const floorControlPointSpacing = 120;
const floorSamplesPerSegment = 8;
const floorDepth = 200;

/**
 * The open area between the walls, above the floor, that bodies fall into.
 */
export interface StressTestArena {
  minX: number;
  maxX: number;
  top: number;
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

async function createFloor(
  world: EcsWorld,
  renderContext: RenderContext,
  halfWidth: number,
  halfHeight: number,
  renderLayer: number,
): Promise<void> {
  const surfaceY = halfHeight - floorHeight;
  const controlPointCount =
    Math.ceil((halfWidth * 2) / floorControlPointSpacing) + 1;
  const controlPoints: Vector2[] = [];

  for (let i = 0; i < controlPointCount; i++) {
    controlPoints.push({
      x: -halfWidth + i * floorControlPointSpacing,
      y: surfaceY + Math.sin(i * 1.3) * floorWaveHeight,
    });
  }

  const curvePoints = buildTerrainCurve(controlPoints, floorSamplesPerSegment);

  const entity = world.createEntity();

  addPositionComponent(world, entity, { isStatic: true });
  addRotationComponent(world, entity);
  addColliderComponent(world, entity, {
    collider: new TerrainCollider(
      curvePoints.map((curvePoint) => curvePoint.position),
      floorDepth,
    ),
  });

  const [borderTexture, fillTexture] = await Promise.all([
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/kenney_pattern-pack/PNG/Default/pattern_19.png'),
      { wrap: 'repeat' },
    ),
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/kenney_pattern-pack/PNG/Default/pattern_37.png'),
      { wrap: 'repeat' },
    ),
  ]);

  addMeshComponent(world, entity, {
    ...createTerrainMesh(renderContext, {
      curvePoints,
      depth: floorDepth,
      border: {
        texture: borderTexture,
        tileSize: { x: 80, y: 75 },
        tint: new Color(0.6, 0.6, 0.6, 1),
      },
      fill: {
        texture: fillTexture,
        tileSize: { x: 30, y: 30 },
        tint: new Color(0.4, 0.29, 0.18, 1),
      },
      borderWidth: 16,
    }),
    category: renderLayer,
  });
}

/**
 * Creates the static scene the bodies pile up in: a wavy terrain floor
 * along the bottom of the view and a wall down each side.
 * @param world - The ECS world to add the boundary entities to.
 * @param camera - The camera entity whose visible area the boundaries enclose.
 * @param renderContext - The render context used to load the floor's textures.
 * @param renderLayer - The render layer the boundaries should be drawn on.
 * @returns The open area between the walls.
 */
export async function createBoundaries(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<StressTestArena> {
  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  await createFloor(world, renderContext, halfWidth, halfHeight, renderLayer);

  const wallSprite = {
    ...createImageSprite(renderContext.whiteTexture, {
      pixelsPerUnit: 1,
    }),
    category: renderLayer,
    width: wallThickness,
    height,
  };
  wallSprite.tintColor = new Color(0.45, 0.47, 0.52, 1);

  for (const x of [
    -halfWidth + wallThickness / 2,
    halfWidth - wallThickness / 2,
  ]) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, {
      local: Vec2.clone({ x, y: 0 }),
      isStatic: true,
    });
    addRotationComponent(world, entity);
    addSpriteComponent(world, entity, wallSprite);
    addColliderComponent(world, entity, {
      collider: new PolygonCollider(rectangleVertices(wallThickness, height)),
    });
  }

  return {
    minX: -halfWidth + wallThickness,
    maxX: halfWidth - wallThickness,
    top: -halfHeight,
  };
}
