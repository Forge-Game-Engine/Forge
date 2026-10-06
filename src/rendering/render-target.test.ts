/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createRenderTarget, RenderTarget } from './render-target';
import { RENDER_TARGET_FORMAT } from './enums/index.js';

// Identity, not deep equality: every mocked GL object is an empty `{}`.
const calledWith = (fn: unknown): unknown[] =>
  (fn as Mock).mock.calls.map(([argument]: unknown[]) => argument);

describe('RenderTarget', () => {
  let gl: WebGL2RenderingContext;
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
    } as unknown as WebGL2RenderingContext;
  });

  describe('constructor', () => {
    it('should create a framebuffer and an attached color texture', () => {
      const target = new RenderTarget(gl, 256, 128);

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);
      expect(target.framebuffer).toBe(framebuffers[0]);
      expect(target.colorTexture).toBe(textures[0]);
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

      const target = new RenderTarget(gl, 256, 128);

      expect(target).toBeDefined();
      expect(gl.bindFramebuffer).toHaveBeenLastCalledWith(
        gl.FRAMEBUFFER,
        previousFramebuffer,
      );
    });

    it('should throw when the framebuffer is incomplete', () => {
      (gl.checkFramebufferStatus as Mock).mockReturnValue(0x8cd6); // FRAMEBUFFER_INCOMPLETE_ATTACHMENT

      expect(() => new RenderTarget(gl, 256, 128)).toThrow(
        /Render target framebuffer is incomplete/,
      );
    });
  });

  describe('format', () => {
    it('defaults to ldr without calling gl.getExtension', () => {
      const target = new RenderTarget(gl, 256, 128);

      expect(target.format).toBe(RENDER_TARGET_FORMAT.ldr);
      expect(gl.getExtension).not.toHaveBeenCalled();
    });

    it('resolves to hdr when requested and supported', () => {
      const target = new RenderTarget(gl, 256, 128, RENDER_TARGET_FORMAT.hdr);

      expect(target.format).toBe(RENDER_TARGET_FORMAT.hdr);
      expect(gl.getExtension).toHaveBeenCalledWith('EXT_color_buffer_float');
    });

    it('falls back to ldr when hdr is requested but unsupported', () => {
      (gl.getExtension as Mock).mockReturnValue(null);

      const target = new RenderTarget(gl, 256, 128, RENDER_TARGET_FORMAT.hdr);

      expect(target.format).toBe(RENDER_TARGET_FORMAT.ldr);
    });

    it('preserves the resolved format across resize', () => {
      const target = new RenderTarget(gl, 256, 128, RENDER_TARGET_FORMAT.hdr);

      target.resize(gl, 512, 256);

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
      const target = new RenderTarget(gl, 256, 128);
      const oldTexture = target.colorTexture;

      target.resize(gl, 512, 256);

      expect(gl.deleteTexture).toHaveBeenCalledWith(oldTexture);
      expect(target.colorTexture).toBe(textures[1]);
      expect(target.width).toBe(512);
      expect(target.height).toBe(256);
    });

    it('should throw when width or height are not positive', () => {
      const target = new RenderTarget(gl, 256, 128);

      expect(() => target.resize(gl, 0, 100)).toThrow(
        'Render target dimensions must be positive numbers.',
      );
      expect(() => target.resize(gl, 100, -1)).toThrow(
        'Render target dimensions must be positive numbers.',
      );
    });
  });

  describe('swapBuffers', () => {
    it('allocates the second buffer only on first use', () => {
      const target = new RenderTarget(gl, 256, 128);

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);

      target.swapBuffers(gl);

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
      expect(gl.framebufferTexture2D).toHaveBeenLastCalledWith(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        textures[1],
        0,
      );

      target.swapBuffers(gl);

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
      expect(gl.createTexture).toHaveBeenCalledTimes(2);
    });

    it('allocates the second buffer at the same size and format', () => {
      const target = new RenderTarget(gl, 256, 128, RENDER_TARGET_FORMAT.hdr);

      (gl.texImage2D as Mock).mockClear();

      target.swapBuffers(gl);

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
      const target = new RenderTarget(gl, 256, 128);

      const first = target.swapBuffers(gl);

      expect(first).toBe(textures[0]);
      expect(target.colorTexture).toBe(textures[1]);
      expect(target.framebuffer).toBe(framebuffers[1]);

      const second = target.swapBuffers(gl);

      expect(second).toBe(textures[1]);
      expect(target.colorTexture).toBe(textures[0]);
      expect(target.framebuffer).toBe(framebuffers[0]);
    });

    it('resizes both buffers once the second is allocated', () => {
      const target = new RenderTarget(gl, 256, 128);

      target.swapBuffers(gl);
      target.resize(gl, 512, 256);

      expect(calledWith(gl.deleteTexture)).toContain(textures[0]);
      expect(calledWith(gl.deleteTexture)).toContain(textures[1]);
      expect(target.colorTexture).toBe(textures[2]);

      const other = target.swapBuffers(gl);

      expect(other).toBe(textures[2]);
      expect(target.colorTexture).toBe(textures[3]);
      expect(gl.createFramebuffer).toHaveBeenCalledTimes(2);
    });
  });

  describe('dispose', () => {
    it('should delete the framebuffer and color texture', () => {
      const target = new RenderTarget(gl, 256, 128);

      target.dispose(gl);

      expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(1);
      expect(calledWith(gl.deleteFramebuffer)).toContain(framebuffers[0]);
      expect(gl.deleteTexture).toHaveBeenCalledWith(target.colorTexture);
    });

    it('deletes both buffers once the second is allocated', () => {
      const target = new RenderTarget(gl, 256, 128);

      target.swapBuffers(gl);
      target.dispose(gl);

      expect(calledWith(gl.deleteFramebuffer)).toContain(framebuffers[0]);
      expect(calledWith(gl.deleteFramebuffer)).toContain(framebuffers[1]);
      expect(calledWith(gl.deleteTexture)).toContain(textures[0]);
      expect(calledWith(gl.deleteTexture)).toContain(textures[1]);
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

    const target = createRenderTarget(gl, 100, 100);

    expect(target).toBeInstanceOf(RenderTarget);
    expect(target.width).toBe(100);
    expect(target.height).toBe(100);
  });
});
