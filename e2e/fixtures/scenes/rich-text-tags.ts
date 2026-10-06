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
  createTransformEcsSystem,
  CURRENT_FONT_ATLAS_FORMAT_VERSION,
  EcsWorld,
  FAUX_BOLD_EMBOLDEN,
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

// 1 em = 1 synthetic glyph tile = this many world units, and the camera is
// set up so 1 world unit = 1 screen pixel - see `text-effects-overlap.ts`.
const SIZE = SYNTHETIC_GLYPH_TILE_SIZE;

// The ink square padded by `distanceRange / 2` atlas pixels on every side,
// as a generated atlas pads its glyphs.
const glyphHalfWidthEm =
  (SYNTHETIC_GLYPH_INK_HALF_SIZE + SYNTHETIC_GLYPH_DISTANCE_RANGE / 2) /
  SYNTHETIC_GLYPH_TILE_SIZE;
const glyphBounds = {
  left: 0.5 - glyphHalfWidthEm,
  right: 0.5 + glyphHalfWidthEm,
  bottom: 0.5 - glyphHalfWidthEm,
  top: 0.5 + glyphHalfWidthEm,
};

const ATLAS_A_CODE_POINT = 65;

/** One horizontal run of same-colored ink found on the canvas. */
export interface InkSpan {
  /** The first canvas column of the run. */
  left: number;

  /** The last canvas column of the run. */
  right: number;

  /** Which ink color the run is: the text's base color or the tag's. */
  color: 'red' | 'green';
}

/** The handle `rich-text-tags.spec.ts` drives and asserts against. */
export interface RichTextTagsSceneHandle extends SceneHandle {
  /** Sets the text entity's markup. */
  setText(text: string): void;

  /**
   * How much wider, in screen pixels, a bold glyph's ink should be than a
   * regular one: {@link FAUX_BOLD_EMBOLDEN} on each side.
   */
  readonly boldWidening: number;

  /**
   * Scans the actual rendered canvas along the glyphs' center row and
   * returns every run of red or green ink, left to right. Must be called in
   * the same `page.evaluate` task as the preceding `step()`.
   */
  measureInkSpans(): InkSpan[];
}

function classifyInk(r: number, g: number, b: number): InkSpan['color'] | null {
  if (r > 128 && g < 100 && b < 100) {
    return 'red';
  }

  if (g > 128 && r < 100 && b < 100) {
    return 'green';
  }

  return null;
}

/**
 * Builds a minimal scene with one text entity drawn from a synthetic,
 * analytically generated MSDF atlas whose only glyph, "A", is a filled
 * square. The base text color is red, so a `<color=#00ff00>` tag shows up
 * as green ink and `<b>` as a wider square.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<RichTextTagsSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 700;
  canvas.height = 200;

  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createCamera(world, {
    isStatic: true,
    clearColor: Color.black,
    verticalWorldUnits: canvas.height,
  });

  const glyphImage = await createSyntheticMsdfGlyphImage();

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
        ascender: 0.5,
        descender: 0.5,
        capHeight: 0.5,
      },
      glyphs: new Map([
        [
          ATLAS_A_CODE_POINT,
          {
            codePoint: ATLAS_A_CODE_POINT,
            advance: 1,
            planeBounds: glyphBounds,
            atlasBounds: glyphBounds,
          },
        ],
      ]),
      kerning: new Map(),
    },
    image: glyphImage,
  };

  const textEntity = world.createEntity();

  // Three glyphs at 1 em each, centered on the canvas.
  addPositionComponent(world, textEntity, {
    local: { x: -1.5 * SIZE, y: 0 },
  });

  const textComponent = addTextComponent(world, textEntity, {
    text: 'AAA',
    fontAtlas,
    size: SIZE,
    color: Color.red,
    verticalAlign: 'middle',
  });

  world.addSystem(createTransformEcsSystem());
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

    setText(text: string): void {
      textComponent.text = text;
    },

    boldWidening: 2 * FAUX_BOLD_EMBOLDEN * SIZE,

    measureInkSpans(): InkSpan[] {
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
      const spans: InkSpan[] = [];
      let current: InkSpan | null = null;

      for (let x = 0; x < canvas.width; x++) {
        const offset = x * 4;
        const color = classifyInk(
          data[offset],
          data[offset + 1],
          data[offset + 2],
        );

        if (current && color === current.color) {
          current.right = x;

          continue;
        }

        if (current) {
          spans.push(current);
          current = null;
        }

        if (color) {
          current = { left: x, right: x, color };
        }
      }

      if (current) {
        spans.push(current);
      }

      return spans;
    },
  };
};
