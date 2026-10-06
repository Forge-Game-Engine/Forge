# Design: Game States, Run Conditions and State-Scoped Entities

|                                       |                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                           |
| **Kind**                              | Feature                                                                                                                                                                                     |
| **Found in**                          | Galactic Journey demo: `src/run/*` (`run.component.ts`'s `enteredPhase`/`leftPhase`, `run.system.ts`, `run-phases.ts`, `clear-run.system.ts`, `run-reset.system.ts`, `run-screens.system.ts`), 43 `isInMenu`/`hasEntered`/`hasLeft` checks across the game |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                    |
| **Related**                           | [`hierarchy-removal.md`](./hierarchy-removal.md), [`input-action-state.md`](./input-action-state.md), [`hierarchical-visibility.md`](./hierarchical-visibility.md)                            |

## 0. Targeted modules

| Path                                            | Change   | Notes                                                                                     |
| ----------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `src/ecs/states.ts`                             | **New**  | `createGameState`, `GameState`, `inState`/`onEnter`/`onExit` run conditions              |
| `src/ecs/state-scoped-component.ts`             | **New**  | Entities removed when their state is entered or left                                      |
| `src/ecs/ecs-world.ts`                          | Modified | `runIf` on `addSystem` and `addSystemGroup`                                               |
| `documentation-site/docs/docs/ecs/`             | Modified | States, run conditions                                                                    |

---

## 1. Summary

Most games move between a few top-level states (loading, menu, playing,
paused, game over) and most of their systems only make sense in some of
them. Forge has no notion of this. Its finite state machine is a general
predicate-driven utility, and systems run every tick.

The demo builds the missing pieces itself:

- **A state with enter and exit.** `RunEcsComponent` holds a
  `FiniteStateMachine` of phases plus `enteredPhase` and `leftPhase`, which
  `run.system.ts` sets for one tick after each transition, and which only
  systems registered after it may read. Moving to another phase means
  setting one of five request flags that the run system turns into a
  transition.
- **Systems that only run in some states.** 43 checks across the game
  (`isInMenu(run)`, `hasEntered(run, ...)`, `hasLeft(run, ...)`) at the top
  of systems, each querying the run entity first.
- **Entities that belong to a state.** `clear-run.system.ts` removes
  asteroids, bullets, enemies, grabbers, warnings, power-ups, particles and
  the player, kind by kind, when a run starts or the menu comes up, and
  needs a helper per kind that owns extra entities.

Bevy has all three as engine features: states with `OnEnter`/`OnExit`,
`run_if(in_state(...))`, and entities despawned when their state is left.
This design gives Forge the same.

---

## 2. Scope

### In scope

- `createGameState`: a named state, with transitions applied at the start
  of the tick.
- Run conditions on systems and system groups, with `inState`, `onEnter`
  and `onExit` built in.
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
  in a dedicated schedule before `Update`; `OnEnter`/`OnExit` schedules run
  once per transition; `run_if(in_state(...))` gates systems; entities
  with a `DespawnOnExit(state)` component (formerly `StateScoped`) are
  despawned, with their descendants, when that state is left.
- **Godot**: no built-in state, but scenes swap wholesale
  (`change_scene_to_file`), freeing the old tree, and `process_mode`
  pauses subtrees.
- **Unity**: scenes play the same role (loading a scene destroys the
  previous one's objects); systems in DOTS can be gated with
  `RequireForUpdate` or disabled.

Bevy is the ECS reference and the model here.

---

## 4. Design

### 4.1 States

```ts
interface GameState<TName extends string> {
  /** The current state. */
  readonly current: TName;
  /** The state entered at the start of this tick, if any. */
  readonly entered: TName | null;
  /** The state left at the start of this tick, if any. */
  readonly exited: TName | null;
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
```

`createGameState` registers a transition system in a group that runs
before the world's default group (the same way `registerInputs` adds its
groups). It's the only writer of `current`, `entered` and `exited`. A
transition requested during a tick is applied at the start of the next
one, so every system in a tick sees the same state, and `entered` and
`exited` are visible to all of them, wherever they're registered.

If `set` is called twice in a tick, the last request wins.

Re-entering lets a game restart without a detour through another state:
`set('playing')` while playing runs the exit and the enter of `playing`
again, with everything they trigger.

### 4.2 Run conditions

```ts
type RunCondition = (world: EcsWorld) => boolean;

world.addSystem(system, { runIf: inState(runState, 'flying') });
world.addSystemGroup(gameplayGroup, { runIf: inState(runState, 'flying') });

function inState<T extends string>(state: GameState<T>, ...names: T[]): RunCondition;
function onEnter<T extends string>(state: GameState<T>, ...names: T[]): RunCondition;
function onExit<T extends string>(state: GameState<T>, ...names: T[]): RunCondition;
```

A system runs if its own condition and its group's are true. Conditions
are evaluated each tick just before the system or group would run.
`onEnter`/`onExit` are true only on the tick of the transition, so a
system registered with `onEnter(runState, 'flying')` runs once per run,
like a Bevy `OnEnter` system.

Run conditions are scheduling only: a system's `query` and `tags` stay
fixed.

### 4.3 State-scoped entities

```ts
addStateScopedComponent(world, entity, {
  state: runState,
  removeOnExit: ['flying'],
});
```

The transition system removes every entity whose state left one of its
`removeOnExit` states, or entered one of its `removeOnEnter` states, before
any system of the tick runs. Removal takes the entity's descendants with it
([`hierarchy-removal.md`](./hierarchy-removal.md)). At least one of the
two lists must be non-empty.

The demo's run leftovers stay on screen behind the end-of-run panels and
are cleared when a new run starts or the menu comes up, so they use
`removeOnEnter: ['flying', 'menu']`, and `clear-run.system.ts` is deleted.

---

## 5. Phases

### Phase 1: Run conditions

| #   | Task                                                                                 | Size |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1.1 | `runIf` on `addSystem` and `addSystemGroup`; tests for both and their combination    | S    |
| 1.2 | `ecs/system.md` section; changelog under `#### Added`                                | S    |

**Definition of done:** a system whose condition is false doesn't run,
and its `cleanup` still runs when it's removed.

### Phase 2: States and scoped entities

| #   | Task                                                                                         | Size |
| --- | -------------------------------------------------------------------------------------------- | ---- |
| 2.1 | `createGameState`, transition system, `entered`/`exited`, re-entry                           | M    |
| 2.2 | `inState`, `onEnter`, `onExit`                                                               | S    |
| 2.3 | State-scoped component and removal at transition                                             | S    |
| 2.4 | Guide `ecs/states.md`; a docs demo (menu, play, game over) with scoped entities; changelog    | M    |

**Definition of done:** the docs demo switches between three states with
no state checks inside its systems and no manual cleanup.

---

## 6. Decision log

### DL-1: Transitions apply at the start of the tick

**Options.** (a) At the start of the next tick. (b) Immediately when
`set` is called.

**Decision: (a).**

**Rationale.** With (b), systems earlier in the tick saw the old state
and later ones the new, which is the ordering constraint the demo
documents on every run system ("must be registered after"). (a) is
Bevy's model.

### DL-2: Enter and exit as run conditions, not separate schedules

**Options.** (a) `onEnter`/`onExit` run conditions on ordinary systems.
(b) Dedicated enter/exit system lists per state (Bevy's schedules).

**Decision: (a).**

**Rationale.** Forge has one schedule; (a) adds no second scheduling
concept, and the systems keep their usual ordering. (b) is worth it in
Bevy because its schedules run exclusively; Forge's systems already run
in order every tick.

### DL-3: Scoped removal on enter as well as on exit

**Rationale.** "Remove when this state is left" is the common case. The
demo's run shows the other one: what a run leaves behind stays visible on
the end screens and goes when the next state that starts fresh is
entered.

---

## 7. Open questions

1. **Should `GameState` live on a component** (queryable, like the demo's
   run entity) rather than as an object passed to systems? An object
   matches how `Time` and `InputManager` are passed today.
   - (a) An object (proposed). (b) A component on a world entity.

---

## 8. Testing considerations

- Run conditions: system and group, false skips, true runs, both
  combined.
- States: transition applied next tick; `entered`/`exited` for exactly
  one tick; last request wins; re-entry exits and enters.
- Scoped entities: removed on exit and on enter, with descendants, before
  the tick's systems.

## 9. Documentation and demo follow-up

- `ecs/system.md`: run conditions. New `ecs/states.md`.
- Demo: `RunEcsComponent`'s phase machine, request flags and
  `enteredPhase`/`leftPhase` become a `GameState`; the 43 checks become run
  conditions; `clear-run.system.ts` and the per-kind removal helpers go.
