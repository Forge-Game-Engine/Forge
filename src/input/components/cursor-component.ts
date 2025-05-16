import type { Component } from '../../ecs';

/**
 * A marker component representing a cursor.
 */
export class CursorComponent implements Component {
  public name: symbol;

  public static readonly symbol = Symbol('Cursor');

  /**
   * Constructs a new cursor component.
   */
  constructor() {
    this.name = CursorComponent.symbol;
  }
}
