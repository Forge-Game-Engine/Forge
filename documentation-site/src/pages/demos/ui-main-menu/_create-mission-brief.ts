import {
  addParentComponent,
  addPositionComponent,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  FontAtlas,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  addRectTransformComponent,
  createLabel,
  createPanel,
  UiAnchor,
  UiAxis,
} from '@forge-game-engine/forge/ui';
import { leftPanelWidth } from './_create-main-menu';
import { fleetCommandPalette } from './_palette';

/** The sprites {@link createMissionBrief} draws its circle/tag/underline with. */
export interface MissionBriefSprites {
  /** The large decorative backdrop circle, tinted `fleetCommandPalette.panel`. */
  circleSprite: SpriteEcsComponent;

  /** The "Continue" tag's background, tinted `fleetCommandPalette.yellow`. */
  tagSprite: SpriteEcsComponent;

  /** The rule under the title, tinted `fleetCommandPalette.blue`. */
  underlineSprite: SpriteEcsComponent;
}

const mutedInk = new Color(
  fleetCommandPalette.ink.r,
  fleetCommandPalette.ink.g,
  fleetCommandPalette.ink.b,
  0.7,
);

/**
 * Builds the reference design's mission brief: a large decorative circle
 * bleeding off the top-right corner (behind everything else here - created
 * first, so it's drawn first, i.e. behind the title text drawn after it),
 * a yellow "Continue" tag, the two-line mission title, a short underline
 * rule, and a wrapped blurb paragraph. Purely decorative/informational - no
 * interactables here, unlike `createMainMenu`/`createFlagshipPanel`.
 * @param world - The ECS world to create the mission brief entities in.
 * @param parent - The entity to parent the mission brief to - a canvas (see `createUiCanvas`) or another UI element.
 * @param fontAtlas - The font atlas the tag/title/blurb labels are drawn from.
 * @param sprites - The sprites this panel is drawn with - see {@link MissionBriefSprites}.
 * @param uiCategory - The render category the canvas's camera culls to.
 * @returns The mission brief's root entity, parented to `parent` and anchored to fill everything right of the nav panel's own fixed on-screen width - other right-column content (see `createFlagshipPanel`) parents to this same entity to share its coordinate space.
 */
export function createMissionBrief(
  world: EcsWorld,
  parent: number,
  fontAtlas: FontAtlas,
  sprites: MissionBriefSprites,
  uiCategory: number,
): number {
  const { circleSprite, tagSprite, underlineSprite } = sprites;

  const root = world.createEntity();

  addPositionComponent(world, root);
  addParentComponent(world, root, { parent });
  addRectTransformComponent(world, root, {
    // Fills whatever's left of `parent` after the nav panel's own on-screen
    // width: `margin: -leftPanelWidth` shrinks the horizontal stretch span
    // by exactly that much, and the *right*-pivoted (`pivot: 1`) anchor
    // keeps that shrink on the *left* edge only - the right edge stays
    // pinned to `parent`'s own right edge, with no `anchoredPosition` offset
    // needed (see `createMainMenu`'s own left panel for the matching
    // `widthUnit: 'screenPixels'` on the fixed-width side). `marginUnit:
    // 'screenPixels'` matches that same panel's own on-screen width exactly,
    // in real device pixels rather than reference pixels, so this rect's
    // left edge always lines up with the nav panel's actual right edge
    // regardless of the canvas's live scale factor - a plain reference-pixel
    // margin would drift out of sync with the panel's fixed on-screen width
    // as the destination's aspect ratio changes. The vertical axis is a
    // plain full stretch, for the same reason `createMainMenu`'s panel needs
    // one instead of a literal `1080`.
    x: UiAxis.stretch(
      { min: 0, max: 1 },
      { pivot: 1, margin: -leftPanelWidth, marginUnit: 'screenPixels' },
    ),
    y: UiAxis.stretch({ min: 0, max: 1 }),
  });

  createPanel(world, root, {
    // Right-pivoted (`topRight`, not `topLeft`) so this stays pinned to
    // `root`'s own right edge - and thus bleeds off the actual top-right
    // corner of the screen, matching the reference design - regardless of
    // how wide `root` actually resolves to; `root`'s own width isn't fixed
    // at the reference design's 1320 (1920 minus the nav panel), since
    // `fitReferenceResolution` grows it past that on a wider-than-16:9
    // destination. `anchoredPosition.x: 314` reproduces the reference
    // design's exact measurement (942-wide circle, right edge 314 reference
    // pixels past a 1320-wide root: `692 + 942 - 1320`) as an offset from
    // the right edge instead of the left.
    anchor: UiAnchor.topRight({ x: 942, y: 942 }),
    anchoredPosition: { x: 314, y: 309 },
    sprite: circleSprite,
  });

  createPanel(world, root, {
    anchor: UiAnchor.topLeft({ x: 222, y: 28 }),
    anchoredPosition: { x: 86, y: -90 },
    sprite: tagSprite,
  });

  createLabel(world, root, {
    text: 'CONTINUE - ACT II',
    fontAtlas,
    size: 14,
    letterSpacing: 0.06,
    anchor: UiAnchor.topLeft({ x: 222, y: 28 }),
    anchoredPosition: { x: 86, y: -90 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.capline,
    maxWidth: 222,
    color: fleetCommandPalette.void,
    category: uiCategory,
  });

  createLabel(world, root, {
    text: 'THE KEPLER',
    fontAtlas,
    size: 64,
    anchor: UiAnchor.topLeft({ x: 700, y: 81 }),
    anchoredPosition: { x: 88, y: -162 },
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  createLabel(world, root, {
    text: 'RIFT',
    fontAtlas,
    size: 64,
    anchor: UiAnchor.topLeft({ x: 700, y: 81 }),
    anchoredPosition: { x: 88, y: -243 },
    verticalAlign: textVerticalAlignments.capline,
    color: fleetCommandPalette.ink,
    category: uiCategory,
  });

  createPanel(world, root, {
    anchor: UiAnchor.topLeft({ x: 178, y: 6 }),
    anchoredPosition: { x: 88, y: -378 },
    sprite: underlineSprite,
  });

  createLabel(world, root, {
    text: 'Mission 07 - Break the blockade at Tannhauser Station before the Kryll carrier group finishes its jump charge.',
    fontAtlas,
    size: 20,
    anchor: UiAnchor.topLeft({ x: 590, y: 64 }),
    anchoredPosition: { x: 88, y: -430 },
    maxWidth: 590,
    verticalAlign: textVerticalAlignments.top,
    color: mutedInk,
    category: uiCategory,
  });

  return root;
}
