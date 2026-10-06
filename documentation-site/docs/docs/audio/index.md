# Audio

Forge plays sound through the browser's Web Audio API. A sound mixer owns
the page's `AudioContext` and a tree of buses; every sound plays through a
bus, and each bus's volume and mute apply to every sound routed through it.

The feature is made of:

- [`SoundMixer`](/Forge/docs/api/interfaces/SoundMixer), created with
  [`createSoundMixer`](/Forge/docs/api/functions/createSoundMixer): owns the
  `AudioContext`, the `master` bus and every other bus, and unlocks audio on
  the player's first input.
- [`MixerBus`](/Forge/docs/api/interfaces/MixerBus): a named stage with a
  `volume` and a `muted` flag. Every bus except `master` feeds a parent
  bus.
- [`SoundAsset`](/Forge/docs/api/interfaces/SoundAsset): decoded audio,
  loaded once with a
  [`SoundAssetCache`](/Forge/docs/api/classes/SoundAssetCache) or created
  from samples with
  [`createSoundAsset`](/Forge/docs/api/functions/createSoundAsset), and
  played any number of times.
- [`playSound`](/Forge/docs/api/functions/playSound): plays a sound asset
  on a bus and returns a
  [`PlayingSound`](/Forge/docs/api/interfaces/PlayingSound) to change its
  volume or stop it.
- [`SoundEcsComponent`](/Forge/docs/api/interfaces/SoundEcsComponent),
  played by
  [`createSoundEcsSystem`](/Forge/docs/api/functions/createSoundEcsSystem):
  a sound that belongs to an entity and stops when the entity or the
  component is removed.

[The sound mixer](./mixer.md) covers creating the mixer and its buses.
[Playing sounds](./playing-sounds.md) covers loading sound assets and
playing them.
