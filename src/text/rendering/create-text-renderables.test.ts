/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import {
  ForgeShaderSource,
  RenderContext,
  ShaderCache,
  spriteFragmentShader,
} from '../../rendering/index.js';
import type { RenderCommand } from '../../rendering/render-command.js';
import { Texture } from '../../rendering/texture.js';
import type { FontAtlas } from '../font-atlas/font-atlas.js';
import { createTextRenderables } from './create-text-renderables.js';
import {
  msdfEffectsFragmentShader,
  msdfFillFragmentShader,
  msdfFillVertexShader,
  msdfVertexShader,
} from './shaders/index.js';

describe('createTextRenderables', () => {
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

    mockGl = {
      VERTEX_SHADER: 'VERTEX_SHADER',
      FRAGMENT_SHADER: 'FRAGMENT_SHADER',
      COMPILE_STATUS: 'COMPILE_STATUS',
      LINK_STATUS: 'LINK_STATUS',
      ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
      TEXTURE0: 0,
      TEXTURE_2D: 'TEXTURE_2D',
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      FLOAT: 'FLOAT',
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
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(spriteFragmentShader))
      .addShader(new ForgeShaderSource(msdfVertexShader))
      .addShader(new ForgeShaderSource(msdfFillVertexShader))
      .addShader(new ForgeShaderSource(msdfFillFragmentShader))
      .addShader(new ForgeShaderSource(msdfEffectsFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);

    fontAtlas = {
      data: {
        formatVersion: 2,
        type: 'msdf',
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
      texture: new Texture(mockGl),
    };
  });

  const bindBatchFor = (fontAtlasToBind: FontAtlas): RenderCommand =>
    ({
      texture: fontAtlasToBind.texture,
      fontAtlas: fontAtlasToBind,
    }) as RenderCommand;

  it('does not throw when its shaders are already registered', () => {
    expect(() => createTextRenderables(renderContext)).not.toThrow();
  });

  it("binds the batch's font atlas texture and metrics to both renderables' materials", () => {
    const { fillRenderable, effectsRenderable } =
      createTextRenderables(renderContext);

    fillRenderable.bindBatch(mockGl, bindBatchFor(fontAtlas));
    effectsRenderable.bindBatch(mockGl, bindBatchFor(fontAtlas));

    const uniform1fCalls = (mockGl.uniform1f as Mock).mock.calls;

    expect(
      uniform1fCalls.filter(([location]) => location === distanceRangeLocation),
    ).toEqual([
      [distanceRangeLocation, 4],
      [distanceRangeLocation, 4],
    ]);
    expect(
      uniform1fCalls.filter(([location]) => location === atlasSizeLocation),
    ).toEqual([
      [atlasSizeLocation, 512],
      [atlasSizeLocation, 512],
    ]);
    expect(mockGl.bindTexture).toHaveBeenCalledWith(
      mockGl.TEXTURE_2D,
      fontAtlas.texture.glTexture,
    );
  });

  it('draws every font with one pair of renderables, rebinding the atlas per batch', () => {
    const { fillRenderable } = createTextRenderables(renderContext);
    const otherFontAtlas: FontAtlas = {
      data: { ...fontAtlas.data, distanceRange: 8 },
      texture: new Texture(mockGl),
    };

    fillRenderable.bindBatch(mockGl, bindBatchFor(fontAtlas));
    fillRenderable.bindBatch(mockGl, bindBatchFor(otherFontAtlas));

    expect(mockGl.bindTexture).toHaveBeenLastCalledWith(
      mockGl.TEXTURE_2D,
      otherFontAtlas.texture.glTexture,
    );
    expect(mockGl.uniform1f).toHaveBeenLastCalledWith(atlasSizeLocation, 512);
    expect(mockGl.uniform1f).toHaveBeenCalledWith(distanceRangeLocation, 8);
  });

  it('throws for a command that names no font atlas', () => {
    const { fillRenderable } = createTextRenderables(renderContext);

    expect(() => fillRenderable.bindBatch(mockGl, {} as RenderCommand)).toThrow(
      'must name the font atlas',
    );
  });

  it('assigns the sprite + embolden + mask instance data layout to fillRenderable and the sprite + embolden + text-effects + mask layout to effectsRenderable', () => {
    const { fillRenderable, effectsRenderable } =
      createTextRenderables(renderContext);

    // Sprite: position(2) + scale(2) + rotation(1) + size(2) + pivot(2) +
    // texOffset(2) + texSize(2) + tint(4) = 17, plus embolden(1) and the
    // mask (14) = 32.
    expect(fillRenderable.floatsPerInstance).toBe(32);

    // Sprite + embolden (18) + text effects: outlineColor(4) +
    // shadowColor(4) + outlineWidth(1) + shadowOffset(2) +
    // shadowSoftness(1) = 12, plus the mask (14), for a total of 44.
    expect(effectsRenderable.floatsPerInstance).toBe(44);
  });
});
