# Entity Lifetimes

The lifecycle module marks an entity as expired a set number of seconds
after it's given a lifetime, and can remove it from the world when it
expires, for example an explosion effect, a projectile or a temporary
obstacle. It's made of:

- [`LifetimeEcsComponent`](./components.md#giving-an-entity-a-lifetime): an
  entity's duration, the seconds counted so far, and whether it has expired.
- [`createLifetimeTrackingEcsSystem`](./systems.md#tracking-lifetimes): the
  system that counts each lifetime's seconds and marks it expired.
- A disposal strategy: a tag that says what happens to an entity when it
  expires, and the system that does it.
  [`RemoveFromWorldLifetimeStrategyId`](./components.md#removing-an-entity-when-it-expires)
  and [`createRemoveFromWorldEcsSystem`](./systems.md#removing-expired-entities)
  remove the entity from the world.

An expired entity without a disposal tag stays in the world, and game code
can read its `hasExpired` (see
[Reacting to an expired lifetime](./components.md#reacting-to-an-expired-lifetime)).
