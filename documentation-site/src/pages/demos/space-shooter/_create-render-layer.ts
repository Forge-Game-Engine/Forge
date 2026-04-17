import {
  RenderLayer,
  RenderLayerComponent,
} from '@forge-game-engine/forge/rendering';
import { World } from '@forge-game-engine/forge/ecs';

export function createRenderLayer(world: World): RenderLayer {
  const renderLayer = new RenderLayer();
  world.buildAndAddEntity([new RenderLayerComponent(renderLayer)]);

  return renderLayer;
}
