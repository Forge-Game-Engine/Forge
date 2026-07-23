# AGENTS.md - Coding Agent Guide for Forge Game Engine

This document provides guidance for AI coding agents working on the Forge Game Engine codebase. It covers architecture, conventions, and best practices to help agents write code that matches the existing codebase.

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

The codebase follows the ECS pattern:

1. **Components** (`Component`): Pure data containers extending the abstract `Component` class
   - Each component class has a unique `id` (symbol) generated automatically
   - Components are lightweight and contain no logic

2. **Systems** (`System`): Logic processors extending the abstract `System` class
   - Systems have a `query` defining which components they operate on
   - Systems implement the `run(entity: Entity)` method
   - Optional lifecycle methods: `beforeAll()`, `stop()`
   - Each system has a unique `id` (symbol) generated automatically

3. **Entities** (`Entity`): Containers for components
   - Entities are created with `new Entity(world, components, options)`
   - Components are added/removed dynamically
   - Entities can have parent-child relationships

4. **World** (`World`): Container for entities and systems
   - Manages entity lifecycle
   - Routes entities to appropriate systems based on queries

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
- Always specify return types for functions: `public run(entity: Entity): void`
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

```typescript
import { Entity, System } from '../ecs/index.js';
import { MyComponent } from '../components/my-component.js';

/**
 * Description of what this system does.
 */
export class MySystem extends System {
  /**
   * Creates a new MySystem instance.
   */
  constructor() {
    super([MyComponent], 'mySystemName');
  }

  /**
   * Processes a single entity.
   * @param entity - The entity to process.
   */
  public run(entity: Entity): void {
    const component = entity.getComponentRequired(MyComponent);
    // Process component data
  }
}
```

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

## Documentation Site Demos

`documentation-site/src/pages/demos/<name>/` holds interactive, in-browser
demos of engine features (`physics`, `ecs`, `particles`, `rendering`, ...),
each rendered through `documentation-site/src/components/Demo.tsx`.

**Critical gotcha**: these demos import the engine as a published package
(e.g. `import { RigidBody } from '@forge-game-engine/forge/physics'`),
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

- Peer dependencies: `@rive-app/webgl2`, `howler`
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
