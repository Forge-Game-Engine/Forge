import type { EcsWorld } from '@forge-game-engine/forge/ecs';
import type { RenderContext, Renderable } from '@forge-game-engine/forge/rendering';
import type {
  FontAsset,
  UiInstanceComponents,
  UiTextInputSource,
} from '@forge-game-engine/forge/ui';
import type { ThemedRenderable } from './_theme';

/**
 * Shared context passed to every showcase section builder. Each section
 * creates its own container panel inside `contentEntity` at vertical offset
 * `y`, and reports back the height it consumed plus any renderables that
 * should react to the theme switcher.
 */
export interface SectionContext {
  world: EcsWorld;
  renderContext: RenderContext;
  canvasEntity: number;
  contentEntity: number;
  contentWidth: number;
  y: number;
  font: FontAsset;
  panelRenderable: Renderable<UiInstanceComponents>;
  textInputSource: UiTextInputSource;
}

export interface SectionResult {
  height: number;
  themedRenderables: ThemedRenderable[];
}
