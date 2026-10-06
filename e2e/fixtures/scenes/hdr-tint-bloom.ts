import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addBloomComponent,
  addToneMappingComponent,
  Color,
  createBloomEcsSystem,
  createCamera,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createRenderTarget,
  createToneMapEcsSystem,
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_FORMAT_KEYS,
  spriteId,
} from '../../../src/rendering/index.js';
import { createSquareImage } from './create-square-image.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// One world unit is one CSS pixel (see `verticalWorldUnits` below).
const spriteSizeInPixels = 32;
const spriteOffsetInPixels = 120;

// Far enough past each sprite's edge to be clear of the sprite itself, close
// enough that both halos still clearly show there.
const haloOffsetInPixels = 12;

// A threshold below `1`, so the white-tinted sprite blooms too and the
// comparison is between two glows, not a glow and nothing.
const bloomSettings = { threshold: 0.8, passes: 6, intensity: 1 };

const brightTint = 3;

/** A sampled pixel's color, `0`-`255` per channel. */
export interface SampledColor {
  r: number;
  g: number;
  b: number;
}

/** Everything `hdr-tint-bloom.spec.ts` asserts against, from one frame. */
export interface HdrTintBloomMeasurement {
  /** The camera render target's resolved storage format. */
  format: RENDER_TARGET_FORMAT_KEYS;

  /** The halo just outside the white-tinted sprite's outer edge. */
  whiteTintedHalo: SampledColor;

  /** The halo the same distance outside the sprite tinted above white. */
  brightTintedHalo: SampledColor;
}

/** The handle `hdr-tint-bloom.spec.ts` drives and asserts against. */
export interface HdrTintBloomSceneHandle extends SceneHandle {
  /**
   * Reads back the presented canvas at the same distance outside each
   * sprite's outer edge, on the row through their centers. Must be called
   * in the same `page.evaluate` task as the preceding `step()` - see
   * `SceneHandle.step` and `camera-pan-zoom.ts`'s `measureGreenSquareBounds`
   * for why.
   */
  measure(): HdrTintBloomMeasurement;
}

/**
 * Builds a minimal scene for a tint above `1` on an HDR camera: two white
 * sprites, the left tinted `Color.white` and the right tinted `3` on every
 * channel, drawn by a camera with an `hdr` render target, bloom and tone
 * mapping. `hdr-tint-bloom.spec.ts` checks the brighter one blooms more.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<HdrTintBloomSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 400;
  canvas.height = 300;

  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const renderTarget = createRenderTarget(
    renderContext.gl,
    renderContext.width,
    renderContext.height,
    RENDER_TARGET_FORMAT.hdr,
  );
  const cameraEntity = createCamera(world, {
    isStatic: true,
    clearColor: Color.black,
    verticalWorldUnits: renderContext.cssHeight,
    renderTarget,
  });

  addBloomComponent(world, cameraEntity, bloomSettings);
  addToneMappingComponent(world, cameraEntity);

  const squareImage = await createSquareImage('#fff');
  const sprite = createImageSprite(squareImage, renderContext, {
    pixelsPerUnit: 1,
  });

  const addSquare = (x: number, tintColor: Color): void => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x, y: 0 } });
    world.addComponent(entity, spriteId, {
      ...sprite,
      width: spriteSizeInPixels,
      height: spriteSizeInPixels,
      tintColor,
    });
  };

  addSquare(-spriteOffsetInPixels, Color.white);
  addSquare(
    spriteOffsetInPixels,
    new Color(brightTint, brightTint, brightTint),
  );

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createBloomEcsSystem(renderContext));
  world.addSystem(createToneMapEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    measure(): HdrTintBloomMeasurement {
      const { gl, width, height, pixelRatio } = renderContext;
      const pixels = new Uint8Array(width * height * 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const pixelAt = (x: number, y: number): SampledColor => {
        const index = (Math.round(y) * width + Math.round(x)) * 4;

        return { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
      };

      // The drawing buffer is `pixelRatio` times the canvas's CSS size.
      // Each halo is sampled outside its sprite's outer edge, away from the
      // other sprite, so neither glow reaches the other's sample.
      const haloDistanceFromCenter =
        (spriteOffsetInPixels + spriteSizeInPixels / 2 + haloOffsetInPixels) *
        pixelRatio;

      return {
        format: renderTarget.format,
        whiteTintedHalo: pixelAt(
          width / 2 - haloDistanceFromCenter,
          height / 2,
        ),
        brightTintedHalo: pixelAt(
          width / 2 + haloDistanceFromCenter,
          height / 2,
        ),
      };
    },
  };
};
