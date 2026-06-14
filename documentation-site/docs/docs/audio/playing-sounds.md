---
sidebar_position: 1
---

# Playing Sounds

[`AudioEcsComponent`](/Forge/docs/api/interfaces/AudioEcsComponent) holds a
Howler [`Howl`](https://github.com/goldfire/howler.js#documentation) and a
`playSound` flag.
[`createAudioEcsSystem`](/Forge/docs/api/functions/createAudioEcsSystem)
checks that flag every tick: when it's `true`, it calls `sound.play()` and
resets `playSound` back to `false`.

## Quick start

Create the `Howl` once, store it in the component, and register the system:

```ts
import { audioId, createAudioEcsSystem } from '@forge-game-engine/forge/audio';
import { createGame } from '@forge-game-engine/forge/utilities';
import { Howl } from 'howler';

const { world } = createGame('game-container');

world.addSystem(createAudioEcsSystem());

const player = world.createEntity();

world.addComponent(player, audioId, {
  sound: new Howl({ src: ['jump.mp3'] }),
  playSound: false,
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

world.addComponent(music, audioId, {
  sound: new Howl({ src: ['theme.mp3'], loop: true, volume: 0.4 }),
  playSound: true,
});
```

`createAudioEcsSystem` resets `playSound` to `false` after the first
`update()`, but `loop: true` keeps Howler playing the sound, so no further
flag changes are needed. To stop it, call the `Howl` API directly (for
example `music.sound.stop()`); the component doesn't expose a "stop" flag.

## Cleanup

`createAudioEcsSystem`'s cleanup hook stops and unloads the `Howl` for any
matching entity whose sound is still playing, but it only runs when the
whole [`world.stop()`](/Forge/docs/api/classes/EcsWorld#stop) (for example
via [`Game.stop()`](/Forge/docs/api/classes/Game#stop)) runs, not when an
individual entity or component is removed.

:::caution
If you remove an entity with an `AudioEcsComponent` while the game keeps
running (for example a temporary "explosion" entity), this cleanup never
runs for it. Call `sound.stop()` and `sound.unload()` yourself before
removing the entity or component, otherwise the loaded audio buffer stays in
memory for the rest of the session.
:::
