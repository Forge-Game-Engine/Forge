---
name: create-system
description: Create a new ECS system for the Forge engine, a stateless plain object made by a create<Name>EcsSystem factory, with a fixed query, injected dependencies (e.g. Time) and all of its state kept in components, wired into its module's exports. Use when asked to add a new system (e.g. "add a system that does X", "create a damage system"), or when a change would give an existing system state of its own.
---

# Create an ECS System

Forge systems are **not** classes. A system is a plain object that
implements `EcsSystem<TQuery>` (`src/ecs/ecs-system.ts`), made by a
`create<Name>EcsSystem` factory. The world calls its `update` once per tick
with every entity that matches its `query` (and `tags`), and the system
loops over them itself.

## The rule: a system holds no state

A system is a function of the world. Everything it reads comes from
components or from dependencies passed to its factory, and **the only state
it changes is component data**. It keeps nothing of its own between ticks.

**Allowed in the factory's closure** (dependencies and configuration, which
the system only reads):

- Engine services passed to the factory: `time: Time`,
  `renderContext: RenderContext`, an input or audio service. The system
  reads them; it doesn't own or change them. `createGravityEcsSystem(time)`
  and `createTimerEcsSystem(time)` are the model.
- Tuning options resolved once with `withDefaults` and never changed
  afterwards (`createCollisionResolutionEcsSystem`'s `resolvedOptions`).
- Objects built once in the factory from those dependencies that hold no
  per-entity or per-tick information, such as the `Material` that
  `createPresentEcsSystem` compiles from its shaders.
- Pure helper functions. Put them at module level, below the factory, not
  in the closure (see `timer-system.ts`).

**Not allowed** (this is state, whatever it's called):

- A `let` in the factory that `update` reassigns: counters, "last frame"
  values, flags, a cached `world`.
- A `Map`, `Set`, `WeakMap` or array in the factory that `update` adds to
  or removes from: per-entity bookkeeping, "already processed", snapshots
  of a component from an earlier tick, handles created for an entity.
- A field written on a dependency to carry information to the next tick.
- Module-level mutable variables (the same thing, shared by every instance).

Variables declared **inside** `update` are fine. They start fresh every tick,
so they're working memory, not state. Prefer them over a closure collection
that `update` clears at the start of each tick.

### Why

- **Behavior is visible in the data.** Saving, loading, inspecting or
  resetting the world captures everything that affects the next tick.
  State hidden in a closure survives `world.removeEntity`, makes two
  instances of the same system behave differently, and isn't in a save.
- **One writer per value.** Component fields have one owning system (see
  `AGENTS.md`'s "Transforms"). A value that lives in a component has an
  owner other code can see and read; a value in a closure can't be read by
  anything else, so the next feature that needs it duplicates it.
- **Systems stay replaceable and testable.** A stateless system can be
  removed, re-created or registered with another world without losing
  anything, and a test only has to build components and call `update`.

### Where state goes instead

Name what the state describes, then put it in the component that owns it:

| The system wants to remember...                               | Put it in                                                                                                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Progress on an entity (elapsed time, a phase, a count)        | A field on that entity's component (`TimerEcsComponent`'s task `elapsed`, `LifetimeEcsComponent.elapsedSeconds`)                                                              |
| A result it computed (finished, contact found, measured size) | An output field the system alone writes, left out of the factory's options (`SoundEcsComponent.hasFinished`; see the `create-component` skill)                                |
| Bookkeeping that isn't part of the user-facing component      | A separate component the system adds to the entity and owns (e.g. a `<name>StateId` component holding a handle or a "last applied" value), removed when it's no longer needed |
| Something shared by every entity, not one of them             | A component on a single entity (a "resource" entity), queried or looked up with `world.query`                                                                                 |
| Something that must happen once per change                    | A dirty flag or version number on the component, written by whoever changes the data and cleared by the system                                                                |

Use the `create-component` skill for any component this needs.

If the feature seems to need system state that none of these fit, stop and
raise it with the user before writing the system. Don't invent a new
exception.

### Existing systems are not all examples of this

Some systems in `/src` still keep state in their closure (for example
`createSoundEcsSystem`'s `trackedSounds` and `updateCount`,
`createTextShapingEcsSystem`'s snapshot map, `createTransformEcsSystem`'s
`frozen` map, and the per-target caches in the rendering post-processing
systems). Don't copy that pattern into a new system, and don't extend it in
an existing one.

## 1. Pick the module and name

Find the `/src/<module>` this system belongs to: usually the same module as
the components it's about. If none fits, ask the user or see `AGENTS.md`'s
"Creating a New Module" section first.

Naming, following the existing systems (`createGravityEcsSystem` in
`gravity-system.ts`, `createAgeScaleEcsSystem` in `age-scale-system.ts`):

- File: `src/<module>/systems/<kebab-case-name>-system.ts`
- Factory: `create<PascalCaseName>EcsSystem`

## 2. Decide the query

- `query` lists every component the system needs on **every** entity it
  processes, in the order `update` reads them. A component only some
  of those entities have isn't in `query`; read it in the loop with
  `world.getComponentAccessor` (see
  `documentation-site/docs/docs/ecs/system.md`).
- `tags` (optional) narrow the match without adding a component array.
- `query` and `tags` are **fixed**. The factory never takes an option that
  changes them. If the system matches entities it shouldn't touch, those
  entities have the wrong components; fix that instead.
- Check which component fields the system writes, and that no other system
  writes them already. If one does, that's a design problem to raise, not a
  second writer to add. Write `local` transform values, never `world`.

## 3. Write the system file

```typescript
import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  <PascalCaseName>EcsComponent,
  <camelCaseName>Id,
} from '../components/<kebab-case-name>-component.js';

/**
 * Creates an ECS system that <what it does to which entities, in one
 * sentence>.
 *
 * <Which fields it reads, which it writes, and anything a caller must know
 * about ordering (e.g. "Run it before `createTransformEcsSystem`, which
 * turns the local position it writes into the world position.").>
 * @param time - The time instance used to <what the dependency is for>.
 * @returns The <name> ECS system.
 */
export const create<PascalCaseName>EcsSystem = (
  time: Time,
): EcsSystem<[<PascalCaseName>EcsComponent]> => ({
  query: [<camelCaseName>Id],
  update: (_world, { components: [<camelCaseName>Components] }) => {
    const deltaSeconds = time.deltaTimeInSeconds;

    for (let i = 0; i < <camelCaseName>Components.length; i++) {
      advance<PascalCaseName>(<camelCaseName>Components[i], deltaSeconds);
    }
  },
});

const advance<PascalCaseName> = (
  component: <PascalCaseName>EcsComponent,
  deltaSeconds: number,
): void => {
  // Read and write component fields only.
};
```

Notes:

- The factory returns the object directly (`=> ({ ... })`). If you find
  yourself writing `=> { const x = ...; return { ... }; }`, check that `x`
  is a dependency or resolved option and not state.
- Dependencies are factory parameters, typed with the engine's own types
  (`Time`, `RenderContext`, ...). Don't pass the `EcsWorld` in: `update`
  receives it.
- Tuning options, if the system genuinely needs some, follow `AGENTS.md`'s
  default-options-object pattern (`withDefaults(default<Name>Options,
options)`), resolved once in the factory. Check "Change Philosophy" first:
  most systems need none.
- Loop with an index over the component arrays (`components[0][i]` belongs
  to `entities[i]`). Use `entities[i]` when you need the entity id, and check
  `world.isAlive(entity)` first in a loop that removes entities.
- `onRegister` and `cleanup` are for releasing what the system's
  dependencies need released when the system goes away, not for setting up
  or clearing state of its own. A stateless system usually has neither.
- `name` is optional; set it if the system is likely to appear in an
  ordering error.
- No `switch`, early returns over nested `if`s, explicit return types, and
  the rest of `AGENTS.md`'s "Coding Conventions" apply.
- JSDoc the factory: what it does, which fields it reads and writes, each
  `@param`, and `@returns`. This feeds the generated API reference.

## 4. Export it

Add to `src/<module>/systems/index.ts`:

```typescript
export * from './<kebab-case-name>-system.js';
```

Every module's top-level `index.ts` already exports `./systems/index.js`
(check; add it if this is the module's first system). For a brand-new
module, see `AGENTS.md`.

## 5. Test the system

Write `<kebab-case-name>-system.test.ts` next to the system, following
`gravity-system.test.ts`'s shape: create an `EcsWorld` and the dependencies
in `beforeEach`, register the system with `world.addSystem`, build entities
with the `add<Name>Component` factories, call `world.update()`, and assert
on component fields. Driving it through the world (rather than calling
`update` with a hand-built `QueryResult`) also checks that `query` matches
the entities you expect.

Cover:

- What the system writes, for typical values and edge cases.
- Entities it must leave alone (a different body type, a missing optional
  component).
- That it doesn't write fields it doesn't own (e.g. `scale.world` stays
  untouched; see `age-scale-system.test.ts`).
- Statelessness: the system's output depends only on components and
  dependencies. For example, a fresh instance of the system registered on a
  world produces the same result as one that has already run for several
  ticks, and removing an entity and adding a new one with the same
  components starts it from the component's values, not from leftovers.

## 6. Document and register it

- Where a game registers this system matters (it has to run after the
  systems that write what it reads, and before the ones that read what it
  writes). Say so in its JSDoc, and in the module's guide under
  `documentation-site/docs/docs` using the `document-feature` skill.
- If the system replaces a stateful one or moves its state into a
  component, update every caller in `/src`, `/demo`, `/e2e` and
  `documentation-site` in the same change.

## 7. Verify

Run the full CLAUDE.md verification suite from the repo root:
`npm run check-types`, `npm test`, `npm run lint`, `npm run cspell`,
`npm run check-exports`, and add a `CHANGELOG.md` bullet under
`## [Unreleased]` for a new public system. Before finishing, re-read the
factory: if anything declared outside `update` is changed inside `update`,
the system has state; move it into a component.
