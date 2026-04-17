import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageCache } from '../asset-loading/index.js';
import { CLEAR_STRATEGY } from './enums/index.js';
import { createRenderContext, RenderContext } from './render-context.js';
import { ShaderCache } from './shaders/index.js';

describe('RenderContext', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let mockBuffer: WebGLBuffer;
  let shaderCache: ShaderCache;
  let imageCache: ImageCache;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');

    // Create mock WebGL buffer
    mockBuffer = {} as WebGLBuffer;

    // Create mock WebGL2RenderingContext
    mockGl = {
      createBuffer: vi.fn().mockReturnValue(mockBuffer),
    } as unknown as WebGL2RenderingContext;

    // Mock canvas.getContext to return our mock GL context
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    // Create shader and image caches
    shaderCache = new ShaderCache();
    imageCache = new ImageCache();
  });

  describe('constructor', () => {
    it('should create a RenderContext with all required parameters', () => {
      const context = new RenderContext(
        shaderCache,
        imageCache,
        canvas,
        CLEAR_STRATEGY.blank,
      );

      expect(context.shaderCache).toBe(shaderCache);
      expect(context.imageCache).toBe(imageCache);
      expect(context.canvas).toBe(canvas);
      expect(context.clearStrategy).toBe(CLEAR_STRATEGY.blank);
      expect(context.gl).toBe(mockGl);
      expect(context.instanceBuffer).toBe(mockBuffer);
    });

    it('should use default clearStrategy when not provided', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(context.clearStrategy).toBe(CLEAR_STRATEGY.blank);
    });

    it('should create an instance buffer', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(mockGl.createBuffer).toHaveBeenCalledTimes(1);
      expect(context.instanceBuffer).toBe(mockBuffer);
    });

    it('should throw an error when WebGL2 context is not available', () => {
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);

      expect(() => new RenderContext(shaderCache, imageCache, canvas)).toThrow(
        'Context not found',
      );
    });

    it('should accept different clearStrategy values', () => {
      const contextNone = new RenderContext(
        shaderCache,
        imageCache,
        canvas,
        CLEAR_STRATEGY.none,
      );

      expect(contextNone.clearStrategy).toBe(CLEAR_STRATEGY.none);

      const contextBlank = new RenderContext(
        shaderCache,
        imageCache,
        canvas,
        CLEAR_STRATEGY.blank,
      );

      expect(contextBlank.clearStrategy).toBe(CLEAR_STRATEGY.blank);
    });
  });

  describe('setGlobalUniformValue', () => {
    it('should set a global uniform value', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);
      const value = 42;

      context.setGlobalUniformValue('testUniform', value);

      expect(context.getGlobalUniformValue('testUniform')).toBe(value);
    });

    it('should set multiple global uniform values', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.setGlobalUniformValue('uniform1', 1);
      context.setGlobalUniformValue('uniform2', 2);
      context.setGlobalUniformValue('uniform3', 3);

      expect(context.getGlobalUniformValue('uniform1')).toBe(1);
      expect(context.getGlobalUniformValue('uniform2')).toBe(2);
      expect(context.getGlobalUniformValue('uniform3')).toBe(3);
    });

    it('should overwrite existing uniform values', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.setGlobalUniformValue('testUniform', 42);
      expect(context.getGlobalUniformValue('testUniform')).toBe(42);

      context.setGlobalUniformValue('testUniform', 100);
      expect(context.getGlobalUniformValue('testUniform')).toBe(100);
    });

    it('should accept different uniform value types', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      // Number
      context.setGlobalUniformValue('numberUniform', 42);
      expect(context.getGlobalUniformValue('numberUniform')).toBe(42);

      // Boolean
      context.setGlobalUniformValue('boolUniform', true);
      expect(context.getGlobalUniformValue('boolUniform')).toBe(true);

      // Float32Array
      const float32Array = new Float32Array([1, 2, 3]);
      context.setGlobalUniformValue('float32Uniform', float32Array);
      expect(context.getGlobalUniformValue('float32Uniform')).toBe(
        float32Array,
      );

      // Int32Array
      const int32Array = new Int32Array([4, 5, 6]);
      context.setGlobalUniformValue('int32Uniform', int32Array);
      expect(context.getGlobalUniformValue('int32Uniform')).toBe(int32Array);
    });
  });

  describe('getGlobalUniformValue', () => {
    it('should retrieve a set global uniform value', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);
      const value = 42;

      context.setGlobalUniformValue('testUniform', value);

      expect(context.getGlobalUniformValue('testUniform')).toBe(value);
    });

    it('should throw an error for non-existent uniform values', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(() => context.getGlobalUniformValue('nonExistent')).toThrow(
        'Global uniform value not found: nonExistent',
      );
    });

    it('should throw an error when getting a uniform before setting it', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(() => context.getGlobalUniformValue('neverSetUniform')).toThrow(
        'Global uniform value not found: neverSetUniform',
      );
    });
  });
});

describe('createRenderContext', () => {
  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let mockBuffer: WebGLBuffer;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');

    // Create mock WebGL buffer
    mockBuffer = {} as WebGLBuffer;

    // Create mock WebGL2RenderingContext
    mockGl = {
      createBuffer: vi.fn().mockReturnValue(mockBuffer),
    } as unknown as WebGL2RenderingContext;

    // Mock canvas.getContext to return our mock GL context
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);
  });

  it('should create a RenderContext with default options', () => {
    const context = createRenderContext(canvas);

    expect(context.canvas).toBe(canvas);
    expect(context.shaderCache).toBeInstanceOf(ShaderCache);
    expect(context.imageCache).toBeInstanceOf(ImageCache);
    expect(context.clearStrategy).toBe(CLEAR_STRATEGY.blank);
  });

  it('should create a RenderContext with custom shaderCache', () => {
    const customShaderCache = new ShaderCache();
    const context = createRenderContext(canvas, {
      shaderCache: customShaderCache,
    });

    expect(context.shaderCache).toBe(customShaderCache);
  });

  it('should create a RenderContext with custom imageCache', () => {
    const customImageCache = new ImageCache();
    const context = createRenderContext(canvas, {
      imageCache: customImageCache,
    });

    expect(context.imageCache).toBe(customImageCache);
  });

  it('should create a RenderContext with custom clearStrategy', () => {
    const context = createRenderContext(canvas, {
      clearStrategy: CLEAR_STRATEGY.none,
    });

    expect(context.clearStrategy).toBe(CLEAR_STRATEGY.none);
  });

  it('should create a RenderContext with all custom options', () => {
    const customShaderCache = new ShaderCache();
    const customImageCache = new ImageCache();
    const context = createRenderContext(canvas, {
      shaderCache: customShaderCache,
      imageCache: customImageCache,
      clearStrategy: CLEAR_STRATEGY.none,
    });

    expect(context.shaderCache).toBe(customShaderCache);
    expect(context.imageCache).toBe(customImageCache);
    expect(context.clearStrategy).toBe(CLEAR_STRATEGY.none);
  });

  it('should create a RenderContext with partial custom options', () => {
    const customShaderCache = new ShaderCache();
    const context = createRenderContext(canvas, {
      shaderCache: customShaderCache,
    });

    expect(context.shaderCache).toBe(customShaderCache);
    expect(context.imageCache).toBeInstanceOf(ImageCache);
    expect(context.clearStrategy).toBe(CLEAR_STRATEGY.blank);
  });

  it('should create working RenderContext instances', () => {
    const context = createRenderContext(canvas);

    // Should be able to set and get global uniform values
    context.setGlobalUniformValue('test', 42);
    expect(context.getGlobalUniformValue('test')).toBe(42);
  });
});
