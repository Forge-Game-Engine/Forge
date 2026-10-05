---
sidebar_position: 1
---

# Playing Sounds

[`AudioEcsComponent`](/Forge/docs/api/interfaces/AudioEcsComponent) holds a
Howler [`Howl`](https://github.com/goldfire/howler.js#documentation), a
`playSound` flag, a `volume` and the [bus](./mixing.md) it plays through.
[`createAudioEcsSystem`](/Forge/docs/api/functions/createAudioEcsSystem)
checks the flag every tick: when it's `true`, it plays the sound and resets
`playSound` back to `false`.

## Quick start

Create the `Howl` once, store it in the component, and register the system:

```ts
import {
  addAudioComponent,
  audioId,
  createAudioEcsSystem,
} from '@forge-game-engine/forge/audio';
import { createGame } from '@forge-game-engine/forge/utilities';
import { Howl } from 'howler';

const { world } = createGame('game-container');

world.addSystem(createAudioEcsSystem());

const player = world.createEntity();

addAudioComponent(world, player, {
  sound: new Howl({ src: ['jump.mp3'] }),
});
```

## Triggering playback

Flip `playSound` to `true` from any other system or event handler when the
sound should play, for example on a rising edge of a jump input:

```ts
const audio = world.getComponent(player, audioId);

if (audio && justPressedJump) {
  audio.playSound = true;
}
```

The next `world.update()` plays the sound and resets `playSound` back to
`false` for you, so this is a one-shot trigger; you don't need to reset it
yourself.

:::caution
Setting `playSound = true` on every tick that a condition holds (for example
"the player is moving") re-triggers playback every frame, stacking
overlapping copies of the same sound. Trigger it on the transition into the
condition (the rising edge), not while it remains true.
:::

## Background music and looping sounds

For music or ambience, configure looping on the `Howl` itself and trigger
playback once:

```ts
const music = world.createEntity();

addAudioComponent(world, music, {
  sound: new Howl({ src: ['theme.mp3'], loop: true }),
  volume: 0.4,
  playSound: true,
});
```

`createAudioEcsSystem` resets `playSound` to `false` after the first
`update()`, but `loop: true` keeps Howler playing the sound, so no further
flag changes are needed. To stop it, call the `Howl` API directly (for
example `music.sound.stop()`); the component doesn't expose a "stop" flag.

## Volume

Set a sound's volume on its component, from `0` (silent) to `1` (as
recorded), not with the `Howl`'s own `volume` option: the system sets each
play's volume from the component, overriding the `Howl`'s. The system keeps
every play it started at the component's current `volume`, scaled by its
`bus`, until the play finishes, so changing either fades a sound that's
already playing. Route sounds through [audio buses](./mixing.md) for volume
settings that apply to whole groups of sounds, such as music and sound
effects.

## Sharing a sound

The component doesn't own its `Howl`. Many components can share one, which
saves decoding the same file again for every bullet or footstep, and each
play of it is tracked separately:

```ts
const laser = new Howl({ src: ['laser.mp3'] });

const fireBullet = (): void => {
  const bullet = world.createEntity();

  addAudioComponent(world, bullet, { sound: laser, playSound: true });
};
```

## Removing entities and stopping the world

A play outlives the entity that started it: removing the entity (a bullet
that hits something, an explosion whose animation finished) lets its sound
play out instead of cutting it off. Stop it yourself first with
`sound.stop()` if it should end with the entity.

When the world stops (for example via
[`Game.stop()`](/Forge/docs/api/classes/Game#stop)), the system's cleanup
stops every play it started that's still going, including ones whose entity
is gone. It never unloads a `Howl`, since other components, or another
world, may still be using it. Call `sound.unload()` yourself once nothing
will play the sound again.
