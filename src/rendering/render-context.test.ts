/* eslint-disable @typescript-eslint/naming-convention */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageCache } from '../asset-loading/index.js';
import { Color } from './color.js';
import { CLEAR_STRATEGY } from './enums/index.js';
import { createRenderContext, RenderContext } from './render-context.js';
import { createRenderTarget, RenderTarget } from './render-target.js';
import { ShaderCache } from './shaders/index.js';

describe('RenderContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  let canvas: HTMLCanvasElement;
  let mockGl: WebGL2RenderingContext;
  let mockBuffer: WebGLBuffer;
  let shaderCache: ShaderCache;
  let imageCache: ImageCache;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');

    // Create mock WebGL buffer
    mockBuffer = {};

    // Create mock WebGL2RenderingContext
    mockGl = {
      createBuffer: vi.fn().mockReturnValue(mockBuffer),
      viewport: vi.fn(),
      bindFramebuffer: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      FRAMEBUFFER: 'FRAMEBUFFER',
      COLOR_BUFFER_BIT: 'COLOR_BUFFER_BIT',
    } as unknown as WebGL2RenderingContext;

    // Mock canvas.getContext to return our mock GL context
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl);

    // Create shader and image caches
    shaderCache = new ShaderCache([]);
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

    it('should initialize width and height from the canvas dimensions', () => {
      canvas.width = 640;
      canvas.height = 480;

      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(context.width).toBe(640);
      expect(context.height).toBe(480);
    });

    it('should treat the canvas size as CSS pixels and scale the drawing buffer by the device pixel ratio', () => {
      vi.stubGlobal('devicePixelRatio', 2);
      canvas.width = 640;
      canvas.height = 480;

      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(context.pixelRatio).toBe(2);
      expect(context.cssWidth).toBe(640);
      expect(context.cssHeight).toBe(480);
      expect(context.width).toBe(1280);
      expect(context.height).toBe(960);
      expect(canvas.width).toBe(1280);
      expect(canvas.height).toBe(960);
      expect(canvas.style.width).toBe('640px');
      expect(canvas.style.height).toBe('480px');
    });

    it("should prefer the canvas's laid-out size over its attribute size as its CSS size", () => {
      vi.stubGlobal('devicePixelRatio', 2);
      canvas.width = 1600;
      canvas.height = 1200;
      Object.defineProperty(canvas, 'clientWidth', { value: 800 });
      Object.defineProperty(canvas, 'clientHeight', { value: 600 });

      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(context.cssWidth).toBe(800);
      expect(context.cssHeight).toBe(600);
      expect(context.width).toBe(1600);
      expect(context.height).toBe(1200);
    });

    it('should cap the pixel ratio at maxPixelRatio', () => {
      vi.stubGlobal('devicePixelRatio', 3);
      canvas.width = 100;
      canvas.height = 50;

      const context = new RenderContext(
        shaderCache,
        imageCache,
        canvas,
        CLEAR_STRATEGY.blank,
        false,
        2,
      );

      expect(context.maxPixelRatio).toBe(2);
      expect(context.pixelRatio).toBe(2);
      expect(context.width).toBe(200);
      expect(context.height).toBe(100);
    });

    it('should fall back to a pixel ratio of 1 when devicePixelRatio is unusable', () => {
      vi.stubGlobal('devicePixelRatio', 0);

      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(context.pixelRatio).toBe(1);
    });

    it('should throw when maxPixelRatio is not positive', () => {
      expect(
        () =>
          new RenderContext(
            shaderCache,
            imageCache,
            canvas,
            CLEAR_STRATEGY.blank,
            false,
            0,
          ),
      ).toThrow('maxPixelRatio must be a positive number');
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

  describe('resize', () => {
    it('should resize the canvas and update the viewport', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(400, 300);

      expect(context.canvas.width).toBe(400);
      expect(context.canvas.height).toBe(300);
      expect(context.canvas.style.width).toBe('400px');
      expect(context.canvas.style.height).toBe('300px');
      expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 400, 300);
    });

    it('should update the width and height properties', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(400, 300);

      expect(context.width).toBe(400);
      expect(context.height).toBe(300);
    });

    it('should size the drawing buffer at the device pixel ratio while keeping the CSS size', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(400, 300, 2);

      expect(context.canvas.width).toBe(800);
      expect(context.canvas.height).toBe(600);
      expect(context.canvas.style.width).toBe('400px');
      expect(context.canvas.style.height).toBe('300px');
      expect(context.width).toBe(800);
      expect(context.height).toBe(600);
      expect(context.cssWidth).toBe(400);
      expect(context.cssHeight).toBe(300);
      expect(context.pixelRatio).toBe(2);
      expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should round a fractional drawing-buffer size to whole pixels', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(801, 601, 1.25);

      expect(context.width).toBe(1001);
      expect(context.height).toBe(751);
      expect(context.cssWidth).toBe(801);
    });

    it('should default to the current window.devicePixelRatio', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      vi.stubGlobal('devicePixelRatio', 1.5);
      context.resize(400, 300);

      expect(context.pixelRatio).toBe(1.5);
      expect(context.width).toBe(600);
      expect(context.height).toBe(450);
    });

    it('should cap the pixel ratio at maxPixelRatio', () => {
      const context = createRenderContext(canvas, { maxPixelRatio: 1 });

      context.resize(400, 300, 3);

      expect(context.pixelRatio).toBe(1);
      expect(context.width).toBe(400);
      expect(context.height).toBe(300);
    });

    it('should resize the drawing buffer when only the device pixel ratio changes', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(400, 300, 1);
      context.resize(400, 300, 2);

      expect(context.width).toBe(800);
      expect(context.height).toBe(600);
      expect(context.cssWidth).toBe(400);
    });

    it('should leave the canvas untouched when nothing would change, since reassigning a canvas size clears it', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(400, 300, 2);
      vi.mocked(mockGl.viewport).mockClear();

      const widthSetter = vi.spyOn(canvas, 'width', 'set');

      context.resize(400, 300, 2);

      expect(widthSetter).not.toHaveBeenCalled();
      expect(mockGl.viewport).not.toHaveBeenCalled();
    });

    it('should throw when the device pixel ratio is not positive', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(() => context.resize(100, 100, 0)).toThrow(
        'devicePixelRatio must be a positive number',
      );
    });

    it('should throw when width or height are not positive', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(() => context.resize(0, 100)).toThrow(
        'Render context dimensions must be positive numbers.',
      );
      expect(() => context.resize(100, -1)).toThrow(
        'Render context dimensions must be positive numbers.',
      );
    });
  });

  describe('maxPixelRatio', () => {
    it('re-applies the last resize at the new cap', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(400, 300, 2);
      context.maxPixelRatio = 1;

      expect(context.maxPixelRatio).toBe(1);
      expect(context.pixelRatio).toBe(1);
      expect(context.width).toBe(400);
      expect(context.height).toBe(300);
      expect(context.cssWidth).toBe(400);
      expect(mockGl.viewport).toHaveBeenLastCalledWith(0, 0, 400, 300);
    });

    it('uses the last device pixel ratio, not the clamped one, when raised again', () => {
      const context = createRenderContext(canvas, { maxPixelRatio: 1 });

      context.resize(400, 300, 3);

      expect(context.pixelRatio).toBe(1);

      context.maxPixelRatio = 2;

      expect(context.pixelRatio).toBe(2);
      expect(context.width).toBe(800);

      context.maxPixelRatio = Number.POSITIVE_INFINITY;

      expect(context.pixelRatio).toBe(3);
      expect(context.width).toBe(1200);
    });

    it('resizes canvas-sized render targets', () => {
      const targetGl = {
        ...mockGl,
        createFramebuffer: vi.fn().mockReturnValue({}),
        createTexture: vi.fn().mockReturnValue({}),
        deleteTexture: vi.fn(),
        bindTexture: vi.fn(),
        texParameteri: vi.fn(),
        texImage2D: vi.fn(),
        framebufferTexture2D: vi.fn(),
        checkFramebufferStatus: vi.fn().mockReturnValue(1),
        getParameter: vi.fn().mockReturnValue(null),
        FRAMEBUFFER_COMPLETE: 1,
      } as unknown as WebGL2RenderingContext;

      vi.spyOn(canvas, 'getContext').mockReturnValue(targetGl);

      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.resize(400, 300, 2);

      const target = createRenderTarget(context, 'canvas');

      context.maxPixelRatio = 1;

      expect(target.width).toBe(400);
      expect(target.height).toBe(300);
    });

    it('is only remembered while the canvas has no size, and applies on the next resize', () => {
      canvas.width = 0;
      canvas.height = 0;

      const context = new RenderContext(shaderCache, imageCache, canvas);

      vi.mocked(mockGl.viewport).mockClear();

      expect(() => {
        context.maxPixelRatio = 1;
      }).not.toThrow();
      expect(mockGl.viewport).not.toHaveBeenCalled();
      expect(context.width).toBe(0);

      context.resize(400, 300, 2);

      expect(context.pixelRatio).toBe(1);
      expect(context.width).toBe(400);
    });

    it('throws when set to a non-positive number', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      expect(() => {
        context.maxPixelRatio = 0;
      }).toThrow('maxPixelRatio must be a positive number');
      expect(() => {
        context.maxPixelRatio = Number.NaN;
      }).toThrow('maxPixelRatio must be a positive number');
    });
  });

  describe('bindRenderTarget', () => {
    it('should bind the default framebuffer and the context dimensions when passed null', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.bindRenderTarget(null);

      expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
        mockGl.FRAMEBUFFER,
        null,
      );
      expect(mockGl.viewport).toHaveBeenLastCalledWith(
        0,
        0,
        context.width,
        context.height,
      );
    });

    it("should bind the target's framebuffer and dimensions when passed a render target", () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);
      const target = {
        framebuffer: {} as WebGLFramebuffer,
        width: 320,
        height: 240,
      } as unknown as RenderTarget;

      context.bindRenderTarget(target);

      expect(mockGl.bindFramebuffer).toHaveBeenCalledWith(
        mockGl.FRAMEBUFFER,
        target.framebuffer,
      );
      expect(mockGl.viewport).toHaveBeenLastCalledWith(0, 0, 320, 240);
    });
  });

  describe('clear', () => {
    it('should clear the color buffer when clearStrategy is blank', () => {
      const context = new RenderContext(
        shaderCache,
        imageCache,
        canvas,
        CLEAR_STRATEGY.blank,
      );

      context.clear();

      expect(mockGl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
      expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
    });

    it('should clear to an opaque color unchanged', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.clear(new Color(0.2, 0.4, 0.6, 1));

      expect(mockGl.clearColor).toHaveBeenCalledWith(0.2, 0.4, 0.6, 1);
    });

    it('should premultiply a translucent clear color by its alpha', () => {
      const context = new RenderContext(shaderCache, imageCache, canvas);

      context.clear(new Color(1, 0.5, 0, 0.5));

      // Every destination holds premultiplied alpha, so a straight
      // (1, 0.5, 0, 0.5) is stored as (0.5, 0.25, 0, 0.5).
      expect(mockGl.clearColor).toHaveBeenCalledWith(0.5, 0.25, 0, 0.5);
    });

    it('should not clear when clearStrategy is none', () => {
      const context = new RenderContext(
        shaderCache,
        imageCache,
        canvas,
        CLEAR_STRATEGY.none,
      );

      context.clear();

      expect(mockGl.clearColor).not.toHaveBeenCalled();
      expect(mockGl.clear).not.toHaveBeenCalled();
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
    mockBuffer = {};

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
    const customShaderCache = new ShaderCache([]);
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
    const customShaderCache = new ShaderCache([]);
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
    const customShaderCache = new ShaderCache([]);
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
