/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createMsdfTextRenderable } from './create-msdf-text-renderable.js';
import { FontAtlas, ImageCache } from '../../asset-loading/index.js';
import { RenderContext } from '../render-context.js';
import {
  ForgeShaderSource,
  msdfFragmentShader,
  ShaderCache,
  spriteVertexShader,
} from '../shaders/index.js';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

describe('createMsdfTextRenderable', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let fontAtlas: FontAtlas;
  let distanceRangeLocation: WebGLUniformLocation;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    distanceRangeLocation = {};

    fontAtlas = {
      image: { width: 512, height: 512 } as HTMLImageElement,
      atlasWidth: 512,
      atlasHeight: 512,
      distanceRange: 4,
      emSize: 1,
      lineHeight: 1.2,
      ascender: 0.95,
      descender: -0.25,
      glyphs: new Map(),
      kerning: new Map(),
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
          pname === 'ACTIVE_UNIFORMS' ? 2 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_texture', type: 0, size: 1 },
            { name: 'u_distanceRange', type: 0, size: 1 },
          ][index] ?? null,
      ),
      getUniformLocation: vi
        .fn()
        .mockImplementation((_program, name: string) => {
          if (name === 'u_distanceRange') {
            return distanceRangeLocation;
          }

          return {} as WebGLUniformLocation;
        }),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      activeTexture: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(spriteVertexShader))
      .addShader(new ForgeShaderSource(msdfFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
  });

  it('does not throw when creating a renderable', () => {
    expect(() =>
      createMsdfTextRenderable(fontAtlas, renderContext),
    ).not.toThrow();
  });

  it('sets u_distanceRange from the font atlas', () => {
    const renderable = createMsdfTextRenderable(fontAtlas, renderContext);

    renderable.material.bind(mockGl);

    const distanceRangeCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === distanceRangeLocation,
    );

    expect(distanceRangeCalls).toHaveLength(1);
    expect(distanceRangeCalls[0][1]).toBe(4);
  });

  it('assigns the given layer as the renderable category', () => {
    const renderable = createMsdfTextRenderable(fontAtlas, renderContext, 3);

    expect(renderable.category).toBe(3);
  });

  it('defaults the layer to 0', () => {
    const renderable = createMsdfTextRenderable(fontAtlas, renderContext);

    expect(renderable.category).toBe(0);
  });

  it('uses the standard sprite instance data layout so glyphs batch with sprites', () => {
    const renderable = createMsdfTextRenderable(fontAtlas, renderContext);

    expect(renderable.floatsPerInstance).toBe(17);
  });
});
