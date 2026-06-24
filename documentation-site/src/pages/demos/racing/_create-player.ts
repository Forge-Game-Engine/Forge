import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  createImageSprite,
  RenderContext,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import {
  positionId,
  rotationId,
  scaleId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import { PlayerId } from './_player.component';
import { trackMargin } from './_create-scene';

const carScale = 0.45;
// Kept low enough that the car takes a few seconds to reach a wall while
// cruising hands-off in a straight line, so there's a comfortable window to
// start steering before the boundary clamp comes into play.
const carBaseSpeed = 100;
const carSpeedRange = 120;
const carTurnSpeed = 2.2;

export async function createPlayer(
  renderContext: RenderContext,
  world: EcsWorld,
  renderLayer: number,
): Promise<void> {
  const carImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_racing-pack/PNG/Cars/car_red_1.png'),
  );

  const carSprite = createImageSprite(carImage, renderContext, renderLayer);

  // The car can face any direction, so its on-screen bounding box changes as
  // it turns - clamping to the half-diagonal keeps the sprite fully inside
  // the bounds at every heading, not just when axis-aligned.
  const carRadius =
    Math.hypot(carSprite.width, carSprite.height) * (carScale / 2);

  const { width, height } = renderContext.canvas;
  const trackHalfWidth = width / 2 - trackMargin;
  const trackHalfHeight = height / 2 - trackMargin;

  const playerEntity = world.createEntity();

  world.addComponent(playerEntity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });

  world.addComponent(playerEntity, rotationId, { local: 0, world: 0 });

  world.addComponent(playerEntity, scaleId, {
    local: new Vector2(carScale, carScale),
    world: new Vector2(carScale, carScale),
  });

  world.addComponent(playerEntity, spriteId, carSprite);

  world.addComponent(playerEntity, PlayerId, {
    baseSpeed: carBaseSpeed,
    speedRange: carSpeedRange,
    turnSpeed: carTurnSpeed,
    minX: -trackHalfWidth + carRadius,
    maxX: trackHalfWidth - carRadius,
    minY: -trackHalfHeight + carRadius,
    maxY: trackHalfHeight - carRadius,
  });
}
