/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../asset-loading/index.js';
import { RENDER_TARGET_FORMAT } from './enums/index.js';
import { drawFullscreenQuad } from './fullscreen-pass.js';
import { Geometry } from './geometry/index.js';
import { Material } from './materials/index.js';
import { RenderContext } from './render-context.js';
import { createRenderTarget } from './render-target.js';
import { ForgeShaderSource, ShaderCache } from './shaders/index.js';
import { createTexture } from './texture.js';

let shaderNameCounter = 0;

const createImage = (width: number, height: number): HTMLImageElement => {
  const image = new Image();

  Object.defineProperty(image, 'naturalWidth', { value: width });
  Object.defineProperty(image, 'naturalHeight', { value: height });

  return image;
};

const createShaderSource = (source: string): ForgeShaderSource =>
  new ForgeShaderSource(
    `#pragma forge name(contextLossShader${shaderNameCounter++})\n${source}`,
  );

describe('WebGL context loss', () => {
  let isLost: boolean;
  let gl: WebGL2RenderingContext;
  let canvas: HTMLCanvasElement;
  let renderContext: RenderContext;

  const newHandle = (): object => ({});

  const loseContext = (): Event => {
    isLost = true;

    const event = new Event('webglcontextlost', { cancelable: true });

    canvas.dispatchEvent(event);

    return event;
  };

  const restoreContext = (): void => {
    isLost = false;
    canvas.dispatchEvent(new Event('webglcontextrestored'));
  };

  const createMaterial = (): Material =>
    new Material(
      renderContext,
      createShaderSource('uniform vec4 u_color;\nvoid main() {}'),
      createShaderSource('void main() {}'),
    );

  beforeEach(() => {
    isLost = false;
    gl = {
      createBuffer: vi.fn(newHandle),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      deleteBuffer: vi.fn(),
      createVertexArray: vi.fn(newHandle),
      bindVertexArray: vi.fn(),
      deleteVertexArray: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      createTexture: vi.fn(newHandle),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      deleteTexture: vi.fn(),
      createFramebuffer: vi.fn(newHandle),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn(() => (isLost ? 0 : 'COMPLETE')),
      deleteFramebuffer: vi.fn(),
      getParameter: vi.fn(() => null),
      createShader: vi.fn(newHandle),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => !isLost),
      deleteShader: vi.fn(),
      createProgram: vi.fn(newHandle),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn((_program: WebGLProgram, name: string) => {
        if (isLost) {
          return null;
        }

        return name === 'ACTIVE_UNIFORMS' ? 1 : true;
      }),
      getActiveUniform: vi.fn(() => ({
        name: 'u_color',
        type: 0x8b52 /* FLOAT_VEC4 */,
        size: 1,
      })),
      getUniformLocation: vi.fn(newHandle),
      useProgram: vi.fn(),
      uniform4fv: vi.fn(),
      activeTexture: vi.fn(),
      drawArrays: vi.fn(),
      viewport: vi.fn(),
      getExtension: vi.fn(() => (isLost ? null : {})),
      isContextLost: vi.fn(() => isLost),
      LINK_STATUS: 'LINK_STATUS',
      COMPILE_STATUS: 'COMPILE_STATUS',
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      FRAMEBUFFER: 'FRAMEBUFFER',
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 'COMPLETE',
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      TEXTURE_2D: 'TEXTURE_2D',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STATIC_DRAW: 'STATIC_DRAW',
      RGBA: 'RGBA',
      RGBA16F: 'RGBA16F',
      HALF_FLOAT: 'HALF_FLOAT',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',
      FLOAT: 'FLOAT',
      TRIANGLES: 'TRIANGLES',
    } as unknown as WebGL2RenderingContext;

    canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 150;
    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );
  });

  describe('losing the context', () => {
    it('asks the browser to restore it and raises onContextLost', () => {
      const onLost = vi.fn(() => {
        expect(renderContext.isContextLost).toBe(true);
      });

      renderContext.onContextLost.registerListener(onLost);

      const event = loseContext();

      expect(event.defaultPrevented).toBe(true);
      expect(onLost).toHaveBeenCalledTimes(1);
    });

    it('counts as lost as soon as the WebGL context is, before the event', () => {
      isLost = true;

      expect(renderContext.isContextLost).toBe(true);
    });

    it('stays lost after the WebGL context comes back until the engine has rebuilt it', () => {
      loseContext();
      isLost = false;

      expect(renderContext.isContextLost).toBe(true);
    });
  });

  describe('creating resources while lost', () => {
    beforeEach(() => {
      loseContext();
      vi.clearAllMocks();
    });

    it('creates a texture without touching WebGL, keeping its size', () => {
      const texture = createTexture(renderContext, createImage(4, 2));

      expect(gl.createTexture).not.toHaveBeenCalled();
      expect(gl.texImage2D).not.toHaveBeenCalled();
      expect(texture.glTexture).toBeNull();
      expect(texture.width).toBe(4);
      expect(texture.height).toBe(2);
    });

    it('creates a material without compiling, still validating its uniforms', () => {
      const material = createMaterial();

      expect(gl.createShader).not.toHaveBeenCalled();
      expect(gl.createProgram).not.toHaveBeenCalled();
      expect(() => {
        material.setUniform('u_color', new Float32Array(4));
      }).not.toThrow();
      expect(() => material.setUniform('u_missing', 1)).toThrow('not declared');
      expect(() => material.program).toThrow("hasn't been linked yet");
    });

    it('creates and resizes a render target without touching WebGL', () => {
      const target = createRenderTarget(renderContext, {
        width: 8,
        height: 8,
      });

      target.resize(16, 16);

      expect(gl.createFramebuffer).not.toHaveBeenCalled();
      expect(gl.checkFramebufferStatus).not.toHaveBeenCalled();
      expect(target.framebuffer).toBeNull();
      expect(target.width).toBe(16);
    });

    it('creates geometry without touching WebGL', () => {
      const geometry = new Geometry(renderContext, [
        { name: 'a_position', data: new Float32Array(2), size: 2 },
      ]);

      expect(geometry).toBeInstanceOf(Geometry);
      expect(gl.createBuffer).not.toHaveBeenCalled();
    });

    it('creates an HDR render target as HDR when the context supported it before the loss', () => {
      const target = createRenderTarget(
        renderContext,
        'canvas',
        RENDER_TARGET_FORMAT.hdr,
      );

      expect(target.format).toBe(RENDER_TARGET_FORMAT.hdr);
    });

    it('draws nothing', () => {
      const material = createMaterial();

      drawFullscreenQuad(renderContext, material);

      expect(gl.drawArrays).not.toHaveBeenCalled();
    });
  });

  describe('skipping checks that read GL state', () => {
    it("doesn't throw when a framebuffer reports incomplete because the context was just lost", () => {
      const target = createRenderTarget(renderContext, {
        width: 8,
        height: 8,
      });

      isLost = true;

      expect(() => {
        target.resize(16, 16);
      }).not.toThrow();
    });

    it('still throws for an incomplete framebuffer while the context is alive', () => {
      (gl.checkFramebufferStatus as Mock).mockReturnValue(0);

      expect(() =>
        createRenderTarget(renderContext, { width: 8, height: 8 }),
      ).toThrow('incomplete');
    });
  });

  describe('restoring the context', () => {
    it('re-requests extensions and recreates the instance buffer', () => {
      const previousInstanceBuffer = renderContext.instanceBuffer;

      loseContext();
      vi.clearAllMocks();
      restoreContext();

      expect(gl.getExtension).toHaveBeenCalledWith('EXT_color_buffer_float');
      expect(renderContext.supportsHdrRenderTargets).toBe(true);
      expect(renderContext.instanceBuffer).not.toBe(previousInstanceBuffer);
    });

    it('links programs again, including those first asked for while lost', () => {
      const before = createMaterial();
      const previousProgram = before.program;

      loseContext();

      const during = createMaterial();

      restoreContext();

      expect(before.program).not.toBe(previousProgram);
      expect(during.program).toBeDefined();
      expect(gl.getUniformLocation).toHaveBeenCalledWith(
        during.program,
        'u_color',
      );
    });

    it('re-uploads each texture from the source it keeps', () => {
      const source = createImage(4, 4);
      const texture = createTexture(renderContext, source);

      loseContext();

      const createdWhileLost = createTexture(renderContext, createImage(2, 2));

      vi.clearAllMocks();
      restoreContext();

      expect(gl.createTexture).toHaveBeenCalledTimes(
        // The two above, plus nothing else: no other texture exists yet.
        2,
      );
      expect(texture.glTexture).not.toBeNull();
      expect(createdWhileLost.glTexture).not.toBeNull();
      expect(gl.texImage2D).toHaveBeenCalledWith(
        'TEXTURE_2D',
        0,
        'RGBA',
        'RGBA',
        'UNSIGNED_BYTE',
        source,
      );
    });

    it("doesn't rebuild disposed resources", () => {
      const texture = createTexture(renderContext, createImage(4, 4));
      const target = createRenderTarget(renderContext, {
        width: 8,
        height: 8,
      });

      loseContext();
      texture.dispose();
      target.dispose();
      vi.clearAllMocks();
      restoreContext();

      expect(gl.createTexture).not.toHaveBeenCalled();
      expect(gl.createFramebuffer).not.toHaveBeenCalled();
    });

    it('recreates render targets at their current size, after their textures', () => {
      const target = createRenderTarget(renderContext, {
        width: 8,
        height: 8,
      });

      loseContext();
      target.resize(32, 16);
      vi.clearAllMocks();
      restoreContext();

      expect(target.framebuffer).not.toBeNull();
      expect(gl.texImage2D).toHaveBeenCalledWith(
        'TEXTURE_2D',
        0,
        'RGBA',
        32,
        16,
        0,
        'RGBA',
        'UNSIGNED_BYTE',
        null,
      );
      expect(gl.framebufferTexture2D).toHaveBeenCalledWith(
        'FRAMEBUFFER',
        'COLOR_ATTACHMENT0',
        'TEXTURE_2D',
        target.colorTexture.glTexture,
        0,
      );
    });

    it('re-uploads geometry from its vertex data and makes new vertex arrays', () => {
      const data = new Float32Array([1, 2]);
      const geometry = new Geometry(renderContext, [
        { name: 'a_position', data, size: 2 },
      ]);
      const material = createMaterial();

      geometry.bind(material);
      loseContext();
      vi.clearAllMocks();
      restoreContext();
      geometry.bind(material);

      expect(gl.bufferData).toHaveBeenCalledWith(
        'ARRAY_BUFFER',
        data,
        'STATIC_DRAW',
      );
      expect(gl.createVertexArray).toHaveBeenCalledTimes(1);
    });

    it('raises onContextRestored once everything is rebuilt and draws again', () => {
      const texture = createTexture(renderContext, createImage(4, 4));
      const material = createMaterial();

      loseContext();

      const onRestored = vi.fn(() => {
        expect(renderContext.isContextLost).toBe(false);
        expect(texture.glTexture).not.toBeNull();
      });

      renderContext.onContextRestored.registerListener(onRestored);
      restoreContext();
      drawFullscreenQuad(renderContext, material);

      expect(onRestored).toHaveBeenCalledTimes(1);
      expect(gl.drawArrays).toHaveBeenCalledTimes(1);
    });
  });
});
