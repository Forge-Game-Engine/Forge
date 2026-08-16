import {
  addTextComponent,
  Color,
  createCamera,
  createCanvas,
  createRenderContext,
  createTransformEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTextShapingEcsSystem,
  EcsWorld,
  FontAtlas,
  positionId,
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

// 1 em = 1 synthetic glyph tile = this many world units, and the camera
// below is set up so 1 world unit = 1 screen pixel at zoom 1 - keeping the
// world/atlas-pixel/screen-pixel numbers below all directly comparable.
const SIZE = SYNTHETIC_GLYPH_TILE_SIZE;

// Both glyphs' `planeBounds`/`atlasBounds`: the ink square (see
// `create-synthetic-msdf-glyph-image.ts`) padded by exactly
// `distanceRange / 2` atlas pixels on every side - the same convention a
// real `msdf-bmfont-xml`-generated atlas uses (see the correction posted to
// issue #584: the generator already bakes this padding into every glyph's
// exported bounds, so this mirrors real atlas data, not an idealized one).
const inkHalfFraction = SYNTHETIC_GLYPH_INK_HALF_SIZE / SYNTHETIC_GLYPH_TILE_SIZE;
const paddingFraction =
  SYNTHETIC_GLYPH_DISTANCE_RANGE / 2 / SYNTHETIC_GLYPH_TILE_SIZE;
const glyphHalfWidthEm = inkHalfFraction + paddingFraction;
const glyphBounds = {
  left: 0.5 - glyphHalfWidthEm,
  right: 0.5 + glyphHalfWidthEm,
  bottom: 0.5 - glyphHalfWidthEm,
  top: 0.5 + glyphHalfWidthEm,
};

// The advance (in em) between the two glyphs is chosen so that:
//  - their *ink* stays a real, positive 5 world units apart (a plausible
//    tight-kerning gap, not glyphs literally touching) - comfortably inside
//    the atlas's own graded budget (~7.5 screen px here), so an
//    outline/shadow *would* visibly reach across it if nothing clamped
//    against the neighbor;
//  - their *padded quads* (ink + the atlas's own baked-in padding on each
//    side) already overlap by 11 world units - this is exactly the
//    `effectClearance <= 0` case `assignEffectClearances` in shape-text.ts
//    is meant to catch, reproducing the tight-kerning ("il"/"ff") scenario
//    from issue #584's reverted PR #598, not a hand-picked worst case.
const targetInkGapWorld = 5;
const tightAdvanceEm = 0.5 + targetInkGapWorld / SIZE;

// The B -> C advance, by contrast, is deliberately wide: a 64 world unit
// ink gap (comfortably more than double the atlas's own ~7.5 screen px
// budget), so C's `effectClearance` is bounded by the atlas budget alone,
// exactly like an isolated glyph - C is this scene's "outline still
// renders normally when nothing is actually tight" sanity control,
// contrasted against A/B's deliberately tight pair above.
const wideAdvanceEm = 1.0;

const ATLAS_A_CODE_POINT = 65;
const ATLAS_B_CODE_POINT = 66;
const ATLAS_C_CODE_POINT = 67;

/** World X of glyph "A"'s own ink right edge (`glyphBounds.right * SIZE`). */
const glyphAInkRightWorldX = glyphBounds.right * SIZE;

/**
 * World X of a point that sits inside glyph "A"'s own ink, but within
 * glyph "B"'s naive (atlas-budget-only, neighbor-unaware) outline reach -
 * the exact pixel the reported overlap bug painted the wrong (outline)
 * color over. 1 world unit inside "A"'s ink edge, comfortably clear of
 * rasterization/AA noise right at the edge itself.
 */
const contestedWorldX = glyphAInkRightWorldX - 1;

/** World X of glyph "C"'s own ink center - see `wideAdvanceEm` above. */
const glyphCCenterWorldX =
  (tightAdvanceEm + wideAdvanceEm + 0.5) * SIZE;

/**
 * World X a few screen px outside "C"'s own (uncontested) right ink edge -
 * where its outline should still show at full, atlas-budget-only strength.
 */
const glyphCOuterEdgeWorldX =
  glyphCCenterWorldX + SYNTHETIC_GLYPH_INK_HALF_SIZE + 3;

/** The handle `text-effects-overlap.spec.ts` drives and asserts against. */
export interface TextEffectsOverlapSceneHandle extends SceneHandle {
  /**
   * Sets every glyph's `outlineColor`. Takes plain r/g/b/a rather than a
   * `Color` instance since this is called from `page.evaluate` (a separate
   * browser-side execution context that can't share class instances with
   * the Node-side spec that constructs the arguments).
   */
  setOutlineColor(r: number, g: number, b: number, a: number): void;

  /** Sets every glyph's `outlineWidth` (screen-pixel-range units). */
  setOutlineWidth(width: number): void;

  /** Sets every glyph's `shadowColor` - see `setOutlineColor` for why r/g/b/a. */
  setShadowColor(r: number, g: number, b: number, a: number): void;

  /** Sets every glyph's `shadowOffset` (screen-pixel-range units). */
  setShadowOffset(offset: { x: number; y: number }): void;

  /** Sets every glyph's `shadowSoftness` (screen-pixel-range units). */
  setShadowSoftness(softness: number): void;

  /** See `contestedWorldX` above. */
  readonly contestedWorldX: number;

  /** World X of "A"'s own ink center - a same-run sanity baseline. */
  readonly glyphACenterWorldX: number;

  /** See `glyphCOuterEdgeWorldX` above. */
  readonly glyphCOuterEdgeWorldX: number;

  /** World X of "C"'s own ink center. */
  readonly glyphCCenterWorldX: number;

  /** World Y every glyph is vertically centered on. */
  readonly glyphCenterWorldY: number;

  /**
   * Reads back the *actual rendered* canvas (`drawImage`/`getImageData`,
   * not `gl.readPixels` - see AGENTS.md's "Be wary of pixel-level rendering
   * assertions") at the given world position. Must be called in the same
   * `page.evaluate` task as the preceding `step()` - see `SceneHandle.step`.
   * @param worldX - World X to sample.
   * @param worldY - World Y to sample.
   */
  sampleColorAt(
    worldX: number,
    worldY: number,
  ): { r: number; g: number; b: number; a: number };
}

/**
 * Builds a minimal scene with two glyphs from a synthetic, analytically
 * generated MSDF atlas (no font file or external generator needed - see
 * `create-synthetic-msdf-glyph-image.ts`), kerned tightly enough that their
 * padded quads overlap while their ink stays a real, positive distance
 * apart. This is the real-GPU proof for the fix in issue #584: a large
 * `outlineWidth` must never paint one glyph's outline color over the
 * *other* glyph's own ink, however far the requested effect size reaches.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<TextEffectsOverlapSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 700;
  canvas.height = 200;

  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createCamera(world, {
    isStatic: true,
    clearColor: Color.black,
    // 1 world unit = 1 screen pixel at zoom 1 (matches `SIZE` above).
    verticalWorldUnits: canvas.height,
  });

  const glyphImage = await createSyntheticMsdfGlyphImage();

  const fontAtlas: FontAtlas = {
    data: {
      formatVersion: 1,
      type: 'msdf',
      atlasImage: 'synthetic.png',
      atlasSize: {
        width: SYNTHETIC_GLYPH_TILE_SIZE,
        height: SYNTHETIC_GLYPH_TILE_SIZE,
      },
      distanceRange: SYNTHETIC_GLYPH_DISTANCE_RANGE,
      // Sum to 1.0 so `verticalAlign: 'middle'` centers this glyph's own
      // ink (which spans exactly 1 em vertically around its own center, by
      // construction) on the entity's position - see the derivation this
      // module's own doc comment gives for `advanceEm`.
      metrics: { lineHeight: 1, ascender: 0.5, descender: 0.5 },
      glyphs: new Map([
        [
          ATLAS_A_CODE_POINT,
          {
            codePoint: ATLAS_A_CODE_POINT,
            advance: tightAdvanceEm,
            planeBounds: glyphBounds,
            atlasBounds: glyphBounds,
          },
        ],
        [
          ATLAS_B_CODE_POINT,
          {
            codePoint: ATLAS_B_CODE_POINT,
            advance: wideAdvanceEm,
            planeBounds: glyphBounds,
            atlasBounds: glyphBounds,
          },
        ],
        [
          ATLAS_C_CODE_POINT,
          {
            codePoint: ATLAS_C_CODE_POINT,
            // Unused - "C" is always the last glyph shaped, so nothing
            // reads its advance.
            advance: 0.5,
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

  world.addComponent(textEntity, positionId, {
    local: { x: 0, y: 0 },
    world: { x: 0, y: 0 },
  });

  // Distinct, saturated colors for ink vs. outline, so a same-run pixel
  // readback can unambiguously tell "a glyph's own ink" apart from "a
  // neighboring glyph's outline bled over it". "A"/"B" are the tight,
  // overlapping-quad pair the fix targets; "C" is spaced comfortably wide
  // of "B" as an unaffected sanity control (see `wideAdvanceEm` above).
  const textComponent = addTextComponent(world, textEntity, {
    text: 'ABC',
    fontAtlas,
    size: SIZE,
    color: Color.red,
    verticalAlign: 'middle',
    outlineColor: Color.green,
    outlineWidth: 0,
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

    setOutlineColor(r: number, g: number, b: number, a: number): void {
      textComponent.outlineColor = new Color(r, g, b, a);
    },

    setOutlineWidth(width: number): void {
      textComponent.outlineWidth = width;
    },

    setShadowColor(r: number, g: number, b: number, a: number): void {
      textComponent.shadowColor = new Color(r, g, b, a);
    },

    setShadowOffset(offset: { x: number; y: number }): void {
      textComponent.shadowOffset = offset;
    },

    setShadowSoftness(softness: number): void {
      textComponent.shadowSoftness = softness;
    },

    contestedWorldX,
    glyphACenterWorldX: 0.5 * SIZE,
    glyphCOuterEdgeWorldX,
    glyphCCenterWorldX,
    glyphCenterWorldY: 0,

    sampleColorAt(
      worldX: number,
      worldY: number,
    ): { r: number; g: number; b: number; a: number } {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      // Camera is static at world (0, 0), zoom 1, 1 world unit = 1 screen
      // pixel: canvas center is world (0, 0), X matches world X directly,
      // Y is flipped (world is Y-up, the canvas/readback is Y-down).
      const canvasX = Math.round(canvas.width / 2 + worldX);
      const canvasY = Math.round(canvas.height / 2 - worldY);
      const { data } = context2d.getImageData(canvasX, canvasY, 1, 1);

      return { r: data[0], g: data[1], b: data[2], a: data[3] };
    },
  };
};
