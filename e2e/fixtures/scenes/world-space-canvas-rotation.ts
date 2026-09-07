import {
  addParentComponent,
  addPositionComponent,
  addRotationComponent,
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
} from '../../../src/rendering/index.js';
import {
  createPanel,
  createUiCanvas,
  UiAnchor,
} from '../../../src/ui/index.js';
import { createWhiteSquareImage } from './create-white-square-image.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// A pure, saturated green with no equivalent anywhere else in the scene
// (clear color, panel), so a same-run canvas readback (see
// `measureGreenBarBounds` below - mirrors `camera-pan-zoom.ts`'s
// `measureGreenSquareBounds`) can find it unambiguously.
const barColor = new Color(0, 1, 0, 1);

/** The on-screen pixel bounds of the health bar, or `null` if not found. */
export interface BarBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The handle `world-space-canvas-rotation.spec.ts` drives and asserts against. */
export interface WorldSpaceCanvasRotationSceneHandle extends SceneHandle {
  /** Sets the followed entity's own world rotation, in radians. */
  setParentRotation(radians: number): void;

  /**
   * Scans the canvas's actual displayed bitmap for the health bar's own
   * tint and returns its bounding box, or `null` if no matching pixel is
   * found. Must be called in the same `page.evaluate` task as the
   * preceding `step()` - see `SceneHandle.step` and
   * `camera-pan-zoom.ts`'s `measureGreenSquareBounds` for why.
   */
  measureBarBounds(): BarBounds | null;
}

function isBarColor(r: number, g: number, b: number): boolean {
  return g > 200 && r < 60 && b < 60;
}

/** Scans `data` (an RGBA `ImageData.data`-shaped buffer, `width`x`height`) for the bar's own tint and returns its bounding box, or `null` if no matching pixel is found. */
function findBarPixelBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): BarBounds | null {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;

      if (!isBarColor(data[offset], data[offset + 1], data[offset + 2])) {
        continue;
      }

      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  return Number.isFinite(left) ? { left, right, top, bottom } : null;
}

/**
 * Builds a minimal scene proving `ParentEcsComponent.inheritRotation:
 * false` at the actual rendering layer, not just in ECS state: a
 * world-space UI canvas (a stand-in health bar) parented to a rotating
 * entity, with `inheritRotation: false`. `world-space-canvas-rotation.spec.ts`
 * rotates the parent and asserts the bar's *rendered pixel bounds* stay
 * fixed - catching a regression anywhere between the ECS fix
 * (`composePositionWithParent`) and what actually reaches the screen,
 * which a purely numeric `position.world` assertion could miss (see
 * AGENTS.md's e2e philosophy).
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<WorldSpaceCanvasRotationSceneHandle> => {
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

  const cameraEntity = createCamera(world, {
    isStatic: true,
    clearColor: Color.black,
    // 1 world unit = 1 screen pixel at zoom 1, matching this scene's own
    // pixel-space math below.
    verticalWorldUnits: canvas.height,
  });

  const parent = world.createEntity();

  addPositionComponent(world, parent, { local: { x: 0, y: 0 } });
  const parentRotation = addRotationComponent(world, parent, { local: 0 });

  const healthBarCanvas = createUiCanvas(world, renderContext, time, {
    renderMode: 'worldSpace',
    camera: cameraEntity,
    anchor: UiAnchor.center({ x: 120, y: 30 }),
    anchoredPosition: { x: 0, y: 100 },
  });

  addParentComponent(world, healthBarCanvas, {
    parent,
    inheritRotation: false,
  });

  const barImage = await createWhiteSquareImage();
  const barSprite = createImageSprite(barImage, renderContext, { layer: 1 });

  barSprite.tintColor = barColor;

  createPanel(world, healthBarCanvas, {
    sprite: barSprite,
    anchor: UiAnchor.stretchAll(),
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

    setParentRotation(radians: number): void {
      parentRotation.local = radians;
    },

    measureBarBounds(): BarBounds | null {
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

      return findBarPixelBounds(data, canvas.width, canvas.height);
    },
  };
};
