# AGENTS.md - Coding Agent Guide for Forge Game Engine

This document provides guidance for AI coding agents working on the Forge Game Engine codebase. It covers architecture, conventions, and best practices to help agents write code that matches the existing codebase.

Human contributors: see [CONTRIBUTING.md](./CONTRIBUTING.md) for a shorter, human-facing summary of setup, verification steps, and commit/changelog conventions that links back here for the full detail.

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Architecture](#architecture)
- [Coding Conventions](#coding-conventions)
- [Module Organization](#module-organization)
- [Development Workflow](#development-workflow)
- [Changelog](#changelog)
- [Testing](#testing)
- [Documentation Site Demos](#documentation-site-demos)
- [Documentation Site Blog](#documentation-site-blog)
- [Common Patterns](#common-patterns)
- [Security Considerations](#security-considerations)

## Project Overview

Forge is a browser-based, code-only game engine built with TypeScript. It provides core game engine functionality including:

- **ECS (Entity-Component-System)**: Core architecture pattern
- **Rendering**: WebGL2-based rendering system
- **Physics**: Native 2D physics engine (rigid bodies, collision detection/resolution, gravity)
- **Audio**: Sound management via Howler.js
- **Animations**: Robust animation system
- **Input**: Keyboard, mouse, and touch input handling
- **Particles**: Particle system
- **Asset Loading**: Resource management
- **FSM**: Finite state machine implementation

**Important**: The engine contains general-purpose game functionality. Game-specific or genre-specific code should be in separate packages.

## Repository Structure

```
/src                        # Source code organized by feature modules
  /animations              # Animation system
  /asset-loading           # Asset loading utilities
  /audio                   # Audio system
  /common                  # Shared components and utilities
  /ecs                     # Entity-Component-System core
  /events                  # Event system
  /finite-state-machine    # FSM implementation
  /input                   # Input handling
  /lifecycle               # Lifecycle management
  /math                    # Math utilities
  /particles               # Particle system
  /physics                 # Physics integration
  /pooling                 # Object pooling
  /rendering               # Rendering system
  /timer                   # Timer utilities
  /utilities               # General utilities
  index.ts                 # Main exports

/demo                      # Demo application
/documentation-site        # Docusaurus documentation
/scripts                   # Build and utility scripts
/assets                    # Static assets (images, etc.)
```

### Module Exports

The package exports are modular. Each subsystem has its own export path:

- `@forge-game-engine/forge/ecs`
- `@forge-game-engine/forge/rendering`
- `@forge-game-engine/forge/physics`
- etc.

Each module has an `index.ts` file that exports its public API.

## Architecture

### Entity-Component-System (ECS)

The codebase follows a data-oriented ECS pattern built from plain objects and
factory functions, not classes:

1. **Components**: Plain data interfaces, not classes. Each one gets a
   `createComponentId` key (a symbol) and an `add<Name>Component` factory
   that attaches it to a caller-supplied entity (see "Component Pattern"
   below). Components carry no logic.

2. **Systems** (`EcsSystem<TQuery>`): Plain objects, produced by
   `create<Name>EcsSystem` factory functions, not classes. A system declares
   a `query` (the component keys it reads, in order) and an optional set of
   `tags`, and implements `update(world, queryResult)`. `queryResult` is a
   batch for the whole tick - `entities: readonly number[]` and a
   `components` array (one array per queried component type, in query
   order) - so `update` runs exactly once per tick regardless of how many
   entities matched (including zero), and the system iterates the batch
   itself. An optional `cleanup(world)` hook runs once when the system is
   removed from an `EcsWorld` or the world is stopped. See "System Pattern"
   below and `/documentation-site/docs/docs/ecs/system.md`.

3. **Entities**: Just numeric ids (`number`), created with
   `EcsWorld.createEntity()`. Components are attached/detached by id via the
   world (`addComponent`/`removeComponent`/`addTag`); there is no `Entity`
   object. Parent-child relationships are expressed via a
   `ParentEcsComponent` referencing another entity's id, not object
   containment.

4. **World** (`EcsWorld`): Container for component data and registered
   systems. Stores component data grouped by component key, runs each
   registered system's `update` once per `EcsWorld.update()` tick (in
   registration-order), and exposes `query(componentKeys, tags?)` for
   ad-hoc lookups outside of a system's own `query`.

### Key Patterns

- **Dependency Injection**: Systems receive dependencies via constructor (e.g., `RenderContext`)
- **Composition over Inheritance**: Favor components over deep class hierarchies
- **Immutability**: Use `readonly` for fields that shouldn't change after construction
- **Private fields**: Prefix with underscore (`_fieldName`)
- **Initialization**: Members are initialized in the constructor body
- **Getters/Setters**: Getters and setters have no access modifiers (always public by default)

## Coding Conventions

### TypeScript Style

**Naming Conventions** (enforced by ESLint):

- **Classes**: `PascalCase` (e.g., `RenderSystem`, `Entity`)
- **Interfaces**: `PascalCase` (e.g., `EntityOptions`)
- **Types**: `PascalCase` (e.g., `ComponentCtor`)
- **Public members**: `camelCase` (e.g., `getComponent`)
- **Private members**: `camelCase` with leading underscore (e.g., `_components`)
- **Constants**: `camelCase` or `UPPER_SNAKE_CASE` depending on context
- **Files**: `kebab-case.ts` (e.g., `render-system.ts`)

**Member Visibility**:

- Always use explicit access modifiers (`public`, `private`, `protected`)
- Exception: Constructors don't need `public`
- Exception: Getters and setters have no access modifiers
- Private fields must have leading underscore

**Member Ordering** (enforced by ESLint):

1. Public instance fields
2. Protected instance fields
3. Private instance fields
4. Public static fields
5. Protected static fields
6. Private static fields
7. Constructor
8. Public static methods
9. Protected static methods
10. Private static methods
11. Public instance methods
12. Protected instance methods
13. Private instance methods

**Type Safety**:

- Use strict TypeScript mode (already enabled in `tsconfig.base.json`)
- Always specify return types for functions: `update(world: EcsWorld, queryResult: QueryResult<T>): void`
- Avoid `any`; use `unknown` if necessary
- Avoid null assertions and casting
- Types should be narrowed and nullish values should be handled appropriately (usually by throwing an error if it makes sense to do so)
- No unused locals or parameters (enforced)

**Imports**:

- Use ES module syntax: `import { X } from './path.js'`
- **Important**: Always include `.js` extension in imports (even for `.ts` files)
- Sort imports alphabetically (case-insensitive, enforced by ESLint)
- Group imports: external libraries first, then internal modules

**Code Style**:

- Use single quotes for strings
- Semicolons required
- 2-space indentation
- Trailing commas in multi-line structures
- Max 7 parameters per function
- Use curly braces for all control structures
- Prefer early returns over nested conditionals
- Execute/return default behavior after all special cases are handled
- No `else` after `return` (early return pattern)
- No switch statements - use polymorphic dispatch or strategy functions instead
- Blank lines before and after block-like statements

**JSDoc Comments**:

- Document all public classes, methods, and properties
- Use `@param`, `@returns`, `@throws` annotations
- Document complex private methods
- Example:
  ```typescript
  /**
   * Adds components to the entity.
   * @param components - The components to add.
   * @throws An error if a component with the same name already exists on the entity.
   */
  public addComponents(...components: Component[]): void {
    // implementation
  }
  ```

### Linting and Formatting

- **ESLint**: Run `npm run lint` to check, `npm run lint:fix` to auto-fix
- **Prettier**: Run `npm run prettier` to check, `npm run prettier:write` to format
- **TypeScript**: Run `npm run check-types` to verify types
- **Spell Check**: Run `npm run cspell` to check spelling

ESLint is configured with:

- TypeScript ESLint with type checking
- SonarJS for code quality
- Prettier integration
- Jest rules for test files

## Module Organization

### Creating a New Module

1. Create a directory under `/src/your-module`
2. Add an `index.ts` that exports the public API
3. Add sub-folders for organization:
   - `/components` - Component interfaces, their `createComponentId` keys, and `add<Name>Component` factories (see "Component Pattern" below)
   - `/systems` - Systems that operate on those components
   - `/types` - Type definitions and interfaces
4. Update `/src/index.ts` to export the new module
5. Add export mapping in `package.json` if it should be separately importable

### Component Pattern

Components are plain data interfaces, not classes. Each one gets a
`createComponentId` key and an `add<Name>Component` factory that attaches
it to a caller-supplied entity, all colocated in the same file. This lets a
caller build up a composite entity by calling several `add<Name>Component`
functions against the same entity (position + rotation + scale + sprite +
...), which is how entities are assembled throughout this codebase.
`add<Name>Component` never creates its own entity; a handful of components
that are always the root of their own entity in practice (currently just
`camera`) additionally get a `create<Name>` aggregate factory that creates
an entity and calls the relevant `add<Name>Component` functions against it.
See the `create-component` skill for the full pattern, including the
default-options-object convention and `create-camera.ts` as the
aggregate-factory example.

### System Pattern

Systems are plain objects produced by a `create<Name>EcsSystem` factory, not
classes. `update` receives the whole tick's batch of matches at once
(`entities` plus one `components` array per queried component type, in query
order) and iterates it itself:

```typescript
import { EcsSystem } from '../../ecs/index.js';
import { MyComponent, myComponentId } from '../components/my-component.js';

/**
 * Creates a system that processes every entity with a `MyComponent`.
 * @returns The ECS system.
 */
export const createMyEcsSystem = (): EcsSystem<[MyComponent]> => ({
  query: [myComponentId],
  update: (world, { components: [myComponents] }) => {
    for (const myComponent of myComponents) {
      // Process component data
    }
  },
});
```

See `/documentation-site/docs/docs/ecs/system.md` for the full contract,
including the optional `tags` and `cleanup` fields.

### Index Files

Each module's `index.ts` should export everything from its submodules:

```typescript
export * from './my-class.js';
export * from './subfolder/index.js';
```

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Run demo in development mode
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Run tests with UI
npm run test:ui
```

### Build Process

- Build command: `npm run build`
- Compiles TypeScript to JavaScript with declarations
- Copies shader files to dist directory
- Output directory: `/dist`

### Git Workflow

**Commit Messages** (Conventional Commits):

- Format: `<type>(<scope>): <subject>`
- Types: `feat`, `fix`, `perf`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`
- Example: `feat(ecs): add component removal event`
- Max length: 200 characters
- Enforced by commitlint with husky pre-commit hooks

## Changelog

`/CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
[Semantic Versioning](https://semver.org/). Feature branches merge into `dev` via squash
merge, so a PR's title becomes its permanent commit message and changelog source.

**When you must add an entry**: if a change's Conventional Commits type is anything other
than `chore`, `style`, `refactor`, `test`, `ci`, `docs`, or `build` (i.e. it's a `feat`,
`fix`, `perf`, or similar release-note-worthy type), add one bullet under the
`## [Unreleased]` heading, in the matching Keep a Changelog category (`#### Added`,
`#### Changed`, `#### Deprecated`, `#### Removed`, `#### Fixed`, `#### Security` — only
include the categories that have entries). Write it for the consumer of the package, not as
a restatement of the commit message. This is enforced by CI
(`.github/workflows/changelog.yml`): a PR whose title isn't an excluded type fails the
`check-changelog` job unless `CHANGELOG.md` gained a new bullet under `[Unreleased]`.

**What agents should never hand-edit**:

- Released version sections (`## [x.y.z] - date`) — these are historical record. Fix a
  factual error if you find one, but don't add new entries to a past release.
- `documentation-site/docs/changelog.md` — generated from the root `CHANGELOG.md` by
  `documentation-site/scripts/sync-changelog.mjs` on `prestart`/`prebuild`, and gitignored.
  Never edit or commit it directly; edit `/CHANGELOG.md` instead and the docs site picks it
  up on the next build.

**What's automated**: `scripts/changelog/promote-unreleased.mjs`, run by
`.github/workflows/create-release.yml` during the "Create Release" workflow, moves
everything under `[Unreleased]` into a new `## [x.y.z] - date` section and leaves a fresh
empty `[Unreleased]` behind. Don't run this manually or preemptively rename `[Unreleased]`
yourself — the release workflow owns that step.

## Testing

### Testing Framework

- **Vitest** for unit tests
- **jsdom** for DOM mocking
- Test files: `*.test.ts` or `*.spec.ts`

### Test File Organization

- Place test files next to the code they test: `render-system.ts` → `render-system.test.ts`
- Use descriptive test names
- Group related tests with `describe` blocks

### Test Patterns

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyClass } from './my-class.js';

describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass();
  });

  it('should do something', () => {
    const result = instance.doSomething();
    expect(result).toBe(expected);
  });

  it('should throw error on invalid input', () => {
    expect(() => instance.method(invalid)).toThrow();
  });
});
```

### Test Conventions

- Use `beforeEach` for common setup
- Test edge cases and error conditions
- Mock external dependencies when needed
- Use descriptive assertions
- For tests involving ECS, create a minimal `World` and entities

### Coverage

- `npm run test:coverage` runs the unit suite with V8 coverage instrumentation
  (configured in `vite.config.base.js`'s `test.coverage`) and writes a report
  to `/coverage` (gitignored): a terminal summary, an `lcov.info`, and an
  HTML report at `coverage/index.html`.
- CI's `test` job (`.github/workflows/ci.yml`) runs `test:coverage` instead of
  plain `npm test` and uploads `/coverage` as the `coverage-report` workflow
  artifact on every run, so coverage is checked without needing a local run.
- There's no enforced coverage threshold yet - the report is a visibility
  tool, not a gate. Modules with thin test suites (check the per-file
  breakdown in the terminal summary or `coverage/index.html`) are good
  candidates for new tests.

## Integration & E2E Testing

`/e2e` holds real-browser tests (Playwright) for cross-system behavior that
unit tests can't see: a real WebGL2 canvas, real DOM input events run through
the actual input pipeline, and a real (but manually stepped, not
`requestAnimationFrame`-driven) game loop. Unlike `/src`'s unit tests - which
mock the WebGL context and drive systems directly - these exercise the real
rendering and input code paths end-to-end.

**These tests depend only on `/src`, never on `/demo` or
`/documentation-site`.** Each scenario gets its own minimal, purpose-built
scene under `e2e/fixtures/scenes/`, built directly against the engine's
public API, so e2e stays unaffected by unrelated changes to the demo app or
docs site (and vice versa).

### Layout

```
e2e/
  fixtures/
    index.html           # single HTML shell (a sized #app container + harness.ts)
    harness.ts            # reads `?scene=`, loads the matching scene, exposes window.__forgeTestHooks
    scenes/
      scene.ts             # the SceneHandle/CreateScene contract every scene implements
      camera-pan-zoom.ts   # imports straight from '../../../src/index.js'
  specs/
    camera-pan-zoom.spec.ts
  playwright.config.ts
  tsconfig.json
vite.config.e2e.js          # dev server for fixtures/, rooted like vite.config.demo.js is for /demo
```

### Adding a new scenario

1. Add `e2e/fixtures/scenes/<name>.ts` exporting a `createScene: CreateScene`
   that builds a minimal world/camera/systems from `/src` and returns a
   handle (implementing `SceneHandle`, extended with whatever fields the spec
   needs to assert against - see `CameraSceneHandle` in
   `camera-pan-zoom.ts`). `harness.ts` picks it up automatically via
   `import.meta.glob('./scenes/*.ts')` - nothing else to register.
2. Drive real browser input against it in `e2e/specs/<name>.spec.ts`
   (`page.locator('canvas').dispatchEvent('wheel', ...)`,
   `page.keyboard.down/up(...)`, etc.) and assert through
   `window.__forgeTestHooks`.
3. Call `handle.step(deltaMilliseconds?)` to advance exactly one frame
   deterministically (it drives `Time.update`/`EcsWorld.update` directly,
   not `Game.run()`'s `requestAnimationFrame` loop), instead of waiting on
   real time. This is what keeps the suite flake-free.

**Node vs. browser split**: `e2e/specs/*.spec.ts` files run under Node
(Playwright's own TS loader), not through Vite - they can `import type` from
a scene module freely (erased at compile time), but a _value_ import that
transitively pulls in `/src` (e.g. anything importing shader `.glsl?raw`
sources) will crash Node's loader, which can't parse those. If a spec needs
a plain constant a scene also uses (see `clearColorRgb` in
`camera-pan-zoom-clear-color.ts`), give it its own tiny module with zero
`/src` imports, and have both the scene and the spec import from that.

**Be wary of pixel-level rendering assertions.** `camera-pan-zoom.spec.ts`
originally included a test that read back the canvas's clear color to prove
a frame actually rendered. It was removed: the read was correct and
reproducible locally (verified via `gl.readPixels`, then again via a
`context2d.drawImage(canvas, 0, 0)` + `getImageData` readback - a
completely different code path, to rule out a readback-API bug), but
deterministically returned a wrong, uniform color for the _entire_ canvas
in one CI environment's specific SwiftShader build, on every attempt,
regardless of worker concurrency. That points at a genuine SwiftShader/GL
instancing compatibility issue in that environment, not a bug in the test.
If you add a pixel-reading assertion:

- Do the `step()` and the read in the _same_ `page.evaluate` call - the
  canvas isn't created with `preserveDrawingBuffer`, so the browser may
  clear it as soon as control returns after a frame is presented.
- Don't assume `gl.readPixels` and a `drawImage`/`getImageData` readback
  disagreeing means the bug is in the readback method - both can (and did)
  agree while still being wrong, if the actual rendered frame is wrong.
- Avoid **absolute** pixel assertions (an exact coordinate, an exact color
  byte value) - they're the kind of assertion the SwiftShader discrepancy
  above breaks for reasons unrelated to your feature. But don't swing to
  asserting ECS/logic state alone either: `camera-pan-zoom.spec.ts` did
  exactly that for its pan test and it passed even though
  `createTransformEcsSystem` was missing from the scene, so the camera's
  `position.local` updated correctly while the camera never visibly moved
  (`render-system.ts`'s projection matrix reads `position.world`, which
  nothing was writing). Numeric-only assertions can't catch a bug like
  that. The pattern that catches it without reintroducing the SwiftShader
  problem is a **relative, same-run** measurement: read the actual
  rendered canvas for a landmark's on-screen bounds before and after the
  action under test, and assert the _change_ matches what the logic state
  predicts (e.g. the landmark's on-screen width scaled by the zoom ratio).
  See the `write-e2e-test` skill and `measureGreenSquareBounds()` in
  `camera-pan-zoom.ts` for the full pattern and rationale.

### Running

- `npm run test:e2e` / `npm run test:e2e:ui` - runs the suite (the
  `webServer` config starts `npm run dev:e2e` against `vite.config.e2e.js`
  automatically).
- `npm run check-types:e2e` - type-checks `/e2e` on its own
  (`npm run check-types` only covers `/src` and `/demo`).
- `@playwright/test` is pinned to an exact version (not `^`), matched to
  whatever Chromium revision is available in this repo's dev/CI
  environments, since the browser binary and the library version are
  tightly coupled - bumping it means also fetching the matching browser
  build (`npx playwright install chromium`), not just a version bump.
- Runs as the `test-e2e` job in `.github/workflows/ci.yml` on every PR into
  `dev`, alongside `lint`/`check-types`/`check-spelling`. Add `test-e2e` to
  the repository's required status checks (Settings → Branches) if it isn't
  already, so a PR can't merge with a red e2e suite.
- Locally, `trace` and `video` are `'on'` for every run (not just failures)
  so a run can always be replayed: `npx playwright show-report
e2e/playwright-report` opens the HTML report, which links each test's
  trace (full DOM/network/console timeline) and video recording. CI only
  keeps these for failures (`'retain-on-failure'`), uploaded as the
  `playwright-report` workflow artifact, to avoid uploading a trace/video
  per test on every green run.
- Two things print an immediate, unambiguous timestamp the moment
  `test:e2e`/`test:e2e:ui` runs: the `pretest:e2e` npm script (fires before
  Node even starts loading Playwright) and the top of
  `playwright.config.ts` itself (fires once Playwright's own startup has
  finished). A run that looks "stuck" with a large gap between those two
  lines and nothing else is Playwright/Node startup itself being slow
  (common on Windows/WSL - antivirus real-time-scanning newly-touched files
  the first time, or generally slower process-spawn/filesystem overhead
  through the WSL2 VM boundary), not a bug in the suite; excluding the
  WSL distro's filesystem from real-time AV scanning is the usual fix.

## Documentation Site Demos

`documentation-site/src/pages/demos/<name>/` holds interactive, in-browser
demos of engine features (`physics`, `ecs`, `particles`, `rendering`, ...),
each rendered through `documentation-site/src/components/Demo.tsx`.

**Critical gotcha**: these demos import the engine as a published package
(e.g. `import { addRigidBodyComponent } from '@forge-game-engine/forge/physics'`),
resolved via `documentation-site/node_modules/@forge-game-engine/forge`, a
`file:..` link back to this repo, satisfied through this repo's
`package.json` `exports`, which point at `/dist`, **not** `/src`. This means:

- `npm run check-types` and `npm test` at the repo root only exercise `/src`
  directly. They will pass even if a change breaks every demo.
- A demo only picks up a `/src` change after `npm run build` regenerates
  `/dist`.
- Demos are a runtime integration surface (canvas rendering, input, the game
  loop) with no automated test coverage. A change can be fully type-safe and
  unit-tested and still crash or misbehave in a demo.

**When a change touches a module that has a demo** (check which demos
import it, e.g. `grep -rl "/physics" documentation-site/src/pages/demos`):

1. Update the demo's source (the `_*.ts` files alongside its `index.tsx`) if
   the change altered the API it depends on.
2. Run `npm run build` from the repo root to refresh `/dist` with the change.
3. From `documentation-site/`, run `npm run typecheck` and `npm run build`
   (`docusaurus build`). This catches broken imports/exports and type
   errors that the root-level checks never see, since they never compile
   against the published package surface.
4. Run `npm run start` in `documentation-site/` (or reuse an already-running
   dev server) and open the affected demo page(s) in a browser. Confirm they
   render and behave correctly with a full page reload, since demos are
   stateful and fast refresh does not guarantee a clean re-initialization.

See also step 9 of `CLAUDE.md`'s verification checklist, which makes this
mandatory before marking a task complete.

## Documentation Site Blog

`documentation-site/blog/` is a Docusaurus blog used for marketing/announcement
content (release roundups, feature spotlights) aimed at consumers of the
engine - distinct from `docs/docs`, which is reference/conceptual
documentation. Enabled via the `blog` key in the `classic` preset options in
`docusaurus.config.ts`, with a `Blog` navbar/footer link pointing at `/blog`.

Conventions:

- One file per post: `blog/YYYY-MM-DD-slug.md`, with `slug`, `title`,
  `authors`, and `tags` in frontmatter. Authors are defined once in
  `blog/authors.yml`; tags in `blog/tags.yml`.
- Internal links (to docs, the API reference, or demos) must include the
  `/Forge` `baseUrl` prefix (e.g. `/Forge/demos/physics`,
  `/Forge/docs/changelog`), matching the convention already used in
  `docs/docs/**` - `onBrokenLinks: 'throw'` in `docusaurus.config.ts` fails
  the build on a mismatch.
- **Gotcha**: this site opts into `future.v4: true`, which defaults
  `markdown.mdx1Compat.comments` to `false`, so the classic HTML-comment
  truncate marker (`<!-- truncate -->`) fails MDX compilation with an
  "Unexpected character `!`" error. Use the MDX-native marker instead:
  `{/* truncate */}`.
- A new post should be verified with `npm run build` (from
  `documentation-site/`) to catch broken links/MDX errors, the same way a
  demo change is per the "Documentation Site Demos" section above.

## Common Patterns

### Readonly Fields

Use `readonly` for fields that shouldn't change after construction:

```typescript
export class Example {
  private readonly _config: Config;

  constructor(config: Config) {
    this._config = config;
  }
}
```

### Optional Parameters with Defaults

Defaults should be stored in an object with the word "default" in its name. Defaults should not be added when reading the value. Types should be narrowed and nullish values should be handled appropriately.

```typescript
interface MoveOptions {
  speed: number;
  direction?: Vector2;
}

const defaultMoveOptions = { speed: 5 };

const move = (options: MoveOptions) => {
  const { speed, direction } = { ...defaultMoveOptions, ...options };

  if (!direction) {
    throw new Error('Needs a direction');
  }

  doMoveLogic(speed, direction);
};
```

**Incorrect pattern** (do not use):

```typescript
const move = (options: MoveOptions) => {
  doMoveLogic(options.speed ?? 5, options.direction ?? Vector2.Left);
};
```

### Error Handling

Throw descriptive errors with context:

```typescript
if (this._components.has(key)) {
  throw new Error(
    `Unable to add component "${key.toString()}" to entity "${this.name}", it already exists on the entity.`,
  );
}
```

### Type Narrowing

Narrow types appropriately and handle nullish values:

```typescript
public getComponent<C extends ComponentCtor>(
  componentType: C,
): InstanceType<C> | null {
  return (this._components.get(componentType.id) as InstanceType<C>) ?? null;
}

public getComponentRequired<C extends ComponentCtor>(
  componentType: C,
): InstanceType<C> {
  const component = this.getComponent(componentType);

  if (component === null) {
    throw new Error(
      `Required component "${componentType.id.toString()}" not found on entity "${this.name}"`,
    );
  }

  return component;
}
```

### Static Counters

Use static fields for ID generation:

```typescript
export class Entity {
  private static _idCounter: number = 0;
  private readonly _id: number;

  constructor() {
    this._id = Entity._generateId();
  }

  private static _generateId(): number {
    return Entity._idCounter++;
  }

  get id(): number {
    return this._id;
  }
}
```

### Getters/Setters

Use getters for computed or protected values:

```typescript
get children(): Set<Entity> {
  return new Set(this._children); // Return a copy
}
```

### Events

Use the event system for decoupled communication:

```typescript
import { ForgeEvent } from '../events/forge-event.js';

export class Entity {
  public onRemovedFromWorld: ForgeEvent;

  constructor() {
    this.onRemovedFromWorld = new ForgeEvent('entityRemovedFromWorld');
  }
}
```

This keeps the cache's lifetime tied to the `RenderContext` that owns it,
makes the dependency visible at every call site, and means two independent
`RenderContext`s (for example in two unrelated tests) never share a cache by
accident.

## Security Considerations

### Validation

- Validate constructor parameters and throw early
- Check for null/undefined before accessing properties
- Validate array indices before access

### Browser Security

- The engine runs in the browser - be aware of browser security model
- No server-side code or Node.js-specific APIs
- Be cautious with user-generated content in WebGL

### Dependencies

- Peer dependencies: `howler`
- Keep dependencies minimal and well-maintained

## Additional Resources

- [Documentation Site](https://forge-game-engine.github.io/Forge/)
- [GitHub Repository](https://github.com/forge-game-engine/Forge)
- Package exports in `package.json` for module structure

## Quick Reference

### Common Commands

```bash
npm run dev          # Run demo app
npm run build        # Build the project
npm test             # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run prettier     # Check formatting
npm run prettier:write  # Format code
npm run check-types  # Type check without emit
npm run check-exports   # Verify package exports
npm run cspell       # Spell check
```

### File Extensions in Imports

✅ **Correct**: `import { X } from './module.js'`  
❌ **Incorrect**: `import { X } from './module'`

Always use `.js` extension even when importing from `.ts` files.

### Key Classes to Know

- `Entity` - Container for components
- `Component` - Base class for all components
- `System` - Base class for all systems
- `World` - Container for entities and systems
- `ForgeEvent` - Event system
- `RenderContext` - WebGL context wrapper

---

**Remember**: Write minimal, focused changes. Follow existing patterns. Test your code. Document public APIs.
