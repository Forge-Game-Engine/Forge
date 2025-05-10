/**
 * Creates a canvas element with the specified ID, dimensions, and appends it to the given container.
 *
 * @param id - The ID to assign to the canvas element.
 * @param container - The HTML element to which the canvas will be appended.
 * @param width - The width of the canvas (default: window.innerWidth).
 * @param height - The height of the canvas (default: window.innerHeight).
 * @returns The created canvas element.
 */
export function createCanvas(
  id: string,
  container: HTMLElement,
  width?: number,
  height?: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.width = width || window.innerWidth;
  canvas.height = height || window.innerHeight;

  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;

  container.appendChild(canvas);

  return canvas;
}
