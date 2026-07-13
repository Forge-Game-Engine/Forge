import { describe, expect, it, vi } from 'vitest';
import { resolveRenderTargetFormat } from './resolve-render-target-format';
import { RENDER_TARGET_FORMAT } from '../../enums/index.js';

describe('resolveRenderTargetFormat', () => {
  it('returns ldr unmodified without calling gl.getExtension', () => {
    const gl = {
      getExtension: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    const result = resolveRenderTargetFormat(gl, RENDER_TARGET_FORMAT.ldr);

    expect(result).toBe(RENDER_TARGET_FORMAT.ldr);
    expect(gl.getExtension).not.toHaveBeenCalled();
  });

  it('resolves hdr when EXT_color_buffer_float is supported', () => {
    const gl = {
      getExtension: vi.fn().mockReturnValue({}),
    } as unknown as WebGL2RenderingContext;

    const result = resolveRenderTargetFormat(gl, RENDER_TARGET_FORMAT.hdr);

    expect(result).toBe(RENDER_TARGET_FORMAT.hdr);
    expect(gl.getExtension).toHaveBeenCalledWith('EXT_color_buffer_float');
  });

  it('falls back to ldr when EXT_color_buffer_float is unavailable', () => {
    const gl = {
      getExtension: vi.fn().mockReturnValue(null),
    } as unknown as WebGL2RenderingContext;

    const result = resolveRenderTargetFormat(gl, RENDER_TARGET_FORMAT.hdr);

    expect(result).toBe(RENDER_TARGET_FORMAT.ldr);
  });
});
