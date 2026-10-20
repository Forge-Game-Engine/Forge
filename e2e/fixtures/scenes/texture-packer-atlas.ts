import atlasDataUrl from '../assets/texture-packer-atlas/atlas.json?url';
import atlasImageUrl from '../assets/texture-packer-atlas/atlas.png';
import {
  addPositionComponent,
  addSpriteComponent,
  Color,
  createAtlasSprite,
  createCamera,
  createCanvas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createTransformEcsSystem,
  EcsWorld,
  TextureAtlasCache,
  Time,
} from '../../../src/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// 600 CSS pixels tall (see e2e/fixtures/index.html) over 600 world units, so
// one world unit is one CSS pixel.
const verticalWorldUnits = 600;

// Every texel is drawn as a 6 x 6 block of CSS pixels, so texel edges land
// on pixel edges and nearest filtering samples each texel's center.
const pixelsPerUnit = 1 / 6;

// Both frames are cut from the same 32 x 32 texel source art: a green
// marker off the frame's center, on transparency. `hero_idle_0` is packed
// trimmed to the marker, `hero_idle_ref` untrimmed. These are the values
// atlas.json gives each frame.
const sourceSize = 32;

interface FrameLayout {
  readonly name: string;
  readonly position: { x: number; y: number };
  /** The frame's pivot, as atlas.json writes it (Y-down). */
  readonly pivot: { x: number; y: number };
}

const trimmedFrame: FrameLayout = {
  name: 'hero_idle_0',
  position: { x: -160, y: 100 },
  pivot: { x: 0.5, y: 1 },
};

const referenceFrame: FrameLayout = {
  name: 'hero_idle_ref',
  position: { x: 160, y: 0 },
  pivot: { x: 0.5, y: 0.5 },
};

/** An on-screen rect, in device pixels of the canvas. */
export interface PixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Where one frame's untrimmed bounds should start on screen. */
export interface PixelOrigin {
  left: number;
  top: number;
}

/** What the scene measured for each frame. */
export interface FrameMeasurement {
  /**
   * The top-left corner of the untrimmed frame, from the sprite's position
   * and the file's pivot and source size, in device pixels.
   */
  expectedFrameOrigin: PixelOrigin;
  /** The green marker's bounds, read back from the canvas. */
  markerBounds: PixelBounds | null;
}

/**
 * The scene's handle: one trimmed and one untrimmed frame of a TexturePacker
 * atlas, loaded through `TextureAtlasCache` and drawn by name.
 */
export interface TexturePackerAtlasSceneHandle extends SceneHandle {
  /**
   * The instance count of every `drawArraysInstanced` call made during the
   * last `step()` - one entry per instanced draw call.
   */
  readonly lastFrameInstancedDraws: readonly number[];
  /**
   * Measures both frames. Must run in the same `page.evaluate` task as the
   * `step()` before it.
   */
  measureFrames(): { trimmed: FrameMeasurement; reference: FrameMeasurement };
}

const isGreenish = (red: number, green: number, blue: number): boolean =>
  green > 150 && red < 120 && blue < 120;

/**
 * Builds a scene that loads a committed TexturePacker "JSON (Hash)" atlas
 * with `TextureAtlasCache` and draws a trimmed frame (`hero_idle_0`) and an
 * untrimmed frame of the same source art (`hero_idle_ref`) by name with
 * `createAtlasSprite`, consecutive in draw order. Wraps the context's
 * `drawArraysInstanced` to count a frame's instanced draw calls.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle, once the atlas has loaded.
 */
export const createScene: CreateScene = async (
  container: HTMLElement,
): Promise<TexturePackerAtlasSceneHandle> => {
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

  const atlas = await new TextureAtlasCache(renderContext).getOrLoad(
    { dataUrl: atlasDataUrl, imageUrl: atlasImageUrl },
    { filter: 'nearest' },
  );

  for (const { name, position } of [trimmedFrame, referenceFrame]) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addSpriteComponent(
      world,
      entity,
      createAtlasSprite(atlas, name, { pixelsPerUnit }),
    );
  }

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  const devicePixelsPerUnit = renderContext.height / verticalWorldUnits;
  const frameSizeInWorldUnits = sourceSize / pixelsPerUnit;

  const expectedFrameOrigin = ({
    position,
    pivot,
  }: FrameLayout): PixelOrigin => ({
    left:
      canvas.width / 2 +
      (position.x - pivot.x * frameSizeInWorldUnits) * devicePixelsPerUnit,
    top:
      canvas.height / 2 +
      (position.y - pivot.y * frameSizeInWorldUnits) * devicePixelsPerUnit,
  });

  /** Scans the columns from `startX` to `endX` for the green marker. */
  const measureMarker = (
    data: Uint8ClampedArray,
    startX: number,
    endX: number,
  ): PixelBounds | null => {
    let bounds: PixelBounds | null = null;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = startX; x < endX; x++) {
        const offset = (y * canvas.width + x) * 4;

        if (!isGreenish(data[offset], data[offset + 1], data[offset + 2])) {
          continue;
        }

        bounds = bounds ?? { left: x, top: y, right: x, bottom: y };
        bounds.left = Math.min(bounds.left, x);
        bounds.right = Math.max(bounds.right, x);
        bounds.top = Math.min(bounds.top, y);
        bounds.bottom = Math.max(bounds.bottom, y);
      }
    }

    return bounds;
  };

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      instancedDraws = [];
      world.update();
      lastFrameInstancedDraws = instancedDraws;
    },

    get lastFrameInstancedDraws(): readonly number[] {
      return lastFrameInstancedDraws;
    },

    measureFrames() {
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
      const middle = Math.floor(canvas.width / 2);

      return {
        trimmed: {
          expectedFrameOrigin: expectedFrameOrigin(trimmedFrame),
          markerBounds: measureMarker(data, 0, middle),
        },
        reference: {
          expectedFrameOrigin: expectedFrameOrigin(referenceFrame),
          markerBounds: measureMarker(data, middle, canvas.width),
        },
      };
    },
  };
};
