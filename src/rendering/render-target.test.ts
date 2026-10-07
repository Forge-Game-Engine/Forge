/* eslint-disable @typescript-eslint/naming-convention */
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../asset-loading/index.js';
import { RENDER_TARGET_FORMAT } from './enums/index.js';
import { RenderContext } from './render-context.js';
import { createRenderTarget, RenderTarget } from './render-target';
import { ShaderCache } from './shaders/index.js';

// Identity, not deep equality: every mocked GL object is an empty `{}`.
const calledWith = (fn: unknown): unknown[] =>
  (fn as Mock).mock.calls.map(([argument]: unknown[]) => argument);

describe('RenderTarget', () => {
  let gl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let framebuffers: WebGLFramebuffer[];
  let textures: WebGLTexture[];

  beforeEach(() => {
    framebuffers = [];
    textures = [];

    gl = {
      createFramebuffer: vi.fn().mockImplementation(() => {
        const framebuffer = {} as WebGLFramebuffer;

        framebuffers.push(framebuffer);

        return framebuffer;
      }),
      createTexture: vi.fn().mockImplementation(() => {
        const texture = {} as WebGLTexture;

        textures.push(texture);

        return texture;
      }),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1), // FRAMEBUFFER_COMPLETE
      getParameter: vi.fn().mockReturnValue(null),
      deleteFramebuffer: vi.fn(),
      deleteTexture: vi.fn(),
      getExtension: vi.fn().mockReturnValue({}),
      FRAMEBUFFER: 'FRAMEBUFFER',
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      TEXTURE_2D: 'TEXTURE_2D',
      RGBA16F: 'RGBA16F',
      HALF_FLOAT: 'HALF_FLOAT',
      createBuffer: vi.fn().mockReturnValue({}),
      viewport: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    const canvas = document.createElement('canvas');

    canvas.width = 300;
    canvas.height = 150;
    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create a framebuffer and an attached color texture', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);
      expect(target.framebuffer).toBe(framebuffers[0]);
      expect(target.colorTexture.glTexture).toBe(textures[0]);
      expect(target.width).toBe(256);
      expect(target.height).toBe(128);
      expect(gl.framebufferTexture2D).toHaveBeenCalledWith(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        textures[0],
        0,
      );
    });

    it('should restore the previously bound framebuffer after attaching', () => {
      const previousFramebuffer = {} as WebGLFramebuffer;

      (gl.getParameter as Mock).mockReturnValue(previousFramebuffer);

      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      expect(target).toBeDefined();
      expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(
        gl.FRAMEBUFFER,
        previousFramebuffer,
      );
    });

    it('should throw when the framebuffer is incomplete', () => {
      (gl.checkFramebufferStatus as Mock).mockReturnValue(0x8cd6); // FRAMEBUFFER_INCOMPLETE_ATTACHMENT

      expect(
        () => new RenderTarget(renderContext, { width: 256, height: 128 }),
      ).toThrow(/Render target framebuffer is incomplete/);
    });
  });

  describe('colorTexture', () => {
    it('throws when the color texture is disposed, since the target owns it', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      expect(() => target.colorTexture.dispose()).toThrow(
        /belongs to its render target/,
      );
      expect(gl.deleteTexture).not.toHaveBeenCalled();
    });

    it('throws when the color texture is updated, since the target owns it', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      (gl.texImage2D as Mock).mockClear();

      expect(() =>
        target.colorTexture.update({} as unknown as TexImageSource),
      ).toThrow(/belongs to its render target/);
      expect(gl.texImage2D).not.toHaveBeenCalled();
    });
  });

  describe('format', () => {
    it('defaults to ldr without calling gl.getExtension', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      expect(target.format).toBe(RENDER_TARGET_FORMAT.ldr);
      expect(gl.getExtension).not.toHaveBeenCalled();
    });

    it('resolves to hdr when requested and supported', () => {
      const target = new RenderTarget(
        renderContext,
        { width: 256, height: 128 },
        RENDER_TARGET_FORMAT.hdr,
      );

      expect(target.format).toBe(RENDER_TARGET_FORMAT.hdr);
      expect(gl.getExtension).toHaveBeenCalledWith('EXT_color_buffer_float');
    });

    it('falls back to ldr when hdr is requested but unsupported', () => {
      (gl.getExtension as Mock).mockReturnValue(null);

      const target = new RenderTarget(
        renderContext,
        { width: 256, height: 128 },
        RENDER_TARGET_FORMAT.hdr,
      );

      expect(target.format).toBe(RENDER_TARGET_FORMAT.ldr);
    });

    it('preserves the resolved format across resize', () => {
      const target = new RenderTarget(
        renderContext,
        { width: 256, height: 128 },
        RENDER_TARGET_FORMAT.hdr,
      );

      target.resize(512, 256);

      expect(target.format).toBe(RENDER_TARGET_FORMAT.hdr);
      expect(gl.texImage2D).toHaveBeenLastCalledWith(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        512,
        256,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null,
      );
    });
  });

  describe('resize', () => {
    it('should delete the old texture and create a new one at the new size', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });
      const oldTexture = target.colorTexture;
      const oldGlTexture = oldTexture.glTexture;

      target.resize(512, 256);

      expect(gl.deleteTexture).toHaveBeenCalledWith(oldGlTexture);
      expect(() => oldTexture.glTexture).toThrow(/disposed/);
      expect(target.colorTexture.glTexture).toBe(textures[1]);
      expect(target.width).toBe(512);
      expect(target.height).toBe(256);
    });

    it('should throw for a canvas-sized target', () => {
      const target = new RenderTarget(renderContext, 'canvas');

      expect(() => target.resize(512, 256)).toThrow(
        /canvas-sized render target follows its render context/,
      );
    });

    it('should throw when width or height are not positive', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      expect(() => target.resize(0, 100)).toThrow(
        'Render target dimensions must be positive numbers.',
      );
      expect(() => target.resize(100, -1)).toThrow(
        'Render target dimensions must be positive numbers.',
      );
    });
  });

  describe('swapBuffers', () => {
    it('allocates the second buffer only on first use', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);

      target.swapBuffers();

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
      expect(gl.framebufferTexture2D).toHaveBeenLastCalledWith(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        textures[1],
        0,
      );

      target.swapBuffers();

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
      expect(gl.createTexture).toHaveBeenCalledTimes(2);
    });

    it('allocates the second buffer at the same size and format', () => {
      const target = new RenderTarget(
        renderContext,
        { width: 256, height: 128 },
        RENDER_TARGET_FORMAT.hdr,
      );

      (gl.texImage2D as Mock).mockClear();

      target.swapBuffers();

      expect(gl.texImage2D).toHaveBeenCalledWith(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        256,
        128,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null,
      );
    });

    it('returns the previous color texture and makes the other buffer current', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      const first = target.swapBuffers();

      expect(first.glTexture).toBe(textures[0]);
      expect(target.colorTexture.glTexture).toBe(textures[1]);
      expect(target.framebuffer).toBe(framebuffers[1]);

      const second = target.swapBuffers();

      expect(second.glTexture).toBe(textures[1]);
      expect(target.colorTexture.glTexture).toBe(textures[0]);
      expect(target.framebuffer).toBe(framebuffers[0]);
    });

    it('resizes both buffers once the second is allocated', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      target.swapBuffers();
      target.resize(512, 256);

      expect(calledWith(gl.deleteTexture)).toContain(textures[0]);
      expect(calledWith(gl.deleteTexture)).toContain(textures[1]);
      expect(target.colorTexture.glTexture).toBe(textures[2]);

      const other = target.swapBuffers();

      expect(other.glTexture).toBe(textures[2]);
      expect(target.colorTexture.glTexture).toBe(textures[3]);
      expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
    });
  });

  describe('dispose', () => {
    it('should delete the framebuffer and color texture', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });
      const glTexture = target.colorTexture.glTexture;

      target.dispose();

      expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(1);
      expect(calledWith(gl.deleteFramebuffer)).toContain(framebuffers[0]);
      expect(gl.deleteTexture).toHaveBeenCalledWith(glTexture);
    });

    it('deletes both buffers once the second is allocated', () => {
      const target = new RenderTarget(renderContext, {
        width: 256,
        height: 128,
      });

      target.swapBuffers();
      target.dispose();

      expect(calledWith(gl.deleteFramebuffer)).toContain(framebuffers[0]);
      expect(calledWith(gl.deleteFramebuffer)).toContain(framebuffers[1]);
      expect(calledWith(gl.deleteTexture)).toContain(textures[0]);
      expect(calledWith(gl.deleteTexture)).toContain(textures[1]);
    });
  });

  describe('canvas-sized', () => {
    it("starts at the render context's drawing-buffer size", () => {
      const target = new RenderTarget(renderContext, 'canvas');

      expect(target.width).toBe(renderContext.width);
      expect(target.height).toBe(renderContext.height);
    });

    for (const devicePixelRatio of [1, 2]) {
      it(`follows the render context's drawing buffer at a pixel ratio of ${devicePixelRatio}`, () => {
        const target = new RenderTarget(renderContext, 'canvas');

        target.swapBuffers();
        renderContext.resize(400, 200, devicePixelRatio);

        expect(target.width).toBe(400 * devicePixelRatio);
        expect(target.height).toBe(200 * devicePixelRatio);
        // texImage2D(target, level, internalFormat, width, height, ...)
        expect((gl.texImage2D as Mock).mock.lastCall?.slice(3, 5)).toEqual([
          400 * devicePixelRatio,
          200 * devicePixelRatio,
        ]);
        // Both color buffers were reallocated.
        expect(calledWith(gl.deleteTexture)).toContain(textures[0]);
        expect(calledWith(gl.deleteTexture)).toContain(textures[1]);
      });
    }

    it('leaves fixed-size targets alone when the render context resizes', () => {
      const target = new RenderTarget(renderContext, {
        width: 64,
        height: 32,
      });

      renderContext.resize(400, 200, 2);

      expect(target.width).toBe(64);
      expect(target.height).toBe(32);
      expect(gl.deleteTexture).not.toHaveBeenCalled();
    });

    it("isn't touched when the drawing buffer keeps its size", () => {
      const target = new RenderTarget(renderContext, 'canvas');

      (gl.texImage2D as Mock).mockClear();
      renderContext.resize(renderContext.cssWidth, renderContext.cssHeight, 1);

      expect(target.width).toBe(300);
      expect(gl.texImage2D).not.toHaveBeenCalled();
    });

    it('stops following the render context once disposed', () => {
      const target = new RenderTarget(renderContext, 'canvas');

      target.dispose();
      (gl.texImage2D as Mock).mockClear();
      renderContext.resize(400, 200, 1);

      expect(target.width).toBe(300);
      expect(gl.texImage2D).not.toHaveBeenCalled();
    });
  });
});

describe('createRenderTarget', () => {
  it('should create a RenderTarget instance', () => {
    const gl = {
      createFramebuffer: vi.fn().mockReturnValue({}),
      createTexture: vi.fn().mockReturnValue({}),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      FRAMEBUFFER: 'FRAMEBUFFER',
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      TEXTURE_2D: 'TEXTURE_2D',
    } as unknown as WebGL2RenderingContext;
    const renderContext = { gl } as RenderContext;

    const target = createRenderTarget(renderContext, {
      width: 100,
      height: 100,
    });

    expect(target).toBeInstanceOf(RenderTarget);
    expect(target.width).toBe(100);
    expect(target.height).toBe(100);
  });

  it('should throw for a non-positive fixed size', () => {
    const renderContext = {} as RenderContext;

    expect(() =>
      createRenderTarget(renderContext, { width: 0, height: 100 }),
    ).toThrow('Render target dimensions must be positive numbers.');
  });
});
