import {
  addParentComponent,
  addPositionComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { ParameterizedForgeEvent } from '@forge-game-engine/forge/events';
import { SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addContentSizeFitterComponent,
  addRectTransformComponent,
  addUiColorTransitionComponent,
  addUiInteractableComponent,
  addVerticalLayoutGroupComponent,
  createLabel,
  createPanel,
  uiAlignments,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { fleetCommandPalette } from './_palette';

/** The reference design's six main-menu entries, in top-to-bottom order. */
const menuItems = [
  'CAMPAIGN',
  'FLEET YARD',
  'SKIRMISH',
  'CODEX',
  'SETTINGS',
  'QUIT TO DESKTOP',
];

const menuWidth = 420;
const rowHeight = 60;

/** One menu row's entity and the label it was built from. */
export interface MainMenuRow {
  /** The row's entity - a `createPanel` result with a `UiInteractableEcsComponent`/`UiColorTransitionEcsComponent` added. */
  entity: number;

  /** The row's display label, e.g. `'CAMPAIGN'`. */
  label: string;
}

export interface MainMenu {
  /** Every row, in the same top-to-bottom order as {@link menuItems} - `rows[0]` is "Campaign". */
  rows: MainMenuRow[];

  /** Raised with a row's label whenever it's invoked - by a click, or a submit action while it's focused. */
  onSelect: ParameterizedForgeEvent<string>;
}

/**
 * Builds the reference design's title lockup ("VANGUARD" over "FLEET
 * COMMAND") and its six-item numbered main menu. Each row is hand-composed
 * rather than built with `createButton` - a button only supports a single
 * centered label, but a menu row needs two independently positioned ones
 * (a dim leading index and a bright title) - by attaching the same pieces
 * `createButton` itself attaches (`UiInteractableEcsComponent` +
 * `UiColorTransitionEcsComponent`) directly to a `createPanel` entity. The
 * six rows are stacked with a `VerticalLayoutGroupEcsComponent` inside a
 * `ContentSizeFitterEcsComponent` container, so adding, removing, or
 * renaming an item never requires touching layout math.
 * @param world - The ECS world to create the title/menu entities in.
 * @param canvas - The canvas entity to parent the title/menu to.
 * @param fontAtlas - The font atlas the title/menu labels are drawn from.
 * @param rowSprite - The sprite each row's flat background is drawn with -
 * its visible tint comes entirely from the row's own
 * `UiColorTransitionEcsComponent`, so this only needs to be a plain,
 * untinted sprite (e.g. `createImageSprite` over a solid white image).
 * @param uiCategory - The render category the canvas's camera culls to.
 * @returns Every row's entity/label (see {@link MainMenuRow}) and
 * `onSelect`, raised with the invoked row's label.
 */
export function createMainMenu(
  world: EcsWorld,
  canvas: number,
  fontAtlas: FontAtlas,
  rowSprite: SpriteEcsComponent,
  uiCategory: number,
): MainMenu {
  createLabel(world, canvas, {
    text: 'VANGUARD',
    fontAtlas,
    size: 22,
    letterSpacing: 0.12,
    anchor: UiAnchor.topLeft({ x: 400, y: 30 }),
    anchoredPosition: { x: 80, y: -60 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.blue,
    category: uiCategory,
  });

  createLabel(world, canvas, {
    text: 'FLEET COMMAND',
    fontAtlas,
    size: 48,
    letterSpacing: 0.08,
    anchor: UiAnchor.topLeft({ x: 700, y: 64 }),
    anchoredPosition: { x: 80, y: -110 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  const menuContainer = world.createEntity();

  addPositionComponent(world, menuContainer);
  addParentComponent(world, menuContainer, { parent: canvas });
  addRectTransformComponent(world, menuContainer, {
    ...UiAnchor.topLeft({ x: menuWidth, y: rowHeight }),
    anchoredPosition: { x: 80, y: -220 },
  });
  addVerticalLayoutGroupComponent(world, menuContainer, {
    spacing: 6,
    childAlignment: uiAlignments.topLeft,
  });
  addContentSizeFitterComponent(world, menuContainer, {
    horizontalFit: 'preferredSize',
    verticalFit: 'preferredSize',
  });

  const onSelect = new ParameterizedForgeEvent<string>('mainMenu.onSelect');
  const rows: MainMenuRow[] = [];

  menuItems.forEach((label, index) => {
    const row = createPanel(world, menuContainer, {
      anchor: UiAnchor.center({ x: menuWidth, y: rowHeight }),
      sprite: rowSprite,
    });

    const interactable = addUiInteractableComponent(world, row);

    addUiColorTransitionComponent(world, row, {
      normalColor: fleetCommandPalette.well,
      hoverColor: fleetCommandPalette.blue,
      pressedColor: fleetCommandPalette.panel,
      duration: 120,
    });

    createLabel(world, row, {
      text: String(index + 1).padStart(2, '0'),
      fontAtlas,
      size: 18,
      letterSpacing: 0.04,
      anchor: UiAnchor.middleLeft({ x: 48, y: rowHeight }),
      anchoredPosition: { x: 24, y: 0 },
      verticalAlign: textVerticalAlignments.middle,
      color: fleetCommandPalette.blue,
      category: uiCategory,
    });

    createLabel(world, row, {
      text: label,
      fontAtlas,
      size: 24,
      letterSpacing: 0.04,
      anchor: UiAnchor.middleLeft({ x: menuWidth - 88, y: rowHeight }),
      anchoredPosition: { x: 80, y: 0 },
      verticalAlign: textVerticalAlignments.middle,
      color: fleetCommandPalette.ink,
      category: uiCategory,
    });

    interactable.onInvoke.registerListener(() => onSelect.raise(label));
    rows.push({ entity: row, label });
  });

  return { rows, onSelect };
}
