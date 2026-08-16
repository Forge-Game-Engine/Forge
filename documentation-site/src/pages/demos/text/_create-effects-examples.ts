import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';
import { Color, SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import {
  addTextComponent,
  FontAtlas,
  shapeText,
  TextEcsComponent,
} from '@forge-game-engine/forge/text';
import { createGuideBox } from './_create-guide-box';
import {
  PulsingTextEffect,
  pulsingTextEffectId,
} from './_pulsing-text-effect.component';

// Short and rendered comparatively large: outline/shadow are bounded by how
// much graded distance the atlas's own `distanceRange` encodes around each
// glyph's edge (see the "Effect size is bounded by the atlas" section of
// the Text Effects doc) - a bigger on-screen size gives that fixed budget
// more screen pixels to work with, which is what actually makes the
// outline/glow below read as a visible ring/taper instead of a sliver.
const sampleText = 'Boom';
const bodySize = 72;
const captionSize = 13;
const captionColor = new Color(0.55, 0.6, 0.72, 1);
const bodyColor = new Color(0.95, 0.97, 1, 1);
const captionGap = 20;
const columnGap = 18;
const boxPadding = 16;

interface EffectsColumn {
  label: string;
  effects: Partial<TextEcsComponent>;
  /**
   * When set, `createPulsingTextEffectEcsSystem` sweeps `effect` back and
   * forth between `minValue`/`maxValue` every frame instead of it staying
   * fixed at whatever `effects` above set it to.
   */
  pulse?: {
    effect: PulsingTextEffect;
    minValue: number;
    maxValue: number;
    periodSeconds: number;
  };
}

// `minValue`/`maxValue` stay comfortably within this column's safe budget
// (see the "Effect size is bounded by the atlas" section of the Text
// Effects doc) at `bodySize` below, so the pulse never visibly plateaus at
// its peak - it's a smooth grow/shrink for the whole cycle.
const columns: EffectsColumn[] = [
  { label: 'No effect (default)', effects: {} },
  {
    label: 'Outline (pulsing)',
    effects: { outlineColor: Color.black, outlineWidth: 1.5 },
    pulse: {
      effect: 'outlineWidth',
      minValue: 0.4,
      maxValue: 6,
      periodSeconds: 2.5,
    },
  },
  {
    label: 'Shadow (glow, pulsing)',
    effects: {
      shadowColor: new Color(0.35, 0.78, 1, 0.9),
      shadowOffset: { x: 0, y: 0 },
      shadowSoftness: 1.7,
    },
    pulse: {
      effect: 'shadowSoftness',
      minValue: 0.8,
      maxValue: 8,
      periodSeconds: 2.5,
    },
  },
];

/**
 * Builds a 3-column showcase of Phase 4's outline/shadow effects: the same
 * word drawn with no effect, with an outline pulsing between a thin and a
 * thick width, and with a soft, centered shadow (a glow) pulsing between a
 * tight and a wide falloff - both driven by `createPulsingTextEffectEcsSystem`
 * on a sine wave, demonstrating that `outlineWidth`/`shadowSoftness` are
 * ordinary per-frame-writable fields. Each column gets a dark guide box
 * behind the text (see `createGuideBox`), since outline and shadow both
 * read most clearly against a background that contrasts with the glyph
 * fill itself.
 * @param world - The ECS world to add label entities to.
 * @param fontAtlas - The font atlas every label draws from.
 * @param whiteSprite - A plain white sprite template for the guide boxes.
 * @param guideLayer - The draw-order layer for guide boxes (drawn behind text).
 * @param contentLayer - The draw-order layer for captions/body text.
 * @param topLeft - This section's top-left corner, in world units.
 * @param usableWidth - The total width available to lay the 3 columns out in.
 * @returns The y coordinate immediately below the section's content, for
 * stacking the next section beneath it.
 */
export function createEffectsExamples(
  world: EcsWorld,
  fontAtlas: FontAtlas,
  whiteSprite: SpriteEcsComponent,
  guideLayer: number,
  contentLayer: number,
  topLeft: Vector2,
  usableWidth: number,
): number {
  const columnWidth =
    (usableWidth - columnGap * (columns.length - 1)) / columns.length;
  const boxTop = topLeft.y - captionGap;

  let sectionBottom = boxTop;

  columns.forEach((column, index) => {
    const x = topLeft.x + index * (columnWidth + columnGap);

    const captionEntity = world.createEntity();
    addPositionComponent(world, captionEntity, {
      world: { x, y: topLeft.y },
    });
    addTextComponent(world, captionEntity, {
      text: column.label,
      fontAtlas,
      size: captionSize,
      color: captionColor,
      layer: contentLayer,
    });

    const { bounds } = shapeText(sampleText, fontAtlas.data, {
      size: bodySize,
    });
    const boxWidth = Math.max(columnWidth, bounds.width + boxPadding * 2);
    const boxHeight = bounds.height + boxPadding * 2;
    const boxLeft = x + (columnWidth - boxWidth) / 2;

    createGuideBox(
      world,
      whiteSprite,
      { x: boxLeft, y: boxTop },
      { x: boxWidth, y: boxHeight },
      guideLayer,
    );

    const textEntity = world.createEntity();
    addPositionComponent(world, textEntity, {
      world: {
        x: boxLeft + (boxWidth - bounds.width) / 2,
        y: boxTop - boxPadding,
      },
    });
    addTextComponent(world, textEntity, {
      text: sampleText,
      fontAtlas,
      size: bodySize,
      color: bodyColor,
      layer: contentLayer,
      ...column.effects,
    });

    if (column.pulse) {
      world.addComponent(textEntity, pulsingTextEffectId, {
        ...column.pulse,
        elapsedSeconds: 0,
      });
    }

    sectionBottom = Math.min(sectionBottom, boxTop - boxHeight);
  });

  return sectionBottom;
}
