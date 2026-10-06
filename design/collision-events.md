# Design: Collision Filtering, Sensors and Per-Entity Contacts

|                                       |                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                               |
| **Kind**                              | Feature                                                                                                                                                                                                                                                                         |
| **Found in**                          | Galactic Journey demo: `src/asteroids/asteroid-collision.system.ts`, `src/enemy/enemy-collision.system.ts`, `src/grabber/grabber-collision.system.ts`, `src/power-ups/power-up-collision.system.ts`, `src/systems/register-collision-systems.ts`, every `addAabbComponent` call |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                        |
| **Related**                           | [#559](https://github.com/Forge-Game-Engine/Forge/issues/559) (sensors), [#560](https://github.com/Forge-Game-Engine/Forge/issues/560) (layers and masks), [`generational-entity-ids.md`](./generational-entity-ids.md)                                                         |

## 0. Targeted modules

| Path                                                         | Change   | Notes                                                                                                                                                          |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/physics/components/collider-component.ts`               | Modified | `category`, `mask`, `sensor`; `aabb` as an output field                                                                                                        |
| `src/physics/components/aabb-component.ts`                   | Removed  | The AABB moves onto the collider                                                                                                                               |
| `src/physics/components/contacts-component.ts`               | **New**  | `ContactsEcsComponent`: who this entity touches, who started and who stopped this tick                                                                         |
| `src/physics/systems/broad-phase-system.ts`                  | Modified | Skips pairs whose categories and masks don't match                                                                                                             |
| `src/physics/systems/narrow-phase-system.ts`                 | Modified | Fills `ContactsEcsComponent`s; writes sensor overlaps only there, never as manifolds                                                                           |
| `src/physics/raycast/raycast.ts`                             | Modified | Reads the collider's `aabb`; filters by mask; skips sensors unless asked                                                                                       |
| `documentation-site/docs/docs/physics/`, docs demos, `/demo` | Modified | Filtering, sensors, contacts; `addAabbComponent` calls removed (28 in the docs site, 2 in `/demo`, 7 in `/src` tests); five manifold scanners move to contacts |

---

## 1. Summary

The physics module finds collisions and writes them, as manifolds, into
one array for the whole world. Game code that wants to know what an entity
touched reads that array. The demo has four systems that each loop over
their own entities and, for each, scan every manifold of the tick for one
involving it, then check the other entity's components to see what it hit:

```ts
for (let i = 0; i < entities.length; i++) {
  for (const { entityA, entityB } of collisionManifolds) {
    if (entityA !== asteroidEntity && entityB !== asteroidEntity) continue;
    const otherEntity = entityA === asteroidEntity ? entityB : entityA;
    if (world.getComponent(otherEntity, bulletId)) { /* ... */ }
```

Around that:

- **Everything is tested against everything.** Bullets against bullets,
  asteroids against asteroids: the broad phase has no way to know which
  pairs matter, so the narrow phase runs on all of them and the game
  ignores most of the results.
- **There are no sensors.** The demo never registers the resolution
  system, since nothing should bounce. A game that wants physical bodies
  and pickups or triggers in the same world can't have both.
- **An entity is in the broad phase only if it has an
  `AabbEcsComponent`**, which callers add by hand next to every collider
  (28 calls in the docs site, 2 in Forge's own `/demo`, one per collider in
  the Galactic Journey demo). Leaving it out makes the collider silently do
  nothing.
- **"What did I touch?" has no per-entity answer**, so every consumer is
  quadratic in its entity count times the tick's collisions, and repeats
  the "which end is me" dance. Forge's own docs demos do the same scan
  (the space shooter, brick breaker, rolling ball and car) and so does
  `/demo/src/game.ts`.

This design adds the three things every 2D physics engine has: collision
categories and masks, sensor colliders, and per-entity contact lists with
begin and end.

---

## 2. Scope

### In scope

- `category`/`mask` filtering in the broad phase (#560).
- `sensor` colliders: detected, never resolved (#559).
- `ContactsEcsComponent`: current, started and ended contacts per entity,
  opt-in.
- The AABB as an output field of the collider; `AabbEcsComponent` removed.

### Out of scope

- **A faster broad phase** (sweep and prune, a spatial hash). Filtering
  saves the narrow phase work; the all-pairs AABB loop is its own change.
- **Contact callbacks.** Forge communicates through components that
  systems read; a system iterating its entities' contacts replaces a
  callback.
- **Group indices** (Box2D's "never collide within this group"). Masks
  cover the demo.
- **Bounds that are current after integration.** `collider.aabb` is
  computed by the broad phase, before integration moves bodies; a raycast
  later in the tick tests those bounds, and a collider added this tick has
  none until the next broad phase. Same as `AabbEcsComponent` today; the
  guide says so.

---

## 3. How established engines handle this

- **Box2D v3**: `b2Filter` with `categoryBits` and `maskBits`; two shapes
  collide when each one's category is in the other's mask. Sensor shapes
  report begin/end overlap events, computed separately from contacts, and
  never get contact points or forces. Since v3.1, contact and sensor
  events are opt-in per shape.
- **Godot**: `collision_layer`/`collision_mask` bitmasks; `Area2D`
  detects overlaps without collision response and emits `body_entered`/
  `body_exited`; `get_overlapping_bodies()` lists current ones.
- **Avian (Bevy)**: `CollisionLayers` (memberships and filters); a
  `Sensor` component; `CollidingEntities`, a component listing who an
  entity currently touches; `CollisionStart`/`CollisionEnd` events
  (opt-in with `CollisionEventsEnabled`).
- **Rapier**: interaction groups with a symmetric (`And`) test by default
  and a one-sided (`Or`) mode, which is Godot's model.
- **Unity**: layers and the collision matrix; `isTrigger` colliders;
  enter/stay/exit callbacks.

---

## 4. Design

### 4.1 Collider fields

```ts
interface ColliderDefaultedOptions {
  friction: number;
  restitution: number;
  /** Bits this collider belongs to (32 bits, as JavaScript's bitwise operators allow). Default `1`. */
  category: number;
  /** Bits of the categories it collides with. Default every bit. */
  mask: number;
  /** Detected and reported, never resolved. Default `false`. */
  sensor: boolean;
}

interface ColliderEcsComponent {
  // ...
  /** World-space bounds, written by the broad phase each tick. Output only. */
  readonly aabb: Aabb;
}
```

Two colliders are tested only if `(a.category & b.mask) !== 0` and
`(b.category & a.mask) !== 0`, Box2D's rule. The broad phase checks this
before the AABB test.

The broad phase queries `[position, collider]` and writes `collider.aabb`,
its only writer; `aabb` isn't accepted by `addColliderComponent`'s
options. `addAabbComponent` and `AabbEcsComponent` are removed; raycasts
read `collider.aabb`. `continuous-collision-detection.md` plans to reuse
`AabbEcsComponent`; whichever design lands second reads `collider.aabb`
instead.

### 4.2 Sensors

When either collider of an overlapping pair is a sensor, the narrow phase
reports the overlap through contacts only (§4.3) and adds nothing to
`collisionManifolds`, as Box2D keeps sensor overlaps apart from contacts.
`collisionManifolds` keeps one meaning, contacts to resolve, and the
resolution system needs no change.

Raycasts skip sensors unless the ray asks for them (Godot's
`collide_with_areas` defaults the same way), since a ray aimed at walls
shouldn't stop at a trigger zone.

### 4.3 Contacts

```ts
interface ContactsEcsComponent {
  /** Entities this one is touching this tick. */
  readonly touching: readonly Entity[];
  /** Entities it started touching this tick. */
  readonly started: readonly Entity[];
  /** Entities it stopped touching this tick (some may no longer exist). */
  readonly ended: readonly Entity[];
}
```

An entity with a collider and a `ContactsEcsComponent` gets it filled by
the narrow phase, its only writer, every tick. The narrow phase queries
`[contactsId]` so it visits every such component, including one whose
entity just lost its collider (its contacts then end). Entities without
one pay nothing. `touching` lists each other entity once, though a pair
can produce several manifolds (one per terrain edge it touches). `started`
and `ended` come from comparing with the previous tick's `touching`.

The demo's asteroid system becomes:

```ts
for (let i = 0; i < entities.length; i++) {
  for (const other of contacts[i].touching) {
    if (!world.isAlive(other)) continue;
    if (world.getComponent(other, bulletId)) {
      /* ... */
    }
  }
}
```

`isAlive` (from [`generational-entity-ids.md`](./generational-entity-ids.md))
covers a bullet that another system removed earlier in the tick, which is
what the demo's `usedBullets` and `removed` sets handle today.

`collisionManifolds` stays as the resolution system's input and for
anything that needs contact points and normals (the car docs demo counts
its wheels' ground manifolds; it moves to contacts with a count of
touching ground entities).

---

## 5. Phases

### Phase 1: Filtering and the AABB on the collider

| #   | Task                                                                                                                                                                  | Size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `category`/`mask` on colliders; broad-phase filter; tests                                                                                                             | S    |
| 1.2 | `collider.aabb` written by the broad phase; `AabbEcsComponent` removed; raycast                                                                                       | M    |
| 1.3 | Raycasts take an optional mask, like the colliders they hit                                                                                                           | S    |
| 1.4 | Migrate the docs site (3 guides, 25 demo files), `/demo` and `/src` tests; changelog: the AABB component's removal under `#### Removed`, filtering under `#### Added` | M    |

**Definition of done:** a collider works without any extra component; two
colliders whose masks exclude each other are never tested.

### Phase 2: Sensors and contacts

| #   | Task                                                                                                               | Size |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---- |
| 2.1 | `sensor`: overlaps reported through contacts only; raycasts skip sensors unless asked; tests                       | S    |
| 2.2 | `ContactsEcsComponent` filled by the narrow phase (`[contactsId]` query, deduplicated); started/ended across ticks | M    |
| 2.3 | Move the space shooter, brick breaker, rolling ball and car docs demos and `/demo/src/game.ts` to contacts         | M    |
| 2.4 | Physics guide: filtering, sensors, contacts; a docs demo with a trigger zone; changelog under `#### Added`         | M    |

**Definition of done:** a sensor in a world with resolved bodies reports
overlaps without pushing anything; no docs demo scans `collisionManifolds`
to find what an entity touched.

Phase 2 depends on [`generational-entity-ids.md`](./generational-entity-ids.md)
for `isAlive`.

---

## 6. Decision log

### DL-1: Contacts as a component, not an event list or callbacks

**Options.** (a) A per-entity component (Avian's `CollidingEntities`).
(b) A world-wide list of begin/end events (Box2D, Avian's events). (c)
Callbacks (Unity, Godot signals).

**Decision: (a).**

**Rationale.** It's the shape the demo's systems need: each iterates its
own entities and asks what they touch. (b) brings back the global scan;
(c) runs game code inside the physics step, outside any system.

### DL-2: Opt-in contacts

**Rationale.** Most colliders (walls, debris) never ask what they touch.
Filling a list for each costs memory and time for nothing; Avian makes
the same choice, and Box2D made its events opt-in in v3.1 for the same
reason.

### DL-3: The AABB is part of the collider

**Options.** (a) A field on the collider written by the broad phase. (b)
`addColliderComponent` also adds an `AabbEcsComponent`.

**Decision: (a).**

**Rationale.** The bounds have no meaning without the collider, and (b)
leaves a component that can be removed separately, or forgotten when the
collider is removed.

---

## 7. Open questions

1. **Should masks be symmetric** (Box2D: both must accept) or one-sided
   (Godot: either one's mask can detect the other)? One-sided lets a
   sensor see bodies that don't see it.
   - (a) Symmetric (proposed; simplest to reason about). (b) One-sided.

---

## 8. Testing considerations

- Filter matrix: matching and non-matching categories both ways.
- Sensors: reported through contacts, never in `collisionManifolds`,
  including sensor against static.
- Contacts: started on the first overlapping tick, touching while
  overlapping (once per entity, even against terrain with several edges),
  ended on the first separated tick, and ended when the other entity is
  removed or loses its collider.
- Raycast against `collider.aabb`, with a mask, and past a sensor.

## 9. Documentation and demo follow-up

- `physics/` guides: collision filtering, sensors, reading contacts.
- Demo: the four collision systems read `ContactsEcsComponent`; bullets,
  enemies, asteroids, grabbers and power-ups get categories and masks; the
  `addAabbComponent` calls and the `usedBullets`/`removed` sets go.
