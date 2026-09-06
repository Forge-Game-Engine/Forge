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
 * Creates the `stretchTop` title bar nested inside the content panel - two
 * levels of stretch-through-nesting - that resizes its width only, following
 * whatever width the content panel (and in turn the window) currently has,
 * plus its `middleRight`-anchored close button: a point anchor still
 * resolves correctly this many levels deep.
 */
export function createTitleBar(
  world: EcsWorld,
  content: number,
  fontAtlas: FontAtlas,
  sprites: DemoSprites,
  textColor: Color,
  uiLayer: number,
): void {
  const titleBar = createPanel(world, content, {
    anchor: UiAnchor.stretchTop({ height: 64, horizontalMargin: -16 }),
    anchoredPosition: { x: 0, y: -8 },
    sprite: sprites.header,
  });

  createLabel(world, titleBar, {
    text: 'Options',
    fontAtlas,
    size: 24,
    anchor: UiAnchor.stretchAll({ x: -24, y: 0 }),
    horizontalAlign: textHorizontalAlignments.left,
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: uiLayer,
  });

  const closeButton = createPanel(world, titleBar, {
    anchor: UiAnchor.middleRight({ x: 40, y: 40 }),
    anchoredPosition: { x: -8, y: 0 },
    sprite: sprites.closeButton,
  });

  createLabel(world, closeButton, {
    text: 'X',
    fontAtlas,
    size: 20,
    anchor: UiAnchor.stretchAll(),
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: uiLayer,
  });
}
