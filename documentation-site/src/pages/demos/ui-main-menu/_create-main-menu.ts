import {
  addParentComponent,
  addPositionComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { ParameterizedForgeEvent } from '@forge-game-engine/forge/events';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
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

/** The left nav panel's full width, measured off the reference design at a 1920-wide reference resolution. */
export const leftPanelWidth = 600;

const rowWidth = 464;
const rowHeight = 76;
const rowLeftInset = 68;
const borderBarWidth = 4;

/** The sprites {@link createMainMenu} draws its panel/title/rows with. */
export interface MainMenuSprites {
  /** The left panel's own background, tinted `fleetCommandPalette.panel`. */
  panelSprite: SpriteEcsComponent;

  /** The title's yellow swatch, tinted `fleetCommandPalette.yellow`. */
  yellowSprite: SpriteEcsComponent;

  /** The divider rule and each row's left border accent, tinted `fleetCommandPalette.border`. */
  borderSprite: SpriteEcsComponent;

  /** Each row's own background - a plain, untinted sprite (its visible color comes entirely from its `UiColorTransitionEcsComponent`). */
  rowSprite: SpriteEcsComponent;
}

/** One menu row's entity and the label it was built from. */
export interface MainMenuRow {
  /** The row's entity - a `createPanel` result with a `UiInteractableEcsComponent`/`UiColorTransitionEcsComponent` added. */
  entity: number;

  /** The row's display label, e.g. `'CAMPAIGN'`. */
  label: string;
}

export interface MainMenu {
  /** The left nav panel's own entity - a `createPanel` result, `leftPanelWidth` wide and full canvas height. Everything else this function builds is parented to it. */
  panel: number;

  /** Every row, in the same top-to-bottom order as {@link menuItems} - `rows[0]` is "Campaign". */
  rows: MainMenuRow[];

  /** Raised with a row's label whenever it's invoked - by a click, or a submit action while it's focused. */
  onSelect: ParameterizedForgeEvent<string>;
}

/**
 * Builds the reference design's left nav panel: a full-height
 * `leftPanelWidth`-wide panel holding the title lockup (a yellow swatch
 * beside "VANGUARD" over the smaller, letter-spaced "FLEET COMMAND"), a
 * divider rule, the six-item numbered main menu, and a build/pilot footer.
 *
 * Each row is hand-composed rather than built with `createButton` - a
 * button only supports a single centered label, but a menu row needs three
 * independently positioned parts (a left border accent, a dim leading
 * index, and a bright title) - by attaching the same interaction pieces
 * `createButton` itself attaches (`UiInteractableEcsComponent` +
 * `UiColorTransitionEcsComponent`) directly to a `createPanel` entity. A
 * row's own tint is fully transparent at rest, so the panel's background
 * shows through until the row is hovered or focused (`hoverColor: blue`) -
 * `createUiMainMenuGame` focuses the first row by default, which is why it
 * reads as solid blue at rest, matching the reference. The six rows are
 * stacked, edge-to-edge, with a `VerticalLayoutGroupEcsComponent` inside a
 * `ContentSizeFitterEcsComponent` container, so adding, removing, or
 * renaming an item never requires touching layout math.
 * @param world - The ECS world to create the panel/menu entities in.
 * @param canvas - The canvas entity to parent the left panel to.
 * @param fontAtlas - The font atlas the title/menu/footer labels are drawn from.
 * @param sprites - The sprites this panel/menu is drawn with - see {@link MainMenuSprites}.
 * @param uiCategory - The render category the canvas's camera culls to.
 * @returns The left panel's entity, every row's entity/label (see {@link MainMenuRow}), and `onSelect`, raised with the invoked row's label.
 */
export function createMainMenu(
  world: EcsWorld,
  canvas: number,
  fontAtlas: FontAtlas,
  sprites: MainMenuSprites,
  uiCategory: number,
): MainMenu {
  const { panelSprite, yellowSprite, borderSprite, rowSprite } = sprites;

  const panel = createPanel(world, canvas, {
    // A fixed `leftPanelWidth` but a full *stretch* on the vertical axis -
    // not a literal `1080` - so the panel always fills the canvas's actual
    // height. `createUiMainMenuGame`'s `matchWidth` scale mode keeps the
    // canvas's width pinned to the 1920 every position in this file is
    // authored against, but its height still varies with the destination's
    // live aspect ratio, and a literal `1080` would leave a gap (or get
    // clipped) on anything taller (or shorter) than that.
    anchor: UiAnchor.stretchLeft({ width: leftPanelWidth }),
    sprite: panelSprite,
  });

  createPanel(world, panel, {
    anchor: UiAnchor.topLeft({ x: 48, y: 50 }),
    anchoredPosition: { x: rowLeftInset, y: -88 },
    sprite: yellowSprite,
  });

  createLabel(world, panel, {
    text: 'VANGUARD',
    fontAtlas,
    size: 42,
    letterSpacing: 0.02,
    anchor: UiAnchor.topLeft({ x: 400, y: 44 }),
    anchoredPosition: { x: 138, y: -90 },
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  createLabel(world, panel, {
    text: 'FLEET COMMAND',
    fontAtlas,
    size: 20,
    letterSpacing: 0.12,
    anchor: UiAnchor.topLeft({ x: 400, y: 24 }),
    anchoredPosition: { x: 138, y: -128 },
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.blue,
    category: uiCategory,
  });

  createPanel(world, panel, {
    anchor: UiAnchor.topLeft({ x: rowWidth, y: 2 }),
    anchoredPosition: { x: rowLeftInset, y: -202 },
    sprite: borderSprite,
  });

  const menuContainer = world.createEntity();

  addPositionComponent(world, menuContainer);
  addParentComponent(world, menuContainer, { parent: panel });
  addRectTransformComponent(world, menuContainer, {
    ...UiAnchor.topLeft({ x: rowWidth, y: rowHeight }),
    anchoredPosition: { x: rowLeftInset, y: -252 },
  });
  addVerticalLayoutGroupComponent(world, menuContainer, {
    spacing: 0,
    childAlignment: uiAlignments.topLeft,
  });
  addContentSizeFitterComponent(world, menuContainer, {
    horizontalFit: 'preferredSize',
    verticalFit: 'preferredSize',
  });

  const onSelect = new ParameterizedForgeEvent<string>('mainMenu.onSelect');
  const rows: MainMenuRow[] = [];
  const transparent = new Color(0, 0, 0, 0);

  menuItems.forEach((label, index) => {
    const row = createPanel(world, menuContainer, {
      anchor: UiAnchor.center({ x: rowWidth, y: rowHeight }),
      sprite: rowSprite,
    });

    const interactable = addUiInteractableComponent(world, row);

    addUiColorTransitionComponent(world, row, {
      normalColor: transparent,
      hoverColor: fleetCommandPalette.blue,
      pressedColor: fleetCommandPalette.border,
      duration: 120,
    });

    createPanel(world, row, {
      anchor: UiAnchor.stretchLeft({ width: borderBarWidth }),
      sprite: borderSprite,
    });

    createLabel(world, row, {
      text: String(index + 1).padStart(2, '0'),
      fontAtlas,
      size: 16,
      letterSpacing: 0.04,
      anchor: UiAnchor.middleLeft({ x: 40, y: rowHeight }),
      anchoredPosition: { x: 32, y: 0 },
      verticalAlign: textVerticalAlignments.middle,
      color: fleetCommandPalette.blue,
      category: uiCategory,
    });

    createLabel(world, row, {
      text: label,
      fontAtlas,
      size: 22,
      letterSpacing: 0.04,
      anchor: UiAnchor.middleLeft({ x: rowWidth - 84, y: rowHeight }),
      anchoredPosition: { x: 84, y: 0 },
      verticalAlign: textVerticalAlignments.middle,
      color: fleetCommandPalette.ink,
      category: uiCategory,
    });

    interactable.onInvoke.registerListener(() => onSelect.raise(label));
    rows.push({ entity: row, label });
  });

  createLabel(world, panel, {
    text: 'PILOT: CMDR. A. OKONJO',
    fontAtlas,
    size: 16,
    letterSpacing: 0.02,
    anchor: UiAnchor.bottomLeft({ x: 500, y: 24 }),
    anchoredPosition: { x: rowLeftInset, y: 56 },
    verticalAlign: textVerticalAlignments.bottom,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  createLabel(world, panel, {
    text: 'BUILD 0.9.14-RC2',
    fontAtlas,
    size: 14,
    letterSpacing: 0.02,
    anchor: UiAnchor.bottomLeft({ x: 400, y: 20 }),
    anchoredPosition: { x: rowLeftInset, y: 28 },
    verticalAlign: textVerticalAlignments.bottom,
    color: fleetCommandPalette.blue,
    category: uiCategory,
  });

  return { panel, rows, onSelect };
}
