import {
  addBloomComponent,
  addGaussianBlurComponent,
  addPositionComponent,
  Color,
  createBloomEcsSystem,
  createCamera,
  createCanvas,
  createContainerResizeSync,
  createGaussianBlurEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createRenderTarget,
  createTransformEcsSystem,
  EcsWorld,
  spriteId,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// 600 CSS pixels tall (see e2e/fixtures/index.html) over 60 world units, so
// one world unit is 10 CSS pixels at any pixel ratio.
const verticalWorldUnits = 60;
const squareWorldSize = 1;

/** How far out from the square's center `measureLuminanceProfile` reads. */
const profileLengthInCssPixels = 60;

/** The post-processing effect a scene instance applies, from `?effect=`. */
export type PostProcessEffect = 'bloom' | 'blur';

/** The handle `post-process-pixel-ratio.spec.ts` drives and asserts against. */
export interface PostProcessPixelRatioSceneHandle extends SceneHandle {
  /** `RenderContext.pixelRatio`. */
  readonly pixelRatio: number;
  /**
   * Reads the rendered canvas's luminance (`0`-`255`) along a horizontal
   * line through the square's center, from its center outwards to the
   * right, one entry per CSS pixel (each read at the middle of that CSS
   * pixel). Must be called in the same `page.evaluate` task as the
   * preceding `step()`.
   */
  measureLuminanceProfile(): number[];
}

/**
 * Reads the post-processing effect to apply from the page's `?effect=`
 * query param.
 * @returns The effect.
 * @throws An error if the param is missing or not a known effect.
 */
function readEffect(): PostProcessEffect {
  const effect = new URLSearchParams(window.location.search).get('effect');

  if (effect === 'bloom' || effect === 'blur') {
    return effect;
  }

  throw new Error(`Expected ?effect=bloom or ?effect=blur, got "${effect}".`);
}

/**
 * Builds a scene for checking that blur and bloom are sized in CSS pixels:
 * a small white square on black at the canvas's center, rendered into a
 * canvas-sized render target that gets either bloom or a Gaussian blur
 * (picked by `?effect=`) before being presented. Rendered at two device
 * pixel ratios, the square's glow (or blur) should look the same in CSS
 * pixels.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): PostProcessPixelRatioSceneHandle => {
  const effect = readEffect();
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createContainerResizeSync(container, [renderContext]);

  const sceneTarget = createRenderTarget(
    renderContext.gl,
    renderContext.width,
    renderContext.height,
  );

  const cameraEntity = createCamera(world, {
    isStatic: true,
    clearColor: new Color(0, 0, 0, 1),
    verticalWorldUnits,
    renderTarget: sceneTarget,
  });

  const squareSprite = createImageSprite(renderContext.whiteTexture);
  const square = world.createEntity();

  addPositionComponent(world, square, {
    local: { x: 0, y: 0 },
  });
  world.addComponent(square, spriteId, {
    ...squareSprite,
    width: squareWorldSize,
    height: squareWorldSize,
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  if (effect === 'bloom') {
    addBloomComponent(world, cameraEntity, {
      threshold: 0.5,
      passes: 2,
      intensity: 1,
    });
    world.addSystem(createBloomEcsSystem(renderContext));
  } else {
    addGaussianBlurComponent(world, cameraEntity, { passes: 3 });
    world.addSystem(createGaussianBlurEcsSystem(renderContext));
  }

  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      // Keep the render target matched to the drawing buffer, in case the
      // resize sync resized the canvas after the target was created.
      if (
        sceneTarget.width !== renderContext.width ||
        sceneTarget.height !== renderContext.height
      ) {
        sceneTarget.resize(
          renderContext.gl,
          renderContext.width,
          renderContext.height,
        );
      }

      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    get pixelRatio(): number {
      return renderContext.pixelRatio;
    },

    measureLuminanceProfile(): number[] {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const { pixelRatio, cssWidth, cssHeight } = renderContext;
      const toDevicePixel = (cssPixel: number): number =>
        Math.floor((cssPixel + 0.5) * pixelRatio);
      const centerX = cssWidth / 2;
      const y = toDevicePixel(cssHeight / 2);
      const { data } = context2d.getImageData(0, y, canvas.width, 1);
      const profile: number[] = [];

      for (let d = 0; d < profileLengthInCssPixels; d++) {
        const offset = toDevicePixel(centerX + d) * 4;

        profile.push(
          0.2126 * data[offset] +
            0.7152 * data[offset + 1] +
            0.0722 * data[offset + 2],
        );
      }

      return profile;
    },
  };
};
