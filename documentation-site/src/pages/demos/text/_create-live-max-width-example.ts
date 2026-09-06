import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  shapeText,
} from '@forge-game-engine/forge/text';
import { createGuideBox } from './_create-guide-box';
import { liveMaxWidthId } from './_live-max-width.component';

const sampleText =
  "This paragraph's maxWidth oscillates every frame - watch the words jump between lines as the column narrows and widens.";
const bodySize = 15;
const bodyLineHeight = 1.2;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.85, 0.87, 0.92, 1);
const captionGap = 22;
const periodSeconds = 4;
const minWidthFraction = 0.35;

/**
 * Builds the live `maxWidth` showcase: a single paragraph whose
 * `TextEcsComponent.maxWidth` `createLiveMaxWidthEcsSystem` oscillates every
 * frame between `minWidthFraction * usableWidth` and `usableWidth`, with a
 * guide box that tracks the current width and a caption that reports it -
 * this is what makes the reflow driven by `createTextShapingEcsSystem`'s
 * dirty tracking visible in real time, rather than only at a single
 * `maxWidth` value.
 * @param world - The ECS world to add the label entities to.
 * @param fontAtlas - The font atlas the label draws from.
 * @param whiteSprite - A plain white sprite template for the guide box.
 * @param guideLayer - The draw-order layer for the guide box (drawn behind text).
 * @param contentLayer - The draw-order layer for the caption/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The widest the paragraph's column ever gets, in world units.
 * @returns The y coordinate immediately below the section's content.
 */
export function createLiveMaxWidthExample(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  whiteSprite: SpriteEcsComponent,
  guideLayer: number,
  contentLayer: number,
  topLeft: Vector2,
  usableWidth: number,
): number {
  const minWidth = usableWidth * minWidthFraction;
  const boxTop = topLeft.y - captionGap;

  const captionEntity = world.createEntity();
  addPositionComponent(world, captionEntity, {
    world: { x: topLeft.x, y: topLeft.y },
  });
  const liveCaption = addTextComponent(world, captionEntity, {
    text: `maxWidth: ${Math.round(usableWidth)} world units (live)`,
    fontAtlas,
    size: captionSize,
    color: captionColor,
    layer: contentLayer,
  });

  // Sized for the tallest wrap this text ever produces - at `minWidth`, the
  // narrowest the oscillation gets - so the guide box never needs to
  // resize itself; only the paragraph beneath it does.
  const { bounds: tallestBounds } = shapeText(sampleText, fontAtlas.data, {
    size: bodySize,
    lineHeight: bodyLineHeight,
    maxWidth: minWidth,
  });

  const { sprite: guideBoxSprite, position: guideBoxPosition } = createGuideBox(
    world,
    whiteSprite,
    { x: topLeft.x, y: boxTop },
    { x: usableWidth, y: tallestBounds.height },
    guideLayer,
  );

  const textEntity = world.createEntity();
  addPositionComponent(world, textEntity, {
    world: { x: topLeft.x, y: boxTop },
  });
  addTextComponent(world, textEntity, {
    text: sampleText,
    fontAtlas,
    size: bodySize,
    lineHeight: bodyLineHeight,
    horizontalAlign: 'justify',
    maxWidth: usableWidth,
    color: bodyColor,
    layer: contentLayer,
  });

  world.addComponent(textEntity, liveMaxWidthId, {
    minWidth,
    maxWidth: usableWidth,
    periodSeconds,
    elapsedSeconds: 0,
    guideBoxLeftX: topLeft.x,
    guideBoxSprite,
    guideBoxPosition,
    captionText: liveCaption,
  });

  return boxTop - tallestBounds.height;
}
