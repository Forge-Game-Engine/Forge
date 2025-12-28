/**
 * Creates a canvas element with the specified ID, dimensions, and appends it to the given container.
 *
 * @param container - The HTML element to which the canvas will be appended.
 * @param id - The ID to assign to the canvas element.
 * @param width - The width of the canvas (default: container.clientWidth).
 * @param height - The height of the canvas (default: container.clientHeight).
 * @returns The created canvas element.
 */
export function createCanvas(
  container: HTMLElement,
  id?: string,
  width?: number,
  height?: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = id ?? 'forge-canvas';
  canvas.width = width ?? container.clientWidth;
  canvas.height = height ?? container.clientHeight;

  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;

  container.appendChild(canvas);

  return canvas;
}
