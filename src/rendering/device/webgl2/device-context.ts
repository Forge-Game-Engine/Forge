import type { GpuCapabilities } from '../gpu-capabilities.js';
import type { GlStateCache } from './gl-state-cache.js';

/**
 * What a device's resources share: the WebGL context, the state cache, and
 * the device's bookkeeping. Internal to the WebGL2 device.
 */
export interface DeviceContext {
  /** The WebGL2 context. */
  readonly gl: WebGL2RenderingContext;

  /** The state cache every operation sets state through. */
  readonly state: GlStateCache;

  /** The device's current capabilities. */
  readonly capabilities: GpuCapabilities;

  /** Whether the WebGL context is lost, so nothing may touch GL. */
  readonly isContextLost: boolean;

  /**
   * Called before an operation touches GL. Outside a render pass, other
   * code may have changed GL state since the device last did, so the cache
   * is forgotten; inside one, the pass applies its state again before its
   * next draw.
   */
  beginOperation(): void;

  /**
   * Returns a number unique among the device's resources, for cache keys.
   * @returns The id.
   */
  nextId(): number;

  /**
   * Drops cached framebuffers and vertex arrays that use a WebGL object
   * about to be deleted.
   * @param id - The id of the resource being destroyed.
   */
  releaseCachedObjectsOf(id: number): void;
}

/** A GPU resource the device recreates when a lost context is restored. */
export interface RestorableResource {
  /**
   * Recreates the resource's WebGL objects from what it keeps on the CPU
   * side. The old ones died with the context.
   */
  restore(): void;
}
