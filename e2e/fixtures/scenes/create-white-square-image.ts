/**
 * Draws a solid white square onto an offscreen `<canvas>` and resolves it as
 * a loaded `HTMLImageElement`, for scenes to hand to `createImageSprite`.
 * `SpriteEcsComponent.tintColor` multiplies against the sampled texture, so
 * a plain white square becomes a flat, freely re-colorable chip per sprite
 * instance - letting a scene render distinct visible shapes without any
 * static asset file (keeping `/e2e` dependent only on `/src`, not on
 * `/demo`'s or `/documentation-site`'s asset folders).
 * @param size - The width and height of the generated square, in pixels.
 * @returns The loaded image.
 */
export function createWhiteSquareImage(size = 64): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  context.fillStyle = '#fff';
  context.fillRect(0, 0, size, size);

  const image = new Image();

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('Failed to load generated white square image'));
    image.src = canvas.toDataURL();
  });
}
