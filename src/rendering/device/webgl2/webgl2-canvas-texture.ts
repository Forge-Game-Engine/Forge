import type {
  GpuTexture,
  GpuTextureUsage,
  GpuTextureView,
  GpuTextureViewDescriptor,
} from '../gpu-texture.js';
import { getTextureFormatInfo, TextureFormatInfo } from './texture-formats.js';

const canvasUsage: readonly GpuTextureUsage[] = Object.freeze([
  'render-attachment',
]);

/**
 * The canvas's drawing buffer as a render attachment: WebGL's default
 * framebuffer. Its size is always the drawing buffer's.
 */
export class WebGl2CanvasTexture implements GpuTexture {
  public readonly dimension = '2d';
  public readonly format = 'rgba8unorm';
  public readonly depthOrArrayLayers = 1;
  public readonly mipLevelCount = 1;
  public readonly sampleCount = 1;
  public readonly usage = canvasUsage;
  public readonly label = 'canvas';

  /** Unique among the device's resources, for cache keys. */
  public readonly id: number;

  /** How the format maps onto WebGL2. */
  public readonly formatInfo: TextureFormatInfo;

  /** Always `true`: this is the canvas. */
  public readonly isCanvas = true;

  private readonly _gl: WebGL2RenderingContext;

  /**
   * Creates the canvas texture.
   * @param gl - The WebGL2 context whose drawing buffer it is.
   * @param id - Its id among the device's resources.
   */
  constructor(gl: WebGL2RenderingContext, id: number) {
    this._gl = gl;
    this.id = id;
    this.formatInfo = getTextureFormatInfo('rgba8unorm');
  }

  /** The drawing buffer's width, in device pixels. */
  get width(): number {
    return this._gl.drawingBufferWidth;
  }

  /** The drawing buffer's height, in device pixels. */
  get height(): number {
    return this._gl.drawingBufferHeight;
  }

  public write(): void {
    throw new Error('The canvas texture can only be rendered into.');
  }

  public generateMipmaps(): void {
    throw new Error('The canvas texture can only be rendered into.');
  }

  public createView(descriptor: GpuTextureViewDescriptor = {}): GpuTextureView {
    if (
      (descriptor.mipLevel ?? 0) !== 0 ||
      (descriptor.arrayLayer ?? 0) !== 0
    ) {
      throw new Error('The canvas texture has one mip level and one layer.');
    }

    return Object.freeze({ texture: this, mipLevel: 0, arrayLayer: 0 });
  }

  public destroy(): void {
    throw new Error('The canvas texture belongs to the device.');
  }
}
