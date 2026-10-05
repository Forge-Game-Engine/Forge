import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addCameraComponent,
  Color,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  SpriteEcsComponent,
  spriteId,
} from '../../../src/rendering/index.js';
import {
  createPanel,
  createUiCanvas,
  registerUiSystems,
  UiAxis,
} from '../../../src/ui/index.js';
import { createWhiteSquareImage } from './create-white-square-image.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

const worldRenderCategory = 1 << 0;
const uiRenderCategory = 1 << 1;

// The tint alphas of the three black UI panels, left to right. Black over
// the world's white clear color makes each panel's measured darkening equal
// to its effective on-screen opacity, so the spec can compare the two
// directly.
const panelAlphas = [0.25, 0.5, 0.75];

// Each panel fills the middle 70% of its own third of the canvas
// horizontally and the middle half vertically, leaving white world
// background visible around and between them. Sampling happens at these
// same normalized positions, so the spec never hardcodes a pixel
// coordinate.
const panelHorizontalInset = 0.15;
const panelVerticalRange = { min: 0.25, max: 0.75 };
const backgroundSampleY = 0.1;

// Opaque, saturated blue, nowhere in the scene itself. The canvas is drawn
// over it before sampling, so any pixel the canvas leaves partially
// transparent shows up as a blue tint instead of passing for a correct
// neutral grey.
const backdropCssColor = '#0000ff';

/** The average color of a sampled block of the composited canvas, `0`-`255` per channel. */
export interface SampledColor {
  r: number;
  g: number;
  b: number;
}

/** One UI panel's configured tint alpha alongside its measured on-screen color. */
export interface PanelMeasurement {
  /** The alpha of the panel's own `SpriteEcsComponent.tintColor`, read back from the ECS. */
  tintAlpha: number;

  /** The panel's center, sampled from the composited canvas. */
  color: SampledColor;
}

/** Everything `translucent-ui-compositing.spec.ts` asserts against, from one frame. */
export interface TranslucentUiCompositingMeasurement {
  /** The world's own white background, outside every panel. */
  background: SampledColor;

  /** Each panel, left to right. */
  panels: PanelMeasurement[];
}

/** The handle `translucent-ui-compositing.spec.ts` drives and asserts against. */
export interface TranslucentUiCompositingSceneHandle extends SceneHandle {
  /**
   * Switches the world camera between rendering into its own off-screen
   * render target (`true`) and straight onto the canvas (`false`). The UI
   * canvas always renders through its own render target either way.
   */
  setWorldRendersToTarget(rendersToTarget: boolean): void;

  /**
   * Draws the canvas's actual displayed bitmap over an opaque backdrop and
   * samples the world background and each panel's center. Must be called
   * in the same `page.evaluate` task as the preceding `step()` - see
   * `SceneHandle.step` and `camera-pan-zoom.ts`'s
   * `measureGreenSquareBounds` for why.
   */
  measure(): TranslucentUiCompositingMeasurement;
}

/**
 * Averages a small block of `context2d` centered on the normalized
 * (`0`-`1`, Y-up, matching the UI's anchors) position `(u, v)`, so a single
 * antialiased or dithered pixel can't skew the result.
 */
function sampleBlock(
  context2d: CanvasRenderingContext2D,
  width: number,
  height: number,
  u: number,
  v: number,
): SampledColor {
  const radius = 4;
  const size = radius * 2 + 1;
  const left = Math.round(u * width) - radius;
  const top = Math.round((1 - v) * height) - radius;
  const { data } = context2d.getImageData(left, top, size, size);
  const pixelCount = size * size;
  let r = 0;
  let g = 0;
  let b = 0;

  for (let i = 0; i < pixelCount; i++) {
    r += data[i * 4];
    g += data[i * 4 + 1];
    b += data[i * 4 + 2];
  }

  return { r: r / pixelCount, g: g / pixelCount, b: b / pixelCount };
}

/**
 * Builds a minimal scene for translucent UI compositing: a world camera
 * cleared to opaque white, and a screen-space UI canvas (which always
 * renders through its own transparent-cleared render target, see
 * `createUiCanvas`) holding three black panels at increasing tint alphas.
 * `translucent-ui-compositing.spec.ts` measures how much each panel
 * actually darkens the presented canvas, and asserts that matches the
 * panel's tint alpha - with the world camera rendering both into its own
 * render target and straight onto the canvas.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<TranslucentUiCompositingSceneHandle> => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 800;
  canvas.height = 600;

  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  const worldTarget = renderContext.createRenderTarget();

  const worldCameraEntity = world.createEntity();

  addPositionComponent(world, worldCameraEntity);

  const worldCamera = addCameraComponent(world, worldCameraEntity, {
    isStatic: true,
    clearColor: Color.white,
    cullingMask: worldRenderCategory,
    renderTarget: worldTarget,
  });

  registerUiSystems(world, renderContext, time);

  const uiCanvas = createUiCanvas(world, renderContext, {
    cullingMask: uiRenderCategory,
    referenceResolution: { x: canvas.width, y: canvas.height },
  });

  const panelImage = await createWhiteSquareImage();

  const panelEntities = panelAlphas.map((alpha, index) => {
    const panelSprite = createImageSprite(panelImage, renderContext, {
      pixelsPerUnit: 1,
      layer: uiRenderCategory,
    });

    panelSprite.tintColor = new Color(0, 0, 0, alpha);

    return createPanel(world, uiCanvas, {
      sprite: panelSprite,
      anchor: {
        x: UiAxis.stretch({
          min: (index + panelHorizontalInset) / panelAlphas.length,
          max: (index + 1 - panelHorizontalInset) / panelAlphas.length,
        }),
        y: UiAxis.stretch(panelVerticalRange),
      },
    });
  });

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

    setWorldRendersToTarget(rendersToTarget: boolean): void {
      worldCamera.renderTarget = rendersToTarget ? worldTarget : undefined;
    },

    measure(): TranslucentUiCompositingMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.fillStyle = backdropCssColor;
      context2d.fillRect(0, 0, sampleCanvas.width, sampleCanvas.height);
      context2d.drawImage(canvas, 0, 0);

      const sample = (u: number, v: number): SampledColor =>
        sampleBlock(context2d, canvas.width, canvas.height, u, v);

      return {
        background: sample(0.5, backgroundSampleY),
        panels: panelEntities.map((panelEntity, index) => {
          const sprite = world.getComponent<SpriteEcsComponent>(
            panelEntity,
            spriteId,
          );

          if (!sprite) {
            throw new Error(`Panel ${index} has no SpriteEcsComponent`);
          }

          return {
            tintAlpha: sprite.tintColor.a,
            color: sample((index + 0.5) / panelEntities.length, 0.5),
          };
        }),
      };
    },
  };
};
