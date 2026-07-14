---
sidebar_position: 2
---

# Routing Events by Type

[`EventDispatcher`](/Forge/docs/api/classes/EventDispatcher) is for cases
where you have many distinct event "types", identified by a string, that all
carry the same shape of data. Rather than declaring a
[`ParameterizedForgeEvent`](/Forge/docs/api/classes/ParameterizedForgeEvent)
field for every type up front, register each type's event with a single
dispatcher and let it route dispatches by name.

This fits situations where the set of event types isn't fixed by your code,
for example notifications coming from many different gameplay systems, or
messages parsed from an external source such as a WebSocket connection.

## A worked example

```ts
import {
  EventDispatcher,
  ParameterizedForgeEvent,
} from '@forge-game-engine/forge/events';

interface Notification {
  title: string;
  description: string;
}

const notifications = new EventDispatcher<Notification>();

const onAchievementUnlocked = new ParameterizedForgeEvent<Notification>(
  'achievement-unlocked',
);
const onLevelComplete = new ParameterizedForgeEvent<Notification>(
  'level-complete',
);

notifications.addEventListener('achievement-unlocked', onAchievementUnlocked);
notifications.addEventListener('level-complete', onLevelComplete);
```

A UI system registers listeners for the types it cares about:

```ts
onAchievementUnlocked.registerListener((notification) => {
  showToast(notification.title, notification.description);
});

onLevelComplete.registerListener((notification) => {
  showLevelCompleteScreen(notification.title);
});
```

Any other system can raise a notification without knowing who, if anyone, is
listening:

```ts
notifications.dispatchEvent('achievement-unlocked', {
  title: 'Achievement Unlocked',
  description: 'Defeat the first boss',
});
```

## Gotchas

### One data type per dispatcher

An `EventDispatcher<TData>` is generic over a single `TData`, shared by every
event registered on it. If different event types need different payload
shapes, use a union type for `TData` and narrow it inside each listener.

### Unmatched types are a silent no-op

`dispatchEvent` for a `type` with no registered listeners does nothing and
does not throw. This is convenient for ignoring event types you don't care
about, but it also means a typo in the `type` string fails silently. Make
sure the strings passed to `addEventListener` and `dispatchEvent` match
exactly.

### A type can have multiple events

`addEventListener` stores events for a `type` in a `Set`, so you can register
more than one `ParameterizedForgeEvent` under the same type, every one of
them is raised on dispatch. `removeEventListener` only removes the specific
event instance you pass it from that one type.

## See also

For the listener lifecycle of the individual `ParameterizedForgeEvent`
instances registered with a dispatcher, including when to deregister them,
see [Creating Custom Events](./custom-events.md).
