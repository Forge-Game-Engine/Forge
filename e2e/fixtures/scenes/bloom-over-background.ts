import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addBloomComponent,
  addCameraComponent,
  Color,
  createBloomEcsSystem,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createRenderTarget,
  spriteId,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

const glowRenderCategory = 1 << 0;

// A mostly-blue background and a yellow sprite: yellow has no blue at all,
// so a glow that only adds light can never lower the background's blue
// channel, while a glow that partly covers the background visibly does.
const backgroundColor = new Color(0.1, 0.3, 0.8);
const spriteColor = new Color(1, 1, 0);

// One world unit is one CSS pixel (see `verticalWorldUnits` below), so the
// sprite is this many CSS pixels wide, centered on the canvas.
const spriteSizeInPixels = 32;

// Strong enough that the glow clearly reaches well past the sprite's edge.
const bloomSettings = { threshold: 0.5, passes: 6, intensity: 3 };

// The part of the row through the sprite's center that `measure` scans for
// the halo, in CSS pixels right of the sprite's edge.
const haloScanRange = { start: 2, end: 64 };

/** A sampled pixel's color, `0`-`255` per channel. */
export interface SampledColor {
  r: number;
  g: number;
  b: number;
}

/** Everything `bloom-over-background.spec.ts` asserts against, from one frame. */
export interface BloomOverBackgroundMeasurement {
  /** The background, sampled far from the sprite and its glow. */
  farBackground: SampledColor;

  /** The lowest blue found in the halo just outside the sprite's silhouette. */
  lowestHaloBlue: number;

  /** The highest red found in the halo just outside the sprite's silhouette. */
  highestHaloRed: number;
}

/** The handle `bloom-over-background.spec.ts` drives and asserts against. */
export interface BloomOverBackgroundSceneHandle extends SceneHandle {
  /**
   * Reads back the presented canvas: the far background, and the halo
   * along the row through the sprite's center, right of its edge. Must be
   * called in the same `page.evaluate` task as the preceding `step()` - see
   * `SceneHandle.step` and `camera-pan-zoom.ts`'s `measureGreenSquareBounds`
   * for why.
   */
  measure(): BloomOverBackgroundMeasurement;
}

/**
 * Builds a minimal scene for bloom layered over another camera: a
 * background camera cleared to opaque blue, and a foreground camera (with a
 * transparent clear and a `BloomEcsComponent`) drawing one yellow sprite,
 * each into its own render target. `bloom-over-background.spec.ts` checks
 * the glow brightens the background past the sprite's silhouette without
 * dimming any of its channels.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): BloomOverBackgroundSceneHandle => {
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

  const backgroundCameraEntity = world.createEntity();

  addPositionComponent(world, backgroundCameraEntity);
  addCameraComponent(world, backgroundCameraEntity, {
    isStatic: true,
    layer: 0,
    clearColor: backgroundColor,
    cullingMask: 0,
    renderTarget: createRenderTarget(renderContext, 'canvas'),
  });

  const glowCameraEntity = world.createEntity();

  addPositionComponent(world, glowCameraEntity);
  addCameraComponent(world, glowCameraEntity, {
    isStatic: true,
    layer: 1,
    clearColor: Color.transparent,
    cullingMask: glowRenderCategory,
    verticalWorldUnits: renderContext.cssHeight,
    renderTarget: createRenderTarget(renderContext, 'canvas'),
  });
  addBloomComponent(world, glowCameraEntity, bloomSettings);

  const sprite = {
    ...createImageSprite(renderContext.whiteTexture),
    category: glowRenderCategory,
  };
  const spriteEntity = world.createEntity();

  addPositionComponent(world, spriteEntity);
  world.addComponent(spriteEntity, spriteId, {
    ...sprite,
    width: spriteSizeInPixels,
    height: spriteSizeInPixels,
    tintColor: spriteColor,
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createBloomEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    measure(): BloomOverBackgroundMeasurement {
      const { gl, width, height } = renderContext;
      const pixels = new Uint8Array(width * height * 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const pixelAt = (x: number, y: number): SampledColor => {
        const index = (Math.round(y) * width + Math.round(x)) * 4;

        return { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
      };

      // The drawing buffer is `pixelRatio` times the canvas's CSS size, so
      // scale the CSS-pixel distances above into device pixels.
      const { pixelRatio } = renderContext;
      const centerX = width / 2;
      const centerY = height / 2;
      const spriteEdgeX = centerX + (spriteSizeInPixels / 2) * pixelRatio;
      let lowestHaloBlue = Number.POSITIVE_INFINITY;
      let highestHaloRed = Number.NEGATIVE_INFINITY;

      for (
        let offset = haloScanRange.start * pixelRatio;
        offset <= haloScanRange.end * pixelRatio;
        offset++
      ) {
        const { r, b } = pixelAt(spriteEdgeX + offset, centerY);

        lowestHaloBlue = Math.min(lowestHaloBlue, b);
        highestHaloRed = Math.max(highestHaloRed, r);
      }

      return {
        farBackground: pixelAt(width * 0.05, height * 0.05),
        lowestHaloBlue,
        highestHaloRed,
      };
    },
  };
};
