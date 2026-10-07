import {
  addMaskComponent,
  addPositionComponent,
  addRotationComponent,
  addSpriteComponent,
  Color,
  createCamera,
  createCanvas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTexture,
  createTransformEcsSystem,
  EcsWorld,
  MaskEcsComponent,
  RotationEcsComponent,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// 600 CSS pixels tall (see e2e/fixtures/index.html) over 600 world units, so
// one world unit is one CSS pixel.
const verticalWorldUnits = 600;

const ringSizeInTexels = 256;
const ringDiameter = 240;
export const ringCenter = { x: -160, y: 0 };

const barWidth = 240;
const barHeight = 40;
const barCenter = { x: 160, y: 120 };

const clipSize = 100;
const clipCenter = { x: 160, y: -120 };
const clippedChildWidth = 300;

/** How many pixels of each landmark the camera currently shows. */
export interface MaskRevealMeasurement {
  /** Ring (orange) pixels in each quadrant around the ring's center. */
  ringQuadrants: {
    topLeft: number;
    topRight: number;
    bottomLeft: number;
    bottomRight: number;
  };
  /** The bar's (green) drawn width, in device pixels. */
  barWidth: number;
  /** The clipped child's (magenta) drawn width, in device pixels. */
  clippedChildWidth: number;
}

/**
 * The scene's handle: a ring revealed by a radial mask, a bar revealed by a
 * linear mask, and a wide sprite clipped by its parent's rect mask.
 */
export interface MaskRevealSceneHandle extends SceneHandle {
  /** Drawing-buffer pixels per world unit. */
  readonly devicePixelsPerUnit: number;
  /** The width of the bar and the clipped child's parent, in world units. */
  readonly sizes: { bar: number; clip: number; clippedChild: number };
  /** Sets the ring's radial mask amount. */
  setRingAmount(amount: number): void;
  /** Sets the ring entity's rotation, in radians. */
  setRingRotation(radians: number): void;
  /** Sets the bar's linear mask amount. */
  setBarAmount(amount: number): void;
  /**
   * Counts the landmarks' pixels on the displayed canvas. Must run in the
   * same `page.evaluate` task as the `step()` before it.
   */
  measure(): MaskRevealMeasurement;
}

/**
 * Draws a white ring on a transparent canvas, tinted per sprite.
 * @returns The canvas to upload.
 */
function drawRingSource(): HTMLCanvasElement {
  const source = document.createElement('canvas');

  source.width = ringSizeInTexels;
  source.height = ringSizeInTexels;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.strokeStyle = '#ffffff';
  context.lineWidth = ringSizeInTexels * 0.15;
  context.beginPath();
  context.arc(
    ringSizeInTexels / 2,
    ringSizeInTexels / 2,
    ringSizeInTexels * 0.4,
    0,
    Math.PI * 2,
  );
  context.stroke();

  return source;
}

const isOrange = (r: number, g: number, b: number): boolean =>
  r > 200 && g > 90 && g < 170 && b < 60;
const isGreen = (r: number, g: number, b: number): boolean =>
  r < 60 && g > 200 && b < 60;
const isMagenta = (r: number, g: number, b: number): boolean =>
  r > 200 && g < 60 && b > 200;

/** Tallies each landmark's pixels as a canvas readback is scanned. */
interface PixelTally {
  include(x: number, y: number, r: number, g: number, b: number): void;
  toMeasurement(): MaskRevealMeasurement;
}

/**
 * Creates a tally that sorts ring pixels into quadrants around
 * `(ringCenterX, ringCenterY)` and measures the bar's and the clipped
 * child's drawn widths.
 */
function createPixelTally(
  ringCenterX: number,
  ringCenterY: number,
): PixelTally {
  const ringQuadrants = {
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
  };
  const bar = { left: Infinity, right: -Infinity };
  const child = { left: Infinity, right: -Infinity };

  const includeSpan = (span: typeof bar, x: number): void => {
    span.left = Math.min(span.left, x);
    span.right = Math.max(span.right, x);
  };

  const widthOf = (span: typeof bar): number =>
    span.right >= span.left ? span.right - span.left + 1 : 0;

  const quadrantOf = (x: number, y: number): keyof typeof ringQuadrants => {
    const vertical = y < ringCenterY ? 'top' : 'bottom';

    return x < ringCenterX ? `${vertical}Left` : `${vertical}Right`;
  };

  return {
    include(x, y, r, g, b): void {
      if (isOrange(r, g, b)) {
        ringQuadrants[quadrantOf(x, y)]++;
      } else if (isGreen(r, g, b)) {
        includeSpan(bar, x);
      } else if (isMagenta(r, g, b)) {
        includeSpan(child, x);
      }
    },

    toMeasurement(): MaskRevealMeasurement {
      return {
        ringQuadrants,
        barWidth: widthOf(bar),
        clippedChildWidth: widthOf(child),
      };
    },
  };
}

/**
 * Builds the mask scene. The ring's mask starts at the top and sweeps a
 * full turn clockwise, so at `amount: 0.25` an unrotated ring shows only
 * its top-right quadrant.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): MaskRevealSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.05, 0.1, 0.3),
    verticalWorldUnits,
  });

  const ring = world.createEntity();

  addPositionComponent(world, ring, { local: ringCenter });

  const ringRotation: RotationEcsComponent = addRotationComponent(world, ring);

  addSpriteComponent(world, ring, {
    texture: createTexture(renderContext, drawRingSource()),
    width: ringDiameter,
    height: ringDiameter,
    tintColor: new Color(1, 0.5, 0),
  });

  const ringMask: MaskEcsComponent = addMaskComponent(world, ring, {
    width: ringDiameter,
    height: ringDiameter,
    shape: {
      kind: 'radial',
      startAngle: Math.PI / 2,
      sweep: -Math.PI * 2,
      amount: 1,
    },
  });

  const bar = world.createEntity();

  addPositionComponent(world, bar, { local: barCenter });
  addSpriteComponent(world, bar, {
    texture: renderContext.whiteTexture,
    width: barWidth,
    height: barHeight,
    tintColor: new Color(0, 1, 0),
  });

  const barMask = addMaskComponent(world, bar, {
    width: barWidth,
    height: barHeight,
    shape: { kind: 'linear', origin: 'left', amount: 1 },
  });

  const clip = world.createEntity();

  addPositionComponent(world, clip, { local: clipCenter });
  addMaskComponent(world, clip, { width: clipSize, height: clipSize });

  const clippedChild = world.createEntity();

  addPositionComponent(world, clippedChild);
  world.setParent(clippedChild, clip);
  addSpriteComponent(world, clippedChild, {
    texture: renderContext.whiteTexture,
    width: clippedChildWidth,
    height: 20,
    tintColor: new Color(1, 0, 1),
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

    get devicePixelsPerUnit(): number {
      return renderContext.height / verticalWorldUnits;
    },

    sizes: { bar: barWidth, clip: clipSize, clippedChild: clippedChildWidth },

    setRingAmount(amount: number): void {
      if (ringMask.shape.kind === 'radial') {
        ringMask.shape.amount = amount;
      }
    },

    setRingRotation(radians: number): void {
      ringRotation.local = radians;
    },

    setBarAmount(amount: number): void {
      if (barMask.shape.kind === 'linear') {
        barMask.shape.amount = amount;
      }
    },

    measure(): MaskRevealMeasurement {
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
      const scale = renderContext.height / verticalWorldUnits;
      const ringCenterX = canvas.width / 2 + ringCenter.x * scale;
      const ringCenterY = canvas.height / 2 - ringCenter.y * scale;
      const tally = createPixelTally(ringCenterX, ringCenterY);

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const offset = (y * canvas.width + x) * 4;

          tally.include(x, y, data[offset], data[offset + 1], data[offset + 2]);
        }
      }

      return tally.toMeasurement();
    },
  };
};
