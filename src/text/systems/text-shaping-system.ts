import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  createTextureFromImage,
  Material,
  RenderContext,
} from '../../rendering/index.js';
import { TextEcsComponent, textId } from '../components/text-component.js';
import {
  TextMeshEcsComponent,
  textMeshId,
} from '../components/text-mesh-component.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import {
  createTextRenderables,
  TextRenderables,
} from '../rendering/create-text-renderable.js';
import { shapeText } from '../utilities/shape-text.js';

/**
 * The shape-relevant subset of a `TextEcsComponent`'s fields, snapshotted
 * per entity so `createTextShapingEcsSystem` can skip re-shaping text that
 * hasn't changed since it was last shaped. `color`, `layer`, and `enabled`
 * affect how/whether the mesh is drawn, not its shape, so they're
 * deliberately excluded. `category` and `material` don't affect shaping
 * either, but are included anyway: unlike `layer` (read fresh every frame at
 * draw time), a `TextMeshEcsComponent`'s `fillRenderable`/`effectsRenderable`
 * are baked in at shape time, so a change to either needs a re-shape to
 * actually pick up the differently-cached `Renderable` pair.
 */
interface ShapeSnapshot {
  text: string;
  fontAtlas: FontAtlas;
  size: number;
  letterSpacing: number;
  lineHeight: number;
  horizontalAlign: TextEcsComponent['horizontalAlign'];
  verticalAlign: TextEcsComponent['verticalAlign'];
  maxWidth: number | undefined;
  horizontalAlignPivot: number;
  category: number;
  material: Material | undefined;
}

function isSameSnapshot(a: ShapeSnapshot, b: ShapeSnapshot): boolean {
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
    a.category === b.category &&
    a.material === b.material
  );
}

/**
 * Creates a text shaping ECS system: turns dirty `TextEcsComponent`s into
 * `TextMeshEcsComponent`s (glyph quads + bounds), only re-shaping an
 * entity's text when a shape-relevant field has actually changed since the
 * last tick this system ran against it.
 * @param renderContext - The render context used to build (and cache, one
 * pair per font, fill material and category) the `Renderable`s each shaped
 * mesh draws with.
 * @returns The ECS system.
 */
export const createTextShapingEcsSystem = (
  renderContext: RenderContext,
): EcsSystem<[TextEcsComponent]> => {
  const { gl, shaderCache } = renderContext;

  // Shared by every font: each font's atlas is bound per renderable (see
  // `createTextRenderables`), so one program serves them all.
  const defaultFillMaterial = new Material(
    shaderCache.getShader('sprite.vert'),
    shaderCache.getShader('msdf-fill.frag'),
    gl,
  );
  const effectsMaterial = new Material(
    shaderCache.getShader('msdf.vert'),
    shaderCache.getShader('msdf-effects.frag'),
    gl,
  );

  const lastShapedSnapshotByComponent = new WeakMap<
    TextEcsComponent,
    ShapeSnapshot
  >();

  // One upload per font, however many materials and categories draw it.
  const atlasTextureByFontAtlas = new WeakMap<FontAtlas, WebGLTexture>();

  // Keyed by font, then fill material, then category: text sharing all
  // three batches into one draw call, while text drawn under different
  // categories (e.g. world-space text vs. a UI label) needs distinct
  // Renderables to be culled independently by camera.
  const renderablesByFontAtlas = new WeakMap<
    FontAtlas,
    Map<Material, Map<number, TextRenderables>>
  >();

  const getAtlasTexture = (fontAtlas: FontAtlas): WebGLTexture => {
    let atlasTexture = atlasTextureByFontAtlas.get(fontAtlas);

    if (!atlasTexture) {
      atlasTexture = createTextureFromImage(gl, fontAtlas.image);
      atlasTextureByFontAtlas.set(fontAtlas, atlasTexture);
    }

    return atlasTexture;
  };

  const getOrCreateRenderables = (
    fontAtlas: FontAtlas,
    fillMaterial: Material,
    category: number,
  ): TextRenderables => {
    let renderablesByMaterial = renderablesByFontAtlas.get(fontAtlas);

    if (!renderablesByMaterial) {
      renderablesByMaterial = new Map();
      renderablesByFontAtlas.set(fontAtlas, renderablesByMaterial);
    }

    let renderablesByCategory = renderablesByMaterial.get(fillMaterial);

    if (!renderablesByCategory) {
      renderablesByCategory = new Map();
      renderablesByMaterial.set(fillMaterial, renderablesByCategory);
    }

    let renderables = renderablesByCategory.get(category);

    if (!renderables) {
      renderables = createTextRenderables(renderContext, {
        fontAtlas,
        atlasTexture: getAtlasTexture(fontAtlas),
        fillMaterial,
        effectsMaterial,
        category,
      });
      renderablesByCategory.set(category, renderables);
    }

    return renderables;
  };

  return {
    query: [textId],
    update: (world, { entities, components: [textComponents] }) => {
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const textComponent = textComponents[i];

        const snapshot: ShapeSnapshot = {
          text: textComponent.text,
          fontAtlas: textComponent.fontAtlas,
          size: textComponent.size,
          letterSpacing: textComponent.letterSpacing,
          lineHeight: textComponent.lineHeight,
          horizontalAlign: textComponent.horizontalAlign,
          verticalAlign: textComponent.verticalAlign,
          maxWidth: textComponent.maxWidth,
          horizontalAlignPivot: textComponent.horizontalAlignPivot,
          category: textComponent.category,
          material: textComponent.material,
        };

        const lastSnapshot = lastShapedSnapshotByComponent.get(textComponent);
        const alreadyShaped =
          world.getComponent<TextMeshEcsComponent>(entity, textMeshId) !== null;

        if (
          alreadyShaped &&
          lastSnapshot &&
          isSameSnapshot(lastSnapshot, snapshot)
        ) {
          continue;
        }

        const { glyphs, bounds } = shapeText(
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
          },
        );

        const { fillRenderable, effectsRenderable } = getOrCreateRenderables(
          textComponent.fontAtlas,
          textComponent.material ?? defaultFillMaterial,
          textComponent.category,
        );

        world.addComponent<TextMeshEcsComponent>(entity, textMeshId, {
          glyphs,
          bounds,
          fillRenderable,
          effectsRenderable,
        });
        lastShapedSnapshotByComponent.set(textComponent, snapshot);
      }
    },
  };
};
