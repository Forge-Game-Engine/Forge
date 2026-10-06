# Design: Generational Entity Handles

|                                       |                                                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                       |
| **Kind**                              | Defect                                                                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/engine-flame/engine-flame.system.ts`, `src/engine-flame/engine-flame.component.ts`, `src/enemy/enemy-collision.system.ts`, `src/grabber/grabber-collision.system.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                |
| **Related**                           | [`demo-findings.md`](./demo-findings.md), [`hierarchy-removal.md`](./hierarchy-removal.md) (builds on this)                                                             |

## 0. Targeted modules

| Path                                               | Change   | Notes                                                                                        |
| -------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `src/ecs/entity.ts`                                | **New**  | `Entity` type alias, handle packing (`entityIndex`, `entityGeneration`), `formatEntity`      |
| `src/ecs/ecs-world.ts`                             | Modified | Slot table with generations, `isAlive`, idempotent `removeEntity`, explicit entity lifetime  |
| `src/utilities/sparse-set.ts`                      | Modified | Indexes its sparse array by the handle's index; membership compares the full handle          |
| `src/common/systems/transform-system.ts`           | Modified | Drops its own re-check for recycled ids                                                      |
| `documentation-site/docs/docs/ecs/entity.md`, `world.md` | Modified | Entity lifetime, stale handles, `isAlive`                                                    |

---

## 1. Summary

An entity in Forge is a plain number, and `EcsWorld` reuses a removed
entity's number for the next entity it creates, immediately and with
nothing to tell the two apart. Any reference to an entity that outlives
it, such as a component field holding another entity's id, a collision
pair, or a closure, silently starts pointing at an unrelated entity.

Four behaviors in `src/ecs/ecs-world.ts` combine into this:

1. **Immediate, last-in-first-out reuse.** `removeEntity` pushes the id
   onto `_freeEntityIds`, and `createEntity` pops from it (lines 225-232,
   433-442). The most recently removed id is the next one handed out, so
   reuse can happen within the same tick, often within the same system.
2. **No generation.** Nothing distinguishes the old entity from the new
   one: `getComponent(oldId, key)` returns the new entity's component.
3. **Double removal frees an id twice.** `removeEntity` doesn't check that
   the entity exists. Removing an entity twice (a bullet that hit two
   targets in one tick) pushes its id onto the free list twice, so two
   future entities get the _same_ id and share component storage.
4. **Removing an entity's last component removes the entity.**
   `removeComponent` (lines 315-330) frees the id if nothing else is left,
   while the caller still holds it. This is documented in `ecs/world.md`.

The demo works around this in several places:

- Engine flames hold their ship's id. The flame system removes a flame
  when its ship is gone, but checks the ship's `EnginesEcsComponent.flames`
  list for the flame's own id, "since a removed ship's id can be reused by
  a new entity" (`engine-flame.component.ts`, `engine-flame.system.ts`).
- The enemy and grabber collision systems keep `removed` and `usedBullets`
  sets so an entity already removed this tick isn't removed (and freed)
  again, or hit again, by another collision pair it was in.

The engine works around it too: the transform system re-checks
`isStatic` "in case the entity's id was recycled for a new entity"
(`transform-system.ts`, lines 133-144).

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
  plain `number`.
- `EcsWorld.isAlive(entity)`.
- `removeEntity` on a stale or already-removed handle is a no-op.
- `removeComponent` never removes the entity.
- `addComponent`/`addTag` on a stale handle throws.
- `SparseSet` comparing full handles, so component lookups with a stale
  handle return `null` without any extra bookkeeping.
- Deleting the engine's own recycled-id workaround in the transform
  system, and documenting how game code should hold references.

### Out of scope

- **Removing children with their parent.** That's
  [`hierarchy-removal.md`](./hierarchy-removal.md), which relies on this
  design to make dangling parent references detectable.
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

- **Bevy**: `Entity` is an index plus a generation. A despawned entity's
  index is reused with a new generation, and queries and `World::get` on
  the old handle find nothing.
- **Unity DOTS**: `Entity` is `Index` plus `Version`; `EntityManager.Exists`
  checks both.
- **flecs**: entity ids carry a generation in their upper bits;
  `ecs_is_alive` checks it.
- **EnTT**: entity identifiers combine an index and a version, with the
  same semantics.

All of them also treat an entity with no components as alive: lifetime is
`create` to `destroy`, not "has at least one component".

---

## 4. Design

### 4.1 Handle layout

A handle stays a JavaScript `number`, so every existing `entity: number`
signature, `Map`/`Set` keyed by entity, and component field holding an
entity keeps working.

```
handle = generation * 2^24 + index
index      = handle mod 2^24       (0 .. 16,777,215 live slots)
generation = floor(handle / 2^24)  (0 .. 2^29 - 1 before wrapping)
```

```ts
export type Entity = number;

export const entityIndex = (entity: Entity): number => entity & 0xffffff;
export const entityGeneration = (entity: Entity): number =>
  Math.floor(entity / 0x1000000);
/** "12v3": index 12, generation 3. For error messages and debugging. */
export const formatEntity = (entity: Entity): string =>
  `${entityIndex(entity)}v${entityGeneration(entity)}`;
```

`entity & 0xffffff` is exact for every handle below 2^53: the bitwise
operator reduces modulo 2^32 first, which keeps the low 24 bits intact.

A slot's first entity has generation 0, so the first 16 million entities a
world ever creates have exactly the numbers they have today (0, 1, 2, ...).
Existing tests that expect the first entity to be `0` keep passing; only a
_reused_ slot produces a different number than before.

2^29 generations per slot is about 100 days of one slot being freed and
reused every frame at 60 frames per second. A generation that would
overflow wraps to 0 (open question 2).

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

Internally the world keeps one generation per slot and a free list of
slot indices:

- `createEntity`: take a free slot (or a new one), return
  `generation * 2^24 + index` for the slot's current generation.
- `removeEntity`: if the handle's generation doesn't match its slot's, or
  the slot is free, return `false`. Otherwise remove every component and
  tag, raise `onEntityRemoved`, increment the slot's generation, and free
  the slot.
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
handle returns `null` and `isAlive` returns `false`, forever. The demo's
flame system can check `world.isAlive(flame.ship)` instead of searching
its ship's flame list.

The transform system's frozen-entity set re-checks `isStatic` because a
recycled id might belong to a new, non-static entity
(`transform-system.ts`, lines 133-144). With generational handles the new
entity has a different handle, so that re-check is deleted.

### 4.5 Errors

`addComponent` and `addTag` throw on a handle that isn't alive, naming it
with `formatEntity` (`Unable to add component "sprite" to entity 12v3: it
was removed.`). Adding to a removed entity is always a bug, and today it
silently resurrects the id while the slot may already be on the free list.

`getComponent`, `getComponentRequired`, `removeComponent` and
`removeEntity` don't throw on stale handles: looking up something that may
have gone away is normal (collision pairs from earlier in the tick, a
target that was destroyed).

---

## 5. Phases

### Phase 1: Generational handles and explicit lifetime

| #   | Task                                                                                                      | Size |
| --- | --------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `entity.ts`: `Entity`, `entityIndex`, `entityGeneration`, `formatEntity`                                  | S    |
| 1.2 | `SparseSet` indexing by `entityIndex`, membership by full handle                                          | S    |
| 1.3 | `EcsWorld` slot table: `createEntity`, `isAlive`, idempotent `removeEntity`, `removeComponent` keeps the entity, `addComponent`/`addTag` throw on dead handles | M    |
| 1.4 | Remove the transform system's recycled-id re-check                                                        | S    |
| 1.5 | Tests: reuse gets a new handle, stale lookups return `null`, double removal, last-component removal, slot reuse after many generations | M    |
| 1.6 | Update `ecs/entity.md` and `ecs/world.md`; changelog under `#### Changed`                                 | S    |

**Definition of done:** a handle to a removed entity never refers to
another entity; removing an entity twice is harmless; an entity stays
alive until `removeEntity`, whatever components it has; every existing
test passes with at most the expected changes to `removeComponent`'s
behavior.

The changelog bullet says: entity ids of reused slots are now larger
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

### DL-2: 24 bits of index

**Rationale.** 16.7 million live entities is far above anything a browser
game holds at once, while leaving 29 bits of generation within the 53
bits a double represents exactly. Fewer index bits would give more
generations, which isn't the scarce side.

### DL-3: `removeEntity` on a dead handle is a no-op, not an error

**Options.** (a) Throw. (b) No-op, returning `false`.

**Decision: (b).**

**Rationale.** Removing something that may already be gone is a normal
gameplay situation (two collisions in one tick involving the same bullet).
Bevy treats it the same way (a warning, not a panic, for a despawn
command on a missing entity). Adding components to a dead entity, on the
other hand, is always a bug, so that throws (DL-5).

### DL-4: An entity is alive from `createEntity` to `removeEntity`

**Options.** (a) Keep "an entity exists while it has components". (b)
Explicit lifetime.

**Decision: (b).**

**Rationale.** (a) frees a handle out from under code that still holds
it, which is the defect this design removes. Every ECS listed in §3 uses
(b).

### DL-5: `addComponent` on a dead handle throws

**Rationale.** Today it silently writes into a free slot, which a later
`createEntity` then hands out with that component already attached. A
descriptive error at the faulty call is the engine's convention for
programming errors.

### DL-6: Keep last-in-first-out slot reuse

**Options.** (a) Reuse the most recently freed slot (today). (b) Reuse the
least recently freed slot.

**Decision: (a).**

**Rationale.** With generations, reuse order no longer affects
correctness. Reusing recent slots keeps the sparse arrays compact and
cache-friendly.

---

## 7. Open questions

1. **Brand the type?** `type Entity = Brand<number, 'Entity'>` would make
   `entity * 1.7` (the demo seeds a flame's flicker that way) and passing a
   plain number a type error. It also touches every signature in the engine
   and in games.
   - (a) Plain alias now, brand later if misuse shows up (proposed).
     (b) Brand in Phase 1.
2. **Generation overflow.** Wrapping after 2^29 reuses makes a handle
   held for that long ambiguous, which is theoretical.
   - (a) Wrap (proposed). (b) Retire the slot permanently (never reuse it
     again), costing 4 bytes per retired slot.

---

## 8. Testing considerations

- Unit tests in `ecs-world.test.ts` for every rule in §4.2 and §4.5.
- A regression test reproducing the double-free: remove the same entity
  twice, create two entities, and assert they have different handles and
  separate components.
- The existing transform, physics and UI tests run unchanged; the
  transform system's recycled-id test is rewritten to assert that a new
  entity in a reused slot isn't treated as frozen.

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
