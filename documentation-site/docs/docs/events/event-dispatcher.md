---
sidebar_position: 1
---

# Event Dispatcher

An [`EventDispatcher<TData>`](/Forge/docs/api/classes/EventDispatcher)
stores [`ParameterizedForgeEvent<TData>`](./index.md#event-types) events
under string types, and raises the events stored under a type when that
type is dispatched. Use it when code identifies events by a string at run
time, for example messages received from a network connection.

## Creating a dispatcher

Every event on a dispatcher takes the same data type, `TData`:

```ts
import { EventDispatcher } from '@forge-game-engine/forge/events';

interface Notification {
  title: string;
  description: string;
}

const notifications = new EventDispatcher<Notification>();
```

For types that carry different data, make `TData` a union and narrow it in
each listener.

## Adding an event to a type

[`addEventListener`](/Forge/docs/api/classes/EventDispatcher#addeventlistener)
stores an event under a type. A type can have several events, and one
event can be stored under several types.

```ts
import { ParameterizedForgeEvent } from '@forge-game-engine/forge/events';

const levelCompleted = new ParameterizedForgeEvent<Notification>(
  'level-completed',
);

notifications.addEventListener('level-completed', levelCompleted);

levelCompleted.registerListener((notification) => {
  console.log(notification.title);
});
```

Listeners are registered on the event, not on the dispatcher (see
[Listening for an event](./index.md#listening-for-an-event)).

## Dispatching an event

[`dispatchEvent`](/Forge/docs/api/classes/EventDispatcher#dispatchevent)
raises every event stored under the type, passing it the data:

```ts
notifications.dispatchEvent('level-completed', {
  title: 'Level complete',
  description: 'All targets reached',
});
```

Dispatching a type with no events does nothing, so a type string that
doesn't match the one passed to `addEventListener` raises nothing and
doesn't throw.

## Removing an event from a type

[`removeEventListener`](/Forge/docs/api/classes/EventDispatcher#removeeventlistener)
removes an event from one type. The event keeps its listeners, and stays
stored under any other types.

```ts
notifications.removeEventListener('level-completed', levelCompleted);
```
