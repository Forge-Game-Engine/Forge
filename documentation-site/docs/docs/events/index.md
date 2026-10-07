# Events

An event is an object that keeps a list of listener functions and calls
them when it's raised. A component, class or module exposes an event so
that other code can run when something happens, instead of checking state
every frame. An [`EventDispatcher`](./event-dispatcher.md) raises events
by a string type.

## Event types

- [`ForgeEvent`](/Forge/docs/api/classes/ForgeEvent): its listeners take no
  arguments. For example, `AnimationClip`'s `onAnimationEndEvent`.
- [`ParameterizedForgeEvent<T>`](/Forge/docs/api/classes/ParameterizedForgeEvent):
  its listeners take one argument of type `T`, the value passed to `raise`.
  For example, `Axis2dAction`'s `valueChangeEvent` passes the action's new
  value.

## Creating an event

Construct an event with a name. The name is included in the error logged
when one of its listeners throws.

```ts
import {
  ForgeEvent,
  ParameterizedForgeEvent,
} from '@forge-game-engine/forge/events';

const opened = new ForgeEvent('opened');
const valueChanged = new ParameterizedForgeEvent<number>('value-changed');
```

To expose an event from a component, add the event to the component's data
when the component is added:

```ts
import { createComponentId } from '@forge-game-engine/forge/ecs';
import { ParameterizedForgeEvent } from '@forge-game-engine/forge/events';

interface CounterEcsComponent {
  count: number;
  countChanged: ParameterizedForgeEvent<number>;
}

const counterId = createComponentId<CounterEcsComponent>('counter');

world.addComponent(entity, counterId, {
  count: 0,
  countChanged: new ParameterizedForgeEvent<number>('count-changed'),
});
```

:::caution
Listeners are registered on one event instance. A new instance has no
listeners, so create each event once and raise that instance. Replacing a
component's event with a new one, for example in a system's `update`,
leaves every registered listener on the old one.
:::

## Raising an event

[`raise`](/Forge/docs/api/classes/ParameterizedForgeEvent#raise) calls
every registered listener, in the order they were registered, before it
returns. A `ParameterizedForgeEvent` passes its argument to each listener.

```ts
opened.raise();
valueChanged.raise(10);
```

`raise` calls the listeners every time it's called, whether or not the
value changed. Raise an event where the state it reports changes.

:::caution
If a listener throws, `raise` logs the error with `console.error` and
rethrows it. The listeners after it aren't called for that `raise`.
:::

## Listening for an event

Pass a function to
[`registerListener`](/Forge/docs/api/classes/ParameterizedForgeEvent#registerlistener).
It's called on every later `raise`.

```ts
const logValue = (value: number): void => {
  console.log('value changed to', value);
};

valueChanged.registerListener(logValue);
```

## Removing a listener

Pass the same function to
[`deregisterListener`](/Forge/docs/api/classes/ParameterizedForgeEvent#deregisterlistener)
to remove it, or call
[`clear`](/Forge/docs/api/classes/ParameterizedForgeEvent#clear) to remove
every listener.

```ts
valueChanged.deregisterListener(logValue);

valueChanged.clear();
```

`deregisterListener` compares functions by reference, so a listener
registered as an inline arrow function can only be removed with `clear`.
Keep a reference to a listener you'll remove.

:::caution
An event keeps every registered listener, and the values the listener
captures, until the listener is removed. Remove the listeners an object
registered when the object is removed, for example when its entity is
removed or a pooled component is reset, or they're still called for it.
:::
