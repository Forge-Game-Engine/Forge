import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color } from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createLabel,
  createPanel,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { DemoSprites } from './_load-demo-sprites';

/**
 * Creates the small `bottomLeft` version tag parented directly to the
 * window panel: its own size never changes, but `createUiLayoutEcsSystem`
 * still repositions it every frame to stay pinned to that corner as the
 * window's edges move.
 */
export function createCornerDecorations(
  world: EcsWorld,
  windowPanel: number,
  fontAtlas: FontAtlas,
  sprites: DemoSprites,
  mutedTextColor: Color,
  uiLayer: number,
): void {
  const versionTag = createPanel(world, windowPanel, {
    anchor: UiAnchor.bottomLeft,
    anchoredPosition: { x: 16, y: 16 },
    sizeOrMargin: { x: 120, y: 32 },
    sprite: sprites.cornerAccent,
  });

  createLabel(world, versionTag, {
    text: 'v1.0.0',
    fontAtlas,
    size: 14,
    anchor: UiAnchor.stretchAll,
    sizeOrMargin: { x: 0, y: 0 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    color: mutedTextColor,
    category: uiLayer,
  });
}
