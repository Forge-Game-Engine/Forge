# Design: Draw Order Relative to the Hierarchy

|                                       |                                                                                                                                                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                           |
| **Kind**                              | Defect                                                                                                                                                                                                                                                                      |
| **Found in**                          | Galactic Journey demo: `src/engine-flame/engine-flame.system.ts` (`sortDepth = ship.y - behindShipDepth` every frame), `src/power-ups/power-up.system.ts` (`y - 0.001`), `sortDepth` of `-1e6`, `-1e5`, `-1000` and `-500` on the warnings, exhaust, planet and finish line |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                    |
| **Related**                           | [`hierarchy-removal.md`](./hierarchy-removal.md) (prerequisite: the children index), [`sprite-textures.md`](./sprite-textures.md), [`hierarchical-visibility.md`](./hierarchical-visibility.md)                                                                             |

## 0. Targeted modules

| Path                                                                                    | Change   | Notes                                                                                       |
| --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `src/rendering/components/draw-order-component.ts`                                      | **New**  | `DrawOrderEcsComponent { order }`: a bounded integer, relative to the parent                |
| `src/rendering/components/sprite-component.ts`, `src/text/components/text-component.ts` | Modified | `sortDepth` removed                                                                         |
| `src/rendering/components/camera-component.ts`                                          | Modified | `ySort` for games that sort by height on screen                                             |
| `src/rendering/draw-order.ts`                                                           | **New**  | Resolves each entity's draw key once per frame (world order, pre-order index)               |
| `src/rendering/systems/render-system.ts`                                                | Modified | Exact radix sort by layer, world order, (Y), hierarchy order                                |
| `src/ui/systems/ui-layout-system.ts`, `ui-raycast-system.ts`, `ui-navigation-system.ts` | Modified | UI hit-testing and navigation use the draw key; the layout system stops writing sort depths |
| `src/ecs/ecs-world.ts`                                                                  | Modified | A creation sequence number per entity, for root order                                       |
| `documentation-site/docs/docs/rendering/index.md`, docs demos, e2e                      | Modified | Draw order rules                                                                            |

---

## 1. Summary

Within a sprite `layer`, Forge sorts by depth, which is the sprite's world
Y unless `sortDepth` overrides it. Lower depth draws first. That causes
three problems in the demo:

- **A child can't be drawn relative to its parent.** Engine flames are
  children of their ship and belong just behind it. `sortDepth` is
  absolute, so the flame system sets it to the ship's Y minus a small
  offset every frame. The power-up halo does the same behind its orb.
- **Depth is position, so ordering is magic numbers.** Backgrounds that
  must stay behind everything get `sortDepth` values of `-1e6`, `-1e5`,
  `-1000` and `-500`. (The sprite `layer` field would have done it, but
  `createImageSprite` also has a `layer` option that means something else:
  the camera culling category. See [`sprite-textures.md`](./sprite-textures.md).)
- **The sort isn't exact.** The render system buckets depths into 4096
  steps across the range of everything a camera submits that frame, all
  layers and off-screen sprites included. With the exhaust's `-1e5` in the
  frame, each step is about 24 units, more than the screen's height, so
  every sprite on screen shares a step: the `1e-3` offsets have no effect,
  Y-sorting is lost entirely, and sprites draw in query order, which
  changes as entities are removed.

The Y-sort default is also a genre choice made for every game: in a side
view (like the demo), overlapping sprites swap as they move up and down.
And it runs the wrong way for a top-down view in a Y-up world: lower on
screen should be in front, but lower Y draws first. The UI works around it
by writing every element's tree position into `sortDepth`, a second writer
on the sprite component, and its raycasts and navigation use a separate
copy of that order, so what's drawn on top isn't guaranteed to be what's
hit first.

This design follows Godot and Bevy: an `order` relative to the parent,
children drawn after their parents, exact sorting, Y-sorting as a camera
setting for the games that want it, and one draw order that UI input uses
too.

---

## 2. Scope

### In scope

- `DrawOrderEcsComponent` on any entity (sprites, text, containers),
  composed through the hierarchy.
- A total draw order: children after their parent, siblings in their
  parenting order, roots in creation order.
- `CameraEcsComponent.ySort`.
- An exact sort, resolved once per frame.
- UI raycasts and navigation using the same order; the UI layout system
  no longer writing sort depths.
- Removing `sortDepth`.

### Out of scope

- **Ordering across cameras.** Unchanged (camera `layer`).
- **Reordering siblings** (bringing a window to the front), which Unity
  (`SetSiblingIndex`) and Godot (`move_child`) provide. Open question 2.

---

## 3. How established engines handle this

- **Godot**: canvas items draw in tree order (parents before children,
  siblings in order). `z_index` is relative to the parent by default
  (`z_as_relative`) and bounded (±4096); items only sort against each
  other within the same `z_index`, so a child at `-1` draws behind
  everything at its parent's level, not just its parent.
  `show_behind_parent` is the separate option for "just under my parent".
  Y-sorting is opt-in per node (`y_sort_enabled`), and sorts that node's
  children, each with its subtree. `z_index` doesn't affect input order,
  which Godot documents as a pitfall.
- **Bevy**: 2D draw order is the global Z of the transform, which is the
  sum of local Z values down the hierarchy. Bevy UI's `UiStack` decides
  both drawing and which node is hit first.
- **Unity**: sorting layer, then order in layer, then distance along the
  camera's transparency sort axis, which is set per camera (or project) to
  Y for top-down games. A Sorting Group sorts a subtree as one unit.
  UI raycasts hit what's drawn on top.

None of them y-sorts by default; all of them let a child sort relative to
its parent.

---

## 4. Design

### 4.1 `DrawOrderEcsComponent`

```ts
interface DrawOrderEcsComponent {
  /** An integer in [-4096, 4096], added to the parent's world order. Default 0. */
  order: number;
}
```

It goes on any entity: a sprite, a text, or a container whose subtree
should move as one. An entity without it has an order of `0`. Values
outside the range, or not integers, throw when added.

A child's world order is its own order plus its parent's world order, as
in Godot: a flame at `-1` draws behind every entity at its ship's level
in the layer, not just its own ship. For the demo's flames and halos that's
the intended look.

### 4.2 Sort key

A camera draws its sprites and text sorted by:

1. `layer` (as today).
2. **World order** (§4.1).
3. **Y**, if the camera's `ySort` is set: higher world Y draws first, so
   lower on screen is in front. A subtree sorts by its root's Y, so a
   character's sword stays with the character. The root here is the
   top-most ancestor, so a game that parents its whole scene under one
   root gets no Y-sorting; Godot avoids that by scoping Y-sort to one
   node's children (open question 3).
4. **Hierarchy order**: a pre-order index over the whole forest. Roots are
   ordered by creation (the world gives each entity a sequence number when
   it's created, since handle numbers are reused), children by the
   sibling-order contract in [`hierarchy-removal.md`](./hierarchy-removal.md).

The pre-order index is unique per entity, so this is a total order.
Within one entity, draws keep a fixed order: a sprite before its text,
nine-slice regions in order, text effects before the fill.

### 4.3 Resolving and sorting

World order and the pre-order index are resolved once per frame, for
every entity that draws, not once per camera, and entities are sorted
rather than per-glyph commands. The key's parts (hierarchy index, then Y
if the camera y-sorts, then world order, then layer) are sorted by a
stable least-significant-part-first radix sort, with Y's float bits mapped
to sortable unsigned integers. It's exact and linear, the properties the
counting sort was chosen for.

### 4.4 What the demo writes

- Flames and halos: `order: -1` once, at creation. They draw behind their
  parent's level; nothing updates them per frame. The halo is a separate
  entity copying its orb's position today, so it becomes a child of its
  orb first.
- Warnings, exhaust, planet and finish line: their own `layer`s, which say
  what the magic numbers meant.

### 4.5 UI

UI elements are a hierarchy, so the default order is already tree order.
The UI layout system stops writing sprites' and texts' sort depths, and
stops computing its own order from query order. The raycast and
navigation systems use the same draw key, so the element drawn on top is
the one hit first (as in Unity and Bevy UI): a dropdown list raised with
`order` both draws above and takes clicks before its later siblings.
`RectTransformEcsComponent.sortDepth` is removed.

---

## 5. Phases

### Phase 1: Hierarchical draw order

| #   | Task                                                                                                                                                                                 | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1.1 | `DrawOrderEcsComponent`; `sortDepth` removed from sprite and text; entity creation sequence                                                                                          | S    |
| 1.2 | Per-frame draw-key resolution; exact radix sort; render system uses it                                                                                                               | M    |
| 1.3 | `CameraEcsComponent.ySort`                                                                                                                                                           | S    |
| 1.4 | UI raycast and navigation use the draw key; the layout system's sort depths and `RectTransformEcsComponent.sortDepth` removed                                                        | M    |
| 1.5 | Stress-test demo: frame time and draw calls before and after                                                                                                                         | S    |
| 1.6 | Audit every docs demo and e2e scene that relies on implicit Y order (the world-space UI canvas demo among them) and migrate `sortDepth` users; guide; changelog under `#### Changed` | M    |

**Definition of done:** a child with `order: -1` draws behind its parent
with no per-frame code; draw order never depends on query order; the UI
hits what it draws on top; the stress-test demo is no slower.

Depends on [`hierarchy-removal.md`](./hierarchy-removal.md) for the
children index and sibling order.

---

## 6. Decision log

### DL-1: No Y-sort by default

**Options.** (a) Keep Y as the default depth, reversed so lower on screen
is in front. (b) No position-based sorting unless the camera asks.

**Decision: (b)**, subject to the team's sign-off (open question 1),
since it changes the default draw order for every game.

**Rationale.** Y-sorting suits top-down games and breaks side views, so it
isn't a general default; none of Unity, Godot or Bevy has it on by
default. A camera setting fits because it's a property of the view, as in
Unity, and different games really need different values.

### DL-2: Order relative to the parent, on its own component

**Options.** (a) A relative order on its own component, usable on any
entity (Godot's `z_index` on every `CanvasItem`). (b) A relative order on
the sprite and text components. (c) Absolute orders, with children
inheriting nothing.

**Decision: (a).**

**Rationale.** "Behind the thing I'm attached to" is the common case
(flames, shadows, halos, outlines), and under (c) it needs a system that
copies the parent's value every frame, which is what the demo has. (b)
can't order a container's subtree, and is ambiguous for an entity with
both a sprite and text (the UI has those).

### DL-3: An exact sort with a total order

**Rationale.** Draw order changing because an unrelated sprite far away
widened the depth range isn't acceptable for any value of the bucket
count, and neither is order depending on how entities happen to sit in
their component storage. A radix sort on the key's parts is exact and
linear; the pre-order index makes the order total.

### DL-4: UI input follows draw order

**Options.** (a) Raycasts and navigation use the draw key. (b) They keep
their own tree order, as Godot does.

**Decision: (a).**

**Rationale.** With (b), an element raised with `order` draws on top but
loses clicks to whatever comes later in the tree, which Godot documents as
a pitfall. Unity and Bevy hit what's drawn on top.

---

## 7. Open questions

1. **Approve the new default.** DL-1 changes how every existing game's
   sprites are ordered within a layer (no more implicit Y-sort).
   - (a) Approve (proposed). (b) Keep Y-sorting as the default, reversed
     to be correct for a Y-up top-down view.
2. **Sibling reordering.** Bringing a window to the front needs a way to
   move a child within its parent's list.
   - (a) Add `world.setSiblingIndex` with this design. (b) Later, when a
     game needs it (proposed).
3. **Where Y-sorting is scoped.** A camera flag sorts every root subtree
   by Y. Godot scopes it to one node's children, which also works for a
   scene parented under a single root.
   - (a) Camera flag (proposed, simplest). (b) A component on a parent
     that Y-sorts its children.

---

## 8. Testing considerations

- Order composition through two levels and on a container; hierarchy
  order between parent and children and between siblings; root order by
  creation, stable across removals of other entities; out-of-range
  orders throw.
- `ySort`: lower on screen in front; a subtree moves with its root.
- A depth range of `1e6` doesn't change the order of sprites `1e-3` apart.
- UI: a raised element is hit before a later sibling; navigation picks
  the topmost drawn element.

## 9. Documentation and demo follow-up

- `rendering/index.md`: the sort key above, replacing the `sortDepth`
  paragraph.
- Demo: the flame and halo `sortDepth` updates are deleted (the halo
  becomes a child of its orb); the magic numbers become layers.
