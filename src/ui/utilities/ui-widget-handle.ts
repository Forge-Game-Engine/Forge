/**
 * The standard return shape for every `createUiX` factory.
 *
 * `TParts` exposes child entity ids or sub-handles (e.g. `{ label: number }`).
 * `TEvents` exposes the widget's primary {@link ParameterizedForgeEvent}s so
 * callers can subscribe without reaching inside the component bag.
 *
 * `destroy()` removes all entities in the widget's subtree, clears owned event
 * listeners, and deregisters any input observers the factory created. Always
 * call `destroy()` when a widget is removed from the world to prevent leaks.
 */
export interface UiWidgetHandle<
  TParts extends Record<string, unknown>,
  TEvents extends Record<string, unknown>,
> {
  /** Root entity id of the widget. */
  entity: number;

  /** Child entity ids and sub-handles exposed by this widget. */
  parts: TParts;

  /**
   * Primary events emitted by this widget. Register listeners here rather than
   * reaching into the component bag directly, so subscriptions are automatically
   * cleared by `destroy()`.
   */
  events: TEvents;

  /**
   * Tears down the widget: recursively removes all entities in the subtree,
   * clears all owned `ParameterizedForgeEvent` listeners, and deregisters any
   * input observers or drag systems the factory created.
   *
   * Always call this when removing a widget from the world. Un-torn-down widgets
   * retain event listeners indefinitely.
   */
  destroy(): void;
}
