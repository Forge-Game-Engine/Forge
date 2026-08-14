import {
  addPositionComponent,
  addTextComponent,
  Color,
  createCamera,
  createCanvas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTextShapingEcsSystem,
  EcsWorld,
  FontAtlas,
  Time,
} from '../../../src/index.js';
import {
  createSyntheticMsdfGlyphImage,
  SYNTHETIC_GLYPH_DISTANCE_RANGE,
  SYNTHETIC_GLYPH_TILE_SIZE,
} from './create-synthetic-msdf-glyph-image.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// A dark, opaque clear color distinct from both the glyph fill and its
// effect colors below, so `measureGlyphBounds` can tell "background" from
// "something was drawn here" with a simple, generous threshold.
const clearColor = new Color(0.05, 0.05, 0.05, 1);
const fillColor = Color.white;
const outlineColor = Color.red;
const shadowColor = new Color(0, 0.6, 1, 1);

function isBackgroundish(r: number, g: number, b: number): boolean {
  return r < 40 && g < 40 && b < 40;
}

/** The extent of every non-background pixel on the sampled scanline. */
export interface GlyphBounds {
  /** The leftmost on-screen x pixel that isn't background-colored. */
  left: number;
  /** The rightmost on-screen x pixel that isn't background-colored. */
  right: number;
}

/** The handle `text-effects.spec.ts` drives and asserts against. */
export interface TextEffectsSceneHandle extends SceneHandle {
  /** Sets the glyph's outline width directly (screen-pixel-range units, see `TextEcsComponent.outlineWidth`). */
  setOutlineWidth(width: number): void;

  /** Sets the glyph's soft-shadow softness directly (see `TextEcsComponent.shadowSoftness`). */
  setShadowSoftness(softness: number): void;

  /**
   * Scans a horizontal line through the vertical center of the canvas's
   * *actual displayed bitmap* (`drawImage`/`getImageData`, not
   * `gl.readPixels` - see AGENTS.md's "Be wary of pixel-level rendering
   * assertions") for any non-background-colored pixel, and returns the
   * leftmost/rightmost match. `null` if nothing is drawn on that line. Must
   * be called in the same `page.evaluate` task as the preceding `step()` -
   * see `SceneHandle.step`.
   */
  measureGlyphBounds(): GlyphBounds | null;
}

/**
 * Builds a minimal scene with a single `TextEcsComponent` entity drawing one
 * synthetic, analytically-generated "glyph" (a filled square - see
 * `createSyntheticMsdfGlyphImage`) from a hand-built, single-glyph
 * `FontAtlas`. No real font or MSDF generator tool is involved (keeping
 * `/e2e` dependent only on `/src`), but the atlas's distance field is a real
 * (if simple) signed distance field, including genuine saturation past its
 * `distanceRange` - the same failure mode `msdf.frag.glsl`'s
 * `maxSafeEffectDistance` clamp guards against for outline/shadow. The
 * camera is configured so 1 world unit is exactly 1 screen pixel, and the
 * glyph is rendered at exactly the atlas's own tile resolution, so 1 atlas
 * pixel is also exactly 1 screen pixel - `SYNTHETIC_GLYPH_DISTANCE_RANGE`
 * can be reasoned about directly in on-screen pixels.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<TextEffectsSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  // See `camera-pan-zoom.ts`'s identical option for why this is required
  // for a reliable post-frame readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createCamera(world, {
    isStatic: true,
    clearColor,
    // Pins pixelsPerUnit (canvasHeight / verticalWorldUnits) to exactly 1,
    // matching `camera-pan-zoom.ts`'s identical trick - 1 world unit is 1
    // screen pixel at zoom 1.
    verticalWorldUnits: canvas.height,
  });

  const glyphImage = await createSyntheticMsdfGlyphImage();

  const fontAtlas: FontAtlas = {
    data: {
      formatVersion: 1,
      type: 'msdf',
      atlasImage: 'synthetic',
      atlasSize: {
        width: SYNTHETIC_GLYPH_TILE_SIZE,
        height: SYNTHETIC_GLYPH_TILE_SIZE,
      },
      distanceRange: SYNTHETIC_GLYPH_DISTANCE_RANGE,
      metrics: { lineHeight: 1.2, ascender: 1, descender: 0 },
      glyphs: new Map([
        [
          // U+25A0 BLACK SQUARE - a fitting stand-in codepoint for a
          // synthetic square "glyph".
          0x25a0,
          {
            codePoint: 0x25a0,
            advance: 1,
            planeBounds: { left: 0, bottom: 0, right: 1, top: 1 },
            atlasBounds: { left: 0, bottom: 0, right: 1, top: 1 },
          },
        ],
      ]),
      kerning: new Map(),
    },
    image: glyphImage,
  };

  const textEntity = world.createEntity();

  // The camera is centered on world (0, 0) (see `createProjectionMatrix`),
  // and the glyph's quad spans local X [0, tileSize] from the entity's own
  // position - offsetting by half a tile centers it horizontally on screen.
  addPositionComponent(world, textEntity, {
    world: { x: -SYNTHETIC_GLYPH_TILE_SIZE / 2, y: 0 },
  });

  const textComponent = addTextComponent(world, textEntity, {
    text: '■',
    fontAtlas,
    // Rendered at exactly the atlas's own tile resolution - see this
    // function's own doc comment.
    size: SYNTHETIC_GLYPH_TILE_SIZE,
    color: fillColor,
    // Centers the glyph's ink vertically on the entity's own Y (matching
    // `ascender: 1`/`descender: 0` above symmetrically around the local
    // baseline), so it lands on the horizontal sample line at
    // `canvas.height / 2` regardless of `verticalAlign`'s default.
    verticalAlign: 'middle',
    outlineColor,
    outlineWidth: 0,
    shadowColor,
    shadowOffset: { x: 0, y: 0 },
    shadowSoftness: 0,
  });

  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    setOutlineWidth(width: number): void {
      textComponent.outlineWidth = width;
    },

    setShadowSoftness(softness: number): void {
      textComponent.shadowSoftness = softness;
    },

    measureGlyphBounds(): GlyphBounds | null {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const y = Math.floor(canvas.height / 2);
      const { data } = context2d.getImageData(0, y, canvas.width, 1);

      let left = -1;
      let right = -1;

      for (let x = 0; x < canvas.width; x++) {
        const offset = x * 4;

        if (
          !isBackgroundish(data[offset], data[offset + 1], data[offset + 2])
        ) {
          if (left === -1) {
            left = x;
          }

          right = x;
        }
      }

      if (left === -1) {
        return null;
      }

      return { left, right };
    },
  };
};
