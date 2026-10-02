/**
 * Creates a canvas element with the specified ID, dimensions, and appends it to the given container.
 *
 * The canvas is sized in CSS pixels. Creating a `RenderContext` for it then
 * resizes its drawing buffer to match the display's `devicePixelRatio`, so
 * it renders at native resolution on a high-DPI display.
 *
 * @param container - The HTML element to which the canvas will be appended.
 * @param id - The ID to assign to the canvas element.
 * @param width - The width of the canvas, in CSS pixels (default: container.clientWidth).
 * @param height - The height of the canvas, in CSS pixels (default: container.clientHeight).
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
