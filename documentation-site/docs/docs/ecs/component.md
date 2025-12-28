---
sidebar_position: 4
---

# Component

A [`Component`](../../api/classes/Component) is a simple data container. It has no logic.

## Creating a component

To create a component, you need to define a class that implements the [`Component`](../../api/classes/Component) interface. The interface enforces a [`name`](../../api/classes/Component#name) property.

:::info

The name property is a [symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol). This ensures that even if 2 different components have the same name, they can still be uniquely identified. It is good practice to give your components unique names.

:::

You can then add more properties.

:::info

These properties represent game state and are generally expected to be [mutable](https://web.mit.edu/6.005/www/fa15/classes/09-immutability/#mutability) and [public](https://www.typescriptlang.org/docs/handbook/2/classes.html#member-visibility) as they will be accessed and updated frequently by your ECS systems.

:::

Here is an example of the [`RotationComponent`](../../api/classes/RotationComponent):

```ts
export class RotationComponent extends Component {
  public radians: number;

  constructor(degrees: number) {
    super();

    this.name = RotationComponent;
    this.radians = (degrees * Math.PI) / 180;
  }
}
```

Components are meant to be composed together to make an entity. Try to find a balance between grouping related data together that will be updated together and having too much data coupled together in one component.
Components should be small and represent one concept.
