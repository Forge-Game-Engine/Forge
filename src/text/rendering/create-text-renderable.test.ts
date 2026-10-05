/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import {
  ForgeShaderSource,
  Material,
  RenderContext,
  ShaderCache,
  spriteFragmentShader,
  spriteVertexShader,
} from '../../rendering/index.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import {
  createTextMaterial,
  createTextRenderables,
  TextRenderables,
} from './create-text-renderable.js';
import {
  msdfEffectsFragmentShader,
  msdfFillFragmentShader,
  msdfVertexShader,
} from './shaders/index.js';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

describe('createTextRenderables', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let fontAtlas: FontAtlas;
  let atlasLocation: WebGLUniformLocation;
  let distanceRangeLocation: WebGLUniformLocation;
  let atlasSizeLocation: WebGLUniformLocation;
  let fillMaterial: Material;
  let effectsMaterial: Material;

  const createRenderables = (
    font: FontAtlas = fontAtlas,
    atlasTexture: WebGLTexture = new WebGLTexture(),
  ): TextRenderables =>
    createTextRenderables(renderContext, {
      fontAtlas: font,
      atlasTexture,
      fillMaterial,
      effectsMaterial,
      category: 1,
    });

  const uniformCalls = (
    method: 'uniform1f' | 'uniform1i',
    location: WebGLUniformLocation,
  ): unknown[][] =>
    (mockGl[method] as Mock).mock.calls.filter(
      ([callLocation]) => callLocation === location,
    );

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    atlasLocation = {};
    distanceRangeLocation = {};
    atlasSizeLocation = {};

    fontAtlas = {
      data: {
        formatVersion: 2,
        type: 'msdf',
        atlasImage: 'fixture.png',
        atlasSize: { width: 512, height: 512 },
        distanceRange: 4,
        metrics: {
          lineHeight: 1.2,
          ascender: 0.9,
          descender: -0.2,
          capHeight: 0.7,
        },
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
            { name: 'u_atlas', type: 0x8b5e /* SAMPLER_2D */, size: 1 },
            { name: 'u_distanceRange', type: 0x1406 /* FLOAT */, size: 1 },
            { name: 'u_atlasSize', type: 0x1406 /* FLOAT */, size: 1 },
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
      createVertexArray: vi.fn().mockReturnValue({}),
      bindVertexArray: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(spriteVertexShader))
      .addShader(new ForgeShaderSource(spriteFragmentShader))
      .addShader(new ForgeShaderSource(msdfVertexShader))
      .addShader(new ForgeShaderSource(msdfFillFragmentShader))
      .addShader(new ForgeShaderSource(msdfEffectsFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
    fillMaterial = new Material(
      shaderCache.getShader('sprite.vert'),
      shaderCache.getShader('msdf-fill.frag'),
      mockGl,
    );
    effectsMaterial = new Material(
      shaderCache.getShader('msdf.vert'),
      shaderCache.getShader('msdf-effects.frag'),
      mockGl,
    );
  });

  it("binds the font's distance range and atlas size when each renderable is bound", () => {
    const { fillRenderable, effectsRenderable } = createRenderables();

    fillRenderable.bind(mockGl);
    effectsRenderable.bind(mockGl);

    expect(
      uniformCalls('uniform1f', distanceRangeLocation).map(([, v]) => v),
    ).toEqual([4, 4]);
    expect(
      uniformCalls('uniform1f', atlasSizeLocation).map(([, v]) => v),
    ).toEqual([512, 512]);
  });

  it("binds each font's own atlas to a material shared between fonts", () => {
    const largerFont: FontAtlas = {
      ...fontAtlas,
      data: { ...fontAtlas.data, atlasSize: { width: 1024, height: 1024 } },
    };
    const first = createRenderables(fontAtlas);
    const second = createRenderables(largerFont);

    first.fillRenderable.bind(mockGl);
    second.fillRenderable.bind(mockGl);
    first.fillRenderable.bind(mockGl);

    expect(first.fillRenderable.material).toBe(second.fillRenderable.material);
    expect(
      uniformCalls('uniform1f', atlasSizeLocation).map(([, v]) => v),
    ).toEqual([512, 1024, 512]);
  });

  it('binds the given atlas texture rather than uploading its own', () => {
    const atlasTexture = new WebGLTexture();
    const { fillRenderable } = createRenderables(fontAtlas, atlasTexture);

    fillRenderable.bind(mockGl);

    expect(mockGl.createTexture).not.toHaveBeenCalled();
    expect(mockGl.bindTexture).toHaveBeenCalledWith(
      mockGl.TEXTURE_2D,
      atlasTexture,
    );
  });

  it('draws fill and effects with the given materials', () => {
    const { fillRenderable, effectsRenderable } = createRenderables();

    expect(fillRenderable.material).toBe(fillMaterial);
    expect(effectsRenderable.material).toBe(effectsMaterial);
    expect(fillRenderable.category).toBe(1);
  });

  it('assigns the plain sprite instance data layout to fillRenderable and the combined sprite + text-effects layout to effectsRenderable', () => {
    const { fillRenderable, effectsRenderable } = createRenderables();

    // Sprite: position(2) + rotation(1) + scale(2) + size(2) + pivot(2) +
    // texOffset(2) + texSize(2) + tint(4) = 17.
    expect(fillRenderable.floatsPerInstance).toBe(17);

    // Sprite (17) + text effects: outlineColor(4) + outlineWidth(1) +
    // shadowColor(4) + shadowOffset(2) + shadowSoftness(1) = 12, for a
    // total of 29.
    expect(effectsRenderable.floatsPerInstance).toBe(29);
  });

  it('throws when the fill material has no atlas uniforms to bind', () => {
    (mockGl.getProgramParameter as Mock).mockImplementation(
      (_program: unknown, pname: unknown) =>
        pname === 'ACTIVE_UNIFORMS' ? 0 : true,
    );
    fillMaterial = new Material(
      renderContext.shaderCache.getShader('sprite.vert'),
      renderContext.shaderCache.getShader('sprite.frag'),
      mockGl,
    );

    expect(() => createRenderables()).toThrow(/u_atlas/);
  });
});

describe('createTextMaterial', () => {
  it("adds the shader to the render context's cache and draws it with sprite.vert", () => {
    const addShader = vi.fn();
    const getShader = vi
      .fn()
      .mockImplementation((name: string) => ({ name, preparedSource: name }));
    const gl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi
        .fn()
        .mockImplementation((_program: unknown, pname: unknown) =>
          pname === 'ACTIVE_UNIFORMS' ? 0 : true,
        ),
    } as unknown as WebGL2RenderingContext;
    const fragmentShader = new ForgeShaderSource(
      '#version 300 es\n#pragma forge name(custom-text.frag)\nvoid main() {}',
    );

    createTextMaterial(
      { gl, shaderCache: { addShader, getShader } } as unknown as RenderContext,
      fragmentShader,
    );

    expect(addShader).toHaveBeenCalledWith(fragmentShader);
    expect(getShader).toHaveBeenCalledWith('sprite.vert');
    expect(getShader).toHaveBeenCalledWith('custom-text.frag');
    expect(gl.shaderSource).toHaveBeenCalledWith(
      expect.anything(),
      'custom-text.frag',
    );
  });
});
