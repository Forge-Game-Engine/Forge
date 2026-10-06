# Design: One Angle and Direction Convention

|                                       |                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                       |
| **Kind**                              | Defect                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/engine-flame/create-engine-flames.ts` (exhaust direction converted by hand, fixed at spawn) |
| **Engine version at time of writing** | `0.25.8`                                                                                                                |
| **Related**                           | [`demo-findings.md`](./demo-findings.md)                                                                                |

## 0. Targeted modules

| Path                                                    | Change   | Notes                                                                                   |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `src/math/vector2.ts`                                   | Modified | `Vec2.up` is `(0, 1)`, `Vec2.down` is `(0, -1)`                                         |
| `src/math/radians-to-vector.ts`                         | Modified | `(cos θ, sin θ)`: angle `0` is `+X`, the inverse of `vectorToRadians`                   |
| `src/particles/components/particle-emitter.ts`          | Modified | `directionRange` and `rotationRange` in radians, counter-clockwise, `0` along `+X`      |
| `src/particles/utilities/spawn-particle.ts`             | Modified | Direction and spawn shape follow the emitter entity's world rotation                    |
| `src/physics/apply-explosive-force.ts`, `collision/`    | Modified | Degenerate-case fallbacks that meant "up" get the corrected `Vec2.up`                   |
| `documentation-site/docs/docs/math/*.md`, `particles/`  | Modified | Y-up throughout; the "not inverses" caution and the y-down section are deleted          |
| `documentation-site/src/pages/demos/particles`, `car`   | Modified | Particle ranges in radians; suspension axes                                             |

---

## 1. Summary

Forge's world is Y-up, and its rotations are radians, positive
counter-clockwise: `RotationEcsComponent`, `Vec2.rotate`, physics and the
sprite renderer all agree. A handful of APIs don't:

| API                                      | Convention today                                              |
| ---------------------------------------- | ------------------------------------------------------------- |
| `ParticleEmitter.directionRange`         | Degrees, `0` is up, **clockwise**                             |
| `ParticleEmitter.rotationRange`          | **Degrees**, counter-clockwise                                |
| `ParticleEmitter.rotationSpeedRange`     | Radians per second, counter-clockwise                         |
| `Vec2.up` / `Vec2.down`                  | `(0, -1)` / `(0, 1)`: **down** / **up** in the world          |
| `radiansToVector(θ)`                     | `(sin θ, -cos θ)`: `0` points **down**                        |
| `vectorToRadians(v)`                     | `atan2(y, x)`: `0` points along `+X`                          |
| `math/angles-and-rotation.md`, `vectors.md` | Say the y axis points down the screen                      |

On top of that, an emitter's direction and spawn shape ignore the
rotation of the entity it's on: particles spawn at the entity's world
position, but always in the same world direction.

The demo's engine flames show both problems. Each flame is a child of its
ship, rotated to point backwards, and emits exhaust. The demo converts the
flame's rotation by hand (`-radiansToDegrees(shipRotation +
engine.rotation)`, with a comment explaining the two conventions), and
does it once when the flame is created, so the exhaust direction would no
longer match if the ship turned.

This design picks the convention the rest of the engine already uses and
applies it to the stragglers: radians, counter-clockwise, `0` along `+X`,
Y-up. Emitters emit in their entity's frame.

---

## 2. Scope

### In scope

- `Vec2.up`/`Vec2.down`, `radiansToVector`, `vectorToRadians`.
- Particle emitter angle units and direction.
- Emitter direction and spawn shape following the emitter entity's world
  rotation.
- The math and particles guides.

### Out of scope

- **Emitter scale.** Spawn shapes don't scale with the entity's world
  scale. Nothing has asked for it yet.
- **Local-space simulation** (particles that move with their emitter after
  spawning). Particles stay in world space, as today.
- **The renderer's internal Y flips.** The sprite renderer negates
  position, rotation and pivot Y on the way to a Y-down projection. That's
  internal, invisible to callers, and covered in
  [`camera-views.md`](./camera-views.md).

---

## 3. How established engines handle this

- **Bevy** (Y-up, like Forge): angles are radians, counter-clockwise.
  `Vec2::from_angle(0)` is `(1, 0)`, and `Vec2::to_angle` is
  `atan2(y, x)`, its inverse. `Vec2::Y` is up.
- **Godot 2D** (Y-down): `Vector2.from_angle(0)` is `(1, 0)` and
  `Vector2.angle()` is its inverse. Angles increase towards `+Y`, which is
  clockwise on a Y-down screen. Particle direction is a vector in the
  node's local space, so it turns with the node.
- **Unity**: particle shapes and emission direction follow the particle
  system's transform; the simulation space (local or world) is a separate
  setting.

Every engine has one angle convention, angle `0` along `+X`, and emitters
that emit relative to their own transform.

---

## 4. Design

### 4.1 The convention

One sentence, stated in the math guide and relied on everywhere: **angles
are radians, positive turns `+X` towards `+Y` (counter-clockwise, since
`+Y` is up), and angle `0` points along `+X`.**

- `Vec2.up` is `(0, 1)` and `Vec2.down` is `(0, -1)`.
- `radiansToVector(θ)` returns `(cos θ, sin θ)`, and
  `vectorToRadians(radiansToVector(θ))` is `θ` (normalized to `(-π, π]`).

### 4.2 Particle emitters

- `directionRange`: radians, the convention above, measured in the
  emitter's frame. Default `{ min: 0, max: 2π }`.
- `rotationRange`: radians. Default `{ min: 0, max: 0 }`.
- `rotationSpeedRange`: unchanged (already radians per second).
- When spawning, the sampled spawn-shape offset and direction are rotated
  by the emitter entity's `rotation.world` (`0` if it has no rotation).
  `emitOutward` uses the offset's angle in the emitter's frame, so it's
  rotated the same way.
- `acceleration` and `getVelocityOffset` stay in world space: they model
  forces like gravity and wind, which don't turn with the emitter.

The demo's flame then sets `directionRange` to the backwards direction in
the flame's own frame plus or minus the spread, once, and the exhaust
follows the ship.

### 4.3 Physics fallbacks

`applyExplosiveForce` and `detectCircleCircleCollision` fall back to
`Vec2.up` when two centers coincide. They keep doing so, and with the fix
the fallback points up, as the code intends.

---

## 5. Phases

### Phase 1: Convention fix

| #   | Task                                                                                         | Size |
| --- | -------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `Vec2.up`/`down`; `radiansToVector` as the inverse of `vectorToRadians`; tests               | S    |
| 1.2 | Particle angle ranges in radians, counter-clockwise from `+X`; defaults; tests               | S    |
| 1.3 | Rotate spawn offset and direction by the emitter's world rotation; tests                     | S    |
| 1.4 | Migrate the particles and car docs demos and the `joints.md` samples                         | S    |
| 1.5 | Rewrite `math/angles-and-rotation.md` and the y-down section of `math/vectors.md`; changelog | S    |

**Definition of done:** every angle in the public API follows §4.1; the
particles demos look as they did; a rotating emitter's particles leave in
its facing direction.

---

## 6. Decision log

### DL-1: Angle `0` points along `+X`, not up

**Options.** (a) `+X` (Bevy, Godot, `Math.atan2`). (b) Up, as particles
and `radiansToVector` use today.

**Decision: (a).**

**Rationale.** It's what `vectorToRadians`, `Vec2.rotate` and the
rotation matrices already assume, so only the stragglers change. (b)
would need a quarter-turn offset in every conversion, which is the
"not inverses" caution the guide has today.

### DL-2: Particle angles in radians

**Rationale.** Forge's guide already says rotation is "radians
everywhere", and the emitter mixes the two today (`rotationRange` in
degrees, `rotationSpeedRange` in radians). Callers who author in degrees
use `degreesToRadians`, as they do for every other angle.

### DL-3: Emitters emit in their entity's frame

**Options.** (a) Direction and shape rotate with the entity. (b) Keep
world space and let callers rotate the range.

**Decision: (a).**

**Rationale.** It's what Unity and Godot do, and it's the only way an
emitter on a child entity (a flame, a muzzle, a thruster) can follow its
parent without a system rewriting its range every frame. An emitter that
should ignore rotation goes on an entity without one.

---

## 7. Open questions

1. **Should spawn shapes also scale with the entity's world scale?**
   Unity has a scaling-mode setting for this. Nothing in the demo or the
   docs demos needs it.
   - (a) Not now (proposed). (b) Scale with the entity.

---

## 8. Testing considerations

- `radiansToVector`/`vectorToRadians` round trip at the four axes and a
  few angles in between.
- Spawning with a rotated emitter: velocity and spawn offset are rotated;
  `emitOutward` too; no rotation component behaves as rotation `0`.
- The circle-collision test that expects `Vec2.up` as the fallback normal
  keeps passing with the new value; its geometry assertions are checked.

## 9. Documentation and demo follow-up

- `math/angles-and-rotation.md`: states §4.1; the round-trip caution and
  its `+ Math.PI / 2` workaround are deleted.
- `math/vectors.md`: the y-down section becomes a Y-up one.
- `particles/emitters.md`: radians, and emitters following their entity.
- Demo: `create-engine-flames.ts` sets the exhaust range in the flame's
  frame; the conversion and its comment are deleted.
