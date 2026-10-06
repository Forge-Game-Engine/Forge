# Design: Game States, Run Conditions and State-Scoped Entities

|                                       |                                                                                                                                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Implemented (Phases 1 and 2); the Galactic Journey migration (§9) follows the next release                                                                                                                                                               |
| **Kind**                              | Feature                                                                                                                                                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/run/*` (`run.component.ts`'s `enteredPhase`/`leftPhase`, `run.system.ts`, `run-phases.ts`, `clear-run.system.ts`, `run-reset.system.ts`, `run-screens.system.ts`), and 15 `isInMenu`/`hasEntered`/`hasLeft` calls in 9 files |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                 |
| **Related**                           | [`generational-entity-ids.md`](./generational-entity-ids.md), [`hierarchy-removal.md`](./hierarchy-removal.md), [`input-action-state.md`](./input-action-state.md), [`hierarchical-visibility.md`](./hierarchical-visibility.md)                         |

## 0. Targeted modules

| Path                                                                | Change   | Notes                                                                                                              |
| ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/ecs/ecs-world.ts`, `ecs-system-group.ts`                       | Modified | `runIf` on `addSystem` and `addSystemGroup`; a built-in first group that every group runs after                    |
| `src/states/`                                                       | **New**  | `createGameState`, `GameState`, `inState`/`onEnter`/`onExit`, the state-scoped component and the transition system |
| `src/index.ts`, `package.json` exports                              | Modified | New module                                                                                                         |
| `documentation-site/docs/docs/ecs/`, new `states/` guide, docs demo | Modified | Run conditions, states                                                                                             |

---

## 1. Summary

Most games move between a few top-level states (loading, menu, playing,
paused, game over) and most of their systems only make sense in some of
them. Forge has no notion of this. Its finite state machine is a general
predicate-driven utility, and systems run every tick. A game can run
several `EcsWorld`s, but `Game` updates every one of them every frame, and
worlds keep separate content apart rather than switch between states
(DL-4).

The demo builds the missing pieces itself:

- **A state with enter and exit.** `RunEcsComponent` holds a
  `FiniteStateMachine` of phases plus `enteredPhase` and `leftPhase`, which
  `run.system.ts` sets for one tick after each transition, and which only
  systems registered after it may read. Moving to another phase means
  setting one of five request flags that the run system turns into a
  transition. A `loading` phase exists only so the menu gets an "entered"
  tick at startup.
- **Systems that only run in some states.** Systems call `isInMenu(run)`,
  `hasEntered(run, ...)` or `hasLeft(run, ...)` at the top of their
  `update` (15 calls in 9 files), each querying the run entity first. Some
  of those calls are gates; others sit in callbacks or in fades that must
  run every tick, and stay as checks.
- **Entities that belong to a state.** `clear-run.system.ts` removes
  asteroids, bullets, enemies, grabbers, warnings, power-ups, particles and
  the player, kind by kind, when a run starts or the menu comes up.

Bevy has all three as engine features: states with `OnEnter`/`OnExit`,
`run_if(in_state(...))`, and entities despawned when their state is left
or entered. This design gives Forge the same.

---

## 2. Scope

### In scope

- Run conditions on systems and system groups.
- A built-in first system group, so state transitions happen before any
  other system of the tick.
- `createGameState`: a named state with transitions applied at the start
  of the tick, enter and exit groups, and `inState`, `onEnter` and
  `onExit` conditions.
- A state-scoped component that removes entities on a transition.

### Out of scope

- **Sub-states and computed states.** One flat state per `GameState`; a
  game can have several.
- **Changing the existing `FiniteStateMachine`.** It stays as a general
  utility (animation controllers, AI).
- **Pausing time.** A paused state stops the systems it gates; `Time`
  itself is unchanged.

---

## 3. How established engines handle this

- **Bevy**: a `States` type, `NextState` to request a transition, applied
  in a dedicated `StateTransition` schedule (after `PreUpdate`, before
  `Update`); `OnExit`, `OnTransition` and `OnEnter` schedules run there,
  once per transition, so enter and exit logic happens before any `Update`
  system; the initial state's `OnEnter` runs at startup; setting the
  current state again re-runs exit and enter (`set_if_different` skips
  that); `run_if(in_state(...))` gates systems; entities with
  `DespawnOnExit`/`DespawnOnEnter` (formerly `StateScoped`) are despawned,
  with their descendants, on the matching transition.
- **Godot**: no built-in state. Games change scenes
  (`change_scene_to_file`), which frees the current scene's node tree and
  loads the next, and pause subtrees with `SceneTree.paused` and each
  node's `process_mode`. Content shared between scenes goes in an
  autoload, which outlives scene changes.
- **Unity**: scenes play the same role. Loading a scene destroys the
  previous scene's objects, unless they're marked to survive scene loads
  or the new scene is loaded additively. In DOTS, systems are gated with
  `RequireForUpdate` or `Enabled`, and several `World`s keep separate
  simulations apart (Netcode's client and server worlds) rather than
  switch between states.

A Godot node or a Unity object carries its own logic, so swapping the
content swaps the logic with it. In an ECS, systems are separate from
entities, so a state needs both halves: which systems run (run
conditions) and which entities go (state-scoped entities). Bevy, whose
states work inside an app's one main world, is the ECS reference and the
model here.

---

## 4. Design

### 4.1 Run conditions

```ts
type RunCondition = (world: EcsWorld) => boolean;

world.addSystem(system, { runIf: inState(runState, 'flying') });
world.addSystemGroup(gameplayGroup, { runIf: inState(runState, 'flying') });
```

A system runs if its group's condition and its own are true, evaluated
each tick just before the group or system would run. A gated system's
query isn't computed when it doesn't run. Run conditions are scheduling
only: a system's `query` and `tags` stay fixed, and its `cleanup` still
runs when it's removed.

### 4.2 The first group

`EcsWorld` gets a built-in `firstSystemGroup` that runs before every other
group of the tick, whatever order groups were added in. Ordering another
group before it throws. Today `addSystemGroup`'s `before` only promises an
order relative to the groups named, so a game's group placed before the
default group (as `registerInputs` does) could run before a state
transition. The first group makes "every system of the tick sees the same
state" true.

"Every group runs after the first group" isn't enough for the state's exit
and enter groups (§4.3), though. They have to run right after the
transition and before every other group, but a group's order among groups
with no edge between them is insertion order, so `registerInputs`'
`input-update` group, added before the state, would run before the enter
group. So a group ordered `after` the first group (or after another group
that is) joins the **start of the tick**: the world orders it before every
group that isn't there, including groups added earlier or later. A
start-of-tick group ordered after a group that isn't at the start of the
tick throws, and so does a group ordered before a start-of-tick group it
isn't part of. That's the same layering Bevy gets from its fixed list of
main schedules, expressed with the group graph Forge already has.

One consequence: start-of-tick groups run before `input-update`, so
`onEnter`/`onExit` systems read the previous tick's input. In Bevy,
`PreUpdate` (input) runs before `StateTransition`. Here the transition
comes first so that every system of the tick, input systems included, sees
the same state; a transition is requested by a system reacting to input,
so it applies on the next tick either way.

### 4.3 States

```ts
interface GameState<TName extends string> {
  /** The current state. */
  readonly current: TName;
  /** The state entered at the start of this tick, if any. */
  readonly entered: TName | null;
  /** The state left at the start of this tick, if any. */
  readonly exited: TName | null;
  /** Systems that run once when a state is left (with `onExit` conditions). */
  readonly exitGroup: EcsSystemGroup;
  /** Systems that run once when a state is entered (with `onEnter` conditions). */
  readonly enterGroup: EcsSystemGroup;
  /**
   * Requests a transition, applied at the start of the next tick.
   * Requesting the current state re-enters it (exit, then enter).
   */
  set(next: TName): void;
}

function createGameState<TName extends string>(
  world: EcsWorld,
  initial: TName,
): GameState<TName>;

function inState<T extends string>(
  state: GameState<T>,
  ...names: T[]
): RunCondition;
function onEnter<T extends string>(
  state: GameState<T>,
  ...names: T[]
): RunCondition;
function onExit<T extends string>(
  state: GameState<T>,
  ...names: T[]
): RunCondition;
```

`createGameState` registers its transition system in the world's first
group. It's the only writer of `current`, `entered` and `exited`. At the
start of each tick, in this order:

1. A requested transition is applied (the last `set` of the previous tick
   wins), setting `entered` and `exited` for this tick.
2. The `exitGroup` runs, so `onExit` systems can still read what the state
   is about to tear down.
3. State-scoped entities are removed (§4.4), in a start-of-tick group of
   their own between the exit and enter groups, so an exit system added
   later can't end up after the removal.
4. The `enterGroup` runs, so `onEnter` systems set the new state up
   before any gameplay system sees it.
5. The rest of the tick.

The exit, removal and enter groups are start-of-tick groups (§4.2), gated
so they only run on ticks with a transition.

On the first tick, the initial state counts as entered: `entered` is
`initial` and `onEnter` systems run, as Bevy runs the initial state's
`OnEnter` at startup. The demo's `loading` phase goes.

Re-entering lets a game restart without a detour through another state:
`set('playing')` while playing runs the exit and the enter of `playing`
again, with everything they trigger.

### 4.4 State-scoped entities

```ts
addStateScopedComponent(world, entity, {
  state: runState,
  removeOnExit: ['flying'],
});
```

The transition removes every entity whose state left one of its
`removeOnExit` states, or entered one of its `removeOnEnter` states, at
step 3 above, with `world.removeEntity`. Removing an entity that was
already removed is a no-op
([`generational-entity-ids.md`](./generational-entity-ids.md)). Once
[`hierarchy-removal.md`](./hierarchy-removal.md) ships, removal takes the
entity's descendants with it. Until then, it takes only the scoped entity,
as `removeEntity` does everywhere else. At least one of the two lists must be non-empty.

The demo's run leftovers stay on screen behind the end-of-run panels and
are cleared when a new run starts or the menu comes up, so they use
`removeOnEnter: ['flying', 'menu']`. Particles are created by emitters, so
their scope is added in the emitter's `onParticleSpawned` callback. With
that, `clear-run.system.ts` is deleted. The demo's `removeWithHealthBar`
and `removePowerUp` helpers stay for kills during a run, until
[`hierarchy-removal.md`](./hierarchy-removal.md)'s open question 1 is
settled.

### 4.5 Where it lives

Run conditions and the first group are scheduling, so they're in
`src/ecs`. States, their component and their transition system are a new
`src/states` module with the usual `components`/`systems` layout, as Bevy
keeps `bevy_state` apart from `bevy_ecs`.

### 4.6 Several worlds

A `GameState` belongs to the world it's created with, which applies its
transitions and runs its enter and exit groups. Systems in another world,
such as a UI overlay world, can still be gated on it with `inState`,
since a run condition only reads the state. A world that `Game` updates
after the owning one sees each transition in the same frame.

---

## 5. Phases

### Phase 1: Run conditions and the first group

| #   | Task                                                                                                                                                | Size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `runIf` on `addSystem` and `addSystemGroup`; the update loop checks the group's condition, then the system's, and skips the query of a gated system | S    |
| 1.2 | `firstSystemGroup`; ordering a group before it throws                                                                                               | S    |
| 1.3 | Tests; `ecs/system.md` section; changelog under `#### Added`                                                                                        | S    |

**Definition of done:** a system whose condition is false doesn't run,
and its `cleanup` still runs when it's removed; the first group runs first
however groups were added.

### Phase 2: States and scoped entities

| #   | Task                                                                                                                       | Size |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | `src/states`: `createGameState`, transition system, `entered`/`exited`, initial entry, re-entry                            | M    |
| 2.2 | `exitGroup`/`enterGroup` ordering; `inState`, `onEnter`, `onExit`                                                          | S    |
| 2.3 | State-scoped component and removal at the transition                                                                       | S    |
| 2.4 | Module wiring; guide `states/`; a docs demo (menu, play, game over) with scoped entities and a `demos.ts` entry; changelog | M    |

**Definition of done:** the docs demo switches between three states with
no state checks inside its systems and no manual cleanup.

Phase 2 depends on Phase 1, and on
[`generational-entity-ids.md`](./generational-entity-ids.md) and
[`hierarchy-removal.md`](./hierarchy-removal.md) for scoped removal.

---

## 6. Decision log

### DL-1: Transitions apply at the start of the tick

**Options.** (a) At the start of the next tick. (b) Immediately when
`set` is called.

**Decision: (a).**

**Rationale.** With (b), systems earlier in the tick saw the old state
and later ones the new, which is the ordering constraint the demo
documents on its run systems ("must be registered after"). (a) is Bevy's
model, and the first group makes it hold for every system.

### DL-2: Enter and exit systems run at the transition point

**Options.** (a) `onEnter`/`onExit` as conditions on ordinary systems,
wherever they're registered. (b) Groups that run right after the
transition, holding systems with those conditions.

**Decision: (b).**

**Rationale.** With (a), setup for a new state would interleave with
gameplay systems in the same tick (a player spawned after the systems
that should see it). Bevy runs its enter and exit schedules at the
transition, before any `Update` system, for that reason. Groups placed at
the start of the tick (§4.2) give Forge the same order without a second
scheduling concept. Bevy runs `OnEnter`/`OnExit` as schedules run on
demand from the transition; Forge's groups run in the world's normal order
and are skipped by a run condition on ticks without a transition, so no
"registered but not run by the loop" kind of group is needed.

### DL-3: Scoped removal on enter as well as on exit

**Rationale.** "Remove when this state is left" is the common case. The
demo's run shows the other one: what a run leaves behind stays visible on
the end screens and goes when the next state that starts fresh is
entered. Bevy has both for the same reason.

### DL-4: States inside one world, not a world per state

**Options.** (a) States, run conditions and state-scoped entities inside
one world. (b) A world per state, the ECS form of a Unity or Godot scene
change: `Game` updates only the current state's worlds, and changing
state swaps them.

**Decision: (a).**

**Rationale.** A game's states share most of what's on screen. The
demo's background keeps streaming past behind the main menu, its journey
HUD fades out when the menu comes up and back in when a run starts, and a
run's asteroids and enemies stay on screen behind the end-of-run panels.
With (b), that content would have to live in a world updated in several
states, or be rebuilt in each, and entity ids are per world: a parent or
a joint's other body is always looked up in the entity's own world. Each
world also needs its own cameras and its own transform, render, UI and
input systems, and worlds that share a canvas don't compose today: each
world's render system clears the canvas before its first camera draws,
so a second world erases the first one's frame unless the render
context's `clearStrategy` is `'none'`. And (b) still needs what this
design adds: something has to decide when to swap, and the work done on
entering and leaving a state (spawning the player, logging the flight)
still has to run once, at the switch.

Several worlds stay the tool for content that doesn't interact, like the
UI overlay world in the `Game` guide (§4.6 covers gating its systems on a
state). Loading and unloading a level's content as a unit, as Unity's
scenes and Godot's packed scenes do, is a separate feature that this
design neither needs nor blocks.

---

## 7. Open questions

1. **Should `GameState` live on a component** (queryable, like the demo's
   run entity) rather than as an object passed to systems? An object
   matches how `Time` and `InputManager` are passed today.
   - (a) An object (proposed). (b) A component on a world entity.

---

## 8. Testing considerations

- Run conditions: system and group, false skips (and skips the query),
  true runs, both combined.
- First group: runs before a group added earlier and ordered before the
  default group; ordering a group before it throws.
- States: transition applied next tick; `entered`/`exited` for exactly
  one tick; initial state entered on the first tick; last request wins;
  re-entry exits and enters; exit group, removal and enter group in
  order.
- Scoped entities: removed on exit and on enter, with descendants, after
  the exit group and before the enter group.

## 9. Documentation and demo follow-up

- `ecs/system.md`: run conditions and the first group. New `states/`
  guide.
- Demo: `RunEcsComponent`'s phase machine, request flags,
  `enteredPhase`/`leftPhase` and the `loading` phase become a `GameState`;
  the gate checks become run conditions (the callback and fade checks
  read `runState.current`); `clear-run.system.ts` goes.
