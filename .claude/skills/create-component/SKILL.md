---
name: create-component
description: Create a new ECS component for the Forge engine, a plain data interface plus a createComponentId key, wired into its module's exports. Use when asked to add a new component (e.g. "add a component for X", "create a health component").
---

# Create an ECS Component

Forge components are **not** classes. A component is a plain data
`interface` plus a unique key created with `createComponentId`, stored on
entities in an `EcsWorld` via `world.addComponent(entity, someId, value)`.

## 1. Pick the module and name

Find the `/src/<module>` this component belongs to (`common`, `rendering`,
`physics`, `audio`, `input`, `animations`, `lifecycle`, `timer`,
`particles`, ...). If none fits, ask the user or see `AGENTS.md`'s "Creating
a New Module" section first.

Naming, following the dominant convention across existing components
(`positionId`/`'position'`, `cameraId`/`'camera'`, `speedId`/`'speed'`,
`ageScaleId`/`'ageScale'`, `gaussianBlurId`/`'gaussianBlur'`):

- File: `src/<module>/components/<kebab-case-name>-component.ts`
- Interface: `<PascalCaseName>EcsComponent`
- Id constant: `<camelCaseName>Id`
- Symbol description string: same as the camelCase name, e.g. `'ageScale'`

## 2. Write the component file

The interface, its id, and its `add<Name>Component` factory all live
together in `src/<module>/components/<kebab-case-name>-component.ts`. Every
component gets an `add<Name>Component` factory in this same file, don't
skip it even for simple components; it's the only supported way callers
attach this component to an entity. `add<Name>Component` always **attaches
to a caller-supplied entity** — it never creates one itself (see "Aggregate
factories" below for the one case that does). This is what lets a caller
build up a composite entity (position + rotation + scale + sprite + ...) by
calling several `add<Name>Component` functions against the same entity,
which is how entities are actually assembled everywhere in this codebase
(see `demo/src/game.ts`).

Follow `AGENTS.md`'s default-options-object pattern (an object literal
named with "default", spread against the caller's options, not inline `??`
per field):

```typescript
import { EcsWorld } from '../../ecs/ecs-world.js';
import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for <what this represents>.
 */
export interface <PascalCaseName>EcsComponent {
  /**
   * <field description: units, semantics, what mutating it does, anything
   * non-obvious. Skip the comment only if the field name is fully
   * self-explanatory.>
   */
  someField: number;
}

export const <camelCaseName>Id =
  createComponentId<<PascalCaseName>EcsComponent>('<camelCaseName>');

const default<PascalCaseName>Options: <PascalCaseName>EcsComponent = {
  someField: 0,
};

/**
 * Attaches a {@link <PascalCaseName>EcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the <name>.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function add<PascalCaseName>Component(
  world: EcsWorld,
  entity: number,
  options: Partial<<PascalCaseName>EcsComponent> = {},
): <PascalCaseName>EcsComponent {
  const component: <PascalCaseName>EcsComponent = {
    ...default<PascalCaseName>Options,
    ...options,
  };

  return world.addComponent(entity, <camelCaseName>Id, component);
}
```

Notes:

- `createComponentId` wraps `Symbol(name)`, symbols are unique per call
  regardless of the string, so the description string only has to be
  readable for debugging, not globally unique.
- Import any cross-module types needed (e.g. `Vector2` from `../../math/index.js`)
  the same way `position-component.ts` and `camera-component.ts` do.
- JSDoc the interface, every field, and the factory per `AGENTS.md`, this
  is what feeds the generated API reference.
- Note that `default<PascalCaseName>Options` above is typed as the full
  `<PascalCaseName>EcsComponent`, **not** `Partial<...>`. This is
  deliberate: it's what makes the compiler catch a defaulted field added
  later without a matching entry in `default<PascalCaseName>Options` (with
  `Partial<...>`, the object could silently omit it and every entity that
  didn't explicitly pass that field would get `undefined` instead of a
  sensible value).
- A component's fields fall into three categories, and mixing them up is
  exactly what the two mistakes below produce:
  - **required** — no sensible default, e.g. `physicsBody` on
    `PhysicsBodyEcsComponent`. Must always be passed to the factory.
  - **defaulted** — has an entry in `default<PascalCaseName>Options`.
    Optional to pass to the factory, but always defined on the resulting
    component.
  - **optional** — marked `?` directly on `<PascalCaseName>EcsComponent`
    (never in `default<PascalCaseName>Options`), e.g. `isKinematic?` on
    `PhysicsBodyEcsComponent`. Never required, may stay `undefined` for the
    entity's whole lifetime; systems reading it must handle that.
  Never use `Pick<<PascalCaseName>EcsComponent, 'requiredField'>` to mark a
  field required in the factory's `options` — the string literal isn't
  checked against the interface, so a field added later without a default
  silently becomes optional instead of a type error. Extract a named
  interface instead, following whichever of these matches the component:
  - **Has required fields, and nothing else** (only required, or required
    plus already-`?`-optional fields): the component interface is already
    the exact shape the factory needs — use `options:
    <PascalCaseName>EcsComponent` directly, no extra interface, no `Pick`,
    no `Partial` (see `parent-component.ts`, `inputs-component.ts`, or
    `physics-body-component.ts`).
  - **Has required fields and defaulted fields**: pull the required ones
    into a `<PascalCaseName>RequiredOptions` interface
    (`<PascalCaseName>EcsComponent extends <PascalCaseName>RequiredOptions`).
    The factory's `options` parameter is
    `<PascalCaseName>RequiredOptions & Partial<<PascalCaseName>EcsComponent>`.
    If there are no genuinely-optional (`?`) fields on top, also pull the
    defaulted ones into a `<PascalCaseName>DefaultedOptions` interface so
    `default<PascalCaseName>Options` can be typed as that (not the whole
    component, which would wrongly force the required fields into the
    defaults object too) — see `audio-component.ts`, `lifetime-component.ts`,
    or `sprite-animation-component.ts`. `sprite-component.ts` shows the same
    shape with more fields.
  - **Has no required fields, only defaulted fields**: no interface split
    needed at all — type `default<PascalCaseName>Options` as the full
    `<PascalCaseName>EcsComponent` directly, as in the template above (see
    `bloom-component.ts`, `flip-component.ts`, `speed-component.ts`, and
    most other components).
  - **Has no required fields, but has both defaulted and genuinely-optional
    (`?`) fields**: split out a `<PascalCaseName>DefaultedOptions`
    interface holding just the defaulted fields
    (`<PascalCaseName>EcsComponent extends <PascalCaseName>DefaultedOptions`,
    with the `?` fields staying directly on `<PascalCaseName>EcsComponent`),
    and type `default<PascalCaseName>Options` as that interface. This isn't
    strictly required for type safety (the `?` fields would stay optional
    either way), but it documents the split clearly once a component's
    field list is long enough that "which fields are defaulted vs.
    genuinely optional" isn't obvious at a glance — see `camera-component.ts`
    or `position-component.ts`.

### Aggregate factories (`create<Name>`)

A handful of components represent something that's always the root of its
own entity in practice (so far: just `camera`). For these, add a
`create<Name>(world, options): number` alongside `add<Name>Component`: it
calls `world.createEntity()`, then calls `add<Name>Component` (and any
other `add<Other>Component` needed to make the entity meaningful, e.g.
`createCamera` also calls `addPositionComponent`) against the new entity,
and returns the entity id.

Because an aggregate factory spans more than one component, it doesn't
belong in a single component file — put it in
`src/<module>/utilities/create-<kebab-case-name>.ts` instead (see
`create-camera.ts`). Only add a `create<Name>` when a component is actually
used this way; most components should only get `add<Name>Component`.

## 3. Export it

Add to `src/<module>/components/index.ts`:

```typescript
export * from './<kebab-case-name>-component.js';
```

Every module's top-level `index.ts` already does `export * from
'./components/index.js';`, so no further wiring is needed unless this is a
brand-new module (see `AGENTS.md`).

## 4. Test the factory

Test `add<Name>Component` in a co-located `<kebab-case-name>-component.test.ts`,
following `bloom-component.test.ts`'s shape: attaches a component with
defaults applied for unspecified options, overrides only the provided
options, and returns the attached component (`toBe` the value read back via
`world.getComponent`). This factory test is the coverage for the component,
the interface itself needs no separate test.

If you also added a `create<Name>` aggregate factory, test it alongside its
own file (`create-<kebab-case-name>.test.ts` next to
`create-<kebab-case-name>.ts`), following `create-camera.test.ts`'s shape:
returns a new entity carrying every component the aggregate attaches,
defaults applied, provided options applied, distinct entities returned
across calls.

## 5. Verify

Run the full CLAUDE.md verification suite from the repo root:
`npm run check-types`, `npm test`, `npm run lint`, `npm run cspell`,
`npm run check-exports`. Add any new words the component introduces (e.g.
an unusual field or component name) to `cspell.json` if `cspell` flags
them.

If this component is user-facing and warrants a conceptual guide (not just
an API reference entry), use the `document-feature` skill.
