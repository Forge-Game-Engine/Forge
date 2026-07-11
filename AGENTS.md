# AGENTS.md - Coding Agent Guide for Forge Game Engine

This document provides guidance for AI coding agents working on the Forge Game Engine codebase. It covers architecture, conventions, and best practices to help agents write code that matches the existing codebase.

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Architecture](#architecture)
- [Coding Conventions](#coding-conventions)
- [Module Organization](#module-organization)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
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

The codebase follows a **data-oriented** ECS: there are no `Entity`, `Component`, or `System` base classes to extend. Entities are plain numeric ids, components are plain data objects, and systems are plain objects created by a factory function.

1. **Components**: Plain interfaces registered with `createComponentId<T>(name)` (`src/ecs/ecs-component.ts`), which returns a unique, branded `ComponentKey<T>` (a `symbol`). Data-less markers use `createTagId(name)` instead, producing a `TagKey`.
   - Convention: define the interface and its key together, e.g. `export interface PlayerEcsComponent { speed: number }` and `export const playerId = createComponentId<PlayerEcsComponent>('player')`.
   - Component files are typically named `*-component.ts` (or `*.component.ts` in demos) and export both the interface and the key.

2. **Systems**: Plain objects implementing the `EcsSystem<TQuery, TBeforeQueryResult, TAfterRunInput>` interface (`src/ecs/ecs-system.ts`), built by a `createXEcsSystem(...)` factory function rather than instantiated with `new`.
   - `query`: an array of `ComponentKey`s an entity must have, in the order their data is passed to `run`.
   - `tags?`: additional `TagKey`s required; tags contribute no data to `run`.
   - `run(queryResult, world, beforeQueryResult)`: invoked once per tick for every matching entity; `queryResult` is `{ entity: number; components: [...] }`, with `components` in `query` order.
   - Optional `beforeQuery(world)`: computed once per tick, before any entity is processed, for state shared across every `run` call that tick.
   - Optional `afterRun(inputs)`: invoked once per tick with every `run` call's return value, after all matching entities have been processed.
   - Optional `cleanupEntities(queryResult, world)`: invoked per matching entity when `EcsWorld.stop()` is called.
   - Register with `world.addSystem(system, registrationOrder?)`. `registrationOrder` (`SystemRegistrationOrder.early`/`normal`/`late`) controls run order relative to other systems; defaults to `normal`.

3. **Entities**: Plain `number` ids, with no wrapping object or parent/child relationships built in.
   - Create with `world.createEntity()`; remove (and all of its components) with `world.removeEntity(entity)`.
   - Attach data with `world.addComponent(entity, componentKey, data)`, or a tag with `world.addTag(entity, tagKey)`.
   - Read with `world.getComponent(entity, componentKey)`, which returns `T | null` — there is no `getComponentRequired`. Inside a system whose `query` already guarantees the component exists, the idiom is a non-null assertion: `world.getComponent(entity, positionId)!`.
   - Remove a single component with `world.removeComponent(entity, componentKey)`.

4. **World** (`EcsWorld`, `src/ecs/ecs-world.ts`): Owns all component storage (one `SparseSet` per component/tag key) and every registered system.
   - `world.update()` runs every registered system once, in registration order; called automatically once per frame by `Game`'s render loop — don't call it directly from game code.
   - `world.queryEntities(componentKeys, out)` fills `out` with every entity matching a raw list of component keys, for code that needs to query entities outside of a system's own `run`.

### Key Patterns

- **Dependency Injection**: Systems and standalone classes (e.g. `RenderContext`) receive dependencies via their factory function or constructor, not looked up globally
- **Composition over Inheritance**: Favor components (and, for non-ECS classes, composed objects) over deep class hierarchies
- **Immutability**: Use `readonly` for fields that shouldn't change after construction
- **Private fields**: Prefix with underscore (`_fieldName`) — applies to the standalone classes the engine still has (e.g. `RenderContext`, `Color`, `Time`); ECS components are plain data objects with no private fields
- **Initialization**: Members are initialized in the constructor body
- **Getters/Setters**: Getters and setters have no access modifiers (always public by default)

## Coding Conventions

### TypeScript Style

**Naming Conventions** (enforced by ESLint):

- **Classes**: `PascalCase` (e.g., `RenderContext`, `RigidBody`)
- **Interfaces**: `PascalCase` (e.g., `PositionEcsComponent`)
- **Types**: `PascalCase` (e.g., `ComponentKey`)
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
- Always specify return types for functions: `run: (result: QueryResult<[MyEcsComponent]>): void => { ... }`
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
   * Adds a component to an entity.
   * @param entity - The entity to add the component to.
   * @param componentKey - The component's key, from `createComponentId`.
   * @param componentData - The component data to store.
   * @throws An error if the entity doesn't exist.
   */
  public addComponent<T>(
    entity: number,
    componentKey: ComponentKey<T>,
    componentData: T,
  ): T {
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
   - `/components` - Component interfaces and their `ComponentKey`s
   - `/systems` - System factory functions (`createXEcsSystem`)
   - `/types` - Type definitions and interfaces
4. Update `/src/index.ts` to export the new module
5. Add export mapping in `package.json` if it should be separately importable

### Component Pattern

```typescript
import { createComponentId } from '../ecs/index.js';

/**
 * Description of what this component represents.
 */
export interface MyEcsComponent {
  /**
   * Description of the field.
   */
  myData: string;
}

export const myComponentId = createComponentId<MyEcsComponent>('myComponent');
```

### System Pattern

```typescript
import { EcsSystem } from '../ecs/index.js';
import { MyEcsComponent, myComponentId } from '../components/my-component.js';

/**
 * Description of what this system does.
 * @param someDependency - Any external dependency the system needs (e.g. `Time`, `RenderContext`).
 */
export const createMyEcsSystem = (
  someDependency: SomeDependency,
): EcsSystem<[MyEcsComponent]> => ({
  query: [myComponentId],
  run: (result, world) => {
    const [myComponent] = result.components;
    // Process component data
  },
});
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
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Example: `feat(ecs): add component removal event`
- Max length: 200 characters
- Enforced by commitlint with husky pre-commit hooks

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
- For tests involving ECS, create a minimal `EcsWorld` and entities (`world.createEntity()`)

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

Narrow types appropriately and handle nullish values. `EcsWorld.getComponent` returns `T | null`, not a required value, so callers outside a system's own `run` (where the `query` doesn't already guarantee the component) must check explicitly:

```typescript
const position = world.getComponent<PositionEcsComponent>(entity, positionId);

if (position === null) {
  throw new Error(`Required component not found on entity ${entity}`);
}
```

Inside a system's `run`, when the component is one of its own `query` entries (so its presence is already guaranteed for every matched entity), the idiom is a non-null assertion instead of re-checking:

```typescript
const position = world.getComponent<PositionEcsComponent>(entity, positionId)!;
```

### Static Counters

Use static fields for ID generation (still used for non-ECS ids, e.g. `RigidBody`):

```typescript
export class RigidBody {
  private static _nextId: number = 0;
  public readonly id: number;

  constructor(/* ... */) {
    this.id = RigidBody._generateId();
    // ...
  }

  private static _generateId(): number {
    return RigidBody._nextId++;
  }
}
```

### Getters/Setters

Use getters for computed or protected values:

```typescript
get r(): number {
  return this._r;
}
```

### Events

Use the event system for decoupled communication:

```typescript
import { ForgeEvent } from '../events/forge-event.js';

export class AnimationClip {
  public readonly onAnimationStartEvent: ForgeEvent;

  constructor(/* ... */) {
    this.onAnimationStartEvent = new ForgeEvent('AnimationStartEvent');
    // ...
  }
}
```

Use `ParameterizedForgeEvent<T>` instead when listeners need a payload (e.g. `raise(value)` / `registerListener((value) => ...)`).

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

- `EcsWorld` - Owns all entities (plain `number` ids), component storage, and registered systems
- `createComponentId` / `createTagId` - Register a component/tag key (a branded `symbol`) for use with `EcsWorld`
- `EcsSystem` - Interface implemented by system factory functions (`createXEcsSystem`)
- `ForgeEvent` / `ParameterizedForgeEvent` - Event system
- `RenderContext` - WebGL context wrapper

---

**Remember**: Write minimal, focused changes. Follow existing patterns. Test your code. Document public APIs.
