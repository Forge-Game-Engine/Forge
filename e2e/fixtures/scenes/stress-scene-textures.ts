/**
 * Textures for the stress scenes, drawn on a 2D canvas so `/e2e` needs no
 * image files: stand-ins for the docs-site demos' star, ember, spark and
 * smoke images.
 */

/**
 * Creates a square 2D canvas and draws on it.
 * @param size - The canvas's width and height, in pixels.
 * @param draw - Draws the texture's contents.
 * @returns The canvas, ready to upload with `createTexture`.
 */
function drawTexture(
  size: number,
  draw: (context: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D canvas context not available');
  }

  draw(context, size);

  return canvas;
}

/**
 * A white five-pointed star on a transparent background.
 * @param size - The texture's size, in pixels.
 * @returns The texture's source canvas.
 */
export function drawStar(size: number): HTMLCanvasElement {
  return drawTexture(size, (context) => {
    const center = size / 2;
    const outer = size / 2;
    const inner = size / 5;

    context.beginPath();

    for (let point = 0; point < 10; point++) {
      const radius = point % 2 === 0 ? outer : inner;
      const angle = Math.PI / 2 + (point * Math.PI) / 5;

      context.lineTo(
        center + radius * Math.cos(angle),
        center - radius * Math.sin(angle),
      );
    }

    context.closePath();
    context.fillStyle = '#ffffff';
    context.fill();
  });
}

/**
 * A white disc that fades to transparent at its edge.
 * @param size - The texture's size, in pixels.
 * @param hardness - How far out, from `0` to `1`, the disc stays opaque
 * before it starts fading.
 * @returns The texture's source canvas.
 */
export function drawSoftCircle(
  size: number,
  hardness: number,
): HTMLCanvasElement {
  return drawTexture(size, (context) => {
    const center = size / 2;
    const gradient = context.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      center,
    );

    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(hardness, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}
