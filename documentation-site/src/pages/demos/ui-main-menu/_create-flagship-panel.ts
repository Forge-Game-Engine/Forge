import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { ForgeEvent } from '@forge-game-engine/forge/events';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createButton,
  createLabel,
  createPanel,
  createProgressBar,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { fleetCommandPalette } from './_palette';

/** The sprites {@link createFlagshipPanel} draws its background/meter/button with. */
export interface FlagshipPanelSprites {
  /** The card's own flat background, tinted `fleetCommandPalette.panel`. */
  panelSprite: SpriteEcsComponent;

  /** The fleet-strength meter's track, tinted `fleetCommandPalette.well`. */
  trackSprite: SpriteEcsComponent;

  /** The fleet-strength meter's fill, tinted `fleetCommandPalette.blue`. */
  fillSprite: SpriteEcsComponent;

  /** The Deploy button's background - a plain, untinted sprite (its visible color comes entirely from its `UiColorTransitionEcsComponent`). */
  buttonSprite: SpriteEcsComponent;
}

export interface FlagshipPanel {
  /**
   * Raised when the Deploy button is invoked - `Button.onInvoke`, surfaced
   * directly since registering a single listener on it is the overwhelmingly
   * common case.
   */
  onDeploy: ForgeEvent;
}

const panelWidth = 520;
const panelHeight = 260;
const contentWidth = panelWidth - 56;

/**
 * Builds the reference design's flagship readout card: the ship's
 * name/class, a `createProgressBar` "Fleet Strength" meter, and a `createButton`
 * "Deploy" call to action - the main menu's secondary panel, showing a
 * progress bar and a button alongside the numbered menu built by
 * `createMainMenu`.
 * @param world - The ECS world to create the panel entities in.
 * @param canvas - The canvas entity to parent the panel to.
 * @param fontAtlas - The font atlas the panel's labels are drawn from.
 * @param sprites - The background/meter/button sprites - see {@link FlagshipPanelSprites}.
 * @param uiCategory - The render category the canvas's camera culls to.
 * @param fleetStrength - The fleet-strength meter's initial value, from `0` (empty) to `1` (full).
 * @returns `onDeploy`, raised when the Deploy button is invoked.
 */
export function createFlagshipPanel(
  world: EcsWorld,
  canvas: number,
  fontAtlas: FontAtlas,
  sprites: FlagshipPanelSprites,
  uiCategory: number,
  fleetStrength: number,
): FlagshipPanel {
  const { panelSprite, trackSprite, fillSprite, buttonSprite } = sprites;

  const panel = createPanel(world, canvas, {
    anchor: UiAnchor.bottomRight({ x: panelWidth, y: panelHeight }),
    anchoredPosition: { x: -80, y: 80 },
    sprite: panelSprite,
  });

  createLabel(world, panel, {
    text: 'FLAGSHIP',
    fontAtlas,
    size: 15,
    letterSpacing: 0.12,
    anchor: UiAnchor.topLeft({ x: 300, y: 22 }),
    anchoredPosition: { x: 28, y: -24 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.blue,
    category: uiCategory,
  });

  createLabel(world, panel, {
    text: 'TSN VANGUARD',
    fontAtlas,
    size: 28,
    letterSpacing: 0.03,
    anchor: UiAnchor.topLeft({ x: 400, y: 38 }),
    anchoredPosition: { x: 28, y: -54 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  createLabel(world, panel, {
    text: 'CRUISER',
    fontAtlas,
    size: 15,
    letterSpacing: 0.1,
    anchor: UiAnchor.topLeft({ x: 300, y: 22 }),
    anchoredPosition: { x: 28, y: -92 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.blue,
    category: uiCategory,
  });

  createLabel(world, panel, {
    text: 'FLEET STRENGTH',
    fontAtlas,
    size: 15,
    letterSpacing: 0.05,
    anchor: UiAnchor.topLeft({ x: 220, y: 20 }),
    anchoredPosition: { x: 28, y: -134 },
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  createLabel(world, panel, {
    text: `${Math.round(fleetStrength * 100)}%`,
    fontAtlas,
    size: 15,
    anchor: UiAnchor.topRight({ x: 100, y: 20 }),
    anchoredPosition: { x: -28, y: -134 },
    maxWidth: 100,
    horizontalAlign: textHorizontalAlignments.right,
    verticalAlign: textVerticalAlignments.middle,
    color: fleetCommandPalette.yellow,
    category: uiCategory,
  });

  createProgressBar(world, panel, {
    anchor: UiAnchor.topLeft({ x: contentWidth, y: 18 }),
    anchoredPosition: { x: 28, y: -160 },
    trackSprite,
    fillSprite,
    value: fleetStrength,
  });

  const deployButton = createButton(world, panel, {
    anchor: UiAnchor.bottomLeft({ x: contentWidth, y: 56 }),
    anchoredPosition: { x: 28, y: 28 },
    sprite: buttonSprite,
    label: 'DEPLOY',
    fontAtlas,
    labelSize: 24,
    labelColor: fleetCommandPalette.void,
    labelCategory: uiCategory,
    transition: {
      normalColor: fleetCommandPalette.yellow,
      hoverColor: Color.white,
      pressedColor: fleetCommandPalette.blue,
    },
  });

  return { onDeploy: deployButton.onInvoke };
}
