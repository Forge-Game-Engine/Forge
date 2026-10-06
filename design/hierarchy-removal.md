# Design: Removing an Entity Removes Its Children

|                                       |                                                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                 |
| **Kind**                              | Defect                                                                                                                                                                            |
| **Found in**                          | Galactic Journey demo: `src/engine-flame/engine-flame.system.ts`, `src/engine-flame/engine-flame.component.ts`, `src/health/health.component.ts`, `src/power-ups/power-up.component.ts`, `src/run/clear-run.system.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                          |
| **Related**                           | [`generational-entity-ids.md`](./generational-entity-ids.md) (prerequisite), [`sprite-draw-order.md`](./sprite-draw-order.md), [`game-states.md`](./game-states.md)               |

## 0. Targeted modules

| Path                                             | Change      | Notes                                                                                                   |
| ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------- |
| `src/ecs/hierarchy.ts`                           | **New**     | `setParent`, `removeParent`, `getParent`, `getChildren` on `EcsWorld`; cycle checks                      |
| `src/ecs/ecs-world.ts`                           | Modified    | Keeps the parent/children index; `removeEntity` removes descendants                                     |
| `src/common/components/parent-component.ts`      | Modified    | `ParentEcsComponent` stays the queryable data, written only by the world; `addParentComponent` removed  |
| `src/common/systems/transform-system.ts`         | Modified    | Drops its cycle detection (cycles can no longer be created)                                             |
| `src/ui/**`, `src/particles/**`, `src/physics/**` | Modified    | Call sites move from `addParentComponent` to `world.setParent`                                          |
| `documentation-site/docs/docs/ecs/`, `common/transforms.md`, UI guides | Modified | Hierarchy and removal rules                                                                             |

---

## 1. Summary

An entity can have a parent (`ParentEcsComponent`), and the transform
system composes a child's transform with its parent's. But removing a
parent does nothing to its children: they stay in the world, still
pointing at the removed parent's id. With ids reused immediately (see
[`generational-entity-ids.md`](./generational-entity-ids.md)), that id
soon belongs to an unrelated entity, and the orphan starts following it.

The demo has to clean up after this, or avoid parenting altogether:

- **Engine flames** are children of their ship. Ships are removed by
  several systems (shot down, flown off screen, cleared at the end of a
  run), so the flame system checks every flame, every tick, for whether its
  ship still lists it, and removes the orphans. The ship carries an extra
  `EnginesEcsComponent` just to support that check.
- **Health bars and power-up halos** are separate entities linked to their
  owner by a field (`HealthEcsComponent.bar`, `PowerUpEcsComponent.halo`),
  and every place that removes an enemy or a power-up has to call a
  helper (`removeWithHealthBar`, `removePowerUp`) to take the linked
  entity with it.
- **UI pages**: removing a panel today would leave its whole subtree of
  labels and buttons behind. The demo never removes UI, but any game that
  builds a screen per visit would leak it.

Every engine with a scene hierarchy treats a parent as owning its
children. This design does the same: the world keeps a parent/children
index, `removeEntity` removes an entity's descendants with it, and
parenting goes through world methods so the index can't go stale.

---

## 2. Scope

### In scope

- `world.setParent(child, parent)`, `world.removeParent(child)`,
  `world.getParent(child)`, `world.getChildren(parent)`.
- `ParentEcsComponent` kept as the queryable component (the transform and
  UI systems query it), written only by the world.
- `removeEntity` removing every descendant, depth first.
- Rejecting cycles in `setParent`.
- Migrating every `addParentComponent` call in `/src`, the docs site, the
  e2e scenes and the guides.

### Out of scope

- **General entity relationships** (custom relationship kinds with their
  own removal rules). Only the one parent/child hierarchy is needed now.
- **Linking lifetimes without parenting** (a health bar drawn by another
  camera that should die with its enemy). Parenting implies transform
  inheritance. Whether those cases still need a separate link once the
  demo's HUD camera shares world units is open question 2.
- **Removing entities when a game state ends.** That's
  [`game-states.md`](./game-states.md), which relies on this design for
  the subtrees of what it removes.

---

## 3. How established engines handle this

- **Unity**: destroying a GameObject destroys all of its children. To keep
  a child, give it another parent first.
- **Godot**: freeing a node frees its children.
- **Bevy**: since 0.16, `despawn` follows the `ChildOf`/`Children`
  relationship and despawns descendants; the old opt-in
  `despawn_recursive` was removed because recursive was always what people
  meant. `Children` is maintained by the engine from `ChildOf`, never
  written by hand.

All three agree that a hierarchy implies ownership, and that the reverse
index (children of a parent) is maintained by the engine.

---

## 4. Design

### 4.1 API

```ts
class EcsWorld {
  /**
   * Makes `child` a child of `parent` (replacing any current parent), so
   * it's removed along with `parent` and its transform follows it.
   * @throws if either isn't alive, or `parent` is `child` or one of its
   * descendants.
   */
  setParent(child: Entity, parent: Entity): void;
  /** Makes `child` a root again. Its world transform is kept. */
  removeParent(child: Entity): void;
  getParent(child: Entity): Entity | null;
  getChildren(parent: Entity): readonly Entity[];
}
```

`ParentEcsComponent` keeps its shape (`{ parent: Entity }`, now
`readonly`), so every system that queries `parentId` today works
unchanged. `setParent` adds or updates it; `removeParent` removes it. It's
the world's own data, the same way `world` transforms belong to the
transform system: nothing else writes it.

`addParentComponent` is removed. Its callers become `world.setParent`.
Adding `parentId` with `world.addComponent` directly throws, pointing at
`setParent`, so the index can't be bypassed.

### 4.2 Removal

`removeEntity(entity)` removes `entity`'s children first, recursively,
then the entity itself. Each removed entity raises `onEntityRemoved`.
Removing a child on its own detaches it from its parent's children.

To keep a child when its parent goes (a weapon dropped by a dying enemy),
call `removeParent` first. That's the same as in Unity and Bevy.

### 4.3 Where the index lives

The parent/children index lives in `EcsWorld`, not in the common module
next to the transform system:

- Removal has to consult it, and removal is the world's job.
- Hierarchy is used by more than transforms: the UI tree, canvas groups,
  and ownership in general.

The index is two maps (`parentOf`, `childrenOf`), updated only by
`setParent`, `removeParent` and `removeEntity`. Child order is insertion
order, which the UI layout and draw order already rely on today through
query order.

### 4.4 Interaction with other systems

- **Transforms**: the transform system's cycle detection (it treats a
  re-entered entity as a root) is deleted: `setParent` refuses cycles, so
  they can't exist.
- **Physics**: a dynamic body with a parent already throws in the Euler
  integration system. Unchanged.
- **UI**: removing a panel now removes its labels, buttons and nested
  panels. `createLabel`, `createPanel` and the other builders call
  `setParent` instead of `addParentComponent`.
- **Particles**: emitted particles are never children of their emitter
  (they're world-space), so removing an emitter leaves its live particles
  to finish, as today.

### 4.5 Performance

`removeEntity` gains one map lookup for an entity without children.
`setParent` walks the new parent's ancestors to check for a cycle, which
is the depth of the tree (a handful of levels in practice).

---

## 5. Phases

### Phase 1: World-owned hierarchy with recursive removal

| #   | Task                                                                                                    | Size |
| --- | ------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Hierarchy index and `setParent`/`removeParent`/`getParent`/`getChildren`, with cycle and liveness checks | M    |
| 1.2 | `removeEntity` removes descendants depth first; detaching on child removal                              | S    |
| 1.3 | `parentId` only writable through the world; `addParentComponent` removed                                | S    |
| 1.4 | Migrate `/src` (UI builders, slider, progress bar, canvas), docs-site demos (21 call sites), e2e scenes   | M    |
| 1.5 | Remove the transform system's cycle handling                                                            | S    |
| 1.6 | Tests: recursive removal, detach before removal, cycles rejected, a new parent moves it between child lists | M    |
| 1.7 | Guides (`ecs/world.md`, `common/transforms.md`, UI guides); changelog under `#### Changed`              | S    |

**Definition of done:** removing an entity removes its whole subtree; no
code outside the world writes `ParentEcsComponent`; every docs demo and
e2e scene works with `setParent`.

Depends on [`generational-entity-ids.md`](./generational-entity-ids.md)
shipping first or together: without generations, a child whose parent was
removed by a path that bypasses the hierarchy (a stale handle held
elsewhere) could still be misattributed.

---

## 6. Decision log

### DL-1: Removing a parent removes its children, always

**Options.** (a) Recursive removal. (b) Orphan the children (make them
roots). (c) A flag on `removeEntity`.

**Decision: (a).**

**Rationale.** It's what every engine in §3 does, and what the demo's
flame and UI cases need. (b) is what Forge does in effect today, and it's
the defect. (c) is an option whose only purpose is to pick between the
right behavior and the defect. Keeping a specific child is one explicit
`removeParent` call.

### DL-2: The world owns the hierarchy

**Options.** (a) Component hooks in the ECS (run code when a component is
added or removed), with the common module maintaining a `Children` index
from them. (b) The world maintains the index itself, with dedicated
methods.

**Decision: (b).**

**Rationale.** (a) adds a general hook mechanism to the ECS to serve one
relationship. (b) is less machinery, and makes the single writer of
`ParentEcsComponent` explicit. If Forge later needs hooks for other
reasons, the hierarchy can move onto them without changing its API.

### DL-3: `addParentComponent` is removed rather than kept as a wrapper

**Rationale.** It would be an alias for `setParent` whose name suggests the
component can be managed like any other. No compatibility wrappers before
1.0.

---

## 7. Open questions

1. **Should `setParent` keep the child's world transform or its local
   transform?** Unity's `SetParent` keeps the world position by default;
   Bevy's `set_parent` keeps the local transform (the child jumps).
   Forge's builders set up local transforms before parenting, so keeping
   local is what they expect.
   - (a) Keep local (proposed; matches how entities are built today).
     (b) Keep world, converting local.
2. **Linked lifetime without transform inheritance.** The demo's health
   bars live in another camera's units, so they can't be children of their
   enemy. If the HUD camera used world units (see
   [`camera-views.md`](./camera-views.md)), they could be. If cases remain,
   a separate "owned by" link might be needed.
   - (a) Wait and see (proposed). (b) Add an ownership relationship now.

---

## 8. Testing considerations

- Unit tests in `ecs-world.test.ts`: subtree removal order and events;
  `getChildren` after changing a parent; cycle errors; liveness errors.
- The UI and transform suites run against the new API; one new UI test
  removes a panel and asserts its subtree is gone.

## 9. Documentation and demo follow-up

- `common/transforms.md`: parenting through `world.setParent`; removing a
  parent removes children.
- Demo: the flame system's orphan check and `EnginesEcsComponent` are
  deleted; flames are removed with their ship. With
  [`sprite-draw-order.md`](./sprite-draw-order.md), the power-up halo can
  become a child of its orb and `removePowerUp` goes too.
