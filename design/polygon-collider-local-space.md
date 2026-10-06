# Design: Collider Shapes Stay Where They're Defined

|                                       |                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                  |
| **Kind**                              | Defect                                                                                             |
| **Found in**                          | Galactic Journey demo: `src/grabber/create-grabbers.ts` (collider drawn symmetric so re-centering doesn't move it) |
| **Engine version at time of writing** | `0.25.8`                                                                                           |
| **Related**                           | [`collision-events.md`](./collision-events.md)                                                     |

## 0. Targeted modules

| Path                                                | Change   | Notes                                                                                   |
| --------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `src/physics/colliders/polygon-collider.ts`         | Modified | Keeps its vertices as given; reports its centroid as its local center of mass          |
| `src/physics/colliders/circle-collider.ts`          | Modified | `center` (local, rotated with the entity) replaces `offset`                             |
| `src/physics/colliders/collider.ts`, `terrain-collider.ts` | Modified | `offset` removed; mass data includes the local center of mass                    |
| `src/physics/components/rigidbody-component.ts`     | Modified | Carries the local center of mass from its collider                                     |
| `src/physics/systems/*`, `apply-*.ts`               | Modified | Integrate, resolve and apply impulses about the world center of mass                   |
| `documentation-site/docs/docs/physics/`, demos      | Modified | Shapes in local space; center of mass                                                   |

---

## 1. Summary

`PolygonCollider` moves the vertices it's given so their centroid sits at
the entity's position. A shape authored around a sprite's pivot ends up
shifted by however far its centroid was from the pivot. The demo's
grabber collider is an octagon hugging an off-center ship in its image,
and the demo had to make the octagon symmetric around the image center so
that re-centering wouldn't move it. Any asymmetric shape (a ramp, a hull
with a long nose) can't be lined up with its art.

The re-centering exists because the rest of the physics treats an
entity's position as its body's center of mass: integration rotates bodies
about it, and contact and joint impulses take their lever arms from it.
Moving the vertices made that assumption true for polygons. A public
`offset` on every collider half-undoes it: polygons rotate it with the
body, circles don't, and neither the mass properties nor the solver know
about it.

Box2D, Unity and Godot all keep shapes where they're authored and compute
the body's center of mass from them. This design does the same.

---

## 2. Scope

### In scope

- Polygons keeping their vertices; circles getting a rotated local
  `center`; `offset` removed.
- A local center of mass in each collider's mass data and on the rigid
  body.
- Integration, collision resolution, joints, springs, dampers, motors and
  the `apply*` helpers working about the world center of mass.

### Out of scope

- **Several colliders per body** (compound shapes). One collider per
  entity, as today; the center of mass comes from that collider.
- **Setting the center of mass by hand** (Unity's
  `Rigidbody2D.centerOfMass` override). Nothing has asked for it.

---

## 3. How established engines handle this

- **Box2D v3**: polygon vertices and circle centers are in body-local
  space. The body computes its local center of mass from its shapes
  (`b2Body_GetLocalCenterOfMass`); the solver integrates the center of
  mass and derives the body origin from it.
- **Unity**: collider shapes are in the GameObject's local space;
  `Rigidbody2D.centerOfMass` is computed from the attached colliders unless
  overridden.
- **Godot**: shapes are positioned by their `CollisionShape2D` nodes;
  `RigidBody2D` computes the center of mass automatically
  (`center_of_mass_mode`).

---

## 4. Design

### 4.1 Colliders

- `new PolygonCollider(vertices, density)` stores the vertices as given
  (after fixing the winding and checking convexity). Its mass data is the
  area times density, the moment of inertia about the centroid, and the
  centroid as `localCenterOfMass`.
- `new CircleCollider(radius, density, center?)`: `center` is a local
  position, rotated with the entity like a polygon's vertices. Its
  `localCenterOfMass` is `center`.
- `Collider.offset` is removed; a shape's position in its entity is what
  its vertices or center say.

### 4.2 The solver

`addRigidBodyComponent` requires a `localCenterOfMass` next to the
`mass` and `momentOfInertia` it already requires. Colliders expose all
three as `massData`, so the usual call becomes
`addRigidBodyComponent(world, entity, { ...collider.massData })` instead
of copying `mass` and `momentOfInertia` by name. Everything that treated the
entity's position as the center of mass uses the world center of mass
instead,
`position.world + rotate(localCenterOfMass, rotation.world)`:

- **Integration** advances the world center of mass by the velocity and
  the rotation by the angular velocity, then writes `position.local` back
  as the center of mass minus the rotated offset, so a body spinning in
  place turns about its center of mass.
- **Collision resolution, joints, springs, dampers and motors** take
  their lever arms from the world center of mass.
- **`applyImpulse`, `applyTorque`, `applyExplosiveForce`** do the same; the
  `entityPosition` parameter becomes the body's world center of mass,
  which a helper computes.

A shape centered on its entity has a `localCenterOfMass` of zero and
behaves exactly as today.

### 4.3 Static, kinematic and sensor colliders

Mass properties don't affect them, so for these (the demo's grabber
included) the change is only that the shape stays where it was authored.

---

## 5. Phases

### Phase 1: Local-space shapes and a computed center of mass

| #   | Task                                                                                         | Size |
| --- | -------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Colliders keep their shapes; `localCenterOfMass` in mass data; `offset` removed; circle `center` | M |
| 1.2 | Integration about the center of mass                                                         | M    |
| 1.3 | Resolution, joints, springs, dampers, motors, `apply*` about the world center of mass        | M    |
| 1.4 | Tests: an off-center polygon spins about its centroid; contact impulses with an offset COM   | M    |
| 1.5 | Check every physics docs demo (18 `PolygonCollider`s) and adjust shapes authored for re-centering | M |
| 1.6 | Physics guide; changelog under `#### Changed`                                                | S    |

**Definition of done:** a polygon's world vertices equal its authored
vertices transformed by the entity; an asymmetric dynamic body rotates
about its centroid; the physics docs demos behave as before.

---

## 6. Decision log

### DL-1: Move the center of mass into the solver rather than keep re-centering

**Options.** (a) Shapes stay put; the solver handles a center of mass
away from the origin. (b) Keep re-centering and tell callers how far the
shape moved, so they can offset their sprite. (c) Make `offset` work
everywhere.

**Decision: (a).**

**Rationale.** (b) makes callers compensate in every sprite, the opposite
of fixing the layer that owns the behavior. (c) keeps two ways to say
where a shape is. (a) is how every physics engine models it, and leaves
centered shapes unchanged.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- Polygon world vertices for an asymmetric shape at several rotations.
- A circle with a `center` rotates around the entity.
- Mass properties: moment of inertia about the centroid unchanged from
  today for the same shape.
- An off-center dynamic body under gravity and spin; a revolute joint
  anchored away from the center of mass.

## 9. Documentation and demo follow-up

- `physics/` guide: shapes are in the entity's local space; the center of
  mass is computed.
- Demo: the grabber's collider can follow the ship's actual outline; the
  comment about re-centering goes.
