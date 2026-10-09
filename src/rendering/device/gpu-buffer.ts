/**
 * What a buffer holds: vertex attributes, indices or uniform blocks. A
 * buffer has one usage for its whole life.
 */
export type GpuBufferUsage = 'vertex' | 'index' | 'uniform';

/** Describes a buffer for `GpuDevice.createBuffer`. */
export interface GpuBufferDescriptor {
  /** What the buffer holds. */
  usage: GpuBufferUsage;

  /** The buffer's size, in bytes. A multiple of `4`. */
  size: number;

  /**
   * The buffer's initial contents, copied in from byte `0`. The rest of the
   * buffer starts zeroed.
   */
  data?: ArrayBufferView;

  /** A name for the buffer, used in error messages. */
  label?: string;
}

/**
 * A GPU buffer, created by `GpuDevice.createBuffer`. It keeps a CPU copy of
 * its contents, which it uploads again when a lost WebGL context is
 * restored. Data that changes every frame goes in a
 * {@link GpuStagingBuffer} instead.
 */
export interface GpuBuffer {
  /** What the buffer holds. */
  readonly usage: GpuBufferUsage;

  /** The buffer's size, in bytes. */
  readonly size: number;

  /** The buffer's label, or `''`. */
  readonly label: string;

  /**
   * Replaces bytes of the buffer. A draw issued before the write reads
   * the old contents, and one issued after reads the new.
   * @param byteOffset - Where the write starts. A multiple of `4`.
   * @param data - The bytes to write. Its byte length is a multiple of `4`.
   * @throws An error if the write doesn't fit the buffer, isn't aligned, or
   * the buffer is destroyed.
   */
  write(byteOffset: number, data: ArrayBufferView): void;

  /**
   * Frees the buffer's GPU memory and CPU copy. Using it afterwards throws;
   * destroying it again does nothing.
   */
  destroy(): void;
}

/** Describes a staging buffer for `GpuDevice.createStagingBuffer`. */
export interface GpuStagingBufferDescriptor {
  /** What the buffer holds. */
  usage: GpuBufferUsage;

  /** A name for the buffer, used in error messages. */
  label?: string;
}

/**
 * A GPU buffer written through a CPU-side array: per-frame data (view
 * blocks, per-draw offsets, instance data), or a CPU mirror of data that
 * changes now and then. Code writes into the array and marks what it
 * changed; the device uploads the changed range once, before the next
 * render pass or draw that could read it, with one call per buffer.
 *
 * Space is handed out by {@link GpuStagingBuffer.allocate}, and the arrays
 * grow to whatever a frame needs and are reused, so steady state allocates
 * nothing. Growing replaces `data` and its views (their offsets stay
 * valid), so read them after allocating, not before.
 *
 * When a lost WebGL context is restored, the allocated range is uploaded
 * again from the CPU array.
 */
export interface GpuStagingBuffer {
  /**
   * The GPU buffer, to bind or set as a vertex or index buffer. Its size
   * grows with the CPU array.
   */
  readonly buffer: GpuBuffer;

  /** The CPU array's bytes. Replaced when the array grows. */
  readonly data: ArrayBuffer;

  /** `data` as 32-bit floats. Replaced when the array grows. */
  readonly float32: Float32Array;

  /** `data` as 32-bit unsigned integers. Replaced when the array grows. */
  readonly uint32: Uint32Array;

  /** `data` as 32-bit signed integers. Replaced when the array grows. */
  readonly int32: Int32Array;

  /** `data` as bytes. Replaced when the array grows. */
  readonly uint8: Uint8Array;

  /** The number of bytes allocated since the last `reset`. */
  readonly allocatedSize: number;

  /**
   * Reserves `byteSize` bytes and marks them changed. A uniform buffer's
   * allocations start at multiples of the device's
   * `uniformBufferOffsetAlignment`, so each can be bound on its own; other
   * buffers' at multiples of `4`.
   * @param byteSize - The number of bytes to reserve.
   * @returns The byte offset of the reserved range.
   */
  allocate(byteSize: number): number;

  /**
   * Marks bytes as changed, so they're uploaded before the next pass or
   * draw.
   * @param byteOffset - The first changed byte.
   * @param byteSize - The number of changed bytes.
   */
  markDirty(byteOffset: number, byteSize: number): void;

  /**
   * Frees every allocation, for the next frame to allocate again from the
   * start. The array keeps its size.
   */
  reset(): void;

  /**
   * Frees the GPU buffer and the CPU array. Using the staging buffer
   * afterwards throws; destroying it again does nothing.
   */
  destroy(): void;
}
