/**
 * Creates a new HTML div element with the specified ID and appends it to the document body.
 * The element has no size or style of its own, so give it a size (for example
 * with CSS on its ID) before passing it to code that sizes a canvas to it.
 *
 * @param id - The ID to assign to the created div element.
 * @returns The created div element.
 */
export function createContainer(id: string): HTMLDivElement {
  const container = document.createElement('div');

  container.id = id;
  document.body.appendChild(container);

  return container;
}
