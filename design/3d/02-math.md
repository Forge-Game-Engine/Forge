# Design 02: 3D Math

|                                       |                                                         |
| ------------------------------------- | ------------------------------------------------------- |
| **Status**                            | Draft, for review (revised after solution review, §7)   |
| **Kind**                              | Feature                                                 |
| **Engine version at time of writing** | `0.26.1`                                                |
| **Program**                           | [Forge 3D](./README.md), milestone M1                   |
| **Related**                           | [04 Transforms](./04-transforms.md), [06 Render pipeline](./06-render-pipeline.md), [14 Physics 3D](./14-physics-3d.md) |

## 0. Targeted modules

| Path                                         | Change   | Notes                                                                                           |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `src/math/vector3.ts`                        | Modified | Completed: dot, cross, lerp, distances, transforms by matrices and quaternions; `forward` is `-Z` |
| `src/math/quaternion.ts`                     | New      | `Quaternion` and `Quat`                                                                         |
| `src/math/matrices/matrix4.ts`               | New      | `Matrix4` and `Mat4`                                                                            |
| `src/math/matrices/matrix3.ts`               | New      | `Matrix3` and `Mat3`                                                                            |
| `src/math/matrices/matrix3x3.ts`             | Removed  | When its last user (the 2D projection) moves to `Mat4` in design 07                             |
| `src/math/geometry/` (new folder)            | New      | `Ray`, `Plane`, `BoundingBox`, `BoundingSphere`, `Frustum` and their operations                |
| `src/math/test-helpers/`                     | New      | Tolerance matchers and seeded generators (design 01)                                            |
| `src/math/index.ts`                          | Modified | Exports                                                                                         |
| `AGENTS.md`                                  | Modified | "Angles and Directions" extended to 3D; a "Math" section with the conventions of README §4.1    |
| `documentation-site/docs/docs/math/`         | Modified | `vectors.md`, `matrices.md`, `angles-and-rotation.md` updated; `quaternions.md` and `geometry.md` new |

---

## 1. Summary

Forge's math module is 2D: `Vector2`/`Vec2`, a partial `Vector3`/`Vec3`
with no dot or cross product, a `Matrix3x3` class used only for the 2D
projection, and a `Matrix2x2` for the 2D solver. There are no quaternions,
4x4 matrices or 3D geometric primitives.

This design adds them, in the style the module already has: plain data
(`interface Vector3 { x; y; z }`) with operations as static methods that
mutate their first argument and return it, so hot loops allocate nothing.
It fixes the conventions of README §4.1 in the code, including turning
`Vec3.forward` around to `-Z`, and adds the conventions to `AGENTS.md`.

Every later design builds on these types, so they're designed for the two
things the rest of the program needs most: speed in tight loops (transform
propagation, culling, physics) and exactness (64-bit arithmetic,
well-defined behavior for degenerate input).

---

## 2. Scope

### In scope

- `Vec3` completed to what transforms, rendering and physics need.
- `Quaternion`/`Quat`: construction, composition, interpolation, look
  rotations, Euler and axis-angle conversion, and 2D angle helpers.
- `Matrix4`/`Mat4`: composition, affine fast paths, inversion, TRS
  composition and decomposition, view and projection matrices.
- `Matrix3`/`Mat3`: rotation, normal matrices and inertia tensors.
- `Ray`, `Plane`, `BoundingBox`, `BoundingSphere`, `Frustum` with
  intersection tests.
- Test helpers, microbenchmarks, guides and `AGENTS.md` conventions.

### Out of scope

- **SIMD.** WebAssembly SIMD would need a WASM math core and copying in and
  out of it; V8 already compiles these scalar loops well. Hot paths that
  need throughput use structure-of-arrays typed arrays inside the system
  that owns them (designs 06 and 14), not a different math library.
- **Dual quaternions, double-precision GPU math, arbitrary-size matrices.**
  Not needed by any design. Large-world precision on the GPU is handled by
  the camera-relative path in design 06.
- **A `Vector4` type.** No public API needs one: planes have their own
  type, colors use `Color`, and homogeneous transforms happen inside
  `Mat4` operations.
- **Changes to `Vec2`.** It stays as is, and works on the `x`/`y` of a
  `Vector3` by structural typing, which 2D game code relies on after
  design 04.

---

## 3. Phases

### Phase 1: Vectors and quaternions

| #   | Task                    | Description                                                                                                         | Size |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Complete `Vec3`         | The operations in §6.2; `forward` becomes `(0, 0, -1)` and `backward` `(0, 0, 1)`                                   | S    |
| 1.2 | `Quaternion` and `Quat` | §6.3, with property tests: inverse, composition, slerp endpoints and constant angular speed, look rotations         | M    |
| 1.3 | Test helpers            | Matchers and seeded generators (design 01 §6.1)                                                                     | S    |

**Definition of done:** all operations are unit-tested, including the
degenerate cases in §6.6; the microbenchmarks in §6.7 exist.

### Phase 2: Matrices

| #   | Task                     | Description                                                                                              | Size |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------- | ---- |
| 2.1 | `Matrix4` and `Mat4`     | §6.4: composition, affine fast paths, inversion, compose and decompose, view and projection; the decision M2 benchmark | M    |
| 2.2 | `Matrix3` and `Mat3`     | §6.5: rotation, normal matrix, symmetric inverse, outer and skew products                                | S    |
| 2.3 | Uniform values           | `Material.setUniform` accepts `Matrix3` and `Matrix4` for `mat3`/`mat4` uniforms (converted to `float32` on upload) | S    |

**Definition of done:** compose and decompose round-trip for random TRS
values with non-uniform and negative scale; projections map their frustum
corners to the clip-space corners.

### Phase 3: Geometry

| #   | Task                    | Description                                                                                  | Size |
| --- | ----------------------- | -------------------------------------------------------------------------------------------- | ---- |
| 3.1 | `Ray`, `Plane`          | §6.6.1: construction, transformation, intersections with planes, spheres, boxes, triangles   | S    |
| 3.2 | Bounds                  | `BoundingBox`, `BoundingSphere`: building from points, transforming, merging, tests          | S    |
| 3.3 | `Frustum`               | Planes from a view-projection matrix; sphere and box tests; corners                          | S    |

**Definition of done:** intersection tests agree with brute-force reference
implementations on seeded random input.

### Phase 4: Conventions and documentation

| #   | Task                    | Description                                                                                          | Size |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------- | ---- |
| 4.1 | `AGENTS.md`             | The 3D conventions of README §4.1, and "use `Quat`, never Euler angles, in engine code"             | S    |
| 4.2 | Guides                  | `quaternions.md` and `geometry.md` new; `vectors.md`, `matrices.md` and `angles-and-rotation.md` updated | M    |
| 4.3 | Changelog               | `#### Added` for the new types; `#### Changed` for `Vec3.forward`                                    | S    |

**Definition of done:** the guides describe every type, and `npm run
check-exports` passes.

---

## 4. Decision log

| #   | Decision                           | Options                                                                                                                                     | Chosen | Rationale, trade-offs, assumptions                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Vectors and quaternions            | (a) Plain objects `{ x, y, z, w }`; (b) `Float32Array`s; (c) classes with methods                                                          | (a)    | It's what `Vector2`/`Vector3` already are, so 2D code and 3D code mix. V8 gives objects created with the same property order one hidden class and compiles field access to a fixed offset, which makes them as fast as typed arrays for scalar work and faster to create. Classes would split the API between methods and the existing static style. |
| M2  | Matrices                           | (a) Branded plain `number[]`s of fixed length, created from literals so V8 stores them as packed doubles; (b) `Float64Array`s; (c) `Float32Array`s; (d) a class wrapping an array (like `Matrix3x3`) | (a), confirmed by a benchmark in Phase 2 | Every transform holds a matrix (design 04), so creating one must be cheap. A 16-element `Float64Array` is 128 bytes, above the size V8 keeps typed-array storage on the JavaScript heap, so each one allocates a separate backing store; a particle spawn would pay that. A packed-double array is contiguous, on the heap and as fast to index. 64-bit avoids rounding intermediates to `float32` (README G4). A class adds an indirection and a second style. The brand stops a `Matrix3` being passed where a `Matrix4` is expected. The Phase 2 benchmark compares (a) and (b) for creation and `multiplyAffine` before the choice is merged. |
| M3  | Operation style                    | (a) Mutate and return the first argument, as `Vec2` does, and put the output first everywhere a function writes one; (b) output last for some functions; (c) return new values | (a)    | Matches the module and the widely used matrix libraries: whatever a function writes is its first parameter, whether it's a target being mutated (`Vec3.cross(target, value)`) or an output being filled (`Mat4.fromTransform(out, ...)`, `Quat.toYawPitchRoll(out, q)`, `Rays.at(out, ray, distance)`). (c) allocates in every hot loop. |
| M4  | Euler angles                       | (a) `fromYawPitchRoll`/`toYawPitchRoll` in one fixed order; (b) `fromEuler(x, y, z, order)`                                                 | (a)    | README G7. The name says which angle is which, so there's nothing to get backwards; the order (yaw about Y, then pitch about X, then roll about Z, each about the already-rotated axes) is the one cameras and characters need.                                                                                                                    |
| M5  | `Vec3.forward`                     | (a) `-Z`, the convention; (b) keep `+Z`                                                                                                     | (a)    | Cameras and lights look along `-Z` in glTF, OpenGL, and every engine Forge compares itself with. `Vec3.forward` has no callers outside its own test, so the fix costs nothing now and avoids every camera needing a flip later.                                                                                                                  |
| M6  | Quaternion multiplication order    | (a) `Quat.multiply(a, b)` sets `a` to `a * b` (apply `b`, then `a`); (b) the reverse                                                        | (a)    | Matches the mathematical product and matrix composition (`M_parent * M_child`), so `Quat.multiply(world, local)` reads like the matrix version. `Quat.premultiply(a, b)` sets `a` to `b * a`.                                                                                                                                                    |
| M7  | Clip-space depth range             | (a) A `depthRange` parameter on every function that builds or reads a projection (builders, `Frustums.fromViewProjection`, `Frustums.corners`, `transformPointProjective` callers); (b) only `[-1, 1]` | (a)    | WebGL2's default is `[-1, 1]`; `EXT_clip_control` and WebGPU use `[0, 1]` (README G8). Near-plane extraction and unprojected corners differ between them, so the readers need it as much as the builders. The camera passes whichever the device reports. It isn't a behavior switch: each value is the correct one for a backend. |
| M8  | Names of the bounding types        | (a) `BoundingBox`, `BoundingSphere`; (b) `Aabb3`, `Sphere`                                                                                  | (a)    | Says what the type is for. The 2D physics `Aabb` keeps its name inside `physics-2d`.                                                                                                                                                                                                                                                               |
| M9  | `Matrix3x3`                        | (a) Delete it when its last user moves to `Mat4`; (b) keep both                                                                             | (a)    | Its only users are the 2D projection and the uniform path. Design 07 projects 2D with the same `Mat4` as 3D, after which `Matrix3x3` is dead code.                                                                                                                                                                                                 |
| M10 | Normalizing a zero vector          | (a) Keep today's contract: `Vec2.normalize` and `Vec3.normalize` throw, and so does `Quat.normalize`; (b) return zero silently              | (a)    | It's the existing contract of both vector types, and a zero vector reaching `normalize` is almost always a bug worth surfacing. Engine hot paths that can meet a zero length (physics normals, look directions) check the length first and take a defined fallback, documented per function (§6.6.2).                                    |
| M11 | Model front                        | (a) `Vec3.forward` is `-Z`; `Vec3.modelFront` is `+Z` (glTF's front); `Quat.lookRotation` aims `-Z`, `Quat.modelLookRotation` aims `+Z`; (b) one direction for both | (a) | Design 04 decision X10: models keep glTF's front so imported levels keep their positions. Naming both directions keeps it explicit, as Godot does.                                                                                                                                                                                   |

---

## 5. Open questions

1. **Should `Vec3` gain a few non-mutating helpers** (`Vec3.sum(a, b)`
   returning a new vector) for readability in game code? Options: (a) no,
   one style; (b) yes, documented as allocating. Proposal: (a); `clone`
   then mutate is explicit about the allocation.

---

## 6. Design

### 6.1 Conventions

From README §4.1, stated here as the module's contract:

- Right-handed, Y-up, forward `-Z`. `Vec3.up = (0, 1, 0)`,
  `Vec3.right = (1, 0, 0)`, `Vec3.forward = (0, 0, -1)`. A model's front
  is `+Z` (`Vec3.modelFront`), as glTF specifies (decision M11).
- Every function that writes a result takes what it writes as its first
  parameter (decision M3).
- Radians, right-hand rule: a positive angle about an axis is
  counter-clockwise when looking down the axis towards the origin.
- Quaternions are unit quaternions, Hamilton convention, `{ x, y, z, w }`
  with `w` the scalar part. `q` and `-q` are the same rotation; `Quat.equals`
  compares rotations, so it treats them as equal, while
  `Quat.exactlyEquals` compares components.
- Matrices are column-major, act on column vectors, and are 64-bit plain
  arrays. Element
  `m[c * 4 + r]` is row `r`, column `c`. Translation is `m[12..14]`.

### 6.2 `Vec3`

Added to the existing operations (all mutate and return `target` unless
they return a scalar):

| Operation                                      | Notes                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `setComponents(target, x, y, z)`               | Without building a temporary vector                                      |
| `dot(a, b)`, `cross(target, value)`            | `cross` sets `target` to `target × value`                                |
| `negate`, `min`, `max`, `abs`                  |                                                                          |
| `scaleAndAdd(target, value, scale)`            | `target += value * scale`, the physics integration step                  |
| `lerp(target, value, t)`                       |                                                                          |
| `distance`, `distanceSquared`                  |                                                                          |
| `transformPoint(target, matrix)`               | `Matrix4`, `w = 1`, no perspective divide (affine use)                   |
| `transformPointProjective(target, matrix)`     | Divides by `w`; for clip and view-space conversions                      |
| `transformDirection(target, matrix)`           | `Matrix4`, `w = 0`                                                       |
| `transformByMatrix3(target, matrix)`           |                                                                          |
| `rotate(target, quaternion)`                   | The `q v q*` sandwich computed with two cross products (no matrix)       |
| `projectOnPlane(target, normal)`, `reflect(target, normal)` |                                                             |
| `angleBetween(a, b)`                           | Numerically stable `atan2(|a × b|, a · b)`                                |
| `fromVector2(out, vector2, z)`                 | For 2D code building positions                                           |
| `normalize(target)`                            | Existing; throws for a zero vector, as today (decision M10)              |
| `modelFront` (getter)                          | `(0, 0, 1)`                                                              |

### 6.3 `Quat`

```ts
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}
```

| Operation                                             | Notes                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Quat.identity` (getter, fresh each access)           | `(0, 0, 0, 1)`                                                                              |
| `fromAxisAngle(out, axis, radians)`                   | `axis` must be unit length                                                                   |
| `fromYawPitchRoll(out, yaw, pitch, roll)`             | Yaw about Y, then pitch about the rotated X, then roll about the rotated Z                   |
| `toYawPitchRoll(out, quaternion)`                     | Inverse of the above; at pitch `±π/2` returns roll `0` and puts the rest in yaw              |
| `fromAngleZ(out, radians)`, `angleZ(quaternion)`      | The 2D helpers. `angleZ` is the twist about Z (swing-twist decomposition), so it's exact for 2D rotations and the meaningful "heading" for others |
| `fromUnitVectors(out, from, to)`                      | Shortest arc; picks a stable perpendicular axis for opposite vectors                         |
| `lookRotation(out, forward, up)`                      | The rotation that turns `-Z` to `forward` with `+Y` as close to `up` as possible (cameras, lights) |
| `modelLookRotation(out, front, up)`                   | The rotation that turns `+Z` (a model's front) to `front`                                    |
| `fromMatrix3(out, matrix)`, `fromMatrix4(out, matrix)` | From a rotation (or the normalized basis of a rotation-and-scale) matrix                    |
| `multiply(target, value)`, `premultiply(target, value)` | `target * value`, `value * target`                                                         |
| `conjugate`, `invert`, `normalize`, `dot`             | `invert` equals `conjugate` for unit quaternions and is the one to use; `normalize` throws for a zero quaternion |
| `slerp(target, value, t)`                             | Shortest path; falls back to normalized lerp when nearly parallel                            |
| `nlerp(target, value, t)`                             | Cheaper, used for blending animation poses (design 12)                                       |
| `rotateTowards(target, value, maxRadians)`            | Constant angular speed turning                                                               |
| `angleBetween(a, b)`                                  |                                                                                              |
| `equals(a, b, tolerance)`, `exactlyEquals`, `clone`   | `equals` treats `q` and `-q` as equal                                                        |

### 6.4 `Mat4`

```ts
export type Matrix4 = Brand<number[], 'Matrix4'>; // length 16, packed doubles (decision M2)
```

| Group             | Operations                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Creation          | `Mat4.create()` (identity), `identity(out)`, `copy(out, m)`, `clone(m)`                                                                          |
| Composition       | `multiply(target, value)` (`target * value`), `premultiply`, `multiplyAffine`, `premultiplyAffine` (skip the bottom row: 36 multiplies instead of 64) |
| Builders          | `fromTransform(out, position, rotation, scale)`, `fromQuat`, `fromTranslation`, `fromScale`, `fromMatrix3`                                       |
| Inversion         | `invert(out, m): Matrix4 \| null` (general, `null` when singular), `invertAffine(out, m): Matrix4 \| null`, `transpose`, `determinant`           |
| Decomposition     | `decompose(outPosition, outRotation, outScale, m)`; a negative determinant puts the reflection in the X scale. `getTranslation(out, m)`, `getMaxScale(m)` |
| Views             | `lookAt(out, eye, target, up)` (a view matrix), `targetTo(out, eye, target, up)` (an object facing a target, its inverse)                       |
| Projections       | `perspective(out, fovY, aspect, near, far, depthRange)`, `perspectiveInfinite(out, fovY, aspect, near, depthRange)`, `orthographic(out, left, right, bottom, top, near, far, depthRange)` |
| GPU               | `toFloat32(out: Float32Array, offset, m)`: writes 16 values into a staging buffer at an offset                                                   |

`depthRange` is `'negativeOneToOne' | 'zeroToOne'` (decision M7). A reversed
depth projection is built by the camera system from these (design 06), not
by the math module, since reversing depth is a renderer choice.

### 6.5 `Mat3`

```ts
export type Matrix3 = Brand<number[], 'Matrix3'>; // length 9
```

`create`, `identity`, `copy`, `multiply`, `premultiply`, `transpose`,
`invert` (`null` when singular), `invertSymmetric` (for inertia tensors),
`determinant`, `fromQuat`, `fromMatrix4` (upper-left 3x3),
`normalFromMatrix4` (inverse transpose of the upper-left 3x3), `fromScale`,
`skew(out, vector)` (the cross-product matrix), `outerProduct(out, a, b)`,
`add`, `scale`. `Mat3` is what design 14 uses for inertia tensors
(`R I Rᵀ`), and what the renderer uses for normal matrices when it
computes them on the CPU.

### 6.6 Geometry

#### 6.6.1 Types

```ts
export interface Ray {
  origin: Vector3;
  direction: Vector3; // unit length
}

export interface Plane {
  normal: Vector3; // unit length
  constant: number; // dot(normal, point) + constant = 0
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface BoundingSphere {
  center: Vector3;
  radius: number;
}

export interface Frustum {
  // left, right, bottom, top, near, far; normals point inwards
  planes: [Plane, Plane, Plane, Plane, Plane, Plane];
}
```

Operations live on `Rays`, `Planes`, `BoundingBoxes`, `BoundingSpheres` and
`Frustums`, matching `Rect`/`Rects`:

- `Rays`: `at(out, ray, distance)`, `transform(out, ray, matrix)`,
  `intersectPlane`, `intersectSphere`, `intersectBox` (slab method),
  `intersectTriangle` (Möller-Trumbore, with a back-face option for
  picking). Each returns the distance along the ray, or `null`.
- `Planes`: `fromPointAndNormal`, `fromPoints`, `normalize`,
  `signedDistance`, `projectPoint`.
- `BoundingBoxes`: `empty()` (inverted, so the first point sets it),
  `fromPositions(positions: Float32Array, stride, offset)`,
  `expandByPoint`, `union`, `center`, `halfExtents`, `transform(out, box,
  matrix)` (transforms the center and takes the absolute matrix times the
  extents, giving the tight box of the transformed box in constant time),
  `intersects`, `containsPoint`.
- `BoundingSpheres`: `fromBox`, `transform(out, sphere, matrix)` (radius
  scaled by `getMaxScale`), `intersects`, `merge`.
- `Frustums`: `fromViewProjection(out, matrix, depthRange)` (planes
  extracted from the matrix's rows, normalized; the near plane depends on
  the depth range), `intersectsSphere`, `intersectsBox` (the
  positive-vertex test), `containsPoint`, `corners(out, inverseMatrix,
  depthRange)` (unprojects the eight clip-space corners, for shadow
  cascade fitting). An infinite far plane (from `perspectiveInfinite`)
  extracts as a zero normal; it's stored as a plane every point passes
  (normal zero, constant `+∞`) rather than normalized into `NaN`, and
  `corners` requires a finite far distance, which shadow fitting supplies
  from its cascade split.

#### 6.6.2 Degenerate input

Each operation defines what happens with degenerate input, and the tests
cover it:

- normalizing a zero vector or quaternion throws (decision M10); engine
  code that can meet one checks first, and each such function documents
  its fallback;
- `Mat4.invert` returns `null` for a singular matrix, and callers handle
  it (for example, a zero scale makes an entity's normals undefined, so
  the renderer culls it);
- `Quat.fromUnitVectors` with opposite vectors picks an axis
  perpendicular to `from`;
- `lookRotation` with `forward` parallel to `up` picks a fallback up;
- ray tests return `null` for parallel rays and for hits behind the
  origin.

### 6.7 Performance

- Every operation is allocation-free except `clone`, `create` and the
  getters that document a fresh value. The allocation tests in design 01
  catch regressions in callers.
- Objects are always created with properties in the same order
  (`x, y, z, w`), so V8 keeps one hidden class per type and property
  access stays monomorphic. Builders write every field, so partially
  filled objects never exist.
- `Mat4.multiplyAffine`, `invertAffine` and `fromTransform` are the paths
  transform propagation uses (design 04); they're written out by hand,
  without loops, so V8 keeps every element in registers.
- Microbenchmarks (`src/math/*.bench.ts`) measure `fromTransform`,
  `multiplyAffine`, `invert`, `invertAffine`, `decompose`,
  `Quat.multiply`, `Quat.slerp`, `Vec3.rotate` and `Frustums.intersectsSphere`,
  and report a widely used math library's equivalent alongside
  (informational, not a gate).

### 6.8 Testing

- Property tests with seeded random input (design 01 §6.1): an inverse
  times the original is the identity; `decompose(fromTransform(t, r, s))`
  returns `t`, `r` (up to sign) and `s`; `Quat.slerp` has endpoints `a`
  and `b` and constant angular velocity; `toYawPitchRoll` inverts
  `fromYawPitchRoll` away from the poles; `Vec3.rotate` agrees with
  `Mat3.fromQuat` times the vector.
- Known values: projection matrices against values computed by hand;
  `lookAt` for axis-aligned cases; frustum planes of a 90° perspective.
- Brute-force references for intersection tests: sampling points along a
  ray agrees with `intersectBox`, `intersectSphere` and `intersectTriangle`.
- The degenerate cases in §6.6.2.

### 6.9 Documentation

- `math/quaternions.md`: what a rotation is in Forge, building one (axis
  and angle, yaw-pitch-roll, look rotation, 2D angle), combining and
  interpolating, why Euler angles are only for input and display.
- `math/geometry.md`: rays, planes, bounds and frustums, with picking and
  culling as examples.
- `math/matrices.md`: rewritten around `Mat4`/`Mat3`, column-major order,
  composition order, and when game code needs a matrix at all (rarely:
  transforms do it).
- `math/angles-and-rotation.md`: the 3D right-hand rule alongside the
  existing 2D rule, showing they agree about Z.

---

## 7. Review

`solution-reviewer` verdict on the first draft (reviewed with design 04):
**REVISE**. The conventions were confirmed correct (right-handed Y-up,
Hamilton quaternions, `multiply(a, b) = a·b`, column-major indexing,
yaw-pitch-roll as `Ry·Rx·Rz`). Changes made:

- Matrices are packed-double plain arrays (M2): a 16-element
  `Float64Array` per transform would allocate its storage off the
  JavaScript heap on every entity creation.
- Every function that writes a result takes it first (M3); the first draft
  mixed first and last.
- The frustum functions take the depth range, and an infinite far plane is
  handled instead of normalizing to `NaN` (M7, §6.6.1).
- `normalize` keeps today's throwing contract for vectors and quaternions
  (M10); the first draft misdescribed it as returning zero.
- Model front (`+Z`) and forward (`-Z`) are both named (M11).
