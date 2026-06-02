/**
 * Creates a new HTML div element with the specified ID and appends it to the document body.
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
