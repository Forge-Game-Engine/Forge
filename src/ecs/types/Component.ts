// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const componentIds = new WeakMap<Function, symbol>();

/**
 * Represents a component in the Entity-Component-System (ECS) architecture.
 * Each component has a unique id represented by a symbol.
 */
export abstract class Component {
  /**
   * The unique id of the component.
   */
  static get id(): symbol {
    let id = componentIds.get(this);

    if (!id) {
      id = Symbol(this.name);
      componentIds.set(this, id);
    }

    return id;
  }
}

export type ComponentCtor<T extends Component = Component> = {
  readonly id: symbol;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
};
