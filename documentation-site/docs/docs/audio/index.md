# Audio

Forge's audio integration is a thin ECS wrapper around
[Howler.js](https://github.com/goldfire/howler.js): an
[`AudioEcsComponent`](/Forge/docs/api/interfaces/AudioEcsComponent) pairs a
Howler `Howl` instance with a `playSound` flag, and
[`createAudioEcsSystem`](/Forge/docs/api/functions/createAudioEcsSystem)
plays queued sounds each tick.

`howler` is a peer dependency. Install it alongside Forge:

```bash
npm install howler
```

Core concepts:

- [`AudioEcsComponent`](/Forge/docs/api/interfaces/AudioEcsComponent): a
  `Howl` instance to play, plus a `playSound` flag that triggers playback.
- [`audioId`](/Forge/docs/api/variables/audioId): the component key used to
  add an `AudioEcsComponent` to an entity.
- [`createAudioEcsSystem`](/Forge/docs/api/functions/createAudioEcsSystem):
  plays queued sounds every tick and unloads them when the world stops.

Guides in this section:

- [Playing Sounds](./playing-sounds.md): triggering one-shot and looping
  sounds, and cleaning up audio resources.
