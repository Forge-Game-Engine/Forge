# Audio

Forge plays audio through the browser's Web Audio API. A game creates one
[`SoundMixer`](/Forge/docs/api/interfaces/SoundMixer), arranges
[buses](/Forge/docs/api/interfaces/MixerBus) under its `master` bus (for
example `music` and `sfx`), loads sounds once, and plays them through a
bus:

```ts
import {
  createSoundMixer,
  playSound,
  SoundAssetCache,
} from '@forge-game-engine/forge/audio';

const mixer = createSoundMixer();
const music = mixer.createBus('music');
const sfx = mixer.createBus('sfx');

const sounds = new SoundAssetCache(mixer);
const laser = await sounds.getOrLoad('audio/laser.mp3');

playSound(sfx, laser, { volume: 0.5 });
```

The pieces:

- [`createSoundMixer`](/Forge/docs/api/functions/createSoundMixer) owns the
  game's audio output and unlocks it on the player's first click, tap or
  key press. See [Mixer and Buses](./mixer-and-buses.md).
- A [`MixerBus`](/Forge/docs/api/interfaces/MixerBus) has a `volume` and a
  `muted` flag that apply to every sound played through it, including
  sounds already playing.
- A [`SoundAsset`](/Forge/docs/api/interfaces/SoundAsset) is decoded audio,
  loaded once with
  [`SoundAssetCache`](/Forge/docs/api/classes/SoundAssetCache) or made from
  samples with
  [`createSoundAsset`](/Forge/docs/api/functions/createSoundAsset). See
  [Loading Sounds](./loading-sounds.md).
- [`playSound`](/Forge/docs/api/functions/playSound) plays a sound without
  an entity. A
  [`SoundEcsComponent`](/Forge/docs/api/interfaces/SoundEcsComponent),
  played by
  [`createSoundEcsSystem`](/Forge/docs/api/functions/createSoundEcsSystem),
  plays a sound that belongs to an entity and stops with it. See
  [Playing Sounds](./playing-sounds.md).

Forge has no audio dependencies to install.
