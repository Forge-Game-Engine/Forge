# Design 04: Transforms

|                                       |                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review (revised after solution review, §7)                                                                                                                                                                                                                                                                                                                                               |
| **Kind**                              | Feature and breaking refactor                                                                                                                                                                                                                                                                                                                                                                       |
| **Engine version at time of writing** | `0.26.1`                                                                                                                                                                                                                                                                                                                                                                                            |
| **Program**                           | [Forge 3D](./README.md), milestone M1                                                                                                                                                                                                                                                                                                                                                               |
| **Depends on**                        | [02 Math](./02-math.md), [03 ECS foundations](./03-ecs-foundations.md)                                                                                                                                                                                                                                                                                                                              |
| **Related**                           | [06 Render pipeline](./06-render-pipeline.md) (GPU scene uploads on `changedTick`), [07 2D on the render pipeline](./07-2d-on-the-render-pipeline.md), [12 Skeletal and morph animation](./12-skeletal-and-morph-animation.md) and [14 Physics 3D](./14-physics-3d.md) (`getCurrentWorldMatrix`), [15 Audio, particles and picking](./15-audio-particles-and-picking-in-3d.md) (`TransformOptions`) |

## 0. Targeted modules

| Path                                                                                                   | Change   | Notes                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/common/components/transform-component.ts`                                                         | New      | `TransformEcsComponent`, `addTransformComponent`, `TransformOptions`, `staticTransformTag`                                                   |
| `src/common/components/position-component.ts`, `rotation-component.ts`, `scale-component.ts`           | Removed  | Replaced by the transform                                                                                                                    |
| `src/common/systems/transform-system.ts`                                                               | Modified | Rewritten: 3D composition, change detection, static subtrees excluded, no closure state; exports `transformPropagationGroup`                 |
| `src/utilities/create-game.ts`                                                                         | Modified | Registers `createTransformEcsSystem()`                                                                                                       |
| `src/common/transform-2d.ts`                                                                           | New      | `getLocalAngle`, `setLocalAngle`, `addLocalAngle`, `getWorldAngle`                                                                           |
| `src/common/transform-helpers.ts`                                                                      | New      | World-space getters and setters, point conversion, reparenting that keeps the world transform, `propagateTransform`, `getCurrentWorldMatrix` |
| `src/common/space/`                                                                                    | Removed  | `Space` has no callers                                                                                                                       |
| `src/physics/**`                                                                                       | Modified | Reads `transform.world`, writes `transform.local`; revolute joints measure the relative angle from the relative rotation                     |
| `src/rendering/**`, `src/ui/**`, `src/particles/**`, `src/text/**`                                     | Modified | Read `transform.world`, write `transform.local` (§6.7)                                                                                       |
| `demo/`, `e2e/`, `documentation-site/src/pages/demos/**`                                               | Modified | Migrated                                                                                                                                     |
| `documentation-site/docs/docs/common/transforms.md`, `physics/index.md`, `math/angles-and-rotation.md` | Modified | Rewritten for the component, stages and wrapped angles                                                                                       |
| `AGENTS.md`                                                                                            | Modified | "Transforms" and "Angles and Directions"                                                                                                     |
| `.claude/skills/create-component/SKILL.md`                                                             | Modified | Its naming example's `positionId`/`'position'` becomes `transformId`/`'transform'`                                                           |

---

## 1. Summary

An entity's transform is three components today: `PositionEcsComponent`
(`Vector2`), `RotationEcsComponent` (an angle) and `ScaleEcsComponent`
(`Vector2`), each with a `local` input and a `world` output. The transform
system composes them with up to nine `getComponent` calls per entity,
recurses up the parent chain, and keeps a `WeakMap` of static entities in
its closure.

This design replaces them with one 3D component, as the product owner
decided (README P2):

```ts
interface TransformEcsComponent {
  local: { position: Vector3; rotation: Quaternion; scale: Vector3 };
  readonly world: WorldTransform; // position, rotation, scale, matrix, changedTick
}
```

`local` is the input every system writes; `world` is the output only the
transform system writes. It now also holds the world matrix the renderer
draws with, and a `changedTick` (design 03) recording when it last changed,
so the renderer uploads and physics refits only what moved.

The transform system visits only non-static transforms (and static ones
below a moving parent), skips those whose local values and parent didn't
change, and keeps no state of its own. Static subtrees (a
`staticTransformTag`) cost nothing per frame.

2D games keep writing `x` and `y`. Positions are `Vector3`s, but `z`
defaults to `0` and `Vec2` operations work on them unchanged. Rotation is
a quaternion, and four helpers read and write it as the 2D angle Forge uses
today.

---

## 2. Scope

### In scope

- `TransformEcsComponent`, `addTransformComponent` and `staticTransformTag`,
  replacing position, rotation and scale.
- The rewritten transform system.
- 2D helpers and world-space helpers.
- Migrating every caller in `/src`, `/demo`, `/e2e` and the docs site, and
  deleting the three old components and `Space`.

### Out of scope

- **Interpolating physics bodies between fixed steps.** Design 14 owns body
  poses and writes their `local` transform from them.
- **Drawing with the world matrix.** In this design the 2D renderer keeps
  its projection and reads `world.position`, `getWorldAngle` and
  `world.scale`; design 07 moves it to matrices.
- **A UI-specific transform.** Forge's UI is entities in the same
  hierarchy; layout keeps writing `local.position`.
- **Enforcing ownership in types.** `readonly` in TypeScript is shallow, so
  `Vec3.add(transform.world.position, v)` compiles. Ownership of `world` is
  enforced by documentation, as it is today.

---

## 3. Phases

### Phase 1: The transform component and migration

One release: the old components can't coexist with the new one without a
compatibility layer, which the change philosophy rules out.

| #   | Task                         | Description                                                                                                                                                                                                                                                                                                     | Size |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Component, tag and factory   | §6.1, §6.2                                                                                                                                                                                                                                                                                                      | S    |
| 1.2 | Transform system             | §6.3, without change detection: composes every visited transform; `transformPropagationGroup`; `createGame` and `createTestWorld()` register the system                                                                                                                                                         | M    |
| 1.3 | 2D and world-space helpers   | §6.4, §6.5                                                                                                                                                                                                                                                                                                      | M    |
| 1.4 | Engine migration             | Every `/src` caller (§6.7), including the revolute joint's relative angle                                                                                                                                                                                                                                       | L    |
| 1.5 | Demo, e2e and docs migration | `/demo`, about 35 files in demos and e2e scenes, every guide that shows the old components; the physics guide's ordering section; the `create-component` skill's naming example                                                                                                                                 | L    |
| 1.6 | Deletions                    | The three old components, the old system's helpers, `Space`                                                                                                                                                                                                                                                     | S    |
| 1.7 | Changelog                    | `#### Changed`: one bullet with the migration (`addPositionComponent(w, e, { local: p })` → `addTransformComponent(w, e, { position: p })`, `position.world` → `transform.world.position`, angles through the helpers, angles now wrap to `(-π, π]`, revolute limits within `(-π, π)`); `#### Removed`: `Space` | S    |

**Definition of done:** every unit test, e2e spec and golden passes; every
demo runs; nothing imports the old components.

### Phase 2: Change detection and static subtrees

Makes the transform system skip unchanged entities and static subtrees, so
a still scene costs almost nothing.

| #   | Task                      | Description                                                                                                                 | Size |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | Prototype and targets     | Measure the §6.8 scenarios on a prototype; replace the starting estimates with measured targets                             | S    |
| 2.2 | Change detection          | §6.3.3: compare with what was last composed; stamp `changedTick` only on change                                             | M    |
| 2.3 | Static subtrees           | §6.3.2: static transforms excluded from the walk; computed from journals                                                    | M    |
| 2.4 | Allocation and benchmarks | Allocation spec; `transform-system.bench.ts`                                                                                | S    |
| 2.5 | Changelog                 | `#### Changed` (perf): the transform system skips unchanged transforms and static subtrees; `staticTransformTag` documented | S    |

**Definition of done:** the §6.8 targets are met; a still scene stamps
nothing; static subtrees under static roots are never visited; the
system's closure holds nothing.

---

## 4. Decision log

| #   | Decision                                                | Options                                                                                                                                                                              | Chosen                            | Rationale, trade-offs, assumptions                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1  | One component or three                                  | (a) One `TransformEcsComponent`; (b) keep position, rotation and scale separate, in 3D                                                                                               | (a)                               | A world matrix needs all three, so composition reads all three for the entity and its parent. Unity, Godot and Bevy each have one transform. A rotation or scale without a position has no use. Trade-off: every caller changes, once.                                                                                                |
| X2  | `local` and `world` in one component or two             | (a) One component with both, as Forge does today; (b) separate local and world components, as Bevy does                                                                              | (a)                               | Keeps Forge's existing model (`local` in, `world` out, one owner each), with one lookup instead of two in systems that read both.                                                                                                                                                                                                     |
| X3  | What `world` holds                                      | (a) The matrix only; (b) decomposed position, rotation and scale plus the matrix                                                                                                     | (b)                               | The renderer needs the matrix; physics, audio, cameras and game code need position and rotation, and decomposing a matrix on every read is slow. Composing both costs one quaternion product and a few multiplies.                                                                                                                    |
| X4  | Change detection                                        | (a) Compare `local` and the parent's stamp with what was last composed; (b) setters that mark the transform dirty; (c) recompute everything visited every frame                      | (a)                               | Design 03 decision E3. Comparing ten numbers is several times cheaper than composing, and can't be forgotten the way marking can. It also handles UI layout, which rewrites the same values every frame. Trade-off: ten numbers of memory per transform.                                                                              |
| X5  | Static transforms                                       | (a) A tag that excludes the entity from the walk, computed from journals; (b) an `isStatic` field checked per entity, as today; (c) no static concept                                | (a)                               | (b) still visits every static entity every frame. Excluding them from the membership (design 03's `without`) makes static subtrees free, which is what Bevy's static-scene optimization achieves by marking dirty trees. Becoming static, leaving it and being reparented are structural changes, so journals see them.               |
| X6  | Entities without a transform in a hierarchy             | (a) They cut the chain: their children compose from the origin, as today; (b) they pass their parent's transform through                                                             | (a)                               | Today's behavior, and Godot's for a child of a node that isn't a `Node3D`. Bevy instead stops propagation at a parent without `GlobalTransform` and warns (B0004); Forge follows Godot. (b) would force the walk through every entity and make a transformless intermediate's changes invisible to its descendants' change detection. |
| X7  | 2D rotation                                             | (a) Helpers that read and write the angle about Z; (b) a separate 2D angle field kept in sync                                                                                        | (a)                               | One stored rotation means one owner. `addTransformComponent` accepts a number for `rotation` as the angle about Z. Angles read back wrap to `(-π, π]`, since a quaternion doesn't count turns (§6.4).                                                                                                                                 |
| X8  | Systems that move entities after propagation            | (a) `propagateTransform(world, entity)` recomputes that entity's subtree immediately; (b) only ordering, accepting a frame of lag                                                    | (a), with ordering as the default | Godot's `force_update_transform` serves the same purpose. A function owned by the transform module keeps the module the only writer of `world`.                                                                                                                                                                                       |
| X9  | World rotation and scale under non-uniform parent scale | (a) Products along the chain, as Unity's lossy scale; (b) a polar decomposition of the world matrix                                                                                  | (a)                               | Exact unless a rotated child sits under a non-uniformly scaled parent. The matrix is always exact, and it's what rendering uses.                                                                                                                                                                                                      |
| X10 | Model front                                             | (a) Forward is `-Z` for everything; models keep glTF's `+Z` front; `Vec3.modelFront` and `Quat.modelLookRotation` name it; (b) rotate every imported model 180° so its front is `-Z` | (a)                               | Rotating on import would put objects from a level exported from a modeling tool at mirrored positions (`x → -x`, `z → -z`), which breaks level workflows. Godot 4 has the same split and names it the same way (`MODEL_FRONT`). Cameras and lights aim `-Z`; a character turns its model front towards where it walks.                |

---

## 5. Open questions

None outstanding. The first draft's question about warning when a static
entity moves is answered by X5: changing a static entity's `local` has no
effect until the tag is removed or the entity is reparented, which the
guide states.

---

## 6. Design

### 6.1 The component

```ts
export interface LocalTransform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface WorldTransform {
  readonly position: Vector3;
  readonly rotation: Quaternion;
  readonly scale: Vector3;
  /** Affine, column-major, 64-bit. */
  readonly matrix: Matrix4;
  /** The change tick this value last changed in, 0 until first computed. */
  readonly changedTick: number;
}

export interface TransformEcsComponent {
  /** Relative to the parent, or the world when there's none. Write this to move the entity. */
  local: LocalTransform;
  /** Output only, written by the transform module. */
  readonly world: WorldTransform;
}

export const transformId =
  createComponentId<TransformEcsComponent>('transform');
/** The entity doesn't move relative to its parent. Under a static parent or at the root, changes to its `local` have no effect until the tag is removed or the entity is reparented. */
export const staticTransformTag = createTagId('static-transform');
```

The component also carries, in a field documented as output-only, what was
last composed: the ten local numbers, the parent handle and the parent's
`changedTick` at the time. That's the state the old system kept in a
`WeakMap` in its closure; on the component, it goes away with the entity.

### 6.2 Adding a transform

```ts
addTransformComponent(world, entity, {
  position: { x: 4, y: 2 }, // z defaults to 0
  rotation: Math.PI / 4, // a number is the angle about Z
  scale: { x: 2, y: 2 }, // z defaults to 1
});

addTransformComponent(world, entity, {
  position: { x: 0, y: 1.5, z: -3 },
  rotation: Quat.fromYawPitchRoll(Quat.identity, Math.PI, 0, 0),
  isStatic: true, // adds staticTransformTag
});
```

The options type is `TransformOptions`, exported with the factory so other
factories can take transform options as they are (design 15's
`spawnParticleBurst` does):

| Option     | Type                       | Default     |
| ---------- | -------------------------- | ----------- |
| `position` | `Vector2 & { z?: number }` | `(0, 0, 0)` |
| `rotation` | `Quaternion \| number`     | identity    |
| `scale`    | `Vector2 & { z?: number }` | `(1, 1, 1)` |
| `isStatic` | `boolean`                  | `false`     |

The factory copies values into fresh objects (systems mutate `local` in
place, so a shared default or a caller's object must never end up in it),
applies defaults with `withDefaults`, and sets `world` as if the entity had
no parent, so `world` is meaningful before the first propagation.

### 6.3 The transform system

The transform module adds and exports `transformPropagationGroup`, a
group in `postUpdate` (design 03 §6.6.1). `createTransformEcsSystem()`
declares `stage: 'postUpdate'` and `group: transformPropagationGroup`, so
other modules can order their own groups against it, as Bevy's plugins
order against its transform propagation set. Groups whose systems write
`local` are ordered `before: transformPropagationGroup`: design 14's
`physicsWriteBackGroup`, design 12's `animationGroup` and
`poseAdjustmentGroup`, and the UI layout group. Camera controllers are the
exception: they follow targets, so they're ordered `after` it and call
`propagateTransform` for their camera (§6.6, design 06 §6.2). Design 15's
`audioGroup` and `particleGroup` are ordered `after` it too, since they
read `world`. `createGame` and `createTestWorld()` register
`createTransformEcsSystem()`, so a game or test that moves an entity never
has to remember it.

#### 6.3.1 The walk

The system declares `query: [transformId]` with `without: [staticTransformTag]`
(the dynamic transforms). Each run:

```text
for each dynamic entity e:
  p = e's parent
  if p has a dynamic transform: continue          // reached from p's walk
  walk(e, base = p's world if p has a transform, else identity)

walk(e, base):
  if changed(e, base): compose(e, base)
  for each child c of e (world.getChildren):
    if c has a transform: walk(c, e.world)         // static children too: they follow a moving parent
```

Only a dynamic entity whose parent is static, transformless or absent
starts a walk. Children are reached through the world's children index, so
an entity without children costs no walk. Transformless entities cut the
chain (decision X6): their children start walks of their own with an
identity base.

#### 6.3.2 Static subtrees

A static transform (one with `staticTransformTag`) doesn't move relative to
its parent. Two secondary declarations find the moments it has to be
computed:

- `statics`: `[transformId]` with `tags: [staticTransformTag]`. Its `added`
  journal holds entities that became static or were created static; they
  are composed once (parents first).
- `staticParents`: `[transformId, parentId]` with the tag. Its `added`
  journal holds static entities given a new parent (`setParent` replaces
  the parent component); `removed` holds those whose parent was removed.
  They're recomposed.

A static entity under a dynamic parent is still reached by its parent's
walk and follows it, as `isStatic` behaves today. A static entity under a
static parent or at the root is never visited again: changing its `local`
has no effect until the tag is removed (which makes it dynamic, through the
membership) or it's reparented. The guide says so.

#### 6.3.3 Change detection

`changed(e, base)` is true when any of the ten `local` numbers differ from
what was last composed, when the parent handle differs, or when the
parent's `world.changedTick` differs from the one recorded at the last
composition. Comparing recorded stamps for inequality (rather than "is it
this tick") stays correct when the system or `propagateTransform` runs more
than once in a tick, or a run is skipped.

#### 6.3.4 Composing

- `matrix = base.matrix × fromTransform(local)` with `Mat4.fromTransform`
  and `Mat4.multiplyAffine` (design 02).
- `position` = the matrix's translation.
- `rotation = base.rotation × local.rotation`, normalized.
- `scale = base.scale × local.scale`, per axis (X9).
- Record what was composed; `world.changedTick = world.changeTick`.

A zero scale is allowed: the matrix is written, and consumers that need an
inverse handle a singular one (design 02 §6.6.2).

### 6.4 2D helpers

`src/common/transform-2d.ts`:

```ts
getLocalAngle(transform): number;            // angle about Z of local.rotation, in (-π, π]
setLocalAngle(transform, radians): void;      // writes local.rotation in place
addLocalAngle(transform, radians): void;      // turns about Z
getWorldAngle(transform): number;             // angle about Z of world.rotation, in (-π, π]
```

They use `Quat.angleZ` and `Quat.fromAngleZ` (design 02), are exact for 2D
rotations, and follow Forge's angle convention. A 2D system reads almost as
it does today:

```ts
// 0.26
position.local.x += velocity.x * dt;
rotation.local += spin * dt;

// after this design
Vec2.scaleAndAdd(transform.local.position, velocity, dt);
addLocalAngle(transform, spin * dt);
```

**Angles wrap.** Today a 2D angle is an unbounded number (`rotation.local`
can reach `10π`), and world angles are sums. A quaternion doesn't count
turns, so angles read back are in `(-π, π]`. Code that subtracts two angles
must use the relative rotation instead. The one engine case is the
revolute joint's limit, which today subtracts body angles; it computes the
angle of `inverse(rotationA) × rotationB`, as Box2D v3 does, and limits are
restricted to `(-π, π)`. The guide and `AGENTS.md`'s "Angles and Directions"
say this.

### 6.5 World-space helpers

`src/common/transform-helpers.ts`:

| Helper                                                           | What it does                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getWorldForward(out, transform)`, `getWorldRight`, `getWorldUp` | `-Z`, `+X`, `+Y` of `world.rotation`                                                                                                                                                                                          |
| `getModelFront(out, transform)`                                  | `+Z` of `world.rotation` (decision X10)                                                                                                                                                                                       |
| `transformPoint(out, transform, point)`                          | Local point to world, through `world.matrix`                                                                                                                                                                                  |
| `inverseTransformPoint(out, transform, point)`                   | World point to local                                                                                                                                                                                                          |
| `setWorldPosition(world, entity, position)`                      | Writes `local.position` so the entity ends up at `position`, through the parent's world inverse                                                                                                                               |
| `setWorldRotation(world, entity, rotation)`                      | The same for rotation                                                                                                                                                                                                         |
| `setParentKeepingWorldTransform(world, child, parent)`           | Reparents and rewrites `local` so the world transform is unchanged (`setParent` keeps `local`)                                                                                                                                |
| `propagateTransform(world, entity)`                              | Recomputes `entity`'s subtree now (decision X8)                                                                                                                                                                               |
| `getCurrentWorldMatrix(out, world, entity)`                      | Composes the entity's current `local` with its ancestors' current `local` values up to the root, stopping with identity at a transformless ancestor (X6). Values written since the last propagation count; nothing is written |

The setters write `local` (the input); `world` catches up at propagation,
or immediately with `propagateTransform`.

`getCurrentWorldMatrix` answers "where is this entity now" for a system
that runs before propagation and can't wait for it: physics registers
bodies, follows `animated` bodies and writes poses back with it (design
14), and pose adjustments convert between world and model space with it
(design 12). It reads `local` values only, so it never sees a stale
`world`, and it writes nothing, so the transform module stays the only
writer of `world`. It costs one affine product per ancestor.

### 6.6 Following other entities

A system in `postUpdate` that runs before propagation and reads another
entity's `world` reads last frame's value. When the source is a root, its
`local` is its world transform and is current. Otherwise, order the
follower after propagation and call `propagateTransform` for the entity it
moved. The guide shows both.

### 6.7 Migration

| Module                                                  | Today                                                                                                                                      | After                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering (sprites, text, terrain, culling, draw order) | `position.world`, `rotation.world`, `scale.world`; root Y for y-sorting                                                                    | `world.position.x/y`, `getWorldAngle`, `world.scale.x/y`; the renderer changes in design 07                                                                                                                                     |
| Cameras                                                 | Pans `position.local`; view from `position.world`                                                                                          | `transform.local.position`, `transform.world.position`                                                                                                                                                                          |
| Physics 2D                                              | Reads world position and angle; integrates into `local`; CCD sweeps from `world` (start) to `local` (end); revolute limits subtract angles | Same, through the transform. The order still holds: physics runs in `update` until design 14 moves it, before propagation in `postUpdate`, so `world` is still the start pose. Revolute limits use the relative rotation (§6.4) |
| UI                                                      | Layout writes `position.local` and sprite sizes                                                                                            | Writes `transform.local.position`                                                                                                                                                                                               |
| Particles                                               | Position, rotation and scale per particle                                                                                                  | One transform per particle; spawn uses the emitter's `getWorldAngle`                                                                                                                                                            |
| Age scale                                               | Writes `scale.local`                                                                                                                       | Writes `transform.local.scale`                                                                                                                                                                                                  |
| Masks                                                   | World rects from position and rotation                                                                                                     | Same values through the transform                                                                                                                                                                                               |

A side effect of stages (design 03): rendering now always reads this
frame's world transforms. Today's demos register rendering before physics
integration, so they draw last frame's positions.

### 6.8 Performance

Starting estimates on the desktop reference, to be replaced by measured
targets from Phase 2's prototype:

| Scenario                                                  | Estimate | Reasoning                                                  |
| --------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| 100,000 static transforms under static roots              | 0        | Never visited                                              |
| 100,000 dynamic transforms, none moved                    | ≤ 2.0 ms | About 20 ns each: a parent lookup and a ten-number compare |
| 100,000 dynamic transforms, 10% moved                     | ≤ 3.0 ms | Composing costs roughly 100 ns                             |
| 10,000 dynamic transforms in chains of depth 8, all moved | ≤ 1.5 ms |                                                            |

For comparison, recomputing every object every frame (Three.js's default)
costs a full composition per object. No allocation per tick.

### 6.9 Testing

- Composition: for random hierarchies (seeded, design 01), `world.matrix`
  equals the product of local matrices from the root; position and
  rotation match.
- Change detection: a moved entity and its descendants are stamped; others
  aren't; reparenting and removing a parent stamp the subtree; running
  propagation twice in one tick is harmless.
- Static: computed once on becoming static; recomputed on reparenting and on
  parent removal; never visited under a static root; follows a dynamic
  parent; becomes dynamic when the tag is removed.
- Transformless entities cut the chain.
- 2D helpers: round-trips; wrapping; the revolute limit across a half turn.
- World-space helpers against the matrix math.
- `getCurrentWorldMatrix`: equals `world.matrix` after propagation; sees
  `local` values written since the last propagation, on the entity and on
  an ancestor; stops with identity at a transformless ancestor.
- The full e2e and golden suites pass after migration with no changed
  images.

---

## 7. Review

`solution-reviewer` verdict on the first draft of this design and design
02: **REVISE**. One transform with 2D helpers and comparison-based change
detection were judged the right direction. Changes made:

- Transformless entities cut the chain again (X6), as today and as Godot
  and Bevy do; passing through was an undeclared behavior change that broke
  change detection.
- The world-wide hierarchy pre-order is gone: it would have been rebuilt on
  every particle spawn. The walk starts from dynamic transforms and follows
  the children index. (The draw-order resolver doesn't share it either: its
  order puts `behindParent` children first.)
- Static transforms are a tag excluded from the walk (X5), so static
  subtrees cost nothing, instead of being visited and skipped.
- Parent changes are detected by comparing recorded stamps, not by "this
  tick".
- Performance figures are labeled estimates, to be replaced from a
  prototype.
- Wrapped angles and the revolute limit are called out (§6.4), with the
  relative-rotation fix.
- World-space helpers and the model-front convention (X10) were added.
- Ownership of `world` is stated as enforced by documentation, since
  `readonly` is shallow.
