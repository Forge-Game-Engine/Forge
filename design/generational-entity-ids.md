# Design: Generational Entity Handles

|                                       |                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**                            | Implemented (Phase 1)                                                                                                                                                                            |
| **Kind**                              | Defect                                                                                                                                                                                           |
| **Found in**                          | Galactic Journey demo: `src/engine-flame/engine-flame.system.ts`, `src/engine-flame/engine-flame.component.ts`, `src/enemy/enemy-collision.system.ts`, `src/grabber/grabber-collision.system.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                         |
| **Related**                           | [`demo-findings.md`](./demo-findings.md), [`hierarchy-removal.md`](./hierarchy-removal.md) (builds on this), [`collision-events.md`](./collision-events.md) (uses `isAlive`)                     |

## 0. Targeted modules

| Path                                                     | Change   | Notes                                                                                       |
| -------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `src/ecs/entity.ts`                                      | **New**  | `Entity` type alias, handle packing (`entityIndex`, `entityGeneration`), `formatEntity`     |
| `src/ecs/ecs-world.ts`                                   | Modified | Slot table with generations, `isAlive`, idempotent `removeEntity`, explicit entity lifetime |
| `src/utilities/sparse-set.ts`                            | Modified | Indexes its sparse array by the handle's index; membership compares the full handle         |
| `src/common/systems/transform-system.ts`                 | Modified | Prunes its frozen set when entities are removed                                             |
| `src/physics/systems/euler-integration-system.ts`        | Modified | Error messages name entities with `formatEntity`                                            |
| `documentation-site/docs/docs/ecs/entity.md`, `world.md` | Modified | Entity lifetime, stale handles, `isAlive`                                                   |

---

## 1. Summary

An entity in Forge is a plain number, and `EcsWorld` reuses a removed
entity's number for the next entity it creates. Reusing numbers is
normal, and every ECS does it, but Forge has nothing to tell the old
entity and the new one apart. Any reference to an entity that outlives
it, such as a component field holding another entity's id, a collision
pair, or a closure, silently starts pointing at an unrelated entity, and
whatever holds it can't find out that its entity is gone.

Four behaviors in `src/ecs/ecs-world.ts` combine into this:

1. **Immediate, last-in-first-out reuse.** `removeEntity` pushes the id
   onto `_freeEntityIds`, and `createEntity` pops from it (lines 225-232,
   433-442). The most recently removed id is the next one handed out, so
   reuse can happen within the same tick, often within the same system.
   Reuse stays (§4.2); this order is why a stale reference turns into a
   wrong one almost at once.
2. **No generation.** Nothing distinguishes the old entity from the new
   one: `getComponent(oldId, key)` returns the new entity's component.
3. **Double removal frees an id twice.** `removeEntity` doesn't check that
   the entity exists. Removing an entity twice (a bullet that hit two
   targets in one tick) pushes its id onto the free list twice, so two
   future entities get the _same_ id and share component storage.
4. **Removing an entity's last component removes the entity.**
   `removeComponent` (lines 315-330) frees the id if nothing else is left,
   while the caller still holds it. This is documented in `ecs/world.md`.

`addComponent` also writes to any id, alive or not (lines 234-243), and
`SparseSet.has` compares bare ids.

The demo works around this in several places:

- Engine flames hold their ship's id. The flame system removes a flame
  when its ship is gone, but checks the ship's `EnginesEcsComponent.flames`
  list for the flame's own id, "since a removed ship's id can be reused by
  a new entity" (`engine-flame.component.ts`, `engine-flame.system.ts`).
- The enemy and grabber collision systems keep `removed` and `usedBullets`
  sets so an entity already removed this tick isn't removed (and freed)
  again, or hit again, by another collision pair it was in.

This design makes an entity a **generational handle**: a slot index plus
a generation counter that increases every time the slot is freed, packed
into the same `number`. A stale handle no longer matches anything: it has
no components, `isAlive` is false, removing it again does nothing.
Entities also get an explicit lifetime: they exist from `createEntity`
until `removeEntity`, whatever components they have.

---

## 2. Scope

### In scope

- Packing an index and a generation into an entity handle that's still a
  plain `number`, small enough to stay a small integer in V8.
- `EcsWorld.isAlive(entity)`.
- `removeEntity` on a stale or already-removed handle is a no-op.
- `removeComponent` never removes the entity.
- `addComponent`/`addTag` on a stale handle throws.
- `SparseSet` comparing full handles, so component lookups with a stale
  handle return `null` without any extra bookkeeping.
- Reusing the least recently freed slot first.
- Documenting how game code should hold references.

### Out of scope

- **Removing children with their parent.** That's
  [`hierarchy-removal.md`](./hierarchy-removal.md).
- **Deferred structural changes (command buffers).** Query results are
  already snapshots (see `ecs/system.md`, "Atomicity"), so removing
  entities while iterating is safe. What wasn't safe was reusing their
  ids; this design fixes that without deferring anything.
- **A branded `Entity` type** that stops arithmetic on handles. Open
  question 1.
- **Saving and loading worlds** ([#567](https://github.com/Forge-Game-Engine/Forge/issues/567)).
  Handles are remapped on load either way.

---

## 3. How established engines handle this

Every mainstream ECS uses generational handles for exactly this reason:

- **Bevy**: `Entity` is an index plus a generation. When an entity is
  despawned, its index's generation increments, and the index is reused
  by a later spawn. Every lookup compares generations, so
  `World::get_entity` and `Query::get` on the old handle find nothing
  rather than the new entity. `Entity` is meant to be stored (Bevy's own
  `ChildOf` holds one), and Bevy's docs advise dropping a handle once you
  know its entity was despawned, since generations eventually wrap. The
  generation is how the holder finds out.
- **Unity DOTS**: `Entity` is `Index` plus `Version`; `EntityManager.Exists`
  checks both.
- **flecs**: entity ids carry a generation in their upper bits;
  `ecs_is_alive` checks it.
- **EnTT**: entity identifiers combine an index and a version; the
  default identifier is 32 bits, with a 20-bit index and a 12-bit version.
- **bitECS**, the most used JavaScript ECS, packs a version into its
  32-bit entity ids (12 bits by default).

All of them also treat an entity with no components as alive: lifetime is
`create` to `destroy`, not "has at least one component".

---

## 4. Design

### 4.1 Handle layout

A handle stays a JavaScript `number`, so every existing `entity: number`
signature, `Map`/`Set` keyed by entity, and component field holding an
entity keeps working.

```
handle     = (generation << 20) | index
index      = handle & 0xfffff   (0 .. 1,048,575 live slots)
generation = handle >>> 20      (0 .. 1,023, then wraps)
```

```ts
export type Entity = number;

export const entityIndex = (entity: Entity): number => entity & 0xfffff;
export const entityGeneration = (entity: Entity): number => entity >>> 20;
/** "12v3": index 12, generation 3. For error messages and debugging. */
export const formatEntity = (entity: Entity): string =>
  `${entityIndex(entity)}v${entityGeneration(entity)}`;
```

Handles stay below 2^30, the top of V8's small-integer range. Above it, a
number is stored on the heap, and every `Set`/`Map` keyed by entity that
systems rebuild each frame (the transform cache, the UI layout's maps)
would allocate on insert. That's why Forge uses 30 bits rather than
EnTT's or bitECS's 32. A million live entities is far above what a
browser game holds at once.

A slot's first entity has generation 0, so until the first removal a
world's entities have exactly the numbers they have today (0, 1, 2, ...);
existing tests that expect the first entity to be `0` keep passing. Only a
_reused_ slot produces a different number than before.

### 4.2 `EcsWorld`

```ts
class EcsWorld {
  createEntity(): Entity;
  /** Whether `entity` was created and hasn't been removed since. */
  isAlive(entity: Entity): boolean;
  /**
   * Removes `entity` and all of its components. Does nothing (and returns
   * `false`) if it isn't alive, e.g. it was already removed this tick.
   */
  removeEntity(entity: Entity): boolean;
  /** Removes one component. The entity stays alive, with or without others. */
  removeComponent<T>(entity: Entity, key: ComponentKey<T>): void;
  /** @throws if `entity` isn't alive. */
  addComponent<T>(entity: Entity, key: ComponentKey<T>, data: T): T;
}
```

Internally the world keeps one generation per slot and a queue of free
slot indices:

- `createEntity`: take the least recently freed slot (or a new one) and
  return its handle for the slot's current generation.
- `removeEntity`: if the handle's generation doesn't match its slot's, or
  the slot is free, return `false`. Otherwise mark the slot dead first
  (increment its generation), then remove every component and tag, queue
  the slot, and raise `onEntityRemoved`. Queuing it before the event means
  a listener that throws can't leak the slot; the queued handle is already
  the next generation, so a listener that creates an entity in it can't be
  confused with the removed one. Marking it dead before the event
  means a listener that removes the same entity again (directly, or
  through a hierarchy) gets `false` instead of recursing or freeing the
  slot twice.
- `isAlive`: the slot is in use and its generation matches the handle's.

Removing the same entity twice in a tick is now harmless, so the demo's
`removed` and `usedBullets` sets become `isAlive` checks or go away. A
second removal can't free the slot twice, so two live entities can never
share a handle.

### 4.3 `SparseSet`

The sparse array is indexed by `entityIndex(handle)`, and the dense array
stores full handles, as it does today. Membership is
`dense[sparse[entityIndex(handle)]] === handle`, so a stale handle (same
index, older generation) is simply not a member. `getComponent` with a
stale handle returns `null`, and no other code needs to know about
generations.

### 4.4 What changes for code holding entity references

Storing another entity's handle in a component (`ParentEcsComponent.parent`,
the demo's `EngineFlameEcsComponent.ship`, `HealthEcsComponent.bar`) is
now safe: once the referenced entity is removed, `getComponent` on the
handle returns `null` and `isAlive` returns `false`, until its slot's
generation wraps (§4.1, open question 2). The demo's flame system can check
`world.isAlive(flame.ship)` instead of searching its ship's flame list.
As Bevy advises, code that finds its entity gone should drop the handle
rather than keep it. [`hierarchy-removal.md`](./hierarchy-removal.md)
takes the most common holders, children and their parent, off game
code's hands.

The transform system keeps a set of frozen (static) entities. Its comment
says it re-checks `isStatic` "in case the entity's id was recycled";
with generations that reason goes, but the check stays, because it's also
how an entity whose `isStatic` was cleared gets unfrozen. What changes is
cleanup: today slot reuse bounds the set's size, and with fresh handles a
removed static entity would stay in it forever. The set holds the
entities' `PositionEcsComponent` objects in a `WeakSet` rather than their
handles, so removing the entity, or just its position, drops it with no
subscription to keep in step. That also covers a case an
`onEntityRemoved` subscription would miss now that `removeComponent` keeps
the entity alive: a static position removed and re-added under a parent is
a new object, so it starts unfrozen and gets composed with its parent.

### 4.5 Errors

`addComponent` and `addTag` throw on a handle that isn't alive, naming it
with `formatEntity` (`Unable to add component "sprite" to entity 12v3: it
was removed.`). Adding to a removed entity is always a bug, and today it
silently resurrects the id while the slot may already be on the free list.

`getComponent` returns `null` for a stale handle, and
`getComponentRequired` throws for it as it does for any missing
component. `removeComponent` and `removeEntity` don't throw on stale
handles: removing something that may already be gone is normal (collision
pairs from earlier in the tick, a target that was destroyed). Every error
message that prints an entity (`getComponentRequired`, the Euler
integration system's parent check) uses `formatEntity`.

---

## 5. Phases

### Phase 1: Generational handles and explicit lifetime

| #   | Task                                                                                                                                                                                                                                                    | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `entity.ts`: `Entity`, `entityIndex`, `entityGeneration`, `formatEntity`                                                                                                                                                                                | S    |
| 1.2 | `SparseSet` indexing by `entityIndex`, membership by full handle                                                                                                                                                                                        | S    |
| 1.3 | `EcsWorld` slot table: `createEntity` (oldest free slot first), `isAlive`, idempotent `removeEntity` marking the slot dead before its event, `removeComponent` keeps the entity, `addComponent`/`addTag` throw on dead handles                          | M    |
| 1.4 | Transform system: prune the frozen set on `onEntityRemoved`; its comment states the remaining reason for the `isStatic` check                                                                                                                           | S    |
| 1.5 | Error messages use `formatEntity`                                                                                                                                                                                                                       | S    |
| 1.6 | Tests: reuse gets a new handle, stale lookups return `null`, double removal, re-entrant removal from a listener, last-component removal, generation wrap; rewrite `ecs-world.test.ts`'s last-component test and the transform system's recycled-id test | M    |
| 1.7 | Benchmark: a particle-heavy scene (the particles stress test) before and after, for creation/removal churn and frame time                                                                                                                               | S    |
| 1.8 | Update `ecs/entity.md` and `ecs/world.md`; changelog under `#### Changed`                                                                                                                                                                               | S    |

**Definition of done:** a handle to a removed entity never refers to
another entity (until its slot has been reused 1,024 times); removing an
entity twice is harmless; an entity stays alive until `removeEntity`,
whatever components it has; the particle benchmark shows no regression;
every existing test passes with at most the expected changes to
`removeComponent`'s behavior.

The changelog bullet says: entity ids of reused slots are now different
numbers, `removeComponent` no longer removes an entity whose last
component it removed (call `removeEntity`), and `addComponent` on a
removed entity now throws.

---

## 6. Decision log

### DL-1: Pack the handle into a `number`

**Options.** (a) An object `{ index, generation }`. (b) A bigint. (c) A
`number` with both parts packed.

**Decision: (c).**

**Rationale.** Every API, component and test in Forge takes and stores
entities as numbers; (c) changes none of their types. (a) allocates per
entity and breaks identity comparison (`===`) and `Map` keys. (b) is slow
in hot loops and can't index arrays.

### DL-2: 20 bits of index, 10 of generation

**Options.** (a) A wide layout using the 53 bits a double holds exactly
(24-bit index, 29-bit generation). (b) 32 bits, as EnTT and bitECS use.
(c) 30 bits.

**Decision: (c).**

**Rationale.** (a) leaves V8's small-integer range as soon as a slot's
generation reaches 64, which particles reach quickly, and every handle
after that is a heap number. (b) has the same problem above 2^30. (c)
keeps every handle a small integer, at the cost of generations wrapping
after 1,024 reuses of one slot, which DL-6 makes rare.

### DL-3: `removeEntity` on a dead handle is a no-op, not an error

**Options.** (a) Throw. (b) No-op, returning `false`.

**Decision: (b).**

**Rationale.** Removing something that may already be gone is a normal
gameplay situation (two collisions in one tick involving the same bullet).
Bevy treats it the same way (a warning, not a panic, for a despawn
command on a missing entity, and `try_despawn` is silent). Adding
components to a dead entity, on the other hand, is always a bug, so that
throws (DL-5).

### DL-4: An entity is alive from `createEntity` to `removeEntity`

**Options.** (a) Keep "an entity exists while it has components". (b)
Explicit lifetime.

**Decision: (b).**

**Rationale.** (a) frees a handle out from under code that still holds
it, which is the defect this design removes. Every ECS listed in §3 uses
(b). Nothing in `/src`, the demo or the e2e scenes relies on (a).

### DL-5: `addComponent` on a dead handle throws

**Rationale.** Today it silently writes into a free slot, which a later
`createEntity` then hands out with that component already attached. A
descriptive error at the faulty call is the engine's convention for
programming errors.

### DL-6: Reuse the least recently freed slot

**Options.** (a) Reuse the most recently freed slot (today). (b) Reuse the
least recently freed slot.

**Decision: (b).**

**Rationale.** Reuse order now decides how fast a slot's generation
climbs toward wrapping. With last-in-first-out reuse, an entity created
and removed every frame (a one-frame effect) takes the same slot every
time and wraps its generation in 1,024 frames, about 17 seconds at 60
frames per second. First-in-first-out spreads reuse over every free slot.
The benchmark in task 1.7 checks the cost to locality.

---

## 7. Open questions

1. **Brand the type?** `type Entity = Brand<number, 'Entity'>` would make
   `entity * 1.7` (the demo seeds a flame's flicker that way) and passing a
   plain number a type error. Forge already brands `ComponentKey`, so
   there's precedent. It also touches every signature in the engine and in
   games.
   - (a) Plain alias now, brand later if misuse shows up (proposed).
     (b) Brand in Phase 1.
2. **Generation overflow.** After 1,024 reuses of one slot, its generation
   wraps and a handle held across all of them would match again. With
   oldest-first reuse that takes 1,024 times as many removals as there are
   free slots.
   - (a) Wrap (proposed; the same trade-off EnTT and bitECS make). (b)
     Retire the slot permanently (never reuse it again).

---

## 8. Testing considerations

- Unit tests in `ecs-world.test.ts` for every rule in §4.2 and §4.5.
- A regression test reproducing the double-free: remove the same entity
  twice, create two entities, and assert they have different handles and
  separate components.
- An `onEntityRemoved` listener that removes the same entity returns
  `false` and doesn't free the slot twice.
- The existing transform, physics and UI tests run unchanged; the
  transform system's recycled-id test becomes a test that a removed static
  entity leaves the frozen set.

## 9. Documentation and demo follow-up

- `ecs/entity.md`: what a handle is, that it's opaque, `isAlive`, and that
  holding handles of other entities in components is safe.
- `ecs/world.md`: replace "If this was the last component on the entity,
  the entity will be removed from the world" with the explicit lifetime
  rule.
- Demo: `engine-flame.system.ts` checks `world.isAlive(flame.ship)`; the
  collision systems' `removed`/`usedBullets` sets become `isAlive` checks.
  With [`hierarchy-removal.md`](./hierarchy-removal.md) the flame check
  goes away entirely.
