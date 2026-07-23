import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { panelId } from './_panel.component';

/**
 * The panel artwork's own border, in texture pixels: a 12px frame (with gold
 * corner accents) around a 40x40 tiled grid interior, on a 64x64 image.
 */
const borderInset = 12;
const nativeSize = 64;

const minSize = 64;
const maxSize = 180;

function placePanel(
  world: EcsWorld,
  sprite: SpriteEcsComponent,
  x: number,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    local: new Vector2(x, 0),
    world: new Vector2(x, 0),
  });

  addSpriteComponent(world, entity, sprite);
  world.addComponent(entity, panelId, { minSize, maxSize });
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
    getAssetUrl('img/nine-slice/panel.png'),
  );

  const naiveSprite = createImageSprite(panelImage, renderContext, renderLayer);

  const stretchSprite = createImageSprite(panelImage, renderContext, renderLayer, {
    slices: {
      left: borderInset,
      right: borderInset,
      top: borderInset,
      bottom: borderInset,
      nativeWidth: nativeSize,
      nativeHeight: nativeSize,
    },
  });

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

  const { width } = renderContext.canvas;
  const spacing = Math.min(width / 3, 260);

  placePanel(world, naiveSprite, -spacing);
  placePanel(world, stretchSprite, 0);
  placePanel(world, tileSprite, spacing);
}
