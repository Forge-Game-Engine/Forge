---
sidebar_position: 9
---

# Fixed Timestep

Forge runs physics in fixed steps: each step advances the simulation by the
same amount of time, `time.fixedDeltaTimeInSeconds`, whatever the length of
the frame. A frame runs as many steps as fit in the time since the previous
frame, and draws each body between its last two steps.

## Why physics runs at a fixed rate

Integration, collision resolution and the joint solvers each change a body
by an amount that depends on the length of the step. When the step is the
frame's delta time, the same scene bounces, stretches and settles
differently at 30, 60 and 144 frames per second, and a long frame moves a
fast body far enough to pass through a thin collider. With a step of a
fixed size, every display runs the same sequence of steps, so bodies move
the same way at any frame rate and tuning values (restitution, spring
stiffness, joint limits) behave the same everywhere.

## What runs in a frame

[`registerFixedUpdate`](/Forge/docs/api/functions/registerFixedUpdate)
registers the `fixed-update` group the physics systems run in (see
[Registering the physics systems](./index.md#registering-the-physics-systems)).
Each frame:

1. [`Game`](/Forge/docs/api/classes/Game) calls `time.update`, which adds
   the frame's delta time to the time accumulated towards fixed steps.
2. The world runs its first and start-of-tick groups: game state
   transitions, `registerInputs`' input update, and a game state's exit and
   enter groups.
3. The world runs `fixed-update` once per whole fixed step in the
   accumulated time: zero times on a frame shorter than a step, and several
   times on a longer one.
4. The world runs the default group: once-per-frame game systems, the
   frame's transform system, which draws bodies between their last two
   steps, and rendering.
5. The world runs `registerInputs`' `input-reset` group.

[Running systems at a fixed rate](../common/time.md#running-systems-at-a-fixed-rate)
lists what `Time` reports to a system in each of these groups.

## Choosing a step rate

The step rate is set on the game's [`Time`](/Forge/docs/api/classes/Time),
as the size of one step in milliseconds. It's 60 steps per second by
default:

```ts
time.fixedDeltaTimeInMilliseconds = 1000 / 50; // 50 steps per second
```

A change takes effect from the next step. The step rate doesn't have to
match the display's frame rate: interpolation draws bodies on every frame
whichever rate runs the steps.

- A higher rate makes each step shorter. Joints and stacked bodies hold
  together more stiffly, and a fast body moves less per step, so it's less
  likely to pass through a thin collider. Every step runs every system in
  `fixed-update`, so the CPU time physics takes per second grows with the
  rate.
- A lower rate runs fewer steps and takes less CPU time. Each step is
  longer, so collisions and joints are resolved less accurately, and an
  interpolated body is drawn up to one longer step behind its simulated
  pose: at 10 steps per second, up to 100 milliseconds.

## Where game systems go

A game system runs once per fixed step, in the group `registerFixedUpdate`
returns, when its effect on the simulation depends on how often it runs:

- it applies a force, torque or velocity change scaled by the delta time;
- it sets a velocity or a motor target that the solver reads in the same
  step, registered before collision resolution;
- it reads `ContactsEcsComponent.started` or `ended`, or
  `collisionManifolds`, registered after the narrow phase (see
  [Reading contacts](./collisions.md#reading-contacts));
- it drives the simulation on a timer, such as a periodic impulse.

A game system runs once per frame, in the default group, when it reads
something that is true for one frame or when it draws:

- it reads a trigger action's `isTriggered`: a press is read by zero fixed
  steps on a short frame and by several on a long one;
- it moves an entity that has no rigid body by writing its `local`;
- it positions or draws something from a body's pose, such as a camera
  that follows a body;
- it spawns entities, edits tiles or colliders, or changes the camera,
  rendering, UI or audio.

A dynamic or kinematic body has no parent, so its `position.local` and
`rotation.local` are its simulated world pose. A once-per-frame system
reads them for game logic. A system that positions or draws something
from a body's pose reads the pose the body is drawn at this frame, with
[`getInterpolatedLocalPosition`](/Forge/docs/api/functions/getInterpolatedLocalPosition)
and
[`getInterpolatedLocalRotation`](/Forge/docs/api/functions/getInterpolatedLocalRotation),
so it lines up with the body on screen (see
[Reading the drawn pose](../common/transforms.md#reading-the-drawn-pose)).

`ContactsEcsComponent.touching` is the state after the latest step, so a
system in either group can read it.

### Requesting a change from a once-per-frame system

A system that reads a press and has to change the simulation inside a step
is split in two. The once-per-frame system sets a field on a component,
and a fixed-step system acts on the field and clears it:

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TriggerAction } from '@forge-game-engine/forge/input';

const createJumpInputEcsSystem = (
  jumpInput: TriggerAction,
): EcsSystem<[PlayerEcsComponent]> => ({
  query: [playerId],
  update: (_world, { components: [players] }) => {
    if (!jumpInput.isTriggered) {
      return;
    }

    for (const player of players) {
      player.jumpRequested = true;
    }
  },
});

world.addSystem(createJumpInputEcsSystem(jumpInput));
```

A player-move system registered in the fixed-update group after the narrow
phase jumps when `jumpRequested` is `true` and the player is on the ground,
and sets `jumpRequested` to `false` on every step. A press on a frame with
no fixed step is acted on in the next frame's first step, and a press on a
frame with several steps is acted on once.

## Drawing bodies between steps

A body moves only on the frames that run a step. To draw it moving on every
frame, `addRigidBodyComponent` gives every rigid body a
[`TransformInterpolationEcsComponent`](/Forge/docs/api/interfaces/TransformInterpolationEcsComponent).
`createTransformInterpolationEcsSystem`, registered last in `fixed-update`,
records where each body ended the step, and the frame's transform system
draws the body between where it started and ended the latest step, by
`time.fixedOverstepFraction`. So a body is drawn up to one step behind its
simulated pose.

A body without the component is drawn where the latest step left it:

```ts
import { transformInterpolationId } from '@forge-game-engine/forge/common';

world.removeComponent(body, transformInterpolationId);
```

[Interpolating between fixed steps](../common/transforms.md#interpolating-between-fixed-steps)
covers the component's snapshots and children of interpolated entities. The
[fixed timestep demo](/Forge/demos/fixed-timestep) draws the same bodies with
and without the component at a step rate chosen on the page.

## Teleporting a body

To move a body to a new pose at once (a respawn, a reset), write its
`local` position and rotation in the default group, or in `fixed-update`
before its transform system:

```ts
import { positionId } from '@forge-game-engine/forge/common';

const position = world.getComponent(body, positionId);

if (position) {
  position.local.x = spawnPoint.x;
  position.local.y = spawnPoint.y;
}
```

An interpolated body whose `local` differs from where the latest step left
it is drawn at `local` until the next step, and the next step starts from
the new pose, so no other call is needed. A teleport written in a fixed step between the transform system
and `createTransformInterpolationEcsSystem` is drawn as a slide over one
step instead (see
[Moving an interpolated entity outside a fixed step](../common/transforms.md#moving-an-interpolated-entity-outside-a-fixed-step)).

## Catching up after a long frame

A frame adds its delta time to the accumulated time, and `fixed-update` runs
once for each whole step in it. After a frame that took longer than usual (a
garbage collection, a slow asset decode), the next frame runs several steps,
so the simulation keeps up with real time instead of slowing down.

The delta time a frame adds is limited to `250` milliseconds, so at most 15
steps run in one frame at 60 steps per second. Time past the limit is
dropped, and the simulation falls behind real time by it. The limit bounds
the work one frame does: without it, a frame whose steps take longer than
the time they cover would make the next frame run even more steps. For the
same reason, a step rate whose steps take longer to run than the time they
cover makes every frame reach the limit, and the game runs slower than real
time.

## Slowing down and pausing

[`time.timeScale`](../common/time.md#scaling-time) multiplies the delta time
added to the accumulated time. The step size doesn't change, so at
`timeScale = 0.5` steps run half as often and every body moves as it would
at full speed, at half the speed on screen. Interpolation draws the bodies
moving on every frame between those steps.

At `timeScale = 0`, no steps run and `fixedOverstepFraction` doesn't change,
so interpolated bodies are drawn at the same pose on every frame.
Once-per-frame systems still run, and read a delta time of `0`.
