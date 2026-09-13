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

/** The sprites {@link createFlagshipPanel} draws its ship placeholder/card/meter/button with. */
export interface FlagshipPanelSprites {
  /** The stat card's own flat background, tinted `fleetCommandPalette.panel`. */
  panelSprite: SpriteEcsComponent;

  /** The hero ship render placeholder's border frame, tinted `fleetCommandPalette.border`. */
  borderSprite: SpriteEcsComponent;

  /** The hero ship render placeholder's inset fill, tinted `fleetCommandPalette.void` to match the canvas backdrop. */
  voidSprite: SpriteEcsComponent;

  /** The fleet-strength meter's track, tinted `fleetCommandPalette.border` so it reads against the card's own `panel`-tinted background. */
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

const heroBoxWidth = 634;
const heroBoxHeight = 302;
const heroBoxBorderWidth = 2;

const cardWidth = 492;
const cardHeight = 242;
const cardContentWidth = cardWidth - 48;

/**
 * Builds the reference design's ship readout: a bordered "hero ship render"
 * placeholder (a stand-in for real ship art - see `heroBoxBorderWidth`'s
 * doc comment) beside a flagship stat card showing the ship's name/class, a
 * `createProgressBar` "Fleet Strength" meter, and a `createButton` "Deploy"
 * call to action.
 * @param world - The ECS world to create the readout entities in.
 * @param parent - The parent entity to anchor the readout within - `createMissionBrief`'s returned root, so both share the same right-column coordinate space.
 * @param fontAtlas - The font atlas the card's labels are drawn from.
 * @param sprites - The border/fill/meter/button sprites - see {@link FlagshipPanelSprites}.
 * @param uiCategory - The render category the canvas's camera culls to.
 * @param fleetStrength - The fleet-strength meter's initial value, from `0` (empty) to `1` (full).
 * @returns `onDeploy`, raised when the Deploy button is invoked.
 */
export function createFlagshipPanel(
  world: EcsWorld,
  parent: number,
  fontAtlas: FontAtlas,
  sprites: FlagshipPanelSprites,
  uiCategory: number,
  fleetStrength: number,
): FlagshipPanel {
  const {
    panelSprite,
    borderSprite,
    voidSprite,
    trackSprite,
    fillSprite,
    buttonSprite,
  } = sprites;

  // Both boxes below are right-pivoted (`topRight`, not `topLeft`) so they
  // stay pinned to `parent`'s (the mission brief's) actual right edge
  // instead of drifting away from it - and leaving a growing empty gap on
  // the right - on a wider-than-16:9 destination, where
  // `fitReferenceResolution` grows `parent` past the reference design's
  // 1320-wide assumption (1920 minus the nav panel). Each `anchoredPosition.x`
  // reproduces the reference design's exact measurement as an offset from
  // the right edge instead of the left: `originalLeftOffset + width - 1320`.
  const heroBox = createPanel(world, parent, {
    anchor: UiAnchor.topRight({ x: heroBoxWidth, y: heroBoxHeight }),
    anchoredPosition: { x: 86 + heroBoxWidth - 1320, y: -694 },
    sprite: borderSprite,
  });

  createPanel(world, heroBox, {
    // `stretchAll`'s margin is added to (or, negative, subtracted from) the
    // full anchored span - shrinking a centered rect by `2 * borderWidth`
    // total (split evenly across both edges by the default 0.5 pivot)
    // insets it by exactly `borderWidth` on every side.
    anchor: UiAnchor.stretchAll({
      x: -2 * heroBoxBorderWidth,
      y: -2 * heroBoxBorderWidth,
    }),
    sprite: voidSprite,
  });

  createLabel(world, heroBox, {
    text: 'HERO SHIP RENDER - 420x200',
    fontAtlas,
    size: 16,
    letterSpacing: 0.02,
    // A left-pivoted anchor even though the text reads centered - see
    // `createButton`'s own doc comment on this pitfall: `horizontalAlign`
    // measures its box from the label's own local x = 0, which a
    // center/right pivot would place in the middle/at the right edge of
    // that box instead of its left edge, pushing "centered" text off to
    // one side.
    anchor: UiAnchor.middleLeft({ x: heroBoxWidth, y: 24 }),
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    maxWidth: heroBoxWidth,
    color: new Color(
      fleetCommandPalette.ink.r,
      fleetCommandPalette.ink.g,
      fleetCommandPalette.ink.b,
      0.5,
    ),
    category: uiCategory,
  });

  const card = createPanel(world, parent, {
    anchor: UiAnchor.topRight({ x: cardWidth, y: cardHeight }),
    anchoredPosition: { x: 744 + cardWidth - 1320, y: -754 },
    sprite: panelSprite,
  });

  createLabel(world, card, {
    text: 'FLAGSHIP',
    fontAtlas,
    size: 15,
    letterSpacing: 0.12,
    anchor: UiAnchor.topLeft({ x: 300, y: 22 }),
    anchoredPosition: { x: 24, y: -20 },
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.blue,
    category: uiCategory,
  });

  createLabel(world, card, {
    text: 'TSN VANGUARD - CRUISER',
    fontAtlas,
    size: 24,
    letterSpacing: 0.02,
    anchor: UiAnchor.topLeft({ x: 440, y: 32 }),
    anchoredPosition: { x: 24, y: -46 },
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  createLabel(world, card, {
    text: 'FLEET STRENGTH',
    fontAtlas,
    size: 15,
    letterSpacing: 0.05,
    anchor: UiAnchor.topLeft({ x: 220, y: 20 }),
    anchoredPosition: { x: 24, y: -96 },
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  const percentageWidth = 100;

  createLabel(world, card, {
    text: `${Math.round(fleetStrength * 100)}%`,
    fontAtlas,
    size: 15,
    // Left-pivoted for the same reason as the hero box's placeholder label
    // above - a right pivot would place the `horizontalAlign: 'right'` box
    // to the *right* of the card's own edge instead of flush with it, since
    // that box is always measured rightward from the label's local x = 0.
    anchor: UiAnchor.topLeft({ x: percentageWidth, y: 20 }),
    anchoredPosition: { x: cardWidth - 24 - percentageWidth, y: -96 },
    maxWidth: percentageWidth,
    horizontalAlign: textHorizontalAlignments.right,
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.yellow,
    category: uiCategory,
  });

  createProgressBar(world, card, {
    anchor: UiAnchor.topLeft({ x: cardContentWidth, y: 16 }),
    anchoredPosition: { x: 24, y: -120 },
    trackSprite,
    fillSprite,
    value: fleetStrength,
  });

  const deployButton = createButton(world, card, {
    anchor: UiAnchor.bottomLeft({ x: cardContentWidth, y: 56 }),
    anchoredPosition: { x: 24, y: 24 },
    sprite: buttonSprite,
    label: 'DEPLOY',
    fontAtlas,
    labelSize: 22,
    labelColor: fleetCommandPalette.void,
    labelCategory: uiCategory,
    transition: {
      normalColor: fleetCommandPalette.blue,
      hoverColor: Color.white,
      pressedColor: fleetCommandPalette.border,
    },
  });

  return { onDeploy: deployButton.onInvoke };
}
