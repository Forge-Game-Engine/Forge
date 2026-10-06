---
sidebar_position: 3
---

# Playing Sounds

There are two ways to play a sound:

- [`playSound`](/Forge/docs/api/functions/playSound) for a sound that's
  an event: a shot, an explosion, a button click. It needs no entity.
- A [`SoundEcsComponent`](/Forge/docs/api/interfaces/SoundEcsComponent)
  for a sound that belongs to an entity: an engine's hum, an alarm on a
  pickup, the music of a level. It stops when its entity (or the
  component) is removed.

Both take the bus to play through. There is no default bus, so every
sound follows the volume setting it belongs under.

## One-shots with playSound

```ts
import { playSound } from '@forge-game-engine/forge/audio';

playSound(sfx, explosion, { volume: 0.6 });

// The same sound, lower and quieter, for enemy fire.
playSound(sfx, laser, { volume: 0.3, rate: 0.6 });
```

Sounds overlap freely, including several copies of the same sound.
`rate` changes the speed and the pitch together: 2 is twice as fast and an
octave higher.

`playSound` returns a
[`PlayingSound`](/Forge/docs/api/interfaces/PlayingSound) for sounds the
game controls itself:

```ts
const siren = playSound(sfx, sirenSound, { loop: true });

siren.volume = 0.3;
siren.stop();
```

`isPlaying` is `false` once the sound has ended or was stopped. A looping
sound started with `playSound` plays until `stop()` is called, even after
the world stops, so keep its handle.

## Sounds that belong to an entity

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

const hum = addSoundComponent(world, ship, {
  sound: engineHum,
  bus: sfx,
  loop: true,
  volume: 0.4,
});
```

The system starts the sound on its next update and keeps it in step with
the component:

- `volume`, `rate` and `loop` changes apply to the playing sound, so the
  hum can follow the ship's speed: `hum.rate = 0.8 + speed / maxSpeed`.
- `paused` pauses the sound where it is; clearing it resumes from there.
- Changing `bus` moves the playing sound to another bus of the same mixer.
- Changing `sound` starts the new sound from the beginning.
- Removing the component or the entity stops the sound.
- Stopping the world stops every sound the system started.

### Knowing when a sound has finished

`hasFinished` becomes `true` once a non-looping sound has played to its
end. Use it instead of guessing the sound's length with a timer, for
example to remove an entity once its sound is over:

```ts
for (let i = 0; i < entities.length; i++) {
  if (sounds[i].hasFinished) {
    world.removeEntity(entities[i]);
  }
}
```

Only the system writes `hasFinished`. A finished component plays nothing
more; to play the sound again, remove the component and add a new one.

## Before the first click

Until the player has clicked, tapped or pressed a key, a non-looping sound
is dropped: `playSound` returns a handle whose `isPlaying` is `false`, and
a component reports `hasFinished`. Looping sounds start and are heard once
audio runs. See [The first click](./mixer-and-buses.md#the-first-click).

## Common mistakes

**Loading a sound every time it plays.** A new cache per shot fetches
and decodes the file every time:

```ts
// Don't
playSound(sfx, await new SoundAssetCache(mixer).getOrLoad('audio/laser.mp3'));

// Do: load once, up front, and reuse the asset
const laser = await sounds.getOrLoad('audio/laser.mp3');
playSound(sfx, laser);
```

**An entity just to play a one-shot.** An entity that only carries a sound
and a lifetime long enough for it to finish is what `playSound` replaces.

**Playing a sound every frame a condition holds.** `playSound` in an
`update` loop while "the player is moving" starts a new copy every frame.
Play on the change into the condition, or use a looping
`SoundEcsComponent` and set `paused` from the condition.
