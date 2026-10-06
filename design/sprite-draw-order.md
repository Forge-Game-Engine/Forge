# Design: Draw Order Relative to the Hierarchy

|                                       |                                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                             |
| **Kind**                              | Defect                                                                                                                                                                                                        |
| **Found in**                          | Galactic Journey demo: `src/engine-flame/engine-flame.system.ts` (`sortDepth = ship.y - behindShipDepth` every frame), `src/power-ups/power-up.system.ts` (`y - 0.001`), `sortDepth` of `-1e6`, `-1e5`, `-1000` and `-500` on the warnings, exhaust, planet and finish line |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                      |
| **Related**                           | [`hierarchy-removal.md`](./hierarchy-removal.md) (prerequisite: the children index), [`sprite-textures.md`](./sprite-textures.md)                                                                              |

## 0. Targeted modules

| Path                                             | Change   | Notes                                                                                     |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `src/rendering/components/sprite-component.ts`   | Modified | `order` (relative to the parent) replaces `sortDepth`                                     |
| `src/text/components/text-component.ts`         | Modified | Same                                                                                      |
| `src/rendering/components/camera-component.ts`   | Modified | `ySort` for games that sort by height on screen                                           |
| `src/rendering/systems/render-system.ts`         | Modified | Exact sort by layer, world order, (Y), hierarchy order                                    |
| `src/ui/systems/ui-layout-system.ts`             | Modified | Stops writing `sortDepth` into sprites and text                                           |
| `documentation-site/docs/docs/rendering/index.md` | Modified | Draw order rules                                                                         |

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
  steps across the range a camera draws that frame. With the exhaust's
  `-1e5` in the frame, each step is about 24 units, more than the screen's
  height, so the demo's `1e-3` offsets have no effect and sprites on
  screen draw in query order, which changes as entities are removed.

The Y-sort default is also a genre choice made for every game: in a side
view (like the demo), overlapping sprites swap as they move up and down.
And it runs the wrong way for a top-down view in a Y-up world: lower on
screen should be in front, but lower Y draws first. The UI works around it
by writing every element's tree position into `sortDepth`, a second writer
on the sprite component.

This design follows Godot and Bevy: an `order` relative to the parent,
children drawn after their parents, exact sorting, and Y-sorting as a
camera setting for the games that want it.

---

## 2. Scope

### In scope

- `order` on sprites and text, composed through the hierarchy.
- Children drawn after their parent, siblings in the order they were
  parented.
- `CameraEcsComponent.ySort`.
- Exact sorting.
- Removing `sortDepth`, and the UI layout system's writes to it.

### Out of scope

- **Ordering across cameras.** Unchanged (camera `layer`).
- **An `order` on entities with neither a sprite nor text.** Containers
  contribute `0` to their descendants' order (open question 1).

---

## 3. How established engines handle this

- **Godot**: canvas items draw in tree order (parents before children,
  siblings in order). `z_index` is relative to the parent by default
  (`z_as_relative`), so a child at `-1` draws behind its parent's level.
  `show_behind_parent` draws a child just under its parent. Y-sorting is
  opt-in per node (`y_sort_enabled`), and sorts that node's children, each
  with its subtree.
- **Bevy**: 2D draw order is the global Z of the transform, which is the
  sum of local Z values down the hierarchy, so a child at `-0.1` sits just
  behind its parent wherever the parent is.
- **Unity**: sorting layer, then order in layer, then distance along the
  camera's transparency sort axis, which is set per camera (or project) to
  Y for top-down games.

None of them y-sorts by default; all of them let a child sort relative to
its parent.

---

## 4. Design

### 4.1 Sort key

A camera draws its sprites and text sorted by:

1. `layer` (as today).
2. **World order**: the entity's `order` plus its parent's world order, up
   the hierarchy (ancestors without a sprite or text count as `0`). The
   default `order` is `0`.
3. **Y**, if the camera's `ySort` is set: higher world Y draws first, so
   lower on screen is in front. A subtree sorts by its root's Y, so a
   character's sword stays with the character.
4. **Hierarchy order**: a parent before its children, siblings in the
   order they were parented (the world's children index from
   [`hierarchy-removal.md`](./hierarchy-removal.md)).
5. The entity handle, for unrelated entities that tie on everything else,
   so the order is the same every frame.

The sort is exact. It stays linear-time with a radix sort over the
packed key instead of the quantized counting sort.

### 4.2 What the demo writes

- Flames and halos: `order: -1` once, at creation. They draw behind their
  parent; nothing updates them per frame.
- Warnings, exhaust, planet and finish line: their own `layer`s, which say
  what the magic numbers meant.

### 4.3 UI

UI elements are a hierarchy, so the default order is already tree order.
The UI layout system stops writing sprites' and texts' sort depth.
`RectTransformEcsComponent.sortDepth` (the UI's own topmost-first ordering
for raycasts and navigation) is unaffected and keeps its single writer.

---

## 5. Phases

### Phase 1: Hierarchical draw order

| #   | Task                                                                                         | Size |
| --- | -------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `order` on sprite and text; `sortDepth` removed                                              | S    |
| 1.2 | Render system: world order, hierarchy order, entity tiebreak; exact radix sort               | M    |
| 1.3 | `CameraEcsComponent.ySort`                                                                   | S    |
| 1.4 | UI layout system stops writing sort depth; UI suites pass                                    | S    |
| 1.5 | Stress-test demo timing before and after                                                     | S    |
| 1.6 | Migrate docs demos and e2e scenes using `sortDepth`; guide; changelog under `#### Changed`     | S    |

**Definition of done:** a child with `order: -1` draws behind its parent
with no per-frame code; draw order never depends on query order; the
stress-test demo is no slower.

Depends on [`hierarchy-removal.md`](./hierarchy-removal.md) for the
children index.

---

## 6. Decision log

### DL-1: No Y-sort by default

**Options.** (a) Keep Y as the default depth, reversed so lower on screen
is in front. (b) No position-based sorting unless the camera asks.

**Decision: (b).**

**Rationale.** Y-sorting suits top-down games and breaks side views, so it
isn't a general default; none of Unity, Godot or Bevy has it on by
default. A camera setting fits because it's a property of the view, as in
Unity, and different games really need different values.

### DL-2: Order relative to the parent

**Options.** (a) Relative (Godot's default, Bevy's Z). (b) Absolute, with
children inheriting nothing.

**Decision: (a).**

**Rationale.** "Just behind the thing I'm attached to" is the common case
(flames, shadows, halos, outlines). Under (b) it needs a system that
copies the parent's value every frame, which is what the demo has.

### DL-3: An exact sort

**Rationale.** Draw order changing because an unrelated sprite far away
widened the depth range isn't acceptable for any value of the bucket
count. A radix sort on the packed key is exact and linear, the property
the counting sort was chosen for.

---

## 7. Open questions

1. **Should containers without sprites or text carry an `order`** (a
   separate draw-order component, like Godot's `z_index` on any
   `Node2D`)? Not needed by the demo or the UI.
   - (a) Not now (proposed). (b) A `DrawOrderEcsComponent`.

---

## 8. Testing considerations

- Order composition through two levels; hierarchy order between parent
  and children and between siblings; entity tiebreak stable across
  removals of other entities.
- `ySort`: lower on screen in front; a subtree moves with its root.
- A depth range of `1e6` doesn't change the order of sprites `1e-3` apart.
- The UI suites, unchanged in expectations.

## 9. Documentation and demo follow-up

- `rendering/index.md`: the sort key above, replacing the `sortDepth`
  paragraph.
- Demo: the flame and halo `sortDepth` updates are deleted; the magic
  numbers become layers.
