/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { createImageSprite } from './create-image-sprite';
import { ImageCache } from '../../asset-loading/index.js';
import { Color } from '../color.js';
import { RenderContext } from '../render-context.js';
import {
  ForgeShaderSource,
  ShaderCache,
  spriteFragmentShader,
  spriteVertexShader,
} from '../shaders/index.js';

// Mock WebGLTexture constructor for instanceof checks in Material.bind
globalThis.WebGLTexture = class WebGLTexture {};

describe('createImageSprite', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let renderContext: RenderContext;
  let image: HTMLImageElement;
  let emissiveImage: HTMLImageElement;
  let emissiveTextureLocation: WebGLUniformLocation;
  let emissiveColorLocation: WebGLUniformLocation;
  let emissiveIntensityLocation: WebGLUniformLocation;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    image = { width: 32, height: 32 } as HTMLImageElement;
    emissiveImage = { width: 32, height: 32 } as HTMLImageElement;
    emissiveTextureLocation = {};
    emissiveColorLocation = {};
    emissiveIntensityLocation = {};

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
          pname === 'ACTIVE_UNIFORMS' ? 4 : true,
        ),
      getProgramInfoLog: vi.fn().mockReturnValue(''),

      getActiveUniform: vi.fn().mockImplementation(
        (_program, index: number) =>
          [
            { name: 'u_texture', type: 0, size: 1 },
            { name: 'u_emissiveTexture', type: 0, size: 1 },
            { name: 'u_emissiveColor', type: 0, size: 1 },
            { name: 'u_emissiveIntensity', type: 0, size: 1 },
          ][index] ?? null,
      ),
      getUniformLocation: vi
        .fn()
        .mockImplementation((_program, name: string) => {
          if (name === 'u_emissiveTexture') {
            return emissiveTextureLocation;
          }

          if (name === 'u_emissiveColor') {
            return emissiveColorLocation;
          }

          if (name === 'u_emissiveIntensity') {
            return emissiveIntensityLocation;
          }

          return {} as WebGLUniformLocation;
        }),
      useProgram: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      uniform4fv: vi.fn(),
      activeTexture: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    const shaderCache = new ShaderCache([])
      .addShader(new ForgeShaderSource(spriteVertexShader))
      .addShader(new ForgeShaderSource(spriteFragmentShader));

    renderContext = new RenderContext(shaderCache, new ImageCache(), canvas);
  });

  it('binds zero emissive intensity when no emissive map is given', () => {
    const sprite = createImageSprite(image, renderContext, 0);

    sprite.renderable.material.bind(mockGl);

    const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === emissiveIntensityLocation,
    );

    expect(intensityCalls).toHaveLength(1);
    expect(intensityCalls[0][1]).toBe(0);
  });

  it('binds the same shared black placeholder texture across sprites with no emissive map', () => {
    const spriteA = createImageSprite(image, renderContext, 0);
    const spriteB = createImageSprite(image, renderContext, 0);

    spriteA.renderable.material.bind(mockGl);
    const [, spriteAEmissiveTexture] = (mockGl.bindTexture as Mock).mock
      .calls[1] as [unknown, WebGLTexture];

    (mockGl.bindTexture as Mock).mockClear();
    spriteB.renderable.material.bind(mockGl);
    const [, spriteBEmissiveTexture] = (mockGl.bindTexture as Mock).mock
      .calls[1] as [unknown, WebGLTexture];

    expect(spriteAEmissiveTexture).toBe(spriteBEmissiveTexture);
  });

  it('sets the configured emissive intensity when an emissive map is given', () => {
    const sprite = createImageSprite(image, renderContext, 0, {
      emissiveMap: {
        image: emissiveImage,
        intensity: 3,
      },
    });

    sprite.renderable.material.bind(mockGl);

    const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === emissiveIntensityLocation,
    );

    expect(intensityCalls).toHaveLength(1);
    expect(intensityCalls[0][1]).toBe(3);
  });

  it('defaults emissive intensity to 1 when an emissive map is given without an explicit intensity', () => {
    const sprite = createImageSprite(image, renderContext, 0, {
      emissiveMap: {
        image: emissiveImage,
      },
    });

    sprite.renderable.material.bind(mockGl);

    const intensityCalls = (mockGl.uniform1f as Mock).mock.calls.filter(
      ([location]) => location === emissiveIntensityLocation,
    );

    expect(intensityCalls[0][1]).toBe(1);
  });

  it('does not throw when creating a sprite without an emissive map', () => {
    expect(() => createImageSprite(image, renderContext, 0)).not.toThrow();
  });

  it('defaults the emissive color to white when an emissive map is given without an explicit color', () => {
    const sprite = createImageSprite(image, renderContext, 0, {
      emissiveMap: {
        image: emissiveImage,
      },
    });

    sprite.renderable.material.bind(mockGl);

    const colorCalls = (mockGl.uniform4fv as Mock).mock.calls.filter(
      ([location]) => location === emissiveColorLocation,
    );

    expect(colorCalls).toHaveLength(1);
    expect(Array.from(colorCalls[0][1] as Float32Array)).toEqual([1, 1, 1, 1]);
  });

  it('sets the configured emissive color when given', () => {
    const sprite = createImageSprite(image, renderContext, 0, {
      emissiveMap: {
        image: emissiveImage,
        color: new Color(1, 0.5, 0.1),
      },
    });

    sprite.renderable.material.bind(mockGl);

    const colorCalls = (mockGl.uniform4fv as Mock).mock.calls.filter(
      ([location]) => location === emissiveColorLocation,
    );

    expect(Array.from(colorCalls[0][1] as Float32Array)).toEqual(
      Array.from(new Float32Array([1, 0.5, 0.1, 1])),
    );
  });

  it('sets the emissive color to white when no emissive map is given', () => {
    const sprite = createImageSprite(image, renderContext, 0);

    sprite.renderable.material.bind(mockGl);

    const colorCalls = (mockGl.uniform4fv as Mock).mock.calls.filter(
      ([location]) => location === emissiveColorLocation,
    );

    expect(Array.from(colorCalls[0][1] as Float32Array)).toEqual([1, 1, 1, 1]);
  });
});
