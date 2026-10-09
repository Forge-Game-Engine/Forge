import { EcsSystem } from '../../ecs/ecs-system.js';
import { TextEcsComponent, textId } from '../components/text-component.js';
import {
  TextMeshEcsComponent,
  textMeshId,
  TextShapeInputs,
} from '../components/text-mesh-component.js';
import { shapeText } from '../utilities/shape-text.js';

function isSameSnapshot(a: TextShapeInputs, b: TextShapeInputs): boolean {
  return (
    a.text === b.text &&
    a.fontAtlas === b.fontAtlas &&
    a.size === b.size &&
    a.letterSpacing === b.letterSpacing &&
    a.lineHeight === b.lineHeight &&
    a.horizontalAlign === b.horizontalAlign &&
    a.verticalAlign === b.verticalAlign &&
    a.maxWidth === b.maxWidth &&
    a.horizontalAlignPivot === b.horizontalAlignPivot &&
    a.richText === b.richText
  );
}

/**
 * Creates a text shaping ECS system: turns `TextEcsComponent`s into
 * `TextMeshEcsComponent`s (glyph quads + bounds), only re-shaping an
 * entity's text when a field its shape depends on differs from the ones its
 * mesh was shaped from (`TextMeshEcsComponent.shapedFrom`).
 * @returns The ECS system.
 */
export const createTextShapingEcsSystem = (): EcsSystem<[TextEcsComponent]> => {
  return {
    query: [textId],
    update: (world, { entities, components: [textComponents] }) => {
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const textComponent = textComponents[i];

        const snapshot: TextShapeInputs = {
          text: textComponent.text,
          fontAtlas: textComponent.fontAtlas,
          size: textComponent.size,
          letterSpacing: textComponent.letterSpacing,
          lineHeight: textComponent.lineHeight,
          horizontalAlign: textComponent.horizontalAlign,
          verticalAlign: textComponent.verticalAlign,
          maxWidth: textComponent.maxWidth,
          horizontalAlignPivot: textComponent.horizontalAlignPivot,
          richText: textComponent.richText,
        };

        const shapedFrom = world.getComponent<TextMeshEcsComponent>(
          entity,
          textMeshId,
        )?.shapedFrom;

        if (shapedFrom && isSameSnapshot(shapedFrom, snapshot)) {
          continue;
        }

        const { glyphs, bounds, caretStops } = shapeText(
          textComponent.text,
          textComponent.fontAtlas.data,
          {
            size: textComponent.size,
            letterSpacing: textComponent.letterSpacing,
            lineHeight: textComponent.lineHeight,
            horizontalAlign: textComponent.horizontalAlign,
            verticalAlign: textComponent.verticalAlign,
            maxWidth: textComponent.maxWidth,
            horizontalAlignPivot: textComponent.horizontalAlignPivot,
            richText: textComponent.richText,
          },
        );

        world.addComponent<TextMeshEcsComponent>(entity, textMeshId, {
          glyphs,
          bounds,
          caretStops,
          shapedFrom: snapshot,
        });
      }
    },
  };
};
