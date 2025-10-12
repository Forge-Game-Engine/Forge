---
sidebar_position: 3
---

# Math Utility Functions

Forge provides various math utility functions for common game development tasks.

## Angle Conversions

```ts
import { degreesToRadians, radiansToDegrees } from '@forge-game-engine/forge';

// Degrees to radians
const radians = degreesToRadians(90); // π/2

// Radians to degrees
const degrees = radiansToDegrees(Math.PI); // 180
```

## Vector and Angle Conversions

```ts
import { radiansToVector, vectorToRadians } from '@forge-game-engine/forge';

// Convert angle to direction vector
const direction = radiansToVector(0); // Vector2(1, 0) - pointing right

// Convert vector to angle
const angle = vectorToRadians(new Vector2(1, 0)); // 0 radians
```

## Clamping

```ts
import { clamp } from '@forge-game-engine/forge';

const clamped = clamp(150, 0, 100); // 100
const clamped2 = clamp(-10, 0, 100); // 0
const clamped3 = clamp(50, 0, 100); // 50
```

## Linear Interpolation

```ts
import { lerp } from '@forge-game-engine/forge';

const interpolated = lerp(0, 100, 0.5); // 50
const interpolated2 = lerp(0, 100, 0.25); // 25
const interpolated3 = lerp(10, 20, 0.8); // 18
```

## Random Numbers

```ts
import { random } from '@forge-game-engine/forge';

// Random integer between min (inclusive) and max (exclusive)
const randomInt = random(1, 10); // 1-9

// Random float
const randomFloat = random(0, 1, true); // 0.0-1.0

// With seed for reproducibility
const seededRandom = random(1, 10, false, 'my-seed');
```

## Smooth Damping

Smoothly interpolate a value towards a target:

```ts
import { smoothDampVector2 } from '@forge-game-engine/forge';

// Smooth camera following
let cameraPos = new Vector2(0, 0);
let velocity = new Vector2(0, 0);
const targetPos = new Vector2(100, 100);

// In your update loop
const result = smoothDampVector2(
  cameraPos,
  targetPos,
  velocity,
  0.3,  // smooth time (lower = faster)
  deltaTime
);

cameraPos = result.current;
velocity = result.currentVelocity;
```

## See Also

- [clamp API](../../api/functions/clamp.md)
- [lerp API](../../api/functions/lerp.md)
- [random API](../../api/functions/random.md)
