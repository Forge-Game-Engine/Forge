/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../asset-loading/index.js';
import { beginPostProcessPass } from './fullscreen-pass.js';
import { RenderContext } from './render-context.js';
import { RenderTarget } from './render-target.js';
import { ShaderCache } from './shaders/index.js';

describe('beginPostProcessPass', () => {
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;

  beforeEach(() => {
    const canvas = document.createElement('canvas');

    mockGl = {
      createBuffer: vi.fn().mockReturnValue({}),
      createFramebuffer: vi.fn().mockImplementation(() => ({})),
      createTexture: vi.fn().mockImplementation(() => ({})),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn().mockReturnValue(1),
      getParameter: vi.fn().mockReturnValue(null),
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      disable: vi.fn(),
      FRAMEBUFFER: 'FRAMEBUFFER',
      FRAMEBUFFER_BINDING: 'FRAMEBUFFER_BINDING',
      FRAMEBUFFER_COMPLETE: 1,
      COLOR_ATTACHMENT0: 'COLOR_ATTACHMENT0',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
      TEXTURE_2D: 'TEXTURE_2D',
      BLEND: 'BLEND',
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );
  });

  it("returns the target's previous color texture", () => {
    const target = new RenderTarget(renderContext, { width: 64, height: 32 });
    const sceneTexture = target.colorTexture;

    const source = beginPostProcessPass(renderContext, target);

    expect(source).toBe(sceneTexture);
    expect(target.colorTexture).not.toBe(sceneTexture);
  });

  it("binds, sizes and clears the target's other buffer with blending off", () => {
    const target = new RenderTarget(renderContext, { width: 64, height: 32 });

    beginPostProcessPass(renderContext, target);

    expect((mockGl.bindFramebuffer as Mock).mock.lastCall?.[1]).toBe(
      target.framebuffer,
    );
    expect(mockGl.viewport).toHaveBeenLastCalledWith(0, 0, 64, 32);
    expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
    expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
  });

  it('alternates between the two buffers on each call', () => {
    const target = new RenderTarget(renderContext, { width: 64, height: 32 });
    const first = target.colorTexture;

    expect(beginPostProcessPass(renderContext, target)).toBe(first);

    const second = target.colorTexture;

    expect(beginPostProcessPass(renderContext, target)).toBe(second);
    expect(target.colorTexture).toBe(first);
    expect(mockGl.createFramebuffer).toHaveBeenCalledTimes(2);
  });

  it('leaves the latest pass in the buffer that later draws and reads use', () => {
    const target = new RenderTarget(renderContext, { width: 64, height: 32 });

    beginPostProcessPass(renderContext, target);

    const passFramebuffer = (mockGl.bindFramebuffer as Mock).mock
      .lastCall?.[1] as WebGLFramebuffer;
    const passTexture = target.colorTexture;

    // What the render system binds next frame to draw sprites, and what the
    // present system samples, are the buffer the pass just wrote.
    renderContext.bindRenderTarget(target);

    expect((mockGl.bindFramebuffer as Mock).mock.lastCall?.[1]).toBe(
      passFramebuffer,
    );
    expect(target.colorTexture).toBe(passTexture);
  });
});
