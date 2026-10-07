import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  Color,
  createCamera,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  spriteId,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';
import { brightTint } from './tint-brighter-than-texture-tint.js';

const defaultStepDeltaMilliseconds = 16.6666;

// A single mid-gray texel (102 / 255 = 0.4 per channel), so a tint above 1
// has room to brighten it before the canvas's 8-bit channels reach full
// brightness.
const textureFill = [102, 102, 102, 255];

// One world unit is one CSS pixel (see `verticalWorldUnits` below).
const spriteSizeInPixels = 48;
const spriteOffsetInPixels = 80;

/** A sampled pixel's color, `0`-`255` per channel. */
export interface SampledColor {
  r: number;
  g: number;
  b: number;
}

/** Everything `tint-brighter-than-texture.spec.ts` asserts against, from one frame. */
export interface TintBrighterThanTextureMeasurement {
  /** The center of the sprite tinted `Color.white`, i.e. its texture as is. */
  whiteTinted: SampledColor;

  /** The center of the identical sprite tinted `brightTint` on every channel. */
  brightTinted: SampledColor;
}

/** The handle `tint-brighter-than-texture.spec.ts` drives and asserts against. */
export interface TintBrighterThanTextureSceneHandle extends SceneHandle {
  /**
   * Reads back the presented canvas at each sprite's center. Must be called
   * in the same `page.evaluate` task as the preceding `step()` - see
   * `SceneHandle.step` and `camera-pan-zoom.ts`'s `measureGreenSquareBounds`
   * for why.
   */
  measure(): TintBrighterThanTextureMeasurement;
}

/**
 * Builds a minimal scene for a tint above `1` on the canvas's 8-bit
 * channels: two identical gray sprites, the left tinted `Color.white` and
 * the right tinted `brightTint` on every channel.
 * `tint-brighter-than-texture.spec.ts` checks the right one draws brighter
 * than its texture.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TintBrighterThanTextureSceneHandle => {
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

  createCamera(world, {
    isStatic: true,
    clearColor: Color.black,
    verticalWorldUnits: renderContext.cssHeight,
  });

  const sprite = createImageSprite(
    createTexture(
      renderContext,
      new ImageData(new Uint8ClampedArray(textureFill), 1, 1),
    ),
  );

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
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    measure(): TintBrighterThanTextureMeasurement {
      const { gl, width, height, pixelRatio } = renderContext;
      const pixels = new Uint8Array(width * height * 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const pixelAt = (x: number, y: number): SampledColor => {
        const index = (Math.round(y) * width + Math.round(x)) * 4;

        return { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
      };

      // The drawing buffer is `pixelRatio` times the canvas's CSS size.
      const offset = spriteOffsetInPixels * pixelRatio;

      return {
        whiteTinted: pixelAt(width / 2 - offset, height / 2),
        brightTinted: pixelAt(width / 2 + offset, height / 2),
      };
    },
  };
};
