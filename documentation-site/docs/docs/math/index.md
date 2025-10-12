---
sidebar_position: 1
---

# Math

Forge provides a comprehensive math library with vector operations, utility functions, and common mathematical helpers for game development.

## Vectors

### Vector2

The [`Vector2`](../../api/classes/Vector2.md) class represents a 2D vector with x and y components.

#### Creating Vectors

```ts
import { Vector2 } from '@forge-game-engine/forge';

// Create vectors
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

#### Vector Operations

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

// Negate
const negated = v1.negate(); // (-10, -20)
```

#### Vector Properties

```ts
const v = new Vector2(3, 4);

// Magnitude (length)
const length = v.magnitude; // 5

// Squared magnitude (faster, avoids sqrt)
const lengthSq = v.magnitudeSquared; // 25

// Normalized (unit vector)
const normalized = v.normalized; // (0.6, 0.8)

// Distance between vectors
const distance = v1.distanceTo(v2);

// Squared distance (faster, avoids sqrt)
const distanceSq = v1.distanceSquaredTo(v2);
```

#### Vector Math

```ts
const v1 = new Vector2(1, 0);
const v2 = new Vector2(0, 1);

// Dot product
const dot = v1.dot(v2); // 0

// Perpendicular vector (rotated 90° counter-clockwise)
const perp = v1.perpendicular(); // (0, 1)

// Lerp (linear interpolation)
const a = new Vector2(0, 0);
const b = new Vector2(100, 100);
const lerped = a.lerp(b, 0.5); // (50, 50)

// Clone
const copy = v1.clone(); // New Vector2 with same values

// Equals
if (v1.equals(v2)) {
  console.log('Vectors are equal');
}
```

### Vector3

The [`Vector3`](../../api/classes/Vector3.md) class represents a 3D vector with x, y, and z components.

```ts
import { Vector3 } from '@forge-game-engine/forge';

const v = new Vector3(1, 2, 3);

// Static helpers
const up = Vector3.up;       // (0, 1, 0)
const down = Vector3.down;   // (0, -1, 0)
const left = Vector3.left;   // (-1, 0, 0)
const right = Vector3.right; // (1, 0, 0)
const forward = Vector3.forward; // (0, 0, 1)
const back = Vector3.back;   // (0, 0, -1)

// Operations (similar to Vector2)
const sum = v.add(new Vector3(1, 1, 1));
const scaled = v.multiply(2);
const normalized = v.normalized;
```

## Utility Functions

### Angle Conversions

```ts
import { degreesToRadians, radiansToDegrees } from '@forge-game-engine/forge';

// Degrees to radians
const radians = degreesToRadians(90); // π/2

// Radians to degrees
const degrees = radiansToDegrees(Math.PI); // 180
```

### Vector and Angle Conversions

```ts
import { radiansToVector, vectorToRadians } from '@forge-game-engine/forge';

// Convert angle to direction vector
const direction = radiansToVector(0); // Vector2(1, 0) - pointing right

// Convert vector to angle
const angle = vectorToRadians(new Vector2(1, 0)); // 0 radians
```

### Clamping

```ts
import { clamp } from '@forge-game-engine/forge';

// Clamp value between min and max
const clamped = clamp(150, 0, 100); // 100
const clamped2 = clamp(-10, 0, 100); // 0
const clamped3 = clamp(50, 0, 100); // 50
```

### Linear Interpolation

```ts
import { lerp } from '@forge-game-engine/forge';

// Lerp between two values
const interpolated = lerp(0, 100, 0.5); // 50
const interpolated2 = lerp(0, 100, 0.25); // 25
const interpolated3 = lerp(10, 20, 0.8); // 18
```

### Random Numbers

```ts
import { random } from '@forge-game-engine/forge';

// Random integer between min (inclusive) and max (exclusive)
const randomInt = random(1, 10); // 1-9

// Random float
const randomFloat = random(0, 1, true); // 0.0-1.0

// With seed for reproducibility
const seededRandom = random(1, 10, false, 'my-seed');
```

### Smooth Damping

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

### Signed Square

Preserve sign when squaring values:

```ts
import { signedSquare } from '@forge-game-engine/forge';

const squared = signedSquare(-3); // -9 (preserves negative)
const squared2 = signedSquare(3); // 9
```

### Scale Relative to Point

Scale a position relative to a pivot point:

```ts
import { scaleRelativeToPoint } from '@forge-game-engine/forge';

const position = new Vector2(100, 100);
const pivot = new Vector2(50, 50);
const scale = 2;

const scaled = scaleRelativeToPoint(position, pivot, scale);
// Position is now twice as far from pivot
```

## Matrices

### Matrix3

3x3 matrix for 2D transformations:

```ts
import { Matrix3 } from '@forge-game-engine/forge';

// Create identity matrix
const matrix = Matrix3.identity;

// Create translation matrix
const translation = Matrix3.translation(new Vector2(10, 20));

// Create rotation matrix
const rotation = Matrix3.rotation(Math.PI / 2); // 90 degrees

// Create scale matrix
const scale = Matrix3.scale(new Vector2(2, 2));

// Multiply matrices (combine transformations)
const combined = translation.multiply(rotation);

// Transform a vector
const point = new Vector2(10, 0);
const transformed = combined.transformVector(point);
```

### Matrix4

4x4 matrix for 3D transformations:

```ts
import { Matrix4 } from '@forge-game-engine/forge';

// Create matrices
const identity = Matrix4.identity;
const translation = Matrix4.translation(new Vector3(1, 2, 3));
const rotation = Matrix4.rotationX(Math.PI / 4);
const scale = Matrix4.scale(new Vector3(2, 2, 2));

// Combine transformations
const transform = translation
  .multiply(rotation)
  .multiply(scale);

// Projection matrices
const ortho = Matrix4.orthographic(0, 800, 600, 0, -1, 1);
const perspective = Matrix4.perspective(
  Math.PI / 4, // FOV
  16 / 9,      // Aspect ratio
  0.1,         // Near plane
  1000         // Far plane
);
```

## Practical Examples

### Movement with Vectors

```ts
import { Vector2 } from '@forge-game-engine/forge';

class MovementSystem extends System {
  run(entity: Entity) {
    const position = entity.getComponent(PositionComponent);
    const velocity = entity.getComponent(VelocityComponent);
    
    // Apply velocity
    const pos = new Vector2(position.x, position.y);
    const vel = new Vector2(velocity.x, velocity.y);
    
    const newPos = pos.add(vel.multiply(this.time.deltaTimeInSeconds));
    
    position.x = newPos.x;
    position.y = newPos.y;
  }
}
```

### Direction to Target

```ts
import { Vector2 } from '@forge-game-engine/forge';

function moveTowardsTarget(
  currentPos: Vector2,
  targetPos: Vector2,
  speed: number,
  deltaTime: number
): Vector2 {
  // Calculate direction
  const direction = targetPos.subtract(currentPos);
  
  // Normalize to get unit vector
  const normalized = direction.normalized;
  
  // Move in direction
  const velocity = normalized.multiply(speed * deltaTime);
  
  return currentPos.add(velocity);
}

// Usage
const current = new Vector2(0, 0);
const target = new Vector2(100, 100);
const newPos = moveTowardsTarget(current, target, 50, 0.016);
```

### Rotation Around Point

```ts
import { Matrix3, Vector2 } from '@forge-game-engine/forge';

function rotateAroundPoint(
  position: Vector2,
  pivot: Vector2,
  angle: number
): Vector2 {
  // Translate to origin
  const translated = position.subtract(pivot);
  
  // Rotate
  const rotation = Matrix3.rotation(angle);
  const rotated = rotation.transformVector(translated);
  
  // Translate back
  return rotated.add(pivot);
}
```

### Circular Motion

```ts
import { Vector2, degreesToRadians } from '@forge-game-engine/forge';

class CircularMotionComponent implements Component {
  name = Symbol('CircularMotion');
  center: Vector2;
  radius: number;
  speed: number; // degrees per second
  angle: number = 0;
  
  constructor(center: Vector2, radius: number, speed: number) {
    this.center = center;
    this.radius = radius;
    this.speed = speed;
  }
}

class CircularMotionSystem extends System {
  constructor() {
    super('circular-motion', [
      PositionComponent.symbol,
      CircularMotionComponent.symbol
    ]);
  }
  
  run(entity: Entity) {
    const position = entity.getComponent(PositionComponent);
    const motion = entity.getComponent(CircularMotionComponent);
    
    // Update angle
    motion.angle += motion.speed * this.time.deltaTimeInSeconds;
    
    // Calculate position on circle
    const radians = degreesToRadians(motion.angle);
    position.x = motion.center.x + Math.cos(radians) * motion.radius;
    position.y = motion.center.y + Math.sin(radians) * motion.radius;
  }
}
```

### Look At Target

```ts
import { vectorToRadians, Vector2 } from '@forge-game-engine/forge';

function lookAt(
  position: Vector2,
  target: Vector2
): number {
  const direction = target.subtract(position);
  return vectorToRadians(direction);
}

// Usage in system
class LookAtSystem extends System {
  run(entity: Entity) {
    const position = entity.getComponent(PositionComponent);
    const target = entity.getComponent(TargetComponent).target;
    const rotation = entity.getComponent(RotationComponent);
    
    const pos = new Vector2(position.x, position.y);
    const targetPos = new Vector2(target.x, target.y);
    
    rotation.radians = lookAt(pos, targetPos);
  }
}
```

### Projectile Motion

```ts
import { Vector2 } from '@forge-game-engine/forge';

class ProjectileComponent implements Component {
  name = Symbol('Projectile');
  velocity: Vector2;
  gravity: number = 980; // pixels per second squared
  
  constructor(velocity: Vector2) {
    this.velocity = velocity;
  }
}

class ProjectileSystem extends System {
  constructor() {
    super('projectile', [
      PositionComponent.symbol,
      ProjectileComponent.symbol
    ]);
  }
  
  run(entity: Entity) {
    const position = entity.getComponent(PositionComponent);
    const projectile = entity.getComponent(ProjectileComponent);
    
    const dt = this.time.deltaTimeInSeconds;
    
    // Apply gravity
    const gravityVector = new Vector2(0, projectile.gravity * dt);
    projectile.velocity = projectile.velocity.add(gravityVector);
    
    // Apply velocity
    const displacement = projectile.velocity.multiply(dt);
    position.x += displacement.x;
    position.y += displacement.y;
  }
}
```

### Bounce Physics

```ts
import { Vector2 } from '@forge-game-engine/forge';

function bounceOffSurface(
  velocity: Vector2,
  surfaceNormal: Vector2,
  bounciness: number = 0.8
): Vector2 {
  // Reflect velocity across surface normal
  const dotProduct = velocity.dot(surfaceNormal);
  const reflection = velocity.subtract(
    surfaceNormal.multiply(2 * dotProduct)
  );
  
  // Apply bounciness
  return reflection.multiply(bounciness);
}

// Usage
const velocity = new Vector2(100, 100);
const wallNormal = new Vector2(-1, 0); // Wall facing left
const newVelocity = bounceOffSurface(velocity, wallNormal);
```

## Best Practices

- **Use Vector2 for positions** - More expressive than separate x/y variables
- **Normalize before scaling** - When working with directions
- **Use magnitudeSquared** - When comparing distances (avoids expensive sqrt)
- **Cache calculations** - Store frequently used vectors
- **Use static helpers** - `Vector2.zero`, `Vector2.one`, etc.
- **Immutable operations** - Vector operations return new vectors, original is unchanged
- **Use matrices for complex transforms** - Combine multiple transformations efficiently

## See Also

- [Vector2 API](../../api/classes/Vector2.md)
- [Vector3 API](../../api/classes/Vector3.md)
- [Matrix3 API](../../api/classes/Matrix3.md)
- [Matrix4 API](../../api/classes/Matrix4.md)
