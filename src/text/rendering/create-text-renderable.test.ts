/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import {
  ForgeShaderSource,
  RenderContext,
  ShaderCache,
} from '../../rendering/index.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import { createTextRenderable } from './create-text-renderable.js';
import { msdfFragmentShader, msdfVertexShader } from './shaders/index.js';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

describe('createTextRenderable', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let fontAtlas: FontAtlas;
  let atlasLocation: WebGLUniformLocation;
  let distanceRangeLocation: WebGLUniformLocation;
  let atlasSizeLocation: WebGLUniformLocation;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    atlasLocation = {};
    distanceRangeLocation = {};
    atlasSizeLocation = {};

    fontAtlas = {
      data: {
        formatVersion: 1,
        type: 'msdf',
        atlasImage: 'fixture.png',
        atlasSize: { width: 512, height: 512 },
        distanceRange: 4,
        metrics: { lineHeight: 1.2, ascender: 0.9, descender: -0.2 },
        glyphs: new Map(),
        kerning: new Map(),
      },
      image: { width: 512, height: 512 } as HTMLImageElement,
    };

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
      TEXTURE_WRAP_S: 'TEXTURE_WRAP_S',
      TEXTURE_WRAP_T: 'TEXTURE_WRAP_T',
      TEXTURE_MIN_FILTER: 'TEXTURE_MIN_FILTER',
      TEXTURE_MAG_FILTER: 'TEXTURE_MAG_FILTER',
      NEAREST: 'NEAREST',
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
          pname === 'ACTIVE_UNIFORMS' ? 3 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_atlas', type: 0, size: 1 },
            { name: 'u_distanceRange', type: 0, size: 1 },
            { name: 'u_atlasSize', type: 0, size: 1 },
          ][index] ?? null,
      ),
      getUniformLocation: vi
        .fn()
        .mockImplementation((_program, name: string) => {
          if (name === 'u_atlas') {
            return atlasLocation;
          }

          if (name === 'u_distanceRange') {
            return distanceRangeLocation;
          }

          if (name === 'u_atlasSize') {
            return atlasSizeLocation;
          }

          return {} as WebGLUniformLocation;
        }),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      activeTexture: vi.fn(),

      getAttribLocation: vi.fn().mockReturnValue(0),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(msdfVertexShader))
      .addShader(new ForgeShaderSource(msdfFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
  });

  it('does not throw when its shaders are already registered', () => {
    expect(() => createTextRenderable(renderContext, fontAtlas)).not.toThrow();
  });

  it("sets the distance range uniform from the font atlas's data", () => {
    const { material } = createTextRenderable(renderContext, fontAtlas);

    material.bind(mockGl);

    const calls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === distanceRangeLocation,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe(4);
  });

  it("sets the atlas size uniform from the font atlas's data", () => {
    const { material } = createTextRenderable(renderContext, fontAtlas);

    material.bind(mockGl);

    const calls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === atlasSizeLocation,
    );

    expect(calls).toHaveLength(1);
    expect(calls[0][1]).toBe(512);
  });

  it('assigns the combined sprite + text-effects instance data layout', () => {
    const renderable = createTextRenderable(renderContext, fontAtlas);

    // Sprite: position(2) + rotation(1) + scale(2) + size(2) + pivot(2) +
    // texOffset(2) + texSize(2) + tint(4) = 17.
    // Text effects: outlineColor(4) + outlineWidth(1) + shadowColor(4) +
    // shadowOffset(2) + shadowSoftness(1) + maxEffectClearance(1) = 13.
    expect(renderable.floatsPerInstance).toBe(30);
  });
});
