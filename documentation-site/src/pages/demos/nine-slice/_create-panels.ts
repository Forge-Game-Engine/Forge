import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { panelId } from './_panel.component';

/**
 * The panel artwork's own border, in texture pixels: a flat white fill with
 * a thin inset frame line and cross-shaped corner notches, on a 96x96 image.
 * The corner ornament occupies a 24px-deep region on each side.
 */
const borderInset = 24;
const nativeSize = 96;

const minSize = 64;
const maxSize = 180;

function placePanel(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  x: number,
  panelMinSize: number,
  panelMaxSize: number,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    local: new Vector2(x, 0),
    world: new Vector2(x, 0),
  });

  addRotationComponent(world, entity, {
    local: 0,
    world: 0,
  });

  addSpriteComponent(world, entity, sprite);
  world.addComponent(entity, panelId, {
    minSize: panelMinSize,
    maxSize: panelMaxSize,
  });
}

/**
 * Builds the three side-by-side comparison panels: a naive single-quad
 * stretch, a nine-slice with `'stretch'` edges/center, and a nine-slice with
 * `'tile'` edges/center - all sharing the same source artwork and the same
 * breathing size animation, so only the slicing config differs.
 * @param world - The ECS world to add the panel entities to.
 * @param renderContext - The render context used to load and size sprites.
 * @param renderLayer - The render layer the panels should be drawn on.
 */
export async function createPanels(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const panelImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_fantasy-ui-borders/PNG/Double/Panel/panel-030.png'),
  );

  const naiveSprite = createImageSprite(panelImage, renderContext, renderLayer);

  const stretchSprite = createImageSprite(
    panelImage,
    renderContext,
    renderLayer,
    {
      slices: {
        left: borderInset,
        right: borderInset,
        top: borderInset,
        bottom: borderInset,
        nativeWidth: nativeSize,
        nativeHeight: nativeSize,
      },
    },
  );

  const tileSprite = createImageSprite(panelImage, renderContext, renderLayer, {
    slices: {
      left: borderInset,
      right: borderInset,
      top: borderInset,
      bottom: borderInset,
      edgeMode: 'tile',
      centerMode: 'tile',
      nativeWidth: nativeSize,
      nativeHeight: nativeSize,
    },
  });

  const { width, height } = renderContext.canvas;
  const spacing = Math.min(width / 3, 260);

  // Clamp the breathing range to whatever space is actually available, so
  // panels never overlap each other or overflow the canvas on a narrow
  // container (e.g. the docs site's demo box squeezed by its code panel).
  const availableSize = Math.min(spacing, height);
  const clampedMaxSize = Math.min(maxSize, availableSize);
  const clampedMinSize = Math.min(minSize, clampedMaxSize);

  placePanel(world, naiveSprite, -spacing, clampedMinSize, clampedMaxSize);
  placePanel(world, stretchSprite, 0, clampedMinSize, clampedMaxSize);
  placePanel(world, tileSprite, spacing, clampedMinSize, clampedMaxSize);
}
