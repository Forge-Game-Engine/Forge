import { describe, expect, it } from 'vitest';
import { resolveRenderTargetFormat } from './resolve-render-target-format';
import { RENDER_TARGET_FORMAT } from '../../enums/index.js';
import type { RenderContext } from '../../render-context.js';

const createRenderContext = (
  supportsHdrRenderTargets: boolean,
): RenderContext => ({ supportsHdrRenderTargets }) as RenderContext;

describe('resolveRenderTargetFormat', () => {
  it('returns ldr unmodified', () => {
    const result = resolveRenderTargetFormat(
      createRenderContext(true),
      RENDER_TARGET_FORMAT.ldr,
    );

    expect(result).toBe(RENDER_TARGET_FORMAT.ldr);
  });

  it('resolves hdr when the render context supports HDR render targets', () => {
    const result = resolveRenderTargetFormat(
      createRenderContext(true),
      RENDER_TARGET_FORMAT.hdr,
    );

    expect(result).toBe(RENDER_TARGET_FORMAT.hdr);
  });

  it('falls back to ldr when the render context does not support HDR render targets', () => {
    const result = resolveRenderTargetFormat(
      createRenderContext(false),
      RENDER_TARGET_FORMAT.hdr,
    );

    expect(result).toBe(RENDER_TARGET_FORMAT.ldr);
  });
});
