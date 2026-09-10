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
} from '@forge-game-engine/forge/ui';
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
 * @param canvas - The canvas entity to parent the mission brief to.
 * @param fontAtlas - The font atlas the tag/title/blurb labels are drawn from.
 * @param sprites - The sprites this panel is drawn with - see {@link MissionBriefSprites}.
 * @param uiCategory - The render category the canvas's camera culls to.
 * @returns The mission brief's root entity, parented to `canvas` and anchored to fill the canvas's right two-thirds - other right-column content (see `createFlagshipPanel`) parents to this same entity to share its coordinate space.
 */
export function createMissionBrief(
  world: EcsWorld,
  canvas: number,
  fontAtlas: FontAtlas,
  sprites: MissionBriefSprites,
  uiCategory: number,
): number {
  const { circleSprite, tagSprite, underlineSprite } = sprites;

  const root = world.createEntity();

  addPositionComponent(world, root);
  addParentComponent(world, root, { parent: canvas });
  addRectTransformComponent(world, root, {
    ...UiAnchor.topLeft({ x: 1320, y: 1080 }),
    anchoredPosition: { x: 600, y: 0 },
  });

  createPanel(world, root, {
    anchor: UiAnchor.topLeft({ x: 942, y: 942 }),
    anchoredPosition: { x: 692, y: 309 },
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
