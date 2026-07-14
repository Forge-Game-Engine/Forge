/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PingPongTarget } from './ping-pong-target';
import { RENDER_TARGET_FORMAT } from './enums/index.js';

describe('PingPongTarget', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = {
      createFramebuffer: vi.fn().mockReturnValue({}),
      createTexture: vi.fn().mockImplementation(() => ({}) as WebGLTexture),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
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

  it('should start with two distinct read and write targets', () => {
    const pingPong = new PingPongTarget(gl, 128, 128);

    expect(pingPong.read).not.toBe(pingPong.write);
  });

  it('should swap read and write targets', () => {
    const pingPong = new PingPongTarget(gl, 128, 128);
    const initialRead = pingPong.read;
    const initialWrite = pingPong.write;

    pingPong.swap();

    expect(pingPong.read).toBe(initialWrite);
    expect(pingPong.write).toBe(initialRead);
  });

  it('should swap back to the original targets after two swaps', () => {
    const pingPong = new PingPongTarget(gl, 128, 128);
    const initialRead = pingPong.read;
    const initialWrite = pingPong.write;

    pingPong.swap();
    pingPong.swap();

    expect(pingPong.read).toBe(initialRead);
    expect(pingPong.write).toBe(initialWrite);
  });

  it('should resize both underlying targets', () => {
    const pingPong = new PingPongTarget(gl, 128, 128);

    pingPong.resize(gl, 64, 64);

    expect(pingPong.read.width).toBe(64);
    expect(pingPong.read.height).toBe(64);
    expect(pingPong.write.width).toBe(64);
    expect(pingPong.write.height).toBe(64);
  });

  it('should dispose both underlying targets', () => {
    const pingPong = new PingPongTarget(gl, 128, 128);

    pingPong.dispose(gl);

    expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(2);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
  });

  it('defaults both underlying targets to ldr', () => {
    const pingPong = new PingPongTarget(gl, 128, 128);

    expect(pingPong.read.format).toBe(RENDER_TARGET_FORMAT.ldr);
    expect(pingPong.write.format).toBe(RENDER_TARGET_FORMAT.ldr);
  });

  it('forwards the requested format to both underlying targets', () => {
    const pingPong = new PingPongTarget(gl, 128, 128, RENDER_TARGET_FORMAT.hdr);

    expect(pingPong.read.format).toBe(RENDER_TARGET_FORMAT.hdr);
    expect(pingPong.write.format).toBe(RENDER_TARGET_FORMAT.hdr);
  });
});
