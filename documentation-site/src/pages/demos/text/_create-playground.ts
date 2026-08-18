import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  TextEcsComponent,
} from '@forge-game-engine/forge/text';
import { createGuideBox } from './_create-guide-box';

export type PlaygroundHorizontalAlign = TextEcsComponent['horizontalAlign'];

// The same conservative, documented-safe effect values used by
// `_create-effects-examples.ts` - see `text-effects.md`'s "Choosing a safe
// range" section for why the playground doesn't default to an atlas's
// absolute maximum. Fixed rather than user-controllable: an `<input
// type="color">` control was tried here and dropped for being noticeably
// slow to interact with, so only width/offset/softness are adjustable.
const outlineColor = new Color(1, 0.55, 0.15, 1);
const glowColor = new Color(0.15, 0.65, 1, 1);

/** The values the playground's controls start at (see `_PlaygroundControls.tsx`). */
export const playgroundDefaults = {
  text: "Type your own text here! This is the engine's shipped default font atlas (Liberation Sans, SIL OFL 1.1) - zero font setup required.",
  size: 24,
  minSize: 12,
  maxSize: 56,
  horizontalAlign: 'left' as PlaygroundHorizontalAlign,
  wrapEnabled: true,

  outlineEnabled: false,
  outlineWidth: 1.2,
  minOutlineWidth: 0.1,
  maxOutlineWidth: 4,

  glowEnabled: false,
  glowAlpha: 0.95,
  glowOffsetX: 0.8,
  glowOffsetY: -0.8,
  minGlowOffset: -3,
  maxGlowOffset: 3,
  glowSoftness: 1.4,
  minGlowSoftness: 0,
  maxGlowSoftness: 4,
};

const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.9, 0.92, 0.96, 1);
const captionGap = 22;
const boxHeight = 220;

export interface Playground {
  /** The live `TextEcsComponent` the controls mutate directly. */
  textComponent: TextEcsComponent;

  /** The `maxWidth` to restore when the "Wrap" toggle is turned back on. */
  wrapWidth: number;

  /** The y coordinate immediately below this section's content. */
  bottom: number;
}

/**
 * Sets `textComponent.maxWidth` from the "Wrap" toggle: `wrapWidth` when
 * enabled, `undefined` (never wrap) when disabled.
 * @param textComponent - The playground's live text component.
 * @param wrapWidth - The width to wrap at when `enabled`.
 * @param enabled - Whether wrapping is turned on.
 */
export function setPlaygroundWrap(
  textComponent: TextEcsComponent,
  wrapWidth: number,
  enabled: boolean,
): void {
  textComponent.maxWidth = enabled ? wrapWidth : undefined;
}

/**
 * Sets `textComponent`'s outline fields from the outline controls.
 * `outlineWidth` of `0` (when `enabled` is `false`) draws no outline, the
 * same "width is its own off switch" semantics
 * `TextEcsComponent.outlineWidth` itself documents.
 * @param textComponent - The playground's live text component.
 * @param enabled - Whether the outline is turned on.
 * @param width - The outline width, in screen-pixel-range units.
 */
export function setPlaygroundOutline(
  textComponent: TextEcsComponent,
  enabled: boolean,
  width: number,
): void {
  textComponent.outlineColor = outlineColor;
  textComponent.outlineWidth = enabled ? width : 0;
}

/**
 * Sets `textComponent`'s soft-shadow/glow fields from the glow controls.
 * A transparent `shadowColor` (when `enabled` is `false`) draws no glow,
 * the same "alpha is its own off switch" semantics
 * `TextEcsComponent.shadowColor` itself documents.
 * @param textComponent - The playground's live text component.
 * @param enabled - Whether the glow is turned on.
 * @param offset - The glow's offset from the glyph, in screen-pixel-range units.
 * @param softness - How far the glow fades out, in screen-pixel-range units.
 */
export function setPlaygroundGlow(
  textComponent: TextEcsComponent,
  enabled: boolean,
  offset: Vector2,
  softness: number,
): void {
  textComponent.shadowColor = new Color(
    glowColor.r,
    glowColor.g,
    glowColor.b,
    enabled ? playgroundDefaults.glowAlpha : 0,
  );
  textComponent.shadowOffset = offset;
  textComponent.shadowSoftness = softness;
}

/**
 * Builds the interactive playground: a live-typed `TextEcsComponent` whose
 * text, size, alignment, wrapping, outline, and glow are all driven by
 * `_PlaygroundControls.tsx` mutating the returned `textComponent` directly -
 * `createTextShapingEcsSystem`'s own dirty tracking (see
 * `text-shaping-system.ts`) picks up each change on its own, no extra
 * plumbing needed.
 * @param world - The ECS world to add the label entities to.
 * @param fontAtlas - The font atlas the label draws from.
 * @param whiteSprite - A plain white sprite template for the guide box.
 * @param guideLayer - The draw-order layer for the guide box (drawn behind text).
 * @param contentLayer - The draw-order layer for the caption/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The wrap width used while "Wrap" is enabled.
 * @returns The playground's live text component, its wrap width, and the y
 * coordinate immediately below the section's content.
 */
export function createPlayground(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  whiteSprite: SpriteEcsComponent,
  guideLayer: number,
  contentLayer: number,
  topLeft: Vector2,
  usableWidth: number,
): Playground {
  const captionEntity = world.createEntity();
  addPositionComponent(world, captionEntity, {
    world: { x: topLeft.x, y: topLeft.y },
  });
  addTextComponent(world, captionEntity, {
    text: 'Try it yourself',
    fontAtlas,
    size: 13,
    color: captionColor,
    layer: contentLayer,
  });

  const boxTop = topLeft.y - captionGap;

  createGuideBox(
    world,
    whiteSprite,
    { x: topLeft.x, y: boxTop },
    { x: usableWidth, y: boxHeight },
    guideLayer,
  );

  const textEntity = world.createEntity();
  addPositionComponent(world, textEntity, {
    world: { x: topLeft.x, y: boxTop },
  });
  const textComponent = addTextComponent(world, textEntity, {
    text: playgroundDefaults.text,
    fontAtlas,
    size: playgroundDefaults.size,
    horizontalAlign: playgroundDefaults.horizontalAlign,
    maxWidth: usableWidth,
    color: bodyColor,
    outlineColor,
    shadowOffset: {
      x: playgroundDefaults.glowOffsetX,
      y: playgroundDefaults.glowOffsetY,
    },
    shadowSoftness: playgroundDefaults.glowSoftness,
    layer: contentLayer,
  });

  return {
    textComponent,
    wrapWidth: usableWidth,
    bottom: boxTop - boxHeight,
  };
}
