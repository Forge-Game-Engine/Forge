import type { Component } from '../../ecs';

/**
 * A marker component representing a cursor.
 */
export class CursorComponent implements Component {
  public static readonly symbol = Symbol('Cursor');

  public name: symbol;

  /**
   * Constructs a new cursor component.
   */
  constructor() {
    this.name = CursorComponent.symbol;
  }
}
