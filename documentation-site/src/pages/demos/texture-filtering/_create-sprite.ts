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
  pixelated: boolean,
): Promise<Sprite> {
  const starSprite = {
    ...createImageSprite(
      createTexture(
        renderContext,
        await renderContext.imageCache.getOrLoad(
          getAssetUrl('img/pixel-planet.png'),
        ),
        { filter: pixelated ? 'nearest' : 'linear' },
      ),
      { pixelsPerUnit: 1 },
    ),
    category: renderLayer,
  };

  return starSprite;
}
