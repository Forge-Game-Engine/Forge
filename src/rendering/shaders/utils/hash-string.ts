/**
 * A fast, non-cryptographic 32-bit hash (FNV-1a). Used to build cache keys
 * of a fixed, small size from GLSL source strings, instead of concatenating
 * (or otherwise combining) the full source itself, which for larger shaders
 * would otherwise become the `Map` key.
 * @param value - The string to hash.
 * @returns The hash, as an unsigned 32-bit integer.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}
