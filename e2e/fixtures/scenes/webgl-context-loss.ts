import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addCameraComponent,
  addToneMappingComponent,
  Color,
  createCanvas,
  createImageSprite,
  createPresentEcsSystem,
  createRenderContext,
  createRenderEcsSystem,
  createRenderTarget,
  createSpriteMaterial,
  createTexture,
  createToneMapEcsSystem,
  ForgeShaderSource,
  RENDER_TARGET_FORMAT,
  spriteId,
  Texture,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;

// One world unit is one CSS pixel (see `verticalWorldUnits` below).
const spriteSizeInPixels = 60;
const spriteOffsetInPixels = 80;

// A fragment shader no other material in the scene uses, so the material
// made from it while the context is lost can't reuse an already-linked
// program: its program is first linked by the restore.
const opaqueTextureFragmentShader = `#version 300 es
#pragma forge name(webgl-context-loss-opaque.frag)

precision mediump float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
out vec4 fragColor;

#pragma forge include(spriteMask)

void main() {
  fragColor = vec4(texture(u_texture, v_texCoord).rgb, spriteMaskCoverage());
}
`;

/** An axis-aligned box of pixels, in device pixels from the top-left. */
export interface PixelBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where the scene's two sprites were found on the presented canvas. */
export interface ContextLossMeasurement {
  /** The green sprite, drawn since the scene started. */
  green: PixelBounds | null;

  /** The red sprite, added while the context was lost. */
  red: PixelBounds | null;
}

/** The handle `webgl-context-loss.spec.ts` drives and asserts against. */
export interface ContextLossSceneHandle extends SceneHandle {
  /** Reads back the presented canvas. Call in the same task as `step()`. */
  measure(): ContextLossMeasurement;

  /** Loses the context through `WEBGL_lose_context`. */
  loseContext(): void;

  /** Restores the context through `WEBGL_lose_context`. */
  restoreContext(): void;

  /** `RenderContext.isContextLost`. */
  isContextLost(): boolean;

  /** How many times `onContextLost` and `onContextRestored` were raised. */
  eventCounts(): { lost: number; restored: number };

  /**
   * Adds the red sprite: a texture, a material from a shader pair nothing
   * else uses, and a sprite drawing them. Called while the context is lost.
   */
  addRedSprite(): void;
}

/** Fills a 2D canvas with one color, as a texture's source. */
function createSolidCanvas(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.width = 8;
  canvas.height = 8;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available.');
  }

  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Builds a scene that exercises every kind of GPU resource a lost WebGL
 * context takes with it: a camera rendering into an HDR canvas-sized render
 * target (an extension, a render target, a post-processing pass), tone
 * mapped and presented, and a green sprite whose texture was made from a
 * canvas. `webgl-context-loss.spec.ts` loses and restores the context and
 * checks the same frame is drawn again.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): ContextLossSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 400;
  canvas.height = 300;

  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });
  const { gl } = renderContext;

  // Fetched up front: `getExtension` returns `null` while the context is
  // lost.
  const loseContextExtension = gl.getExtension('WEBGL_lose_context');

  if (!loseContextExtension) {
    throw new Error('WEBGL_lose_context is not available.');
  }

  renderContext.shaderCache.addShader(
    new ForgeShaderSource(opaqueTextureFragmentShader),
  );

  const counts = { lost: 0, restored: 0 };

  renderContext.onContextLost.registerListener(() => {
    counts.lost++;
  });
  renderContext.onContextRestored.registerListener(() => {
    counts.restored++;
  });

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: Color.black,
    verticalWorldUnits: renderContext.cssHeight,
    renderTarget: createRenderTarget(
      renderContext,
      'canvas',
      RENDER_TARGET_FORMAT.hdr,
    ),
  });
  addToneMappingComponent(world, cameraEntity);

  const addSprite = (texture: Texture, x: number): number => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x, y: 0 } });
    world.addComponent(entity, spriteId, {
      ...createImageSprite(texture),
      width: spriteSizeInPixels,
      height: spriteSizeInPixels,
    });

    return entity;
  };

  addSprite(
    createTexture(renderContext, createSolidCanvas('#00ff00')),
    -spriteOffsetInPixels,
  );

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createToneMapEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    measure(): ContextLossMeasurement {
      const { width, height } = renderContext;
      const pixels = new Uint8Array(width * height * 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      const findBounds = (
        matches: (r: number, g: number, b: number) => boolean,
      ): PixelBounds | null => {
        let left = Number.POSITIVE_INFINITY;
        let right = Number.NEGATIVE_INFINITY;
        let top = Number.POSITIVE_INFINITY;
        let bottom = Number.NEGATIVE_INFINITY;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;

            if (!matches(pixels[index], pixels[index + 1], pixels[index + 2])) {
              continue;
            }

            // `readPixels` rows run bottom-up.
            const rowFromTop = height - 1 - y;

            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, rowFromTop);
            bottom = Math.max(bottom, rowFromTop);
          }
        }

        if (left > right) {
          return null;
        }

        return {
          left,
          top,
          width: right - left + 1,
          height: bottom - top + 1,
        };
      };

      return {
        green: findBounds((r, g, b) => g > r + 60 && g > b + 60),
        red: findBounds((r, g, b) => r > g + 60 && r > b + 60),
      };
    },

    loseContext(): void {
      loseContextExtension.loseContext();
    },

    restoreContext(): void {
      loseContextExtension.restoreContext();
    },

    isContextLost(): boolean {
      return renderContext.isContextLost;
    },

    eventCounts(): { lost: number; restored: number } {
      return { ...counts };
    },

    addRedSprite(): void {
      const redSprite = addSprite(
        createTexture(renderContext, createSolidCanvas('#ff0000')),
        spriteOffsetInPixels,
      );

      world.getComponentRequired(redSprite, spriteId).material =
        createSpriteMaterial(renderContext, 'webgl-context-loss-opaque.frag');
    },
  };
};
