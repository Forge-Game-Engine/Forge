---
sidebar_position: 1
---

# Math

Forge provides a math library with vector operations and utility functions for game development.

## Topics

- **[Vectors](./vectors.md)** - Vector2 and Vector3 classes for 2D and 3D operations
- **[Utility Functions](./utility-functions.md)** - Angle conversions, clamping, lerp, and more

## Quick Reference

### Vectors

```ts
import { Vector2 } from '@forge-game-engine/forge';

const v = new Vector2(10, 20);
const sum = v.add(new Vector2(5, 5));
const length = v.magnitude();
const normalized = v.normalize();
```

### Utility Functions

```ts
import { lerp, clamp, degreesToRadians } from '@forge-game-engine/forge';

const interpolated = lerp(0, 100, 0.5); // 50
const clamped = clamp(150, 0, 100); // 100
const radians = degreesToRadians(90); // π/2
```

## Common Patterns

### Direction to Target

```ts
function getDirectionTo(from: Vector2, to: Vector2): Vector2 {
  const direction = to.subtract(from);
  return direction.normalize();
}
```

### Distance Check

```ts
function isInRange(pos1: Vector2, pos2: Vector2, range: number): boolean {
  return pos1.distanceTo(pos2) <= range;
}
```

See the individual pages for detailed examples and API documentation.
