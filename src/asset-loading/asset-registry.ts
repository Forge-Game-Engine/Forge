/**
 * A registry for assets that allows for registration of assets with string IDs and retrieval of numeric IDs.
 * This is useful for efficient storage and retrieval of assets while still allowing for human-readable identifiers.
 */
export class AssetRegistry<T> {
  private readonly _items: T[] = [];
  private readonly _stringToIdMap: Map<string, number> = new Map();

  /** Registers an asset with a string ID and returns its numeric ID.
   * @param stringId - The human-readable string ID for the asset.
   * @param item - The asset to register.
   * @returns The numeric ID assigned to the registered asset.
   * @throws Error if the string ID is already registered in the registry.
   */
  public register(stringId: string, item: T): number {
    if (this._stringToIdMap.has(stringId)) {
      throw new Error(
        `Asset with string ID "${stringId}" is already registered in the registry.`,
      );
    }

    const numericId = this._items.length;

    this._items.push(item);
    this._stringToIdMap.set(stringId, numericId);

    return numericId;
  }

  /** Retrieves the numeric ID associated with a given string ID.
   * @param stringId - The string ID of the asset to retrieve.
   * @returns The numeric ID associated with the provided string ID.
   * @throws Error if the string ID is not found in the registry.
   */
  public getId(stringId: string): number {
    const id = this._stringToIdMap.get(stringId);

    if (id === undefined) {
      throw new Error(
        `Asset with string ID "${stringId}" not found in registry.`,
      );
    }

    return id;
  }

  /** Retrieves an asset directly by its numeric ID.
   * @param numericId - The numeric ID of the asset to retrieve.
   * @returns The asset associated with the provided numeric ID.
   * @throws Error if the numeric ID is out of bounds.
   */
  public getDirect(numericId: number): T {
    if (numericId < 0 || numericId >= this._items.length) {
      throw new Error(
        `Asset with numeric ID ${numericId} not found in registry.`,
      );
    }

    return this._items[numericId];
  }
}
