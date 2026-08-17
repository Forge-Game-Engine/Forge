/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import {
  ForgeShaderSource,
  RenderContext,
  ShaderCache,
  spriteFragmentShader,
  spriteVertexShader,
} from '../../rendering/index.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import { createTextRenderable } from './create-text-renderable.js';
import {
  msdfEffectsFragmentShader,
  msdfFillFragmentShader,
  msdfVertexShader,
} from './shaders/index.js';

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
      .addShader(new ForgeShaderSource(spriteVertexShader))
      .addShader(new ForgeShaderSource(spriteFragmentShader))
      .addShader(new ForgeShaderSource(msdfVertexShader))
      .addShader(new ForgeShaderSource(msdfFillFragmentShader))
      .addShader(new ForgeShaderSource(msdfEffectsFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
  });

  it('does not throw when its shaders are already registered', () => {
    expect(() => createTextRenderable(renderContext, fontAtlas)).not.toThrow();
  });

  it("sets the distance range uniform on both renderables' materials from the font atlas's data", () => {
    const { fillRenderable, effectsRenderable } = createTextRenderable(
      renderContext,
      fontAtlas,
    );

    fillRenderable.material.bind(mockGl);
    effectsRenderable.material.bind(mockGl);

    const calls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === distanceRangeLocation,
    );

    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe(4);
    expect(calls[1][1]).toBe(4);
  });

  it("sets the atlas size uniform on both renderables' materials from the font atlas's data", () => {
    const { fillRenderable, effectsRenderable } = createTextRenderable(
      renderContext,
      fontAtlas,
    );

    fillRenderable.material.bind(mockGl);
    effectsRenderable.material.bind(mockGl);

    const calls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === atlasSizeLocation,
    );

    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe(512);
    expect(calls[1][1]).toBe(512);
  });

  it('assigns the plain sprite instance data layout to fillRenderable and the combined sprite + text-effects layout to effectsRenderable', () => {
    const { fillRenderable, effectsRenderable } = createTextRenderable(
      renderContext,
      fontAtlas,
    );

    // Sprite: position(2) + rotation(1) + scale(2) + size(2) + pivot(2) +
    // texOffset(2) + texSize(2) + tint(4) = 17.
    expect(fillRenderable.floatsPerInstance).toBe(17);

    // Sprite (17) + text effects: outlineColor(4) + outlineWidth(1) +
    // shadowColor(4) + shadowOffset(2) + shadowSoftness(1) +
    // maxEffectClearance(1) = 13, for a total of 30.
    expect(effectsRenderable.floatsPerInstance).toBe(30);
  });

  it('shares a single GPU texture between both renderables', () => {
    const { fillRenderable, effectsRenderable } = createTextRenderable(
      renderContext,
      fontAtlas,
    );

    expect(mockGl.createTexture).toHaveBeenCalledTimes(1);

    fillRenderable.material.bind(mockGl);
    effectsRenderable.material.bind(mockGl);

    const calls = (mockGl.uniform1i as Mock).mock.calls.filter(
      ([location]) => location === atlasLocation,
    );

    expect(calls).toHaveLength(2);
  });
});
