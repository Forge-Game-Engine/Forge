/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createTerrainMesh } from './create-terrain-mesh';
import { buildTerrainCurve } from './terrain-curve';
import { ImageCache } from '../../asset-loading/index.js';
import { Vec2 } from '../../math/index.js';
import { Color } from '../color.js';
import { RenderContext } from '../render-context.js';
import { ForgeShaderSource, ShaderCache } from '../shaders/index.js';
import { Texture } from '../texture.js';
import { terrainFragmentShader, terrainVertexShader } from './shaders/index';

describe('createTerrainMesh', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let fillTexture: Texture;
  let borderTexture: Texture;

  const createOptions = (
    overrides: Partial<Parameters<typeof createTerrainMesh>[1]> = {},
  ) => ({
    curvePoints: buildTerrainCurve(
      [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 20, y: 0 },
      ],
      4,
    ),
    depth: 50,
    position: Vec2.zero,
    angle: 0,
    border: {
      texture: borderTexture,
      tileSize: { x: 20, y: 20 },
      tint: Color.white,
    },
    fill: {
      texture: fillTexture,
      tileSize: { x: 30, y: 30 },
      tint: Color.white,
    },
    borderWidth: 10,
    ...overrides,
  });

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

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

      createTexture: vi.fn().mockImplementation(() => ({})),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),

      createShader: vi.fn().mockReturnValue({}),
      deleteShader: vi.fn(),
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
            { name: 'u_fillTexture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
            { name: 'u_borderTexture', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
            { name: 'u_fillTileSize', type: 0x8b50 /* FLOAT_VEC2 */, size: 1 },
            {
              name: 'u_borderTileSize',
              type: 0x8b50 /* FLOAT_VEC2 */,
              size: 1,
            },
            { name: 'u_fillTint', type: 0x8b52 /* FLOAT_VEC4 */, size: 1 },
            { name: 'u_borderTint', type: 0x8b52 /* FLOAT_VEC4 */, size: 1 },
            { name: 'u_borderWidth', type: 0x1406 /* FLOAT */, size: 1 },
            { name: 'u_borderBlend', type: 0x1406 /* FLOAT */, size: 1 },
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
    fillTexture = new Texture(mockGl, { wrap: 'repeat' });
    borderTexture = new Texture(mockGl, { wrap: 'repeat' });
  });

  it('does not throw when building a mesh', () => {
    expect(() =>
      createTerrainMesh(renderContext, createOptions()),
    ).not.toThrow();
  });

  it('builds 6 vertices (2 triangles) per pair of consecutive curve points', () => {
    const curvePoints = buildTerrainCurve(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      5,
    );

    const mesh = createTerrainMesh(
      renderContext,
      createOptions({ curvePoints }),
    );

    expect(mesh.vertexCount).toBe((curvePoints.length - 1) * 6);
  });

  it('extends the mesh below its surface, toward -y, by depth below the lowest point', () => {
    const curvePoints = buildTerrainCurve(
      [
        { x: 0, y: 10 },
        { x: 10, y: 20 },
      ],
      1,
    );

    createTerrainMesh(renderContext, createOptions({ curvePoints, depth: 50 }));

    const [positions, , depths] = (mockGl.bufferData as Mock).mock.calls.map(
      ([, data]) => data as Float32Array,
    );

    // Each pair is (x, -y): the mesh hands the GPU the negated world y, as
    // the sprite pipeline does.
    const worldYs = Array.from(
      { length: positions.length / 2 },
      (_, index) => -positions[index * 2 + 1],
    );

    // Surface left, surface right, bottom left; surface right, bottom
    // right, bottom left.
    expect(worldYs).toEqual([10, 20, -40, 20, -40, -40]);
    expect(Array.from(depths)).toEqual([0, 0, 50, 0, 60, 50]);
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

  it('binds each layer texture to its sampler', () => {
    const mesh = createTerrainMesh(renderContext, createOptions());

    (mockGl.bindTexture as Mock).mockClear();

    mesh.material.bind(mockGl);

    const boundTextures = (mockGl.bindTexture as Mock).mock.calls.map(
      ([, texture]: unknown[]) => texture,
    );

    expect(boundTextures).toContain(fillTexture.glTexture);
    expect(boundTextures).toContain(borderTexture.glTexture);
  });

  it.each(['border', 'fill'] as const)(
    "throws when the %s texture doesn't wrap with repeat",
    (layer) => {
      const clampedTexture = new Texture(mockGl, { wrap: 'clamp' });
      const options = createOptions();

      expect(() =>
        createTerrainMesh(renderContext, {
          ...options,
          [layer]: { ...options[layer], texture: clampedTexture },
        }),
      ).toThrow(/must be created with wrap: 'repeat'/);
    },
  );
});
