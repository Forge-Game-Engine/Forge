/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createQuadGeometry } from './create-quad-geometry';

describe('createQuadGeometry', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    gl = {
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STATIC_DRAW: 'STATIC_DRAW',
      FLOAT: 'FLOAT',
      createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  });

  it('builds a unit quad (extents 0.5) by default', () => {
    createQuadGeometry(gl);

    const positions = (gl.bufferData as Mock).mock.calls[0][1] as Float32Array;

    expect(Math.max(...positions)).toBeCloseTo(0.5);
    expect(Math.min(...positions)).toBeCloseTo(-0.5);
  });

  it('builds a quad spanning the requested extents', () => {
    createQuadGeometry(gl, { extents: 1 });

    const positions = (gl.bufferData as Mock).mock.calls[0][1] as Float32Array;

    expect(Math.max(...positions)).toBeCloseTo(1);
    expect(Math.min(...positions)).toBeCloseTo(-1);
  });

  it('returns the cached geometry for the same context and extents', () => {
    const first = createQuadGeometry(gl, { extents: 0.5 });
    const second = createQuadGeometry(gl, { extents: 0.5 });

    expect(second).toBe(first);
    expect(gl.createBuffer).toHaveBeenCalledTimes(2); // position + texCoord, once.
  });

  it('caches different extents separately on the same context', () => {
    const unitQuad = createQuadGeometry(gl, { extents: 0.5 });
    const fullscreenQuad = createQuadGeometry(gl, { extents: 1 });

    expect(unitQuad).not.toBe(fullscreenQuad);
  });
});
