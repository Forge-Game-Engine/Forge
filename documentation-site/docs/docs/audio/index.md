# Audio

Forge's audio integration is a thin ECS wrapper around
[Howler.js](https://github.com/goldfire/howler.js): an
[`AudioEcsComponent`](/Forge/docs/api/interfaces/AudioEcsComponent) pairs a
Howler `Howl` instance with a `playSound` flag, a volume and an audio bus,
and [`createAudioEcsSystem`](/Forge/docs/api/functions/createAudioEcsSystem)
plays queued sounds each tick and keeps them at their volume.

`howler` is a peer dependency. Install it alongside Forge:

```bash
npm install howler
```

Core concepts:

- [`AudioEcsComponent`](/Forge/docs/api/interfaces/AudioEcsComponent): a
  `Howl` instance to play, a `playSound` flag that triggers playback, its
  `volume` and the `bus` it plays through.
- [`AudioBus`](/Forge/docs/api/interfaces/AudioBus): a channel of the mix
  (master, music, sound effects, ...) with its own volume and mute, made by
  [`createAudioBus`](/Forge/docs/api/functions/createAudioBus).
- [`audioId`](/Forge/docs/api/variables/audioId): the component key used to
  add an `AudioEcsComponent` to an entity.
- [`createAudioEcsSystem`](/Forge/docs/api/functions/createAudioEcsSystem):
  plays queued sounds every tick, applies volume and bus changes to sounds
  already playing, and stops what it started when the world stops.

Guides in this section:

- [Playing Sounds](./playing-sounds.md): triggering one-shot and looping
  sounds, setting their volume, and what happens when entities are removed.
- [Mixing with Audio Buses](./mixing.md): master, music and sound effect
  volumes, muting, and player volume settings.
