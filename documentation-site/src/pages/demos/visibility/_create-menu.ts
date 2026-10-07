import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addVisibilityComponent,
  Color,
  SpriteEcsComponent,
  VisibilityEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addCanvasGroupComponent,
  addContentSizeFitterComponent,
  addLayoutElementComponent,
  addVerticalLayoutGroupComponent,
  CanvasGroupEcsComponent,
  createButton,
  createLabel,
  createPanel,
  uiAlignments,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

const textColor = new Color(0.12, 0.12, 0.16, 1);

export interface Menu {
  /** Hides or shows the whole menu: panel, title and every button. */
  visibility: VisibilityEcsComponent;

  /** Hides or shows the "Load game" button on its own. */
  loadButtonVisibility: VisibilityEcsComponent;

  /** Fades the whole menu, which stays laid out and drawn. */
  canvasGroup: CanvasGroupEcsComponent;
}

/**
 * Builds a menu panel whose `VerticalLayoutGroupEcsComponent` stacks four
 * buttons, with a `ContentSizeFitterEcsComponent` so the panel fits them.
 * Hiding the "Load game" button takes it out of the group, so the buttons
 * below move up and the panel shrinks to fit the three that are left. The
 * panel also gets a `VisibilityEcsComponent`, to hide everything at once,
 * and a `CanvasGroupEcsComponent`, to fade it instead.
 * @param world - The ECS world to create the menu entities in.
 * @param canvas - The canvas entity to parent the menu panel to.
 * @param fontAtlas - The font atlas the title and button labels are drawn from.
 * @param panelSprite - The nine-sliced sprite the panel and buttons share.
 * @param uiCategory - The render category the canvas's camera culls to.
 * @returns The menu's visibility and canvas group components.
 */
export function createMenu(
  world: EcsWorld,
  canvas: number,
  fontAtlas: FontAtlas,
  panelSprite: SpriteEcsComponent,
  uiCategory: number,
): Menu {
  const panel = createPanel(world, canvas, {
    anchor: UiAnchor.topRight(),
    anchoredPosition: { x: -160, y: -120 },
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
    anchor: UiAnchor.stretchTopLeft({ height: 0 }),
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
  };

  const buttons = ['Continue', 'Load game', 'Options', 'Quit'].map((label) => {
    const button = createButton(world, panel, {
      sprite: panelSprite,
      label,
      fontAtlas,
      labelSize: 22,
      labelColor: textColor,
      labelCategory: uiCategory,
      anchor: UiAnchor.center({ x: 220, y: 56 }),
      transition: buttonTransition,
    });

    // A fixed preferred size, so the group and the fitter measure each
    // button at 220 x 56 rather than at whatever size the group last gave
    // it, and the panel shrinks once a button is hidden.
    addLayoutElementComponent(world, button.entity, {
      preferredWidth: 220,
      preferredHeight: 56,
    });

    return button;
  });

  return {
    visibility: addVisibilityComponent(world, panel),
    loadButtonVisibility: addVisibilityComponent(world, buttons[1].entity),
    canvasGroup: addCanvasGroupComponent(world, panel),
  };
}
