---
sidebar_position: 3
---

# Quaternions

A [`Quaternion`](/Forge/docs/api/interfaces/Quaternion) is a plain
`{ x, y, z, w }` object that holds a rotation in 3D, as a unit quaternion.
The static methods of [`Quat`](/Forge/docs/api/classes/Quat) build,
combine, apply and interpolate rotations.

## Rotations in Forge

Rotations follow the right-hand rule: a positive angle about an axis turns
counter-clockwise when looking down the axis towards the origin (see
[Angles and Rotation](./angles-and-rotation.md)). `x`, `y` and `z` are the
quaternion's vector part and `w` its scalar part, and
[`Quat.identity`](/Forge/docs/api/classes/Quat#identity), `(0, 0, 0, 1)`,
is no rotation. A quaternion `q` and its negation `-q` are the same
rotation.

Like the vector methods, every `Quat` method that writes a quaternion
writes into its first argument and returns it, and no method creates a
quaternion except `Quat.identity` and
[`Quat.clone`](/Forge/docs/api/classes/Quat#clone):

```ts
import { Quat } from '@forge-game-engine/forge/math';

const rotation = Quat.identity;

Quat.fromAngleZ(rotation, Math.PI / 2); // rotation is now a quarter turn
```

## Building a rotation from an axis and an angle

[`Quat.fromAxisAngle(out, axis, radians)`](/Forge/docs/api/classes/Quat#fromaxisangle)
sets `out` to a turn of `radians` about `axis`, which must be unit length:

```ts
import { Quat, Vec3 } from '@forge-game-engine/forge/math';

const turnLeft = Quat.fromAxisAngle(Quat.identity, Vec3.up, Math.PI / 4);
```

## Building a rotation from yaw, pitch and roll

[`Quat.fromYawPitchRoll(out, yaw, pitch, roll)`](/Forge/docs/api/classes/Quat#fromyawpitchroll)
yaws about `Y`, then pitches about the yawed `X`, then rolls about the
yawed and pitched `Z`. For a camera, a positive yaw turns it left, a
positive pitch tilts it up, and roll tilts the view:

```ts
const cameraRotation = Quat.fromYawPitchRoll(Quat.identity, yaw, pitch, 0);
```

[`Quat.toYawPitchRoll(out, rotation)`](/Forge/docs/api/classes/Quat#toyawpitchroll)
reads the three angles back into a
[`YawPitchRoll`](/Forge/docs/api/interfaces/YawPitchRoll), with pitch from
`-π/2` to `π/2`. At a pitch of exactly `±π/2`, yaw and roll turn about the
same axis, so roll is returned as `0`.

:::note
Yaw, pitch and roll are for input and display, such as a mouse-look
camera's angles or an angle shown in an editor. Store and combine
rotations as quaternions: angles read back from a combined rotation can
differ from the ones that built it, and they can't be interpolated
correctly.
:::

## Building a rotation that faces a direction

[`Quat.lookRotation(out, forward, up)`](/Forge/docs/api/classes/Quat#lookrotation)
sets `out` to the rotation that turns `-Z`
([`Vec3.forward`](/Forge/docs/api/classes/Vec3#forward)) to `forward`, with
`+Y` as close to `up` as possible. Cameras, lights and anything that aims
look along `-Z`:

```ts
const direction = Vec3.subtract(Vec3.clone(target), position);

Quat.lookRotation(cameraRotation, direction, Vec3.up);
```

[`Quat.modelLookRotation(out, front, up)`](/Forge/docs/api/classes/Quat#modellookrotation)
turns `+Z` ([`Vec3.modelFront`](/Forge/docs/api/classes/Vec3#modelfront)),
the direction a model's front faces, to `front` instead.

Both throw when the direction is a zero vector. When it's parallel to `up`,
they use `Vec3.up`, or `Vec3.forward` for a vertical direction, as the up
vector.

[`Quat.fromUnitVectors(out, from, to)`](/Forge/docs/api/classes/Quat#fromunitvectors)
sets `out` to the shortest rotation that turns the unit vector `from` into
the unit vector `to`.

## Building a rotation from a 2D angle

[`Quat.fromAngleZ(out, angle)`](/Forge/docs/api/classes/Quat#fromanglez)
sets `out` to a rotation about `Z` by a 2D angle, so angle `0` points along
`+X` and a positive angle turns `+X` towards `+Y`.
[`Quat.angleZ(rotation)`](/Forge/docs/api/classes/Quat#anglez) reads the
angle back, from `-π` to `π`:

```ts
const rotation = Quat.fromAngleZ(Quat.identity, Math.PI / 2);

Quat.angleZ(rotation); // Math.PI / 2
```

For a rotation that also turns about other axes, `angleZ` returns the part
of the rotation about `Z`.

## Rotating a vector

[`Vec3.rotate(vector, rotation)`](/Forge/docs/api/classes/Vec3#rotate)
rotates `vector` in place:

```ts
const facing = Vec3.rotate(Vec3.forward, cameraRotation);
```

## Combining rotations

[`Quat.multiply(target, value)`](/Forge/docs/api/classes/Quat#multiply)
sets `target` to `target * value`, the rotation that applies `value` first
and then `target`, the same order as multiplying matrices. A child's world
rotation is its parent's world rotation times its local rotation:

```ts
const worldRotation = Quat.multiply(Quat.clone(parentRotation), localRotation);
```

[`Quat.premultiply(target, value)`](/Forge/docs/api/classes/Quat#premultiply)
sets `target` to `value * target`, applying `value` after `target`.
[`Quat.invert`](/Forge/docs/api/classes/Quat#invert) sets a rotation to the
one that undoes it.

## Interpolating rotations

[`Quat.slerp(target, value, t)`](/Forge/docs/api/classes/Quat#slerp) moves
`target` towards `value` along the shortest path, turning at a constant
angular speed as `t` goes from `0` to `1`.
[`Quat.nlerp`](/Forge/docs/api/classes/Quat#nlerp) is cheaper, but its
angular speed isn't constant:

```ts
Quat.slerp(rotation, targetRotation, 0.1);
```

[`Quat.rotateTowards(target, value, maxRadians)`](/Forge/docs/api/classes/Quat#rotatetowards)
turns `target` towards `value` by at most `maxRadians`, for turning at a
fixed speed:

```ts
Quat.rotateTowards(rotation, targetRotation, turnSpeed * deltaTimeInSeconds);
```

## Comparing rotations

[`Quat.angleBetween(a, b)`](/Forge/docs/api/classes/Quat#anglebetween)
returns the angle of the rotation from `a` to `b`, from `0` to `π`.
[`Quat.equals(a, b, tolerance)`](/Forge/docs/api/classes/Quat#equals)
returns whether two quaternions are the same rotation within a tolerance,
counting `q` and `-q` as equal;
[`Quat.exactlyEquals`](/Forge/docs/api/classes/Quat#exactlyequals)
compares components exactly.

:::caution
[`Quat.normalize`](/Forge/docs/api/classes/Quat#normalize) and `Quat.invert`
throw for a zero quaternion `(0, 0, 0, 0)`, which isn't a rotation.
:::
