---
sidebar_position: 6
---

# Query

A [query](../../api/type-aliases/Query.md) is an [alias](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases) for an array of component symbols, usually used to define the components required on an entity to be considered when running a system.

This is how you would define a query:

```ts
const transformQuery = [
  PositionComponent.symbol,
  RotationComponent.symbol,
  ScaleComponent.symbol,
];
```

But usually you would just pass the array into the super constructor:

```ts
export class MovementSystem extends System {
  constructor() {
    super('MovementSystem', [
        PositionComponent.symbol,
        VelocityComponent.symbol,
      ] // this is a query
    ); 
  }

  public run(entity: Entity): void {
    ...
  }
}
```