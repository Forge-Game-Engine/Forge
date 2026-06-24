import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createImageSprite,
  RenderContext,
  spriteId,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

/**
 * The distance from the canvas edge to the centerline of the barrier ring,
 * also used by `_create-player.ts` so the car's drivable area lines up with
 * the barriers drawn here.
 */
export const trackMargin = 70;

const objectsPath = 'img/kenney_racing-pack/PNG/Objects';

interface ObstacleLayout {
  asset: string;
  x: number;
  y: number;
  scale?: number;
}

// Positions are fractions of the track's half-width/half-height, so the
// layout scales with the canvas instead of being pinned to exact pixels.
const obstacleLayout: ObstacleLayout[] = [
  { asset: 'cone_straight.png', x: -0.55, y: 0.55 },
  { asset: 'cone_straight.png', x: -0.4, y: 0.6 },
  { asset: 'cone_straight.png', x: 0.35, y: 0.1 },
  { asset: 'tires_red.png', x: 0.6, y: 0.5 },
  { asset: 'tires_white.png', x: -0.15, y: -0.65 },
  { asset: 'barrel_blue.png', x: 0.6, y: -0.4 },
  { asset: 'barrel_red.png', x: 0.45, y: -0.55 },
  { asset: 'rock1.png', x: -0.65, y: -0.5, scale: 0.8 },
  { asset: 'rock2.png', x: -0.7, y: 0.1, scale: 0.8 },
  { asset: 'rock3.png', x: 0.1, y: 0.7, scale: 0.8 },
  { asset: 'oil.png', x: 0.15, y: -0.35, scale: 0.6 },
];

function placeSprite(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  scale: number,
  rotation: number,
): void {
  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    local: position.clone(),
    world: position.clone(),
  });

  world.addComponent(entity, rotationId, { local: rotation, world: rotation });

  world.addComponent(entity, scaleId, {
    local: new Vector2(scale, scale),
    world: new Vector2(scale, scale),
  });

  world.addComponent(entity, spriteId, sprite);
}

async function createGround(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const grassImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl(
      'img/kenney_racing-pack/PNG/Tiles/Grass/land_grass04.png',
    ),
  );
  const grassSprite = createImageSprite(grassImage, renderContext, renderLayer);

  const { width, height } = renderContext.canvas;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  for (
    let y = -halfHeight + grassSprite.height / 2;
    y < halfHeight;
    y += grassSprite.height
  ) {
    for (
      let x = -halfWidth + grassSprite.width / 2;
      x < halfWidth;
      x += grassSprite.width
    ) {
      placeSprite(world, grassSprite, new Vector2(x, y), 1, 0);
    }
  }
}

async function createBarrierRing(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const [redImage, whiteImage] = await Promise.all([
    renderContext.imageCache.getOrLoad(
      getAssetUrl(`${objectsPath}/barrier_red.png`),
    ),
    renderContext.imageCache.getOrLoad(
      getAssetUrl(`${objectsPath}/barrier_white.png`),
    ),
  ]);

  const redSprite = createImageSprite(redImage, renderContext, renderLayer);
  const whiteSprite = createImageSprite(
    whiteImage,
    renderContext,
    renderLayer,
  );

  const { width, height } = renderContext.canvas;
  const trackHalfWidth = width / 2 - trackMargin;
  const trackHalfHeight = height / 2 - trackMargin;
  const barrierLength = redSprite.width;

  let useWhite = false;

  for (
    let x = -trackHalfWidth + barrierLength / 2;
    x < trackHalfWidth;
    x += barrierLength
  ) {
    const sprite = useWhite ? whiteSprite : redSprite;

    placeSprite(world, sprite, new Vector2(x, trackHalfHeight), 1, 0);
    placeSprite(world, sprite, new Vector2(x, -trackHalfHeight), 1, 0);
    useWhite = !useWhite;
  }

  useWhite = false;

  for (
    let y = -trackHalfHeight + barrierLength / 2;
    y < trackHalfHeight;
    y += barrierLength
  ) {
    const sprite = useWhite ? whiteSprite : redSprite;

    placeSprite(
      world,
      sprite,
      new Vector2(trackHalfWidth, y),
      1,
      Math.PI / 2,
    );
    placeSprite(
      world,
      sprite,
      new Vector2(-trackHalfWidth, y),
      1,
      Math.PI / 2,
    );
    useWhite = !useWhite;
  }
}

async function createObstacles(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const { width, height } = renderContext.canvas;
  const trackHalfWidth = width / 2 - trackMargin;
  const trackHalfHeight = height / 2 - trackMargin;

  const uniqueAssets = [...new Set(obstacleLayout.map((o) => o.asset))];

  const uniqueImages = await Promise.all(
    uniqueAssets.map((asset) =>
      renderContext.imageCache.getOrLoad(
        getAssetUrl(`${objectsPath}/${asset}`),
      ),
    ),
  );

  const spritesByAsset = new Map(
    uniqueAssets.map((asset, index) => [
      asset,
      createImageSprite(uniqueImages[index], renderContext, renderLayer),
    ]),
  );

  for (const obstacle of obstacleLayout) {
    const sprite = spritesByAsset.get(obstacle.asset);

    if (!sprite) {
      throw new Error(`Missing sprite for obstacle asset "${obstacle.asset}".`);
    }

    const position = new Vector2(
      obstacle.x * trackHalfWidth,
      obstacle.y * trackHalfHeight,
    );

    placeSprite(world, sprite, position, obstacle.scale ?? 1, 0);
  }
}

/**
 * Builds the racing demo's static scene: a tiled grass floor, a barrier
 * ring marking the edge of the drivable area, and a scattering of cones,
 * tires, barrels, rocks and an oil slick to drive around.
 * @param world - The ECS world to add the scene entities to.
 * @param renderContext - The render context used to load and size sprites.
 * @param renderLayer - The render layer the scene should be drawn on.
 */
export async function createScene(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  await createGround(world, renderContext, renderLayer);
  await createBarrierRing(world, renderContext, renderLayer);
  await createObstacles(world, renderContext, renderLayer);
}
