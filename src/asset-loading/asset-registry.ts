export class AssetRegistry<T> {
  private readonly _items: T[] = [];
  private readonly _stringToIdMap: Map<string, number> = new Map();

  public register(stringId: string, item: T): number {
    if (this._stringToIdMap.has(stringId)) {
      return this._stringToIdMap.get(stringId)!;
    }

    const numericId = this._items.length;

    this._items.push(item);
    this._stringToIdMap.set(stringId, numericId);

    return numericId;
  }

  public getId(stringId: string): number {
    const id = this._stringToIdMap.get(stringId);

    return id !== undefined ? id : -1;
  }

  public getDirect(numericId: number): T {
    return this._items[numericId];
  }
}
