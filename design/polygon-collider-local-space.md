# Design: Collider Shapes Stay Where They're Defined

|                                       |                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                                           |
| **Kind**                              | Defect                                                                                                                                                                                                                                                                                      |
| **Found in**                          | Galactic Journey demo: `src/grabber/create-grabbers.ts` (collider drawn symmetric about the image center so re-centering doesn't move it); in this repository, the triangle sprite-pivot workaround in `demo/src/game.ts` and `documentation-site/src/pages/demos/physics/_spawn-shapes.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                                    |

## 0. Targeted modules

| Path                                                                                                                      | Change   | Notes                                                                         |
| ------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `src/physics/colliders/polygon-collider.ts`                                                                               | Modified | Keeps its vertices as given; reports its centroid as its local center of mass |
| `src/physics/colliders/circle-collider.ts`                                                                                | Modified | `center` (local, rotated with the entity) replaces `offset`                   |
| `src/physics/colliders/collider.ts`, `terrain-collider.ts`                                                                | Modified | `offset` removed; mass data includes the local center of mass                 |
| `src/physics/collision/detect-circle-*.ts`, `raycast/raycast-circle.ts`                                                   | Modified | Circles use their rotated `center` instead of `offset`                        |
| `src/physics/components/rigidbody-component.ts`, `rigid-body-inverse-mass.ts`                                             | Modified | The local center of mass, zero for non-dynamic bodies                         |
| `src/physics/systems/euler-integration-system.ts`, `collision-resolution-system.ts`, `joints/`, spring and damper systems | Modified | Work about the world center of mass                                           |
| `src/physics/apply-impluse.ts`, `apply-explosive-force.ts`                                                                | Modified | Find the center of mass themselves                                            |
| `documentation-site/docs/docs/physics/`, docs demos, `/demo`                                                              | Modified | Shapes in local space; center of mass; the triangle pivot workaround removed  |

---

## 1. Summary

`PolygonCollider` moves the vertices it's given so their centroid sits at
the entity's position. A shape authored around a sprite's pivot ends up
shifted by however far its centroid was from the pivot, so any asymmetric
shape (a ramp, a hull with a long nose, a triangle) can't be lined up with
its art. The Galactic Journey demo drew its grabber's octagonal collider
symmetric about the image's center so re-centering wouldn't move it. In
this repository, Forge's own `/demo` and the physics docs demo both move a
triangle's sprite pivot to the triangle's centroid to make the art follow
the shifted collider.

The re-centering exists because the rest of the physics treats an
entity's position as its body's center of mass: integration rotates bodies
about it, and contact and joint impulses take their lever arms from it.
Moving the vertices made that assumption true for polygons. A public
`offset` on every collider half-undoes it: polygons rotate it with the
body, circles don't, circle-against-polygon collision ignores the
polygon's offset entirely, terrain applies it only to its bounds, and
neither the mass properties nor the solver know about it.

Box2D, Avian and Rapier keep shapes where they're authored, compute the
body's center of mass from them, and solve about it. This design does the
same.

---

## 2. Scope

### In scope

- Polygons keeping their vertices; circles getting a rotated local
  `center`; `offset` removed.
- A local center of mass in each collider's mass data, and on the rigid
  body for dynamic bodies.
- Integration, collision resolution, joints, springs, dampers and the
  impulse helpers working about the world center of mass.
- Removing the triangle-pivot workarounds.

### Out of scope

- **Several colliders per body** (compound shapes). One collider per
  entity, as today; the center of mass comes from that collider.
- **Setting the center of mass by hand** (Unity's
  `Rigidbody2D.centerOfMass` override). Nothing has asked for it.
- **Torque and motors.** `applyTorque` and the angular velocity motor have
  no lever arm, so they're unaffected.

---

## 3. How established engines handle this

- **Box2D v3**: polygon vertices and circle centers are in body-local
  space. The body computes its local center of mass from its shapes
  (`b2Body_GetLocalCenterOfMass`); the solver integrates the center of
  mass and derives the body origin from it. Static and kinematic bodies
  get a local center of zero, recomputed when the body's type changes.
- **Avian** and **Rapier** compute mass properties, the center of mass
  included, from the colliders, with optional overrides.
- **Unity**: collider points are in the GameObject's local space, and
  `Collider2D.offset` moves a shape as well; `Rigidbody2D.centerOfMass` is
  computed from the attached colliders unless overridden.
- **Godot**: shapes are placed by their `CollisionShape2D` node
  transforms; `RigidBody2D`'s automatic center of mass assumes each
  shape's origin is its center of mass.

---

## 4. Design

### 4.1 Colliders

- `new PolygonCollider(vertices, density)` stores the vertices as given
  (after fixing the winding and checking convexity). Its mass data is the
  area times density, the moment of inertia about the centroid, and the
  centroid as `localCenterOfMass`.
- `new CircleCollider(radius, density, center?)`: `center` is a local
  position, rotated with the entity like a polygon's vertices. Its
  `localCenterOfMass` is `center`. Circle collision and raycast code uses
  the rotated center wherever it used `offset`.
- `Collider.offset` is removed; a shape's position in its entity is what
  its vertices or center say.

### 4.2 The rigid body

`addRigidBodyComponent` requires a `localCenterOfMass` next to the `mass`
and `momentOfInertia` it already requires. Colliders expose all three as
`massData`, and callers pass a copy (the vector is cloned, since several
bodies can share one collider and vector operations mutate in place).
Whether the rigid body should derive its mass data from its collider
instead of having it copied in is open question 1.

The local center that the solver uses is zero for bodies that aren't
`'dynamic'`, as in Box2D, and it's resolved where it's read, next to
`getRigidBodyInverseMass`, so changing a body's `type` at runtime stays
consistent. Kinematic bodies are integrated like dynamic ones today, and
an off-center kinematic body should keep turning about its origin.

### 4.3 The solver

The world center of mass is
`position.world + rotate(localCenterOfMass, rotation.world)`:

- **Integration** stays an increment of `position.local`, so a teleport
  made after the transform pass isn't overwritten:
  `local += v * dt + R(θ) c - R(θ + ω dt) c`, where `c` is the local
  center. The last two terms keep the center of mass where the velocity
  puts it while the body turns. Dynamic bodies are always roots, so local
  equals world for them. `velocity` is the center of mass's velocity, as
  in Box2D; the guide and changelog say so.
- **Collision resolution** takes its lever arms from the world center of
  mass, and reads the body's rotation to find it.
- **Joints, springs and dampers** go through `resolveJointBody`, which
  returns the world center of mass. Anchors stay relative to the entity
  origin, as in Box2D: the lever arm is `R(localAnchor - localCenter)`.
- **`applyImpulse`** takes `(world, entity, impulse, point)` and finds the
  body's center of mass itself, so existing calls that pass the entity's
  position as the center fail to compile instead of silently spinning the
  body wrongly. **`applyExplosiveForce`** measures from the center of mass.

A shape centered on its entity has a `localCenterOfMass` of zero and
behaves exactly as today.

### 4.4 Static, kinematic and detection-only colliders

Mass properties don't affect them, so for these (the Galactic Journey
grabber included, which has no rigid body) the change is only that the
shape stays where it was authored.

### 4.5 Other designs

Continuous collision detection (`createContinuousCollisionEcsSystem`)
sweeps circles from the entity's position; this design changes it to
sweep from the world center of mass and the circle's rotated `center`.

---

## 5. Phases

### Phase 1: Local-space shapes and a computed center of mass

| #   | Task                                                                                                                                                                                                                           | Size |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1.1 | Colliders keep their shapes; `localCenterOfMass` in mass data; `offset` removed; circle `center` in collision and raycast code                                                                                                 | M    |
| 1.2 | Rigid body local center (zero unless dynamic, resolved where read); integration as an increment of `local`                                                                                                                     | M    |
| 1.3 | Resolution, `resolveJointBody`, springs and dampers about the world center of mass                                                                                                                                             | M    |
| 1.4 | `applyImpulse(world, entity, impulse, point)`; `applyExplosiveForce` from the center of mass                                                                                                                                   | S    |
| 1.5 | Tests: an off-center polygon spins about its centroid; contact impulses with an offset center; a kinematic body keeps its origin; a teleport after the transform pass survives integration; the re-centering test is rewritten | M    |
| 1.6 | Remove the triangle pivot workarounds (`/demo`, the physics docs demo); check every physics docs demo (18 `PolygonCollider`s) and the guides' re-centering notes (`physics/index.md`, `terrain.md`, `forces.md`)               | M    |
| 1.7 | Changelog under `#### Changed`: shapes stay where authored, `offset` and the old `applyImpulse` signature are gone, `velocity` is the center of mass's                                                                         | S    |

**Definition of done:** a polygon's world vertices equal its authored
vertices transformed by the entity; an asymmetric dynamic body rotates
about its centroid; the physics docs demo's triangle rotates about its
centroid with its sprite at the default pivot.

---

## 6. Decision log

### DL-1: Shapes in local space, with the center of mass in the solver

**Options.** (a) Shapes stay where they're authored; the solver handles a
center of mass away from the origin. (b) Keep re-centering and tell
callers how far the shape moved, so they can offset their sprite. (c)
Keep re-centering and make `offset` work everywhere to place shapes.

**Decision: (a).**

**Rationale.** (b) makes callers compensate in every sprite, which is
what the triangle-pivot workaround does today: the opposite of fixing the
layer that owns the behavior. (c) needs the same solver work as (a), since
an offset shape's centroid sits at its offset, so (a) and (c) differ only
as authoring APIs, and (a) has one way to say where a shape is. Box2D,
Avian and Rapier work like (a).

---

## 7. Open questions

1. **Should the rigid body derive its mass data from its collider?** Every
   `addRigidBodyComponent` call in the docs and demos (21) already copies
   `mass` and `momentOfInertia` from a collider, and this design adds a
   third value to copy. Box2D, Avian, Unity and Godot all compute mass data
   from the shapes. All 38 call sites change either way.
   - (a) Derive it from the collider, with the rigid body no longer taking
     mass values (proposed). (b) Keep copying, through `massData`, as
     §4.2 describes.

---

## 8. Testing considerations

- Polygon world vertices for an asymmetric shape at several rotations.
- A circle with a `center` rotates around the entity, in collision and in
  raycasts.
- Mass properties: moment of inertia about the centroid unchanged from
  today for the same shape.
- An off-center dynamic body under gravity and spin; a revolute joint
  anchored away from the center of mass; a kinematic off-center body
  turning about its origin; a runtime change of `type`.

## 9. Documentation and demo follow-up

- `physics/` guides: shapes are in the entity's local space; the center
  of mass is computed; `velocity` is the center of mass's.
- Demo: the grabber's collider can follow the ship's actual outline; the
  comment about re-centering goes.
