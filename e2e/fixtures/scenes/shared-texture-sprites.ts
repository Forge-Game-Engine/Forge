import {
  addPositionComponent,
  Color,
  createCamera,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  createTransformEcsSystem,
  EcsWorld,
  spriteId,
  Time,
} from '../../../src/index.js';
import { PixelBounds } from './input-scene-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// 600 CSS pixels tall (see e2e/fixtures/index.html) over 600 world units, so
// one world unit is one CSS pixel.
const verticalWorldUnits = 600;

// The shared texture: a small, solid orange square drawn on a canvas.
// Orange is far from the dark blue clear color, so every sprite pixel is
// unambiguous in a readback.
const textureSizeInTexels = 16;
const textureFill = '#ff8000';

// 16 texels at 0.2 texels per world unit: an 80 world-unit (CSS pixel)
// square per sprite.
const pixelsPerUnit = 0.2;

// Each sprite sits this far either side of the canvas center.
const spriteOffsetInWorldUnits = 150;

/** Both sprites' measured on-screen bounds, one per half of the canvas. */
export interface SharedTextureSpriteBounds {
  left: PixelBounds | null;
  right: PixelBounds | null;
}

/**
 * The scene's handle: two sprites made by separate `createImageSprite` calls
 * from one texture, either side of the canvas center.
 */
export interface SharedTextureSpritesSceneHandle extends SceneHandle {
  /** Each sprite's world size, from `createImageSprite`. */
  readonly spriteWorldSizes: { width: number; height: number }[];
  /** How far each sprite's center is from the canvas center, in world units. */
  readonly spriteOffsetInWorldUnits: number;
  /** Drawing-buffer pixels per world unit. */
  readonly devicePixelsPerUnit: number;
  /**
   * The instance count of every `drawArraysInstanced` call made during the
   * last `step()` - one entry per instanced draw call.
   */
  readonly lastFrameInstancedDraws: readonly number[];
  /**
   * Scans the displayed canvas for orange pixels in each half. Must run in
   * the same `page.evaluate` task as the `step()` before it.
   */
  measureSpriteBounds(): SharedTextureSpriteBounds;
}

/**
 * Draws the shared texture's contents: a solid orange square.
 * @returns The canvas to upload.
 */
function drawTextureSource(): HTMLCanvasElement {
  const source = document.createElement('canvas');

  source.width = textureSizeInTexels;
  source.height = textureSizeInTexels;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.fillStyle = textureFill;
  context.fillRect(0, 0, textureSizeInTexels, textureSizeInTexels);

  return source;
}

/**
 * Whether a 0-255 RGB pixel is the texture's orange, with a generous
 * tolerance for antialiased edges.
 */
function isOrange(r: number, g: number, b: number): boolean {
  return r > 200 && g > 90 && g < 170 && b < 60;
}

/**
 * Grows `bounds` to include `(x, y)`.
 */
function includePixel(
  bounds: PixelBounds | null,
  x: number,
  y: number,
): PixelBounds {
  if (bounds === null) {
    return { left: x, right: x, top: y, bottom: y };
  }

  return {
    left: Math.min(bounds.left, x),
    right: Math.max(bounds.right, x),
    top: Math.min(bounds.top, y),
    bottom: Math.max(bounds.bottom, y),
  };
}

/**
 * Builds a scene with one texture, created once, shared by two sprites
 * from two separate `createImageSprite` calls: the render system must bind
 * the sprite's own `texture` for both, so both appear on screen. Wraps the
 * context's `drawArraysInstanced` to count the instanced draw calls a frame
 * makes, so the spec can see that the two sprites share one batch.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SharedTextureSpritesSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });
  const { gl } = renderContext;

  let instancedDraws: number[] = [];
  let lastFrameInstancedDraws: readonly number[] = [];
  const drawArraysInstanced = gl.drawArraysInstanced.bind(gl);

  gl.drawArraysInstanced = (
    mode: GLenum,
    first: GLint,
    count: GLsizei,
    instanceCount: GLsizei,
  ): void => {
    instancedDraws.push(instanceCount);
    drawArraysInstanced(mode, first, count, instanceCount);
  };

  createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.05, 0.1, 0.3),
    verticalWorldUnits,
  });

  const texture = createTexture(renderContext, drawTextureSource());
  const spriteWorldSizes: { width: number; height: number }[] = [];

  for (const x of [-spriteOffsetInWorldUnits, spriteOffsetInWorldUnits]) {
    const sprite = createImageSprite(texture, { pixelsPerUnit });
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x, y: 0 } });
    world.addComponent(entity, spriteId, sprite);
    spriteWorldSizes.push({ width: sprite.width, height: sprite.height });
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      instancedDraws = [];
      world.update();
      lastFrameInstancedDraws = instancedDraws;
    },

    spriteWorldSizes,
    spriteOffsetInWorldUnits,

    get devicePixelsPerUnit(): number {
      return renderContext.height / verticalWorldUnits;
    },

    get lastFrameInstancedDraws(): readonly number[] {
      return lastFrameInstancedDraws;
    },

    measureSpriteBounds(): SharedTextureSpriteBounds {
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
      const middle = canvas.width / 2;
      let left: PixelBounds | null = null;
      let right: PixelBounds | null = null;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const offset = (y * canvas.width + x) * 4;

          if (!isOrange(data[offset], data[offset + 1], data[offset + 2])) {
            continue;
          }

          if (x < middle) {
            left = includePixel(left, x, y);
          } else {
            right = includePixel(right, x, y);
          }
        }
      }

      return { left, right };
    },
  };
};
