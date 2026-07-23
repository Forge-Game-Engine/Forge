/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createTerrainMesh } from './create-terrain-mesh';
import { buildTerrainCurve } from './terrain-curve';
import { ImageCache } from '../../asset-loading/index.js';
import { Vector2 } from '../../math/index.js';
import { Color } from '../color.js';
import { RenderContext } from '../render-context.js';
import { ForgeShaderSource, ShaderCache } from '../shaders/index.js';
import { terrainFragmentShader, terrainVertexShader } from './shaders/index';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

describe('createTerrainMesh', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let fillImage: HTMLImageElement;
  let borderImage: HTMLImageElement;

  const createOptions = (
    overrides: Partial<Parameters<typeof createTerrainMesh>[1]> = {},
  ) => ({
    curvePoints: buildTerrainCurve(
      [new Vector2(0, 0), new Vector2(10, 5), new Vector2(20, 0)],
      4,
    ),
    depth: 50,
    position: Vector2.zero,
    angle: 0,
    border: {
      image: borderImage,
      tileSize: new Vector2(20, 20),
      tint: Color.white,
    },
    fill: {
      image: fillImage,
      tileSize: new Vector2(30, 30),
      tint: Color.white,
    },
    borderWidth: 10,
    ...overrides,
  });

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    fillImage = { width: 32, height: 32 } as HTMLImageElement;
    borderImage = { width: 32, height: 32 } as HTMLImageElement;

    mockGl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      COMPILE_STATUS: 'COMPILE_STATUS',
      LINK_STATUS: 'LINK_STATUS',
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      TEXTURE0: 0,
      TEXTURE_2D: 'TEXTURE_2D',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      STATIC_DRAW: 'STATIC_DRAW',
      CLAMP_TO_EDGE: 'CLAMP_TO_EDGE',
      REPEAT: 'REPEAT',
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      LINEAR: 'LINEAR',
      RGBA: 'RGBA',
      UNSIGNED_BYTE: 'UNSIGNED_BYTE',

      createBuffer: vi.fn().mockReturnValue({}),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),

      createTexture: vi.fn().mockImplementation(() => new WebGLTexture()),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),

      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getShaderInfoLog: vi.fn().mockReturnValue(''),

      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi
        .fn()
        .mockImplementation((_program: unknown, pname: unknown) =>
          pname === 'ACTIVE_UNIFORMS' ? 8 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_fillTexture', type: 0, size: 1 },
            { name: 'u_borderTexture', type: 0, size: 1 },
            { name: 'u_fillTileSize', type: 0, size: 1 },
            { name: 'u_borderTileSize', type: 0, size: 1 },
            { name: 'u_fillTint', type: 0, size: 1 },
            { name: 'u_borderTint', type: 0, size: 1 },
            { name: 'u_borderWidth', type: 0, size: 1 },
            { name: 'u_borderBlend', type: 0, size: 1 },
          ][index] ?? null,
      ),
      getUniformLocation: vi
        .fn()
        .mockImplementation(() => ({}) as WebGLUniformLocation),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      uniform2fv: vi.fn(),
      uniform4fv: vi.fn(),
      activeTexture: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(terrainVertexShader))
      .addShader(new ForgeShaderSource(terrainFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
  });

  it('does not throw when building a mesh', () => {
    expect(() =>
      createTerrainMesh(renderContext, createOptions()),
    ).not.toThrow();
  });

  it('builds 6 vertices (2 triangles) per pair of consecutive curve points', () => {
    const curvePoints = buildTerrainCurve(
      [new Vector2(0, 0), new Vector2(10, 0)],
      5,
    );

    const mesh = createTerrainMesh(
      renderContext,
      createOptions({ curvePoints }),
    );

    expect(mesh.vertexCount).toBe((curvePoints.length - 1) * 6);
  });

  it('binds the configured border width uniform', () => {
    const mesh = createTerrainMesh(
      renderContext,
      createOptions({
        borderWidth: 42,
      }),
    );

    mesh.material.bind(mockGl);

    const calls = (mockGl.uniform1f as Mock).mock.calls;
    const borderWidthCall = calls.find(([, value]) => value === 42);

    expect(borderWidthCall).toBeDefined();
  });

  it('defaults borderBlend when not provided', () => {
    const mesh = createTerrainMesh(renderContext, createOptions());

    mesh.material.bind(mockGl);

    const calls = (mockGl.uniform1f as Mock).mock.calls;
    const borderBlendCall = calls.find(([, value]) => value === 12);

    expect(borderBlendCall).toBeDefined();
  });

  it('uses an explicit borderBlend when provided', () => {
    const mesh = createTerrainMesh(
      renderContext,
      createOptions({ borderBlend: 30 }),
    );

    mesh.material.bind(mockGl);

    const calls = (mockGl.uniform1f as Mock).mock.calls;
    const borderBlendCall = calls.find(([, value]) => value === 30);

    expect(borderBlendCall).toBeDefined();
  });

  it('wraps both textures with REPEAT rather than CLAMP_TO_EDGE', () => {
    createTerrainMesh(renderContext, createOptions());

    const wrapCalls = (mockGl.texParameteri as Mock).mock.calls.filter(
      ([, pname]) => pname === 'TEXTURE_WRAP_S',
    );

    expect(wrapCalls.length).toBeGreaterThan(0);

    for (const call of wrapCalls) {
      expect(call[2]).toBe('REPEAT');
    }
  });
});
