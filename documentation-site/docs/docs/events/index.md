# Events

Forge includes a small pub/sub event system used for decoupled communication
between components, systems, and other parts of the engine. Rather than one
part of the engine reaching into another's state every frame to check if
something changed, it can raise an event, and anything interested can
register a listener.

Core concepts:

- [`ForgeEvent`](/Forge/docs/api/classes/ForgeEvent): a simple event with no
  payload, for "something happened" notifications, for example an animation
  starting or ending.
- [`ParameterizedForgeEvent`](/Forge/docs/api/classes/ParameterizedForgeEvent):
  an event that passes data to its listeners, for example an input axis
  reporting its new value.
- [`EventDispatcher`](/Forge/docs/api/classes/EventDispatcher): a registry
  that routes many string-keyed events sharing the same data type through
  one object.

Guides in this section:

- [Creating Custom Events](./custom-events.md): exposing `ForgeEvent` and
  `ParameterizedForgeEvent` from your own components and classes, and the
  gotchas around listener lifecycles.
- [Routing Events by Type](./event-dispatcher.md): using `EventDispatcher` to
  manage many named events that share a payload shape.
