---
sidebar_position: 2
---

# Vectors

Forge provides Vector2 and Vector3 classes for 2D and 3D vector operations.

## Vector2

The [`Vector2`](../../api/classes/Vector2.md) class represents a 2D vector with x and y components.

### Creating Vectors

```ts
import { Vector2 } from '@forge-game-engine/forge';

const v1 = new Vector2(10, 20);
const v2 = new Vector2(5, 5);
const zero = new Vector2(); // (0, 0)

// Static helper vectors
const up = Vector2.up;       // (0, -1)
const down = Vector2.down;   // (0, 1)
const left = Vector2.left;   // (-1, 0)
const right = Vector2.right; // (1, 0)
const zero2 = Vector2.zero;  // (0, 0)
const one = Vector2.one;     // (1, 1)
```

### Vector Operations

```ts
const v1 = new Vector2(10, 20);
const v2 = new Vector2(5, 5);

// Addition
const sum = v1.add(v2); // (15, 25)

// Subtraction
const diff = v1.subtract(v2); // (5, 15)

// Multiplication by scalar
const scaled = v1.multiply(2); // (20, 40)

// Component-wise multiplication
const multiplied = v1.multiplyComponents(v2); // (50, 100)

// Division
const divided = v1.divide(2); // (5, 10)
```

### Vector Properties

```ts
const v = new Vector2(3, 4);

// Magnitude (length) - NOTE: This is a method, not a property
const length = v.magnitude(); // 5

// Squared magnitude (faster, avoids sqrt) - Also a method
const lengthSq = v.magnitudeSquared(); // 25

// Normalize - Returns a new normalized vector
const normalized = v.normalize(); // (0.6, 0.8)

// Distance between vectors
const distance = v1.distanceTo(v2);

// Clone
const copy = v1.clone();

// Equals
if (v1.equals(v2)) {
  console.log('Vectors are equal');
}

// Rotate
const rotated = v.rotate(Math.PI / 2); // Rotate 90 degrees
```

## Vector3

The [`Vector3`](../../api/classes/Vector3.md) class represents a 3D vector.

```ts
import { Vector3 } from '@forge-game-engine/forge';

const v = new Vector3(1, 2, 3);

// Static helpers
const up = Vector3.up;         // (0, 1, 0)
const down = Vector3.down;     // (0, -1, 0)
const left = Vector3.left;     // (-1, 0, 0)
const right = Vector3.right;   // (1, 0, 0)
const forward = Vector3.forward; // (0, 0, 1)
const back = Vector3.back;     // (0, 0, -1)

// Operations (similar to Vector2)
const sum = v.add(new Vector3(1, 1, 1));
const scaled = v.multiply(2);
const normalized = v.normalize();
```

## See Also

- [Vector2 API](../../api/classes/Vector2.md)
- [Vector3 API](../../api/classes/Vector3.md)
