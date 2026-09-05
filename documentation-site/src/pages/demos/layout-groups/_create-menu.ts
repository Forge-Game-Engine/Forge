import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addContentSizeFitterComponent,
  addLayoutElementComponent,
  addVerticalLayoutGroupComponent,
  createButton,
  createLabel,
  createPanel,
  uiAlignments,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

const textColor = new Color(0.12, 0.12, 0.16, 1);

/**
 * Builds a "Menu" panel: a `VerticalLayoutGroupEcsComponent` stacking three
 * buttons, with a `ContentSizeFitterEcsComponent` on the panel itself so it
 * shrink-wraps to exactly fit them - resize a button (or add a fourth) and
 * the panel grows with it, with no `sizeOrMargin` of its own to keep in sync.
 * `padding.top` reserves room for the title label, which is excluded from
 * the group's own arrangement (and from the size the fitter measures) via
 * `LayoutElementEcsComponent.ignoreLayout` - it's positioned by its own
 * anchor instead, the same way a decorative element would be.
 * @param world - The ECS world to create the menu entities in.
 * @param canvas - The canvas entity to parent the menu panel to.
 * @param fontAtlas - The font atlas the title/button labels are drawn from.
 * @param panelSprite - The nine-sliced sprite the panel and buttons share.
 * @param uiCategory - The render category the canvas's camera culls to.
 */
export function createMenu(
  world: EcsWorld,
  canvas: number,
  fontAtlas: FontAtlas,
  panelSprite: SpriteEcsComponent,
  uiCategory: number,
): void {
  const panel = createPanel(world, canvas, {
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 60, y: -60 },
    sprite: panelSprite,
  });

  addVerticalLayoutGroupComponent(world, panel, {
    padding: { left: 24, right: 24, top: 64, bottom: 24 },
    spacing: 16,
    childAlignment: uiAlignments.center,
  });
  addContentSizeFitterComponent(world, panel, {
    horizontalFit: 'preferredSize',
    verticalFit: 'preferredSize',
  });

  const title = createLabel(world, panel, {
    text: 'Menu',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.stretchTopLeft,
    // See createButton's own labels below for why this is needed - a
    // stretch anchor's default sizeOrMargin is a margin, not a literal size.
    sizeOrMargin: { x: 0, y: 0 },
    anchoredPosition: { x: 0, y: -20 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: uiCategory,
  });

  addLayoutElementComponent(world, title, { ignoreLayout: true });

  const buttonTransition = {
    normalColor: Color.white,
    hoverColor: new Color(0.85, 0.85, 0.85, 1),
    pressedColor: new Color(0.65, 0.65, 0.65, 1),
    disabledColor: new Color(0.5, 0.5, 0.5, 0.6),
  };

  for (const label of ['Continue', 'Options', 'Quit']) {
    createButton(world, panel, {
      sprite: panelSprite,
      label,
      fontAtlas,
      labelSize: 22,
      labelColor: textColor,
      labelCategory: uiCategory,
      sizeOrMargin: { x: 220, y: 56 },
      transition: buttonTransition,
    });
  }
}
