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
  UiAxis,
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

/**
 * The left nav panel's full width, in actual on-screen (device) pixels -
 * kept fixed regardless of the canvas's live scale factor (see `UiAxis`'s
 * `sizeUnit`/`marginUnit`), unlike the rest of this demo, which scales
 * normally with `fitReferenceResolution`. `600 * (1080 / 1920)`: the
 * on-screen width the reference design's own 600-reference-pixel panel
 * already had once the canvas's aspect ratio reaches 16:9 or wider (where
 * `fitReferenceResolution` pins `verticalWorldUnits` at exactly `1080`) -
 * chosen so this fixed width matches the reference design's own look
 * exactly at that aspect ratio, rather than picking an arbitrary number.
 */
export const leftPanelWidth = 600 * (1080 / 1920);

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
 * @param parent - The entity to parent the left panel to - a canvas (see `createUiCanvas`) or another UI element.
 * @param fontAtlas - The font atlas the title/menu/footer labels are drawn from.
 * @param sprites - The sprites this panel/menu is drawn with - see {@link MainMenuSprites}.
 * @param uiCategory - The render category the canvas's camera culls to.
 * @returns The left panel's entity, every row's entity/label (see {@link MainMenuRow}), and `onSelect`, raised with the invoked row's label.
 */
export function createMainMenu(
  world: EcsWorld,
  parent: number,
  fontAtlas: FontAtlas,
  sprites: MainMenuSprites,
  uiCategory: number,
): MainMenu {
  const { panelSprite, yellowSprite, borderSprite, rowSprite } = sprites;

  const panel = createPanel(world, parent, {
    // `widthUnit: 'screenPixels'` keeps this panel a fixed on-screen width
    // regardless of the canvas's live scale factor (see `leftPanelWidth`'s
    // own doc comment) - a full *stretch* on the vertical axis, not a
    // literal `1080`, so the panel always fills its parent's actual height,
    // whatever that resolves to.
    anchor: UiAnchor.stretchLeft({
      width: leftPanelWidth,
      widthUnit: 'screenPixels',
    }),
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

  // `rowWidth === leftPanelWidth's own 600-reference-pixel measurement minus
  // `2 * rowLeftInset` (464 = 600 - 2*68) - i.e. this divider (and
  // `menuContainer` below) were always meant to span the panel's full width
  // symmetrically inset by `rowLeftInset` on each edge. Now that the panel's
  // own width is a fixed on-screen pixel count rather than a fixed
  // reference-pixel one (see `leftPanelWidth`), that has to be expressed as
  // a *percentage* of the panel's actual resolved width (a stretch anchor)
  // instead of a literal `rowWidth`, so it keeps spanning correctly at any
  // aspect ratio rather than overflowing or leaving a gap.
  createPanel(world, panel, {
    anchor: {
      x: UiAxis.stretch({ min: 0, max: 1 }, { margin: -2 * rowLeftInset }),
      y: UiAxis.point(1, { size: 2 }),
    },
    anchoredPosition: { x: 0, y: -202 },
    sprite: borderSprite,
  });

  const menuContainer = world.createEntity();

  addPositionComponent(world, menuContainer);
  addParentComponent(world, menuContainer, { parent: panel });
  addRectTransformComponent(world, menuContainer, {
    x: UiAxis.stretch({ min: 0, max: 1 }, { margin: -2 * rowLeftInset }),
    y: UiAxis.point(1, { size: rowHeight }),
    anchoredPosition: { x: 0, y: -252 },
  });
  addVerticalLayoutGroupComponent(world, menuContainer, {
    spacing: 0,
    childAlignment: uiAlignments.topLeft,
  });
  // No `horizontalFit` - left at its `'unconstrained'` default so the
  // stretch-x anchor above stands; each row still fills the container's
  // actual width via `VerticalLayoutGroupEcsComponent`'s own
  // `childForceExpandWidth` (defaulted `true`), regardless of `rowWidth`.
  addContentSizeFitterComponent(world, menuContainer, {
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
