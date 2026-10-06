---
sidebar_position: 2
---

# Playing Sounds

A [`SoundAsset`](/Forge/docs/api/interfaces/SoundAsset) is decoded audio.
[`playSound`](/Forge/docs/api/functions/playSound) plays one through a bus,
and a [`SoundEcsComponent`](/Forge/docs/api/interfaces/SoundEcsComponent)
plays one for as long as an entity has the component.

## Loading sound files

A [`SoundAssetCache`](/Forge/docs/api/classes/SoundAssetCache) fetches and
decodes sound files and keeps each one by URL:

```ts
import { SoundAssetCache } from '@forge-game-engine/forge/audio';

const sounds = new SoundAssetCache(mixer);
const laser = await sounds.getOrLoad('sounds/laser.mp3');
```

Each URL is fetched and decoded once. Calls for a URL that's still loading
wait for the same load. A file that can't be fetched or decoded rejects
with an error naming its URL.

The browser decodes the files. MP3, AAC (`.m4a`) and 16-bit PCM WAV decode
in every major browser. Ogg Vorbis, Opus and WebM don't decode in every
version of Safari.

A sound asset doesn't belong to a world: the same asset plays in any world,
including one that was stopped and started again.

## Creating a sound from samples

[`createSoundAsset`](/Forge/docs/api/functions/createSoundAsset) creates a
sound asset from samples, for audio generated at runtime:

```ts
import { createSoundAsset } from '@forge-game-engine/forge/audio';

const sampleRate = 44100;
const samples = new Float32Array(sampleRate / 2);

for (let i = 0; i < samples.length; i++) {
  samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
}

const beep = createSoundAsset({ sampleRate, channels: [samples] });
```

`channels` holds one `Float32Array` per channel, with values in `[-1, 1]`.

## Playing a sound

[`playSound`](/Forge/docs/api/functions/playSound) plays a sound asset
through a bus:

```ts
import { playSound } from '@forge-game-engine/forge/audio';

playSound(sfx, laser, { volume: 0.5 });
```

Plays of the same sound overlap. The options set the sound's own
`volume`, its playback `rate` (which also shifts its pitch) and whether it
`loop`s.

Before the player's first input, a looping sound starts and is heard once
[audio is unlocked](./mixer.md#unlocking-audio), and a non-looping sound is
dropped.

## Stopping a sound

`playSound` returns a [`PlayingSound`](/Forge/docs/api/interfaces/PlayingSound):

```ts
const theme = playSound(music, themeSound, { loop: true });

theme.volume = 0.3;
theme.stop();
```

[`stop`](/Forge/docs/api/interfaces/PlayingSound#stop) fades the sound out
over a few milliseconds and stops it.
[`isPlaying`](/Forge/docs/api/interfaces/PlayingSound#isplaying) is
`false` once the sound has ended, been stopped, or was dropped.

## Playing a sound on an entity

[`addSoundComponent`](/Forge/docs/api/functions/addSoundComponent) adds a
[`SoundEcsComponent`](/Forge/docs/api/interfaces/SoundEcsComponent) to an
entity, and
[`createSoundEcsSystem`](/Forge/docs/api/functions/createSoundEcsSystem)
plays it:

```ts
import {
  addSoundComponent,
  createSoundEcsSystem,
} from '@forge-game-engine/forge/audio';

world.addSystem(createSoundEcsSystem());

addSoundComponent(world, engine, {
  sound: engineHum,
  bus: sfx,
  loop: true,
});
```

The sound starts on the system's next update.

## Changing a sound on an entity

The system applies the component's fields to its sound every update:

- `paused` set to `true` pauses the sound at its position, and `false`
  resumes it from there.
- `volume`, `rate` and `loop` apply to the playing sound.
- A new `bus` moves the playing sound to that bus. It must belong to the
  same mixer.
- A new `sound` stops the current sound and starts the new one from the
  beginning.

```ts
const hum = world.getComponentRequired(engine, soundId);

hum.rate = 1.5;
hum.paused = true;
```

## Detecting when a sound finishes

The system sets
[`hasFinished`](/Forge/docs/api/interfaces/SoundEcsComponent#hasfinished)
to `true` when a non-looping sound has played to its end. It's also set
when the component was added before the player's first input, because the
sound was dropped. A finished component doesn't play again; add a new
component to play the sound again.

```ts
if (world.getComponentRequired(door, soundId).hasFinished) {
  world.removeComponent(door, soundId);
}
```

## Removing a sound from an entity

Removing the component, or the entity, stops its sound on the system's
next update. Stopping the world stops every sound the system started.
