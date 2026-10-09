import type { GpuBufferUsage, GpuStagingBuffer } from '../gpu-buffer.js';
import type { DeviceContext, RestorableResource } from './device-context.js';
import { WebGl2Buffer } from './webgl2-buffer.js';

/** The CPU array's size before anything is allocated, in bytes. */
const initialCapacity = 256;

/**
 * A staging buffer: a CPU array that grows to what a frame needs, and a
 * GPU buffer the device uploads the changed range into, once, before the
 * next pass or draw.
 */
export class WebGl2StagingBuffer
  implements GpuStagingBuffer, RestorableResource
{
  public readonly buffer: WebGl2Buffer;

  private readonly _context: DeviceContext;
  private readonly _onDirty: (staging: WebGl2StagingBuffer) => void;
  private readonly _onDestroy: (staging: WebGl2StagingBuffer) => void;
  private _data: ArrayBuffer;
  private _float32: Float32Array;
  private _uint32: Uint32Array;
  private _int32: Int32Array;
  private _uint8: Uint8Array;
  private _allocatedSize: number;
  private _dirtyStart: number;
  private _dirtyEnd: number;
  private _isDestroyed: boolean;

  /**
   * Creates an empty staging buffer.
   * @param context - The device's shared context.
   * @param usage - What it holds.
   * @param label - Its label.
   * @param onDirty - Called the first time it has changes to upload.
   * @param onDestroy - Called when it's destroyed.
   */
  constructor(
    context: DeviceContext,
    usage: GpuBufferUsage,
    label: string,
    onDirty: (staging: WebGl2StagingBuffer) => void,
    onDestroy: (staging: WebGl2StagingBuffer) => void,
  ) {
    this._context = context;
    this._onDirty = onDirty;
    this._onDestroy = onDestroy;
    this._data = new ArrayBuffer(initialCapacity);
    this._float32 = new Float32Array(this._data);
    this._uint32 = new Uint32Array(this._data);
    this._int32 = new Int32Array(this._data);
    this._uint8 = new Uint8Array(this._data);
    this._allocatedSize = 0;
    this._dirtyStart = Number.POSITIVE_INFINITY;
    this._dirtyEnd = 0;
    this._isDestroyed = false;
    this.buffer = new WebGl2Buffer(
      context,
      { usage, size: initialCapacity, label },
      null,
      () => {
        this.destroy();
      },
    );
  }

  get data(): ArrayBuffer {
    return this._data;
  }

  get float32(): Float32Array {
    return this._float32;
  }

  get uint32(): Uint32Array {
    return this._uint32;
  }

  get int32(): Int32Array {
    return this._int32;
  }

  get uint8(): Uint8Array {
    return this._uint8;
  }

  get allocatedSize(): number {
    return this._allocatedSize;
  }

  /** Whether it has changes the GPU buffer doesn't have yet. */
  get isDirty(): boolean {
    return this._dirtyEnd > this._dirtyStart;
  }

  public allocate(byteSize: number): number {
    this._assertAlive();

    if (!Number.isInteger(byteSize) || byteSize <= 0) {
      throw new Error(
        `A staging allocation must be a positive whole number of bytes, received ${byteSize}.`,
      );
    }

    const alignment =
      this.buffer.usage === 'uniform'
        ? this._context.capabilities.limits.uniformBufferOffsetAlignment
        : 4;
    const offset = Math.ceil(this._allocatedSize / alignment) * alignment;
    const end = offset + Math.ceil(byteSize / 4) * 4;

    this._ensureCapacity(end);
    this._allocatedSize = end;
    this.markDirty(offset, end - offset);

    return offset;
  }

  public markDirty(byteOffset: number, byteSize: number): void {
    this._assertAlive();

    if (byteOffset < 0 || byteOffset + byteSize > this._data.byteLength) {
      throw new Error(
        `Bytes ${byteOffset} to ${byteOffset + byteSize} are outside staging buffer "${this.buffer.label}".`,
      );
    }

    const wasDirty = this.isDirty;

    this._dirtyStart = Math.min(
      this._dirtyStart,
      Math.floor(byteOffset / 4) * 4,
    );
    this._dirtyEnd = Math.max(
      this._dirtyEnd,
      Math.ceil((byteOffset + byteSize) / 4) * 4,
    );

    if (!wasDirty && this.isDirty) {
      this._onDirty(this);
    }
  }

  public reset(): void {
    this._assertAlive();
    this._allocatedSize = 0;
  }

  public destroy(): void {
    if (this._isDestroyed) {
      return;
    }

    this._isDestroyed = true;
    this.buffer.destroy();
    this._onDestroy(this);
  }

  /**
   * Uploads the changed range, growing the GPU buffer first if the array
   * outgrew it. Does nothing while the context is lost; the range stays
   * changed until it's uploaded.
   */
  public flush(): void {
    if (!this.isDirty || this._context.isContextLost) {
      return;
    }

    if (this.buffer.size < this._data.byteLength) {
      // New storage starts empty, so everything allocated goes up again.
      this.buffer.resize(this._data.byteLength);
      this._dirtyStart = 0;
      this._dirtyEnd = Math.max(this._dirtyEnd, this._allocatedSize);
    }

    this.buffer.upload(
      this._dirtyStart,
      new Uint8Array(
        this._data,
        this._dirtyStart,
        this._dirtyEnd - this._dirtyStart,
      ),
    );
    this._dirtyStart = Number.POSITIVE_INFINITY;
    this._dirtyEnd = 0;
  }

  public restore(): void {
    this.buffer.restoreAt(this._data.byteLength);

    if (this._allocatedSize > 0) {
      this.markDirty(0, this._allocatedSize);
    }
  }

  private _ensureCapacity(byteSize: number): void {
    if (byteSize <= this._data.byteLength) {
      return;
    }

    let capacity = this._data.byteLength;

    while (capacity < byteSize) {
      capacity *= 2;
    }

    const data = new ArrayBuffer(capacity);
    const uint8 = new Uint8Array(data);

    uint8.set(this._uint8);
    this._data = data;
    this._float32 = new Float32Array(data);
    this._uint32 = new Uint32Array(data);
    this._int32 = new Int32Array(data);
    this._uint8 = uint8;
  }

  private _assertAlive(): void {
    if (this._isDestroyed) {
      throw new Error(
        `Staging buffer "${this.buffer.label}" has been destroyed and can no longer be used.`,
      );
    }
  }
}
