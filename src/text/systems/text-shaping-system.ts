import { EcsSystem } from '../../ecs/ecs-system.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  addTextMeshComponent,
  TextEcsComponent,
  textId,
  TextMeshEcsComponent,
  textMeshId,
} from '../components/index.js';
import { shapeText } from '../utilities/shape-text.js';

/**
 * Whether `mesh` was shaped from the shape-affecting fields `text` currently
 * has. `TextEcsComponent.color`/`enabled`/`layer`/`renderable` don't affect
 * shaping and are deliberately excluded, so changing them never triggers a
 * re-shape.
 */
function isMeshCurrent(
  mesh: TextMeshEcsComponent,
  text: TextEcsComponent,
): boolean {
  return (
    mesh.sourceText === text.text &&
    mesh.sourceFont === text.font &&
    mesh.sourceFontSize === text.fontSize &&
    mesh.sourceWrapWidth === text.wrapWidth &&
    mesh.sourceLineSpacing === text.lineSpacing &&
    mesh.sourceAlignment === text.alignment &&
    mesh.sourcePivot.x === text.pivot.x &&
    mesh.sourcePivot.y === text.pivot.y
  );
}

function reshape(
  world: EcsWorld,
  entity: number,
  text: TextEcsComponent,
  existingMesh: TextMeshEcsComponent | null,
): void {
  const shaped = shapeText(text.text, text.font, text.fontSize, {
    alignment: text.alignment,
    wrapWidth: text.wrapWidth,
    lineSpacing: text.lineSpacing,
    pivot: text.pivot,
  });

  const mesh: TextMeshEcsComponent = {
    glyphs: shaped.glyphs,
    bounds: shaped.bounds,
    sourceText: text.text,
    sourceFont: text.font,
    sourceFontSize: text.fontSize,
    sourceWrapWidth: text.wrapWidth,
    sourceLineSpacing: text.lineSpacing,
    sourceAlignment: text.alignment,
    sourcePivot: { x: text.pivot.x, y: text.pivot.y },
  };

  if (existingMesh) {
    Object.assign(existingMesh, mesh);

    return;
  }

  addTextMeshComponent(world, entity, mesh);
}

/**
 * Creates a system that shapes every entity's `TextEcsComponent` into a
 * `TextMeshEcsComponent` of glyph quads for the render system to draw.
 *
 * Re-shaping a paragraph is real cost (word-wrapping, kerning lookups, one
 * quad per character), so this only happens when `text`, `font`,
 * `fontSize`, `wrapWidth`, `lineSpacing`, `alignment`, or `pivot` actually
 * changed since the last shape - every other system in a typical pipeline
 * recomputes unconditionally per frame, but text shaping is the deliberate
 * exception.
 *
 * Register this with a `SystemRegistrationOrder` after any system that can
 * change an entity's `wrapWidth` (e.g. a UI layout pass resolving a
 * container's rect) and before `createRenderEcsSystem`, so the render pass
 * always consumes this frame's glyph quads rather than last frame's.
 * Standalone text with no layout dependency (damage numbers, floating
 * names, debug overlays) has no ordering constraint beyond "before render".
 * @returns The ECS system.
 */
export const createTextShapingEcsSystem = (): EcsSystem<
  [TextEcsComponent]
> => ({
  query: [textId],
  update: (world, { entities, components: [texts] }) => {
    for (let i = 0; i < entities.length; i++) {
      const text = texts[i];

      if (!text.enabled) {
        continue;
      }

      const entity = entities[i];
      const existingMesh = world.getComponent<TextMeshEcsComponent>(
        entity,
        textMeshId,
      );

      if (existingMesh && isMeshCurrent(existingMesh, text)) {
        continue;
      }

      reshape(world, entity, text, existingMesh);
    }
  },
});
