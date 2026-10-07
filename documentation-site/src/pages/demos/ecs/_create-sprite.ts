import { getAssetUrl } from '@site/src/utils/get-asset-url';
import {
  createImageSprite,
  createTexture,
  RenderContext,
  Sprite,
} from '@forge-game-engine/forge/rendering';

export async function createSprite(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<Sprite> {
  const starSprite = {
    ...createImageSprite(
      createTexture(
        renderContext,
        await renderContext.imageCache.getOrLoad(
          getAssetUrl('img/space-shooter/star_medium.png'),
        ),
      ),
      { pixelsPerUnit: 1 },
    ),
    category: renderLayer,
  };

  return starSprite;
}
