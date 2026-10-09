import {
  Color,
  createCamera,
  createCanvas,
  createRenderContext,
  createTexture,
  EcsWorld,
  RenderContext,
  RenderTarget,
  Texture,
  TextureOptions,
  Time,
} from '../../src/index.js';
import { withDefaults } from '../../src/utilities/with-defaults.js';
import type { SceneHandle } from '../fixtures/scenes/scene.js';

/**
 * Every golden image is this size, in CSS pixels, at a device pixel ratio
 * of `1`: small enough to keep the reference images small in the
 * repository, large enough to show the feature.
 */
export const goldenCanvasSize = { width: 320, height: 240 } as const;

/** The fixed time each `step()` advances by, so animated state is repeatable. */
export const goldenStepMilliseconds = 1000 / 60;

/** What every golden scene starts from. */
export interface GoldenSceneContext {
  /** The scene's world. Systems are added by the scene. */
  world: EcsWorld;

  /** The time driving `world`, advanced only by `step()`. */
  time: Time;

  /** The golden canvas, `goldenCanvasSize` in CSS pixels. */
  canvas: HTMLCanvasElement;

  /**
   * A render context that keeps its drawing buffer after a frame is
   * presented, so the canvas can be captured after `step()` returns.
   */
  renderContext: RenderContext;
}

/**
 * Creates the canvas, render context, world and time a golden scene draws
 * with.
 * @param container - The element the scene's canvas goes in.
 * @returns The scene's context.
 */
export function createGoldenSceneContext(
  container: HTMLElement,
): GoldenSceneContext {
  const canvas = createCanvas(
    container,
    'forge-canvas',
    goldenCanvasSize.width,
    goldenCanvasSize.height,
  );
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  return { world: new EcsWorld(), time: new Time(), canvas, renderContext };
}

/** Options for {@link createGoldenCamera}. */
export interface GoldenCameraOptions {
  /** The color the camera clears to. */
  clearColor: Color;

  /** Where the camera renders, instead of the canvas. */
  renderTarget?: RenderTarget;

  /** Which categories the camera draws (default: all). */
  cullingMask?: number;
}

/**
 * Creates a static camera at the origin that shows one world unit per CSS
 * pixel, so a scene places things in canvas pixels from the center, Y-up.
 * @param context - The scene's context.
 * @param options - The camera's clear color and render target.
 * @returns The camera's entity.
 */
export function createGoldenCamera(
  context: GoldenSceneContext,
  options: GoldenCameraOptions,
): number {
  return createCamera(context.world, {
    isStatic: true,
    verticalWorldUnits: context.renderContext.cssHeight,
    ...options,
  });
}

/**
 * Returns the handle every golden scene gives the harness: `step()` advances
 * the world by a fixed time, whatever delta it's called with, so each frame
 * of a golden scene is the same on every run.
 * @param context - The scene's context.
 * @returns The scene's handle.
 */
export function createGoldenSceneHandle(
  context: GoldenSceneContext,
): SceneHandle {
  let clockInMilliseconds = 0;

  return {
    step(): void {
      clockInMilliseconds += goldenStepMilliseconds;
      context.time.update(clockInMilliseconds);
      context.world.update();
    },
  };
}

const defaultComputedTextureOptions: Partial<TextureOptions> = {
  filter: 'nearest',
};

/** One texel's color, `0`-`255` per channel, straight alpha. */
export type Texel = readonly [r: number, g: number, b: number, a: number];

/**
 * Creates a texture from texels computed in code. Golden scenes use these
 * instead of image files: a decoded PNG can carry color-space chunks
 * (`gAMA`, `cHRM`, `iCCP`) that the browser applies on upload, which would
 * make a golden depend on how images are uploaded rather than on how they
 * are drawn.
 * @param renderContext - The render context to create the texture in.
 * @param width - The texture's width, in texels.
 * @param height - The texture's height, in texels.
 * @param texelAt - The color of the texel at column `x` and row `y`, with
 * row `0` at the top.
 * @param options - How the texture is sampled (default: nearest, clamped).
 * @returns The texture.
 */
export function createComputedTexture(
  renderContext: RenderContext,
  width: number,
  height: number,
  texelAt: (x: number, y: number) => Texel,
  options: Partial<TextureOptions> = {},
): Texture {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels.set(texelAt(x, y), (y * width + x) * 4);
    }
  }

  return createTexture(
    renderContext,
    new ImageData(pixels, width, height),
    withDefaults(defaultComputedTextureOptions, options),
  );
}
