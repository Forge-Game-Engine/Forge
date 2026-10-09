import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  addTextComponent,
  Color,
  createCamera,
  createCanvas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTextShapingEcsSystem,
  createTexture,
  createTransformEcsSystem,
  CURRENT_FONT_ATLAS_FORMAT_VERSION,
  EcsWorld,
  FontAtlas,
  Time,
} from '../../../src/index.js';
import {
  createSyntheticMsdfGlyphImage,
  SYNTHETIC_GLYPH_DISTANCE_RANGE,
  SYNTHETIC_GLYPH_INK_HALF_SIZE,
  SYNTHETIC_GLYPH_TILE_SIZE,
} from './create-synthetic-msdf-glyph-image.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// World units per em. The camera maps 1 world unit to 1 canvas pixel, so a
// glyph's ink square is `SIZE / 2` pixels wide and "ABC" is about 2.5 em of
// ink - small enough to stay on the canvas at a scale of 2 in any rotation.
const SIZE = 40;

const inkHalfFraction =
  SYNTHETIC_GLYPH_INK_HALF_SIZE / SYNTHETIC_GLYPH_TILE_SIZE;
const paddingFraction =
  SYNTHETIC_GLYPH_DISTANCE_RANGE / 2 / SYNTHETIC_GLYPH_TILE_SIZE;
const glyphHalfWidthEm = inkHalfFraction + paddingFraction;
const glyphBounds = {
  left: 0.5 - glyphHalfWidthEm,
  right: 0.5 + glyphHalfWidthEm,
  bottom: 0.5 - glyphHalfWidthEm,
  top: 0.5 + glyphHalfWidthEm,
};

/** The on-canvas bounds of the text's ink, in world units (Y-up). */
export interface InkBounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

/** The handle `rotated-scaled-text.spec.ts` drives and asserts against. */
export interface RotatedScaledTextSceneHandle extends SceneHandle {
  /** Sets the text entity's local rotation, in radians. */
  setRotation(radians: number): void;

  /** Sets the text entity's local scale. */
  setScale(x: number, y: number): void;

  /**
   * Reads back the rendered canvas (`drawImage`/`getImageData`) and returns
   * the bounds of every red (ink) pixel, in world units relative to the
   * text entity's position, or `null` when no ink is visible. Call it in
   * the same `page.evaluate` task as the preceding `step()`.
   */
  measureInkBounds(): InkBounds | null;
}

/**
 * Builds a scene with a three-glyph label ("ABC", one synthetic square
 * glyph each) at the world origin, on a static camera that maps one world
 * unit to one canvas pixel. A spec rotates and scales the label and
 * compares its rendered ink bounds against the unrotated, unscaled label's
 * bounds turned and scaled the same way about the entity's position.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<RotatedScaledTextSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 600;
  canvas.height = 600;

  // Keeps the presented frame readable after `step()` returns, for the
  // same-run readback in `measureInkBounds`.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createCamera(world, {
    isStatic: true,
    clearColor: Color.black,
    verticalWorldUnits: canvas.height,
  });

  const glyphImage = await createSyntheticMsdfGlyphImage();
  const codePoints = [65, 66, 67];

  const fontAtlas: FontAtlas = {
    data: {
      formatVersion: CURRENT_FONT_ATLAS_FORMAT_VERSION,
      type: 'msdf',
      atlasSize: {
        width: SYNTHETIC_GLYPH_TILE_SIZE,
        height: SYNTHETIC_GLYPH_TILE_SIZE,
      },
      distanceRange: SYNTHETIC_GLYPH_DISTANCE_RANGE,
      metrics: {
        lineHeight: 1,
        ascender: glyphBounds.top,
        descender: glyphBounds.bottom,
        capHeight: 0.5 + inkHalfFraction,
      },
      glyphs: new Map(
        codePoints.map((codePoint) => [
          codePoint,
          {
            codePoint,
            advance: 1,
            planeBounds: glyphBounds,
            atlasBounds: glyphBounds,
          },
        ]),
      ),
      kerning: new Map(),
    },
    texture: createTexture(renderContext, glyphImage),
  };

  const textEntity = world.createEntity();

  addPositionComponent(world, textEntity, { local: { x: 0, y: 0 } });

  const rotation = addRotationComponent(world, textEntity, { local: 0 });
  const scale = addScaleComponent(world, textEntity, {
    local: { x: 1, y: 1 },
  });

  addTextComponent(world, textEntity, {
    text: 'ABC',
    fontAtlas,
    size: SIZE,
    color: Color.red,
    verticalAlign: 'middle',
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    setRotation(radians: number): void {
      rotation.local = radians;
    },

    setScale(x: number, y: number): void {
      scale.local.x = x;
      scale.local.y = y;
    },

    measureInkBounds(): InkBounds | null {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const { data } = context2d.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const offset = (y * canvas.width + x) * 4;

          if (data[offset] > 128) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (minX === Infinity) {
        return null;
      }

      // The entity sits at the canvas center; the canvas is Y-down and the
      // world Y-up. Bounds are pixel edges, not pixel centers.
      return {
        left: minX - canvas.width / 2,
        right: maxX + 1 - canvas.width / 2,
        bottom: canvas.height / 2 - (maxY + 1),
        top: canvas.height / 2 - minY,
      };
    },
  };
};
