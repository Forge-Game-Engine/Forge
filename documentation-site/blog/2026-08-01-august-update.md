---
slug: august-2026-update
title: 'August Update: A Real 2D Physics Engine, New Joints, and Crisp UI'
authors: [forgeTeam]
tags: [release, physics, rendering, demos]
---

Since `0.21.0`, Forge has gone from "renders sprites and moves them around" to
"simulates a physical world." This post rounds up everything that's shipped
since then, including what's currently sitting in `dev` ahead of the next
release.

{/* truncate */}

## A real 2D physics engine

`0.21.0` introduced Forge's native physics engine: [`RigidBody`](/Forge/docs/api/classes/RigidBody)
and [`PhysicsWorld`](/Forge/docs/api/classes/PhysicsWorld) give you gravity,
convex collision shapes, collision detection and resolution, raycasting, and
an impulse-based force API - all with zero external dependencies, wired
straight into the ECS. Check out the [Physics demo](/Forge/demos/physics) to
see bodies falling, colliding, and settling in real time.

## Joints, springs, and motors for every kind of motion

A physics engine is only as fun as what you can build with it, so the last
few releases have been almost entirely about connecting bodies together:

- **[Revolute joints](/Forge/demos/revolute-joint)** (hinges) let two bodies
  rotate around a shared point - see them swinging a wrecking ball in the
  [Wrecking Ball demo](/Forge/demos/wrecking-ball).
- **[Prismatic joints](/Forge/demos/prismatic-joint)** (sliders) constrain
  motion to a single axis, perfect for pistons, elevators, and sliding doors.
- **Linear springs and dampers** add soft, bouncy connections between bodies -
  watch them in action in the [Linear Spring and Damper demo](/Forge/demos/linear-spring-damper)
  and in a classic [Newton's Cradle](/Forge/demos/newtons-cradle).
- **Torque and angular-velocity motors** apply continuous rotational force to
  a body, demoed in the [Torque and Motors demo](/Forge/demos/torque).

Put them all together and you get things like the
[Hill Climb Racer demo](/Forge/demos/hill-climb-racer): a car with motorized
wheels, suspension, and a body all held together with joints, driving over
procedurally generated terrain.

## Terrain to build worlds on

Speaking of terrain - `TerrainShape` gives you 2D heightmap collision that
matches a smooth, curved render mesh point-for-point, so what the player sees
is exactly what they collide with. The [Rolling Ball demo](/Forge/demos/rolling-ball)
shows a ball rolling over rolling hills built entirely from this new shape.

## Crisp UI at any size with nine-slice sprites

Borders, panels, and buttons no longer have to choose between stretching
blurrily or being locked to one size. Nine-slice sprites split an image into
a 3x3 grid and scale only the stretchable middle regions, keeping corners and
edges pixel-perfect at any dimension. See it for yourself in the
[Nine-Slice Sprites demo](/Forge/demos/nine-slice), or in the ropes, doors,
walls, and frames throughout the physics demos above.

## A camera that behaves the same everywhere

Cameras now show a fixed number of vertical world units
(`verticalWorldUnits`, default `10`) on screen, regardless of the player's
resolution or aspect ratio, replacing the old behavior where 1 world unit
always equaled 1 pixel. A new `calculateVisibleWorldSize` helper computes
exactly how many world units are visible at any destination size, so game
logic can position things relative to what's actually on screen instead of
reaching for canvas pixel dimensions.

## Gamepads that just work

`GamepadInputSource` now supports hot-plugging - plug in a controller
mid-game and it's picked up automatically, with the most recently connected
gamepad selected by default. Try it out with a controller in the
[Brick Breaker demo](/Forge/demos/brick-breaker).

## Smaller improvements you'll still feel

- Demos can now go fullscreen.
- A new `preserveDrawingBuffer` option on `createRenderContext`/`RenderContext`
  lets you read the canvas back after a frame has been presented - handy for
  screenshots or `toDataURL`.
- Mouse-driven trigger actions now correctly respect the active input group,
  matching how keyboard and every other input type already behaved.

## Try it out

All of this is available today - the physics and joint work landed in
`0.21.0` through `0.23.1`, with the camera, gamepad, and input polish
currently in `dev` ahead of the next release. Grab the
[Getting Started guide](/Forge/docs/intro) to add Forge to your project, or
jump straight into the [demos](/Forge/demos/physics) to see it all in motion.
For the full list of changes, release by release, see the
[changelog](/Forge/docs/changelog).

We're excited about where the physics engine is headed next - if you build
something with it, [let us know on GitHub](https://github.com/Forge-Game-Engine/Forge).
