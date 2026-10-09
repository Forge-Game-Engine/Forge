import type { GpuBuffer, GpuBufferUsage } from '../gpu-buffer.js';
import type { DeviceContext, RestorableResource } from './device-context.js';
import * as glc from './gl-constants.js';

function assertAligned(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value % 4 !== 0) {
    throw new Error(
      `${name} must be a non-negative multiple of 4, received ${value}.`,
    );
  }
}

function asBytes(data: ArrayBufferView): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

/**
 * A WebGL buffer. A plain buffer keeps a CPU copy of its contents, which it
 * uploads again on restore; a staging buffer's GPU side keeps none, since
 * its staging array is the copy.
 */
export class WebGl2Buffer implements GpuBuffer, RestorableResource {
  public readonly usage: GpuBufferUsage;
  public readonly label: string;

  /** Unique among the device's resources, for cache keys. */
  public readonly id: number;

  private readonly _context: DeviceContext;
  private readonly _onDestroy: (buffer: WebGl2Buffer) => void;
  private _contents: Uint8Array | null;
  private _size: number;
  private _glBuffer: WebGLBuffer | null;
  private _isDestroyed: boolean;

  /**
   * Creates the buffer, and its WebGL storage unless the context is lost.
   * @param context - The device's shared context.
   * @param descriptor - The buffer's usage, size and label.
   * @param descriptor.usage - What it holds.
   * @param descriptor.size - Its size, in bytes.
   * @param descriptor.label - Its label.
   * @param contents - Its CPU copy, or `null` for a staging buffer's GPU
   * side.
   * @param onDestroy - Called when it's destroyed.
   */
  constructor(
    context: DeviceContext,
    descriptor: { usage: GpuBufferUsage; size: number; label: string },
    contents: Uint8Array | null,
    onDestroy: (buffer: WebGl2Buffer) => void,
  ) {
    assertAligned('A buffer size', descriptor.size);

    if (descriptor.size === 0) {
      throw new Error('A buffer size must be positive.');
    }

    this._context = context;
    this.usage = descriptor.usage;
    this.label = descriptor.label;
    this.id = context.nextId();
    this._onDestroy = onDestroy;
    this._contents = contents;
    this._size = descriptor.size;
    this._glBuffer = null;
    this._isDestroyed = false;

    if (!context.isContextLost) {
      this.restore();
    }
  }

  /** The buffer's size, in bytes. */
  get size(): number {
    return this._size;
  }

  /**
   * The WebGL buffer, or `null` while the context is lost.
   * @throws An error if the buffer is destroyed.
   */
  get glBuffer(): WebGLBuffer | null {
    this._assertAlive();

    return this._glBuffer;
  }

  /** The GL target uploads bind the buffer to. */
  get glTarget(): number {
    return this.usage === 'uniform'
      ? glc.GL_UNIFORM_BUFFER
      : glc.GL_ARRAY_BUFFER;
  }

  public write(byteOffset: number, data: ArrayBufferView): void {
    this._assertAlive();
    assertAligned('A buffer write offset', byteOffset);
    assertAligned('A buffer write size', data.byteLength);

    if (byteOffset + data.byteLength > this._size) {
      throw new Error(
        `A write of ${data.byteLength} bytes at ${byteOffset} doesn't fit buffer "${this.label}" of ${this._size} bytes.`,
      );
    }

    this._contents?.set(asBytes(data), byteOffset);
    this.upload(byteOffset, data);
  }

  public destroy(): void {
    if (this._isDestroyed) {
      return;
    }

    this._isDestroyed = true;
    this._deleteGlBuffer();
    this._contents = null;
    this._onDestroy(this);
  }

  /**
   * Uploads bytes to the GPU only, without touching the CPU copy. Does
   * nothing while the context is lost.
   * @param byteOffset - Where the bytes go.
   * @param data - The bytes.
   */
  public upload(byteOffset: number, data: ArrayBufferView): void {
    if (this._glBuffer === null || this._context.isContextLost) {
      return;
    }

    this._context.beginOperation();
    this._bind();
    this._context.gl.bufferSubData(this._bindTarget(), byteOffset, data);
  }

  /**
   * Gives the buffer new, empty storage of `size` bytes. For staging
   * buffers, whose array grew; a plain buffer's size is fixed.
   * @param size - The new size, in bytes.
   */
  public resize(size: number): void {
    this._assertAlive();
    this._size = size;

    if (this._glBuffer === null || this._context.isContextLost) {
      return;
    }

    this._context.beginOperation();
    this._bind();
    this._context.gl.bufferData(this._bindTarget(), size, glc.GL_DYNAMIC_DRAW);
  }

  /**
   * Recreates the buffer at a new size, for a staging buffer whose array
   * grew while the context was lost.
   * @param size - The size, in bytes.
   */
  public restoreAt(size: number): void {
    this._size = size;
    this.restore();
  }

  public restore(): void {
    const { gl } = this._context;

    this._glBuffer = gl.createBuffer();
    this._context.beginOperation();
    this._bind();

    if (this._contents) {
      gl.bufferData(this._bindTarget(), this._contents, glc.GL_STATIC_DRAW);

      return;
    }

    gl.bufferData(this._bindTarget(), this._size, glc.GL_DYNAMIC_DRAW);
  }

  private _bindTarget(): number {
    return this.usage === 'index' ? glc.GL_ELEMENT_ARRAY_BUFFER : this.glTarget;
  }

  private _bind(): void {
    const { state } = this._context;

    if (this.usage === 'index') {
      state.bindIndexBufferForUpload(this._glBuffer);

      return;
    }

    state.bindBuffer(this.glTarget, this._glBuffer);
  }

  private _deleteGlBuffer(): void {
    const { gl, state } = this._context;

    this._context.releaseCachedObjectsOf(this.id);

    if (this._glBuffer) {
      state.forget(this._glBuffer);
      gl.deleteBuffer(this._glBuffer);
    }

    this._glBuffer = null;
  }

  private _assertAlive(): void {
    if (this._isDestroyed) {
      throw new Error(
        `Buffer "${this.label}" has been destroyed and can no longer be used.`,
      );
    }
  }
}
