import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { positionId, scaleId } from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  easeInBack,
  easeInOutBack,
  easeInOutElastic,
  easeInOutQuint,
  easeInOutSine,
  linear,
} from '@forge-game-engine/forge/animations';
import {
  Color,
  createImageSprite,
  RenderContext,
  spriteId,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { easingRowId } from './_easing-row.component';

interface EasingRowConfig {
  name: string;
  easingFunction: (t: number) => number;
  color: Color;
}

/**
 * One row per easing function, in increasing order of visual complexity. The
 * color here is reused for the row's legend swatch in `index.tsx`.
 */
export const easingRowConfigs: EasingRowConfig[] = [
  { name: 'linear', easingFunction: linear, color: Color.fromHSLA(0, 75, 60) },
  {
    name: 'easeInOutSine',
    easingFunction: easeInOutSine,
    color: Color.fromHSLA(60, 75, 60),
  },
  {
    name: 'easeInOutQuint',
    easingFunction: easeInOutQuint,
    color: Color.fromHSLA(120, 75, 60),
  },
  {
    name: 'easeInBack',
    easingFunction: easeInBack,
    color: Color.fromHSLA(180, 75, 60),
  },
  {
    name: 'easeInOutBack',
    easingFunction: easeInOutBack,
    color: Color.fromHSLA(240, 75, 60),
  },
  {
    name: 'easeInOutElastic',
    easingFunction: easeInOutElastic,
    color: Color.fromHSLA(300, 75, 60),
  },
];

const ballSizePixels = 28;
const laneHeightPixels = 4;
const laneColor = Color.fromHSLA(0, 0, 30);
const horizontalMarginPixels = 200;
const verticalMarginPixels = 60;

// Reserves headroom on either side of the track for easing functions that
// overshoot past 0 or 1 (easeInBack, easeInOutBack, easeInOutElastic), so
// the ball never sweeps past the edge of the canvas.
const overshootMarginFraction = 0.2;

function placeSprite(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  position: Vector2,
  scale: Vector2,
): number {
  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    local: position.clone(),
    world: position.clone(),
  });

  world.addComponent(entity, scaleId, {
    local: scale.clone(),
    world: scale.clone(),
  });

  world.addComponent(entity, spriteId, sprite);

  return entity;
}

/**
 * Builds one lane per easing function: a static track bar plus a ball that
 * sweeps back and forth across it, so all the easing curves can be compared
 * side by side.
 * @param world - The ECS world to add the row entities to.
 * @param renderContext - The render context used to load and size sprites.
 * @param renderLayer - The render layer the rows should be drawn on.
 */
export async function createEasingRows(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );

  const spriteTemplate = createImageSprite(
    whiteImage,
    renderContext,
    renderLayer,
  );

  const { width, height } = renderContext.canvas;
  const trackHalfWidth = width / 2 - horizontalMarginPixels;
  const minX = -trackHalfWidth * (1 - overshootMarginFraction);
  const maxX = trackHalfWidth * (1 - overshootMarginFraction);

  const rowCount = easingRowConfigs.length;
  const usableHeight = height - verticalMarginPixels * 2;
  const rowSpacing = rowCount > 1 ? usableHeight / (rowCount - 1) : 0;
  const topY = usableHeight / 2;

  easingRowConfigs.forEach(({ easingFunction, color }, index) => {
    const y = topY - index * rowSpacing;

    const laneSprite: SpriteEcsComponent = {
      ...spriteTemplate,
      tintColor: laneColor,
    };

    placeSprite(
      world,
      laneSprite,
      new Vector2(0, y),
      new Vector2(
        (trackHalfWidth * 2) / spriteTemplate.width,
        laneHeightPixels / spriteTemplate.height,
      ),
    );

    const ballSprite: SpriteEcsComponent = {
      ...spriteTemplate,
      tintColor: color,
    };

    const ballEntity = placeSprite(
      world,
      ballSprite,
      new Vector2(minX, y),
      new Vector2(
        ballSizePixels / spriteTemplate.width,
        ballSizePixels / spriteTemplate.height,
      ),
    );

    world.addComponent(ballEntity, easingRowId, {
      easingFunction,
      minX,
      maxX,
    });
  });
}
