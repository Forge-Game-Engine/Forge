---
sidebar_position: 3
---

# Playing Sounds

There are two ways to play a sound:

- [`playSound`](/Forge/docs/api/functions/playSound) plays a sound that
  doesn't belong to an entity, such as a shot, an explosion or a button
  click.
- A [`SoundEcsComponent`](/Forge/docs/api/interfaces/SoundEcsComponent)
  plays a sound that belongs to an entity, such as an engine's hum or a
  level's music. It stops when the component or its entity is removed.

Both take the [bus](./mixer-and-buses.md) to play through. There is no
default bus.

## Playing a one-shot sound

```ts
import { playSound } from '@forge-game-engine/forge/audio';

playSound(sfx, explosion, { volume: 0.6 });

playSound(sfx, laser, { volume: 0.3, rate: 0.6 });
```

Any number of sounds play at once, including several copies of the same
sound. `rate` changes the speed and the pitch together: `2` is twice as
fast and an octave higher.

Call `playSound` once when the event happens. Calling it every frame while
a condition holds starts a new copy every frame; for a sound that plays
while a condition holds, use a looping `SoundEcsComponent` and set its
`paused` from the condition.

## Controlling a playing sound

`playSound` returns a
[`PlayingSound`](/Forge/docs/api/interfaces/PlayingSound), whose `volume`
can be changed and which `stop()` stops:

```ts
const siren = playSound(sfx, sirenSound, { loop: true });

siren.volume = 0.3;
siren.stop();
```

`isPlaying` is `false` once the sound has ended or was stopped.

:::caution
A looping sound started with `playSound` plays until `stop()` is called,
even after the world stops. Keep its `PlayingSound` to stop it.
:::

## Attaching a sound to an entity

[`addSoundComponent`](/Forge/docs/api/functions/addSoundComponent) attaches
a sound to an entity, and
[`createSoundEcsSystem`](/Forge/docs/api/functions/createSoundEcsSystem)
plays it:

```ts
import {
  addSoundComponent,
  createSoundEcsSystem,
} from '@forge-game-engine/forge/audio';

world.addSystem(createSoundEcsSystem());

const hum = addSoundComponent(world, engine, {
  sound: engineHum,
  bus: sfx,
  loop: true,
  volume: 0.4,
});
```

The system starts the sound on its next update. On each update it applies
the component's fields to the playing sound:

- Changes to `volume`, `rate` and `loop` apply to the playing sound.
- `paused` pauses the sound; setting it back to `false` resumes it from
  the same place.
- Changing `bus` moves the playing sound to another bus of the same mixer.
- Changing `sound` starts the new sound from the beginning.

## Knowing when a sound has finished

`hasFinished` is set to `true` once a non-looping sound has played to its
end. For example, to remove an entity once its sound is over:

```ts
for (let i = 0; i < entities.length; i++) {
  if (sounds[i].hasFinished) {
    world.removeEntity(entities[i]);
  }
}
```

Only the system writes `hasFinished`. A finished component plays nothing
more; to play the sound again, remove the component and add a new one.

## Sounds played before the first click

Until the player has clicked, tapped or pressed a key, a non-looping sound
is dropped: `playSound` returns a `PlayingSound` whose `isPlaying` is
`false`, and a component's `hasFinished` is set to `true`. Looping sounds
start and are heard once audio runs. See
[Starting audio on the first click](./mixer-and-buses.md#starting-audio-on-the-first-click).

## Stopping a sound

- `stop()` stops a sound started with `playSound`.
- Removing a `SoundEcsComponent`, or its entity, stops its sound on the
  system's next update.
- Removing the system or stopping the world stops every sound the system
  started.
- [Stopping the mixer](./mixer-and-buses.md#stopping-the-mixer) stops
  every sound. On its next update, the system sets `hasFinished` on each
  component whose sound was playing.
