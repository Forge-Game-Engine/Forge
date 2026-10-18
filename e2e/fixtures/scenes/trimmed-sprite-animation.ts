import {
  addPositionComponent,
  addSpriteAnimationComponent,
  addSpriteComponent,
  AnimationClip,
  AssetRegistry,
  Color,
  createCamera,
  createCanvas,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createSpriteAnimationEcsSystem,
  createTexture,
  createTextureRegion,
  createTransformEcsSystem,
  EcsWorld,
  spriteId,
  TextureRegion,
  Time,
} from '../../../src/index.js';
import { PixelBounds } from './input-scene-helpers.js';
import { CreateScene, SceneHandle } from './scene.js';

// 600 CSS pixels tall (see e2e/fixtures/index.html) over 600 world units, so
// one world unit is one CSS pixel.
const verticalWorldUnits = 600;

// Every frame is cut from one 32 x 32 texel untrimmed frame, drawn at 0.2
// texels per world unit: a 160 world-unit (CSS pixel) square sprite.
const frameSizeInTexels = 32;
const pixelsPerUnit = 0.2;

// The marker every frame holds at the same place in the untrimmed frame, in
// texels from its top-left. It's off-center so a trimmed frame drawn in
// the wrong place, or stretched to the untrimmed size, moves or resizes it.
const marker = { left: 20, top: 4, size: 8 };
const markerFill = '#00ff40';

// An off-center pivot, so a pivot re-expressed with the wrong Y convention
// (Y-up instead of Y-down) moves trimmed frames vertically.
const pivot = { x: 0.25, y: 0.75 };

/**
 * One packed frame: where its trimmed rect sits in the untrimmed frame, and
 * where it was packed in the atlas texture, both in texels.
 */
interface PackedFrame {
  trim: { left: number; top: number; width: number; height: number };
  atlas: { left: number; top: number };
}

// Frame 0 is untrimmed; frames 1 and 2 are trimmed to different rects, as
// an atlas packer trims transparent borders, and packed side by side.
const packedFrames: PackedFrame[] = [
  {
    trim: { left: 0, top: 0, width: 32, height: 32 },
    atlas: { left: 0, top: 0 },
  },
  {
    trim: { left: 16, top: 0, width: 16, height: 16 },
    atlas: { left: 32, top: 0 },
  },
  {
    trim: { left: 18, top: 2, width: 12, height: 18 },
    atlas: { left: 48, top: 0 },
  },
];
const atlasSize = { width: 64, height: 32 };

const frameDurationMilliseconds = 100;

// The reference sprite and the two animated sprites, left to right.
const spritePositionsX = [-200, 0, 200];

/** Each sprite's marker bounds, left to right; `null` where none is drawn. */
export type TrimmedSpriteMarkerBounds = (PixelBounds | null)[];

/**
 * The scene's handle: a reference sprite showing frame 0 and two sprites
 * playing a clip of differently trimmed frames, one frame apart.
 */
export interface TrimmedSpriteAnimationSceneHandle extends SceneHandle {
  /** How far apart the sprites are, in world units. */
  readonly spriteSpacingInWorldUnits: number;
  /** Drawing-buffer pixels per world unit. */
  readonly devicePixelsPerUnit: number;
  /** The milliseconds each frame of the clip is shown. */
  readonly frameDurationMilliseconds: number;
  /** The index in the clip of the frame each animated sprite shows. */
  readonly animatedFrameIndices: number[];
  /**
   * The instance count of every `drawArraysInstanced` call made during the
   * last `step()` - one entry per instanced draw call.
   */
  readonly lastFrameInstancedDraws: readonly number[];
  /**
   * Scans the displayed canvas for each sprite's marker. Must run in the
   * same `page.evaluate` task as the `step()` before it.
   */
  measureMarkerBounds(): TrimmedSpriteMarkerBounds;
}

/**
 * Draws the atlas: each frame's trimmed rect packed at its atlas position,
 * holding the part of the marker inside it. Everything else is
 * transparent.
 * @returns The canvas to upload.
 */
function drawAtlasSource(): HTMLCanvasElement {
  const source = document.createElement('canvas');

  source.width = atlasSize.width;
  source.height = atlasSize.height;

  const context = source.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.fillStyle = markerFill;

  for (const { trim, atlas } of packedFrames) {
    context.fillRect(
      atlas.left + marker.left - trim.left,
      atlas.top + marker.top - trim.top,
      marker.size,
      marker.size,
    );
  }

  return source;
}

/**
 * Builds a frame's region from its texel rects.
 */
function createFrameRegion({ trim, atlas }: PackedFrame): TextureRegion {
  return createTextureRegion(
    { x: atlas.left / atlasSize.width, y: atlas.top / atlasSize.height },
    { x: trim.width / atlasSize.width, y: trim.height / atlasSize.height },
    {
      offset: {
        x: trim.left / frameSizeInTexels,
        y: trim.top / frameSizeInTexels,
      },
      scale: {
        x: trim.width / frameSizeInTexels,
        y: trim.height / frameSizeInTexels,
      },
    },
  );
}

/**
 * Whether a 0-255 RGB pixel is the marker's green, with a generous
 * tolerance for antialiased edges.
 */
function isMarkerGreen(r: number, g: number, b: number): boolean {
  return g > 180 && r < 80 && b < 140;
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
 * Builds a scene with one atlas texture holding three packed frames of one
 * untrimmed frame, the last two trimmed differently. A reference sprite
 * shows the untrimmed frame; two sprites play all three frames, one frame
 * apart, through the sprite animation system. Every frame holds a marker at
 * the same place in the untrimmed frame, so a correctly drawn trimmed frame
 * puts it exactly where the reference sprite's is. Wraps the context's
 * `drawArraysInstanced` to count the instanced draw calls a frame makes.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): TrimmedSpriteAnimationSceneHandle => {
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

  // Nearest filtering, so no frame samples its packed neighbor's texels.
  const texture = createTexture(renderContext, drawAtlasSource(), {
    filter: 'nearest',
  });
  const frames = packedFrames.map(createFrameRegion);
  const clips = new AssetRegistry<AnimationClip>();
  const clip = new AnimationClip(frames);
  const clipHandle = clips.register('trimmed', clip);
  const spriteSize = frameSizeInTexels / pixelsPerUnit;
  const animatedEntities: number[] = [];

  for (const [index, x] of spritePositionsX.entries()) {
    const entity = world.createEntity();
    const animatedFrameIndex = index - 1;

    addPositionComponent(world, entity, { local: { x, y: 0 } });
    addSpriteComponent(world, entity, {
      texture,
      width: spriteSize,
      height: spriteSize,
      pivot,
      region: frames[Math.max(0, animatedFrameIndex)],
    });

    if (animatedFrameIndex < 0) {
      continue;
    }

    addSpriteAnimationComponent(world, entity, {
      animationClipHandle: clipHandle,
      animationFrameIndex: animatedFrameIndex,
      frameDurationMilliseconds,
    });
    animatedEntities.push(entity);
  }

  world.addSystem(createSpriteAnimationEcsSystem(time, clips));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = frameDurationMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      instancedDraws = [];
      world.update();
      lastFrameInstancedDraws = instancedDraws;
    },

    spriteSpacingInWorldUnits: spritePositionsX[1] - spritePositionsX[0],
    frameDurationMilliseconds,

    get devicePixelsPerUnit(): number {
      return renderContext.height / verticalWorldUnits;
    },

    get animatedFrameIndices(): number[] {
      return animatedEntities.map((entity) =>
        clip.frames.indexOf(
          world.getComponentRequired(entity, spriteId).region,
        ),
      );
    },

    get lastFrameInstancedDraws(): readonly number[] {
      return lastFrameInstancedDraws;
    },

    measureMarkerBounds(): TrimmedSpriteMarkerBounds {
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
      // Each green pixel belongs to the sprite whose marker should be
      // nearest: the marker's center is this far right of the sprite's
      // position, in world units.
      const markerCenterOffset =
        ((marker.left + marker.size / 2) / frameSizeInTexels - pivot.x) *
        spriteSize;
      const devicePixelsPerUnit = renderContext.height / verticalWorldUnits;
      const expectedMarkerCentersX = spritePositionsX.map(
        (x) =>
          canvas.width / 2 + (x + markerCenterOffset) * devicePixelsPerUnit,
      );
      const nearestSprite = (x: number): number => {
        let nearest = 0;

        for (const [index, center] of expectedMarkerCentersX.entries()) {
          if (
            Math.abs(x - center) < Math.abs(x - expectedMarkerCentersX[nearest])
          ) {
            nearest = index;
          }
        }

        return nearest;
      };
      const bounds: TrimmedSpriteMarkerBounds = spritePositionsX.map(
        () => null,
      );

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const offset = (y * canvas.width + x) * 4;

          if (
            !isMarkerGreen(data[offset], data[offset + 1], data[offset + 2])
          ) {
            continue;
          }

          const sprite = nearestSprite(x);

          bounds[sprite] = includePixel(bounds[sprite], x, y);
        }
      }

      return bounds;
    },
  };
};
