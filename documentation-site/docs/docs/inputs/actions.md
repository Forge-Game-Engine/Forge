---
sidebar_position: 1
---

# Actions

Actions are things that the player can "do" in your game; for example jump, shoot, walk, aim, etc.

## Action types

### Trigger Action

A trigger action represents a boolean value that can be set to `true` and will be reset to `false` at the end of the frame.

It should be used to represent actions like "jump", or "shoot"

```ts
const jumpAction = new TriggerAction('jump');
```

```ts
export class JumpSystem extends System {
  private readonly _inputsComponent: InputsComponent;

  constructor(inputsEntity: Entity) {
    super('JumpSystem', [PositionComponent.symbol]);

    this._inputsComponent = inputsEntity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );
  }

  public run(entity: Entity) {
    const jumpAction = inputs.inputManager.getAction<TriggerAction>('jump');

    if (jumpAction?.isTriggered) {
      console.log('jump action triggered');
    }
  }
}
```

### 1-D Axis Action

A 1-D axis action represents a single numeric value. It is usually normalized to `-1..1` or `0..1`.

It should be used to represent actions like "acceleration"

```ts
const accelerationAction = new Axis1dAction('acceleration');
```

```ts
export class RunSystem extends System {
  private readonly _inputsComponent: InputsComponent;

  constructor(inputsEntity: Entity) {
    super('RunSystem', [PositionComponent.symbol]);

    this._inputsComponent = inputsEntity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );
  }

  public run(entity: Entity) {
    const accelerationAction = new Axis1dAction('acceleration');

    console.log(`acceleration is ${accelerationAction?.value}`);
  }
}
```

### 2-D Axis Action

A 2-D axis action represents a 2 numeric values. One for the x-axis and one for the y-axis. The components of the vector is usually normalized to `-1..1` or `0..1`.

It should be used to represent actions like "aim"

```ts
const aimAction = new Axis2dAction('aim');
```

```ts
export class SpaceshipSystem extends System {
  private readonly _inputsComponent: InputsComponent;

  constructor(inputsEntity: Entity) {
    super('SpaceshipSystem', [PositionComponent.symbol]);

    this._inputsComponent = inputsEntity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );
  }

  public run(entity: Entity) {
    const shipMovementAction = new Axis2dAction('ship-movement');

    console.log(`ship movement is ${shipMovementAction?.value}`);
  }
}
```

## Action Reset

At the end of every frame, all actions are reset.

* Trigger actions will revert to a `false`.
* 1-D axis actions will revert to `0`.
* 2-D axis actions will revert to `[0, 0]`.

The reset behavior of axis type actions can be changed, by specifying a [`ActionResetType`](../../api/variables/actionResetTypes) during creation.
