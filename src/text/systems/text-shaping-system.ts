import { EcsSystem } from '../../ecs/ecs-system.js';
import { TextEcsComponent, textId } from '../components/text-component.js';
import {
  TextMeshEcsComponent,
  textMeshId,
  TextShapeInputs,
} from '../components/text-mesh-component.js';
import { shapeText } from '../utilities/shape-text.js';

// Whether `text`'s shape inputs are still the ones its mesh was shaped
// from. Reads the component directly, so the check runs every tick without
// allocating.
function isShapedFrom(
  text: TextEcsComponent,
  shapedFrom: TextShapeInputs,
): boolean {
  return (
    text.text === shapedFrom.text &&
    text.fontAtlas === shapedFrom.fontAtlas &&
    text.size === shapedFrom.size &&
    text.letterSpacing === shapedFrom.letterSpacing &&
    text.lineHeight === shapedFrom.lineHeight &&
    text.horizontalAlign === shapedFrom.horizontalAlign &&
    text.verticalAlign === shapedFrom.verticalAlign &&
    text.maxWidth === shapedFrom.maxWidth &&
    text.horizontalAlignPivot === shapedFrom.horizontalAlignPivot &&
    text.richText === shapedFrom.richText
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

        const shapedFrom = world.getComponent<TextMeshEcsComponent>(
          entity,
          textMeshId,
        )?.shapedFrom;

        if (shapedFrom && isShapedFrom(textComponent, shapedFrom)) {
          continue;
        }

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
        const { glyphs, bounds, caretStops } = shapeText(
          snapshot.text,
          snapshot.fontAtlas.data,
          snapshot,
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
