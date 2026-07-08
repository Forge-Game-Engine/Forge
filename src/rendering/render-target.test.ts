/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createRenderTarget, RenderTarget } from './render-target';

describe('RenderTarget', () => {
  let gl: WebGL2RenderingContext;
  let framebuffer: WebGLFramebuffer;
  let textures: WebGLTexture[];

  beforeEach(() => {
    framebuffer = {} as WebGLFramebuffer;
    textures = [];

    gl = {
      createFramebuffer: vi.fn().mockReturnValue(framebuffer),
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
      FRAMEBUFFER: 'FRAMEBUFFER',
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      TEXTURE_2D: 'TEXTURE_2D',
    } as unknown as WebGL2RenderingContext;
  });

  describe('constructor', () => {
    it('should create a framebuffer and an attached color texture', () => {
      const target = new RenderTarget(gl, 256, 128);

      expect(gl.createFramebuffer).toHaveBeenCalledTimes(1);
      expect(target.framebuffer).toBe(framebuffer);
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

  describe('dispose', () => {
    it('should delete the framebuffer and color texture', () => {
      const target = new RenderTarget(gl, 256, 128);

      target.dispose(gl);

      expect(gl.deleteFramebuffer).toHaveBeenCalledWith(framebuffer);
      expect(gl.deleteTexture).toHaveBeenCalledWith(target.colorTexture);
    });
  });
});

describe('createRenderTarget', () => {
  it('should create a RenderTarget instance', () => {
    const gl = {
      createFramebuffer: vi.fn().mockReturnValue({} as WebGLFramebuffer),
      createTexture: vi.fn().mockReturnValue({} as WebGLTexture),
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
