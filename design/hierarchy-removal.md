# Design: Removing an Entity Removes Its Children

|                                       |                                                                                                                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                      |
| **Kind**                              | Defect                                                                                                                                                                                                                 |
| **Found in**                          | Galactic Journey demo: `src/engine-flame/engine-flame.system.ts`, `src/engine-flame/engine-flame.component.ts`, `src/health/health.component.ts`, `src/power-ups/power-up.component.ts`, `src/run/clear-run.system.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                               |
| **Related**                           | [`generational-entity-ids.md`](./generational-entity-ids.md) (prerequisite), [`sprite-draw-order.md`](./sprite-draw-order.md), [`game-states.md`](./game-states.md)                                                    |

## 0. Targeted modules

| Path                                                                                                       | Change      | Notes                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `src/ecs/hierarchy.ts`                                                                                     | **New**     | `ParentEcsComponent` (moved here), the children index, `setParent`/`removeParent`/`getParent`/`getChildren` |
| `src/ecs/ecs-world.ts`                                                                                     | Modified    | Owns the hierarchy; `removeEntity` removes descendants; `parentId` writable only through the world          |
| `src/common/components/parent-component.ts`                                                                | **Removed** | `ParentEcsComponent` moves to the ECS module; `addParentComponent` is removed                               |
| `src/common/systems/transform-system.ts`                                                                   | Modified    | Drops its cycle detection (cycles can no longer be created)                                                 |
| `src/ui/systems/ui-layout-system.ts`, `ui-layout-group-system.ts`, `ui-canvas-group-system.ts`             | Modified    | Read children from the world instead of rebuilding a map from query order each frame                        |
| `src/ui/utilities/create-panel.ts`, `create-label.ts`, `create-slider.ts`, `create-progress-bar.ts`        | Modified    | `world.setParent` instead of `addParentComponent`                                                           |
| `documentation-site/docs/docs/ecs/world.md`, `common/transforms.md`, `ui/creating-a-canvas.md`, docs demos | Modified    | Hierarchy and removal rules                                                                                 |

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

There's no index from a parent to its children either. Three UI systems
(layout, layout groups, canvas groups) each rebuild a children map from
query order every frame, and query order changes when any entity is
removed (removal swaps the last entry of a component set into the hole),
so removing an unrelated UI entity can already reorder a layout group's
children.

Every engine with a scene hierarchy treats a parent as owning its
children, and keeps the reverse index itself. This design does the same:
the world keeps a parent/children index with a stable sibling order,
`removeEntity` removes an entity's descendants with it, and parenting goes
through world methods so the index can't go stale.

---

## 2. Scope

### In scope

- `world.setParent(child, parent)`, `world.removeParent(child)`,
  `world.getParent(child)`, `world.getChildren(parent)`.
- `ParentEcsComponent` kept as the queryable component (the transform and
  UI systems query it), moved into the ECS module and written only by the
  world.
- `removeEntity` removing every descendant, depth first.
- A sibling-order contract, and the UI systems reading it.
- Rejecting cycles in `setParent`.
- Migrating every `addParentComponent` call in `/src`, the docs site and
  the guides.

### Out of scope

- **General entity relationships** (custom relationship kinds with their
  own removal rules). Only the one parent/child hierarchy is needed now.
- **Linking lifetimes without parenting** (a health bar drawn by another
  camera that should die with its enemy). Parenting implies transform
  inheritance. Open question 1.
- **Keeping the world transform when changing parents.** `setParent` and
  `removeParent` keep the child's local transform (DL-4). A helper that
  converts the local transform so the child stays put on screen belongs in
  the transform module, not the ECS, and can be added when needed.
- **Removing entities when a game state ends.** That's
  [`game-states.md`](./game-states.md), which relies on this design for
  the subtrees of what it removes.

---

## 3. How established engines handle this

- **Unity**: destroying a GameObject destroys all of its children. To keep
  a child, give it another parent first. Unity DOTS keeps lifetime links
  (`LinkedEntityGroup`) separate from transform parenting.
- **Godot**: freeing a node frees its children.
- **Bevy**: since 0.16, the `ChildOf` relationship lives in `bevy_ecs`, and
  `Children` is maintained by the engine from it, never written by hand.
  `despawn` follows it and despawns descendants; the old opt-in
  `despawn_recursive` was removed because recursive was always what people
  meant. Relationships can also opt into `linked_spawn` without being a
  transform hierarchy. The variants that preserve a child's global
  transform when reparenting (`*_in_place`) live in `bevy_transform`, not
  in the ECS.

All three agree that a hierarchy implies ownership, and that the reverse
index (children of a parent) is maintained by the engine.

---

## 4. Design

### 4.1 API

```ts
class EcsWorld {
  /**
   * Makes `child` a child of `parent` (replacing any current parent), so
   * it's removed along with `parent` and its transform follows it. The
   * child keeps its local transform. Setting the current parent again does
   * nothing.
   * @throws if either isn't alive, or `parent` is `child` or one of its
   * descendants.
   */
  setParent(child: Entity, parent: Entity): void;
  /** Makes `child` a root again. It keeps its local transform. */
  removeParent(child: Entity): void;
  getParent(child: Entity): Entity | null;
  /**
   * `parent`'s children in sibling order. A read-only view of the world's
   * own list: it changes as children are added or removed, so copy it
   * before removing children in a loop.
   */
  getChildren(parent: Entity): readonly Entity[];
}
```

`ParentEcsComponent` keeps its shape (`{ parent: Entity }`, now
`readonly`), so every system that queries `parentId` works unchanged
apart from its import path, which moves from the common module to the
ECS module (Bevy made the same move with `ChildOf`). `setParent` adds or
updates it; `removeParent` removes it. It's the world's own data: nothing
else writes it.

`addParentComponent` is removed. Its callers become `world.setParent`.
Adding `parentId` with `world.addComponent`, or removing it with
`world.removeComponent`, throws, pointing at `setParent`/`removeParent`,
so the index can't be bypassed.

### 4.2 Removal

`removeEntity(entity)` removes `entity`'s children first, recursively,
then the entity itself. Each removed entity raises `onEntityRemoved`.
Removing a child on its own detaches it from its parent's children.

To keep a child when its parent goes (a weapon dropped by a dying enemy),
call `removeParent` first. That's the same as in Unity and Bevy.

A system's query result is a snapshot, so one taken before a removal can
still list descendants that were just removed with their parent. Loops
that remove entities check `world.isAlive` before acting on an entity
(the guide shows this).

### 4.3 Where the index lives, and sibling order

The index lives in `EcsWorld`, next to the component it maintains:

- Removal has to consult it, and removal is the world's job.
- Hierarchy is used by more than transforms: the UI tree, canvas groups,
  draw order and ownership in general.

The index is a parent per child and an ordered list of children per
parent, updated only by `setParent`, `removeParent` and `removeEntity`.
The sibling-order contract:

- A child is appended to its new parent's list when parented.
- Removing a child (or moving it to another parent) removes it from the
  list in order, not by swapping, so its siblings keep their order.
- Setting a child's current parent again changes nothing.

The UI layout, layout-group and canvas-group systems read
`world.getChildren` instead of rebuilding a children map from query order
each frame, so sibling order no longer changes when unrelated entities are
removed, and [`sprite-draw-order.md`](./sprite-draw-order.md) draws
siblings in the same order.

### 4.4 Interaction with other systems

- **Transforms**: the transform system's cycle detection (it treats a
  re-entered entity as a root, with a `visiting` set) is deleted:
  `setParent` refuses cycles, so they can't exist.
- **Physics**: a dynamic body with a parent already throws in the Euler
  integration system. Unchanged.
- **UI**: removing a panel now removes its labels, buttons and nested
  panels. `createLabel`, `createPanel` and the other builders call
  `setParent` instead of `addParentComponent`.
- **Particles**: emitted particles are never children of their emitter
  (they're world-space), so removing an emitter leaves its live particles
  to finish, as today.

### 4.5 Performance

`removeEntity` gains one lookup for an entity without children.
`setParent` walks the new parent's ancestors to check for a cycle, which
is the depth of the tree (a handful of levels in practice). Removing a
child from its parent's list is linear in the number of siblings, which
is small except for very wide UI lists.

---

## 5. Phases

### Phase 1: World-owned hierarchy with recursive removal

| #   | Task                                                                                                                                                                                 | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1.1 | `src/ecs/hierarchy.ts`: `ParentEcsComponent`, the index, `setParent`/`removeParent`/`getParent`/`getChildren`, cycle and liveness checks, sibling-order contract                     | M    |
| 1.2 | `removeEntity` removes descendants depth first; detaching on child removal                                                                                                           | S    |
| 1.3 | `parentId` only writable through the world (`addComponent` and `removeComponent` throw); `addParentComponent` removed                                                                | S    |
| 1.4 | UI layout, layout-group and canvas-group systems read `getChildren`; their per-frame maps deleted                                                                                    | M    |
| 1.5 | Migrate `/src` builders (about 14 calls in 7 files), the docs-site demos (7 files) and doc comments (`create-ui-canvas.ts`, `ui-canvas-render-mode.ts`)                              | M    |
| 1.6 | Remove the transform system's cycle handling                                                                                                                                         | S    |
| 1.7 | Tests (about 13 files touch parenting): recursive removal, detach before removal, cycles rejected, sibling order across removals and reparenting, `removeComponent(parentId)` throws | M    |
| 1.8 | Guides (`ecs/world.md`, `common/transforms.md`, `ui/creating-a-canvas.md`); changelog under `#### Changed`, including the new import path                                            | S    |

**Definition of done:** removing an entity removes its whole subtree; no
code outside the world writes `ParentEcsComponent`; sibling order survives
unrelated removals; every docs demo works with `setParent`.

Depends on [`generational-entity-ids.md`](./generational-entity-ids.md):
its explicit lifetime (today, removing an entity's last component frees
it without touching anything that refers to it), its idempotent
`removeEntity` (a descendant removed earlier in the same tick), and
`isAlive`, which `setParent` checks.

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
methods, and the parent component lives in the ECS module.

**Decision: (b).**

**Rationale.** (a) adds a general hook mechanism to the ECS to serve one
relationship. (b) is less machinery, and makes the single writer of
`ParentEcsComponent` explicit. Moving the component into the ECS module
also removes the world's import of the common module for it. If Forge
later needs hooks for other reasons, the hierarchy can move onto them
without changing its API.

### DL-3: `addParentComponent` is removed rather than kept as a wrapper

**Rationale.** It would be an alias for `setParent` whose name suggests the
component can be managed like any other. No compatibility wrappers before
1.0.

### DL-4: Changing parents keeps the local transform

**Options.** (a) Keep local: the child takes the same offset under its new
parent (Bevy's `set_parent`). (b) Keep world: convert the local transform
so the child stays put (Unity's `SetParent` default).

**Decision: (a).**

**Rationale.** (b) would make the ECS write `position`, `rotation` and
`scale` locals, which game code, physics and UI layout own, from world
values that can be a frame stale. Forge's builders set local transforms
before parenting, so (a) is also what they expect. A keep-world helper
belongs in the transform module (as Bevy's `*_in_place` variants do), not
in the world.

---

## 7. Open questions

1. **Linked lifetime without transform inheritance.** The demo's health
   bars live in another camera's units, so they can't be children of their
   enemy, and its halos copy their orb's position instead of being
   children. [`camera-views.md`](./camera-views.md) and
   [`sprite-draw-order.md`](./sprite-draw-order.md) remove those reasons;
   cases may remain. Unity DOTS (`LinkedEntityGroup`) and Bevy
   (`linked_spawn` relationships) both offer a lifetime link separate from
   the transform hierarchy.
   - (a) Wait and see (proposed): the demo's `removeWithHealthBar` and
     `removePowerUp` stay until the other designs land. (b) Add an
     ownership relationship now.

---

## 8. Testing considerations

- Unit tests in `ecs-world.test.ts`: subtree removal order and events;
  `getChildren` after reparenting; sibling order after removing a middle
  child and an unrelated entity; cycle errors; liveness errors;
  `addComponent`/`removeComponent` of `parentId` throw.
- The UI and transform suites run against the new API; one new UI test
  removes a panel and asserts its subtree is gone, and one removes an
  unrelated entity and asserts a layout group's order is unchanged.

## 9. Documentation and demo follow-up

- `common/transforms.md`: parenting through `world.setParent`; removing a
  parent removes children; changing parents keeps the local transform.
- `ecs/world.md`: the hierarchy API, and checking `isAlive` in loops that
  remove entities.
- Demo: the flame system's orphan check and `EnginesEcsComponent` are
  deleted; flames are removed with their ship. With
  [`sprite-draw-order.md`](./sprite-draw-order.md), the power-up halo can
  become a child of its orb and `removePowerUp` goes too.
