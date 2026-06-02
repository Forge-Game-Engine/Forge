import { getAssetUrl } from '@site/src/utils/get-asset-url';
import {
  createImageSprite,
  RenderContext,
  Sprite,
} from '@forge-game-engine/forge/rendering';

export async function createSprite(
  renderContext: RenderContext,
  renderLayer: number,
): Promise<Sprite> {
  const starSprite = createImageSprite(
    await renderContext.imageCache.getOrLoad(
      getAssetUrl('img/space-shooter/star_medium.png'),
    ),
    renderContext,
    renderLayer,
  );

  return starSprite;
}
