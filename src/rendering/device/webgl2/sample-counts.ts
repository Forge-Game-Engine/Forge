import type { GpuCapabilities } from '../gpu-capabilities.js';
import type { GpuTextureFormat } from '../gpu-texture.js';

/**
 * Checks that the device can multisample a format at a sample count.
 * @param capabilities - The device's capabilities.
 * @param format - The format.
 * @param sampleCount - The sample count, above `1`.
 * @param owner - What asked for it, for the error.
 * @throws An error if the device doesn't support that count for the
 * format, naming the counts it does.
 */
export function assertSampleCountSupported(
  capabilities: GpuCapabilities,
  format: GpuTextureFormat,
  sampleCount: number,
  owner: string,
): void {
  const supported = capabilities.getSampleCounts(format);

  if (!supported.includes(sampleCount)) {
    throw new Error(
      `${owner} asks for ${sampleCount} samples of "${format}", which this device supports with ${supported.length > 0 ? supported.join(', ') : 'no multisampling'} (see capabilities.getSampleCounts).`,
    );
  }
}
