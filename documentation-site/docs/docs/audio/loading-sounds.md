---
sidebar_position: 2
---

# Loading Sounds

A [`SoundAsset`](/Forge/docs/api/interfaces/SoundAsset) is decoded audio.
It can play any number of times at once, on any bus, and stays usable
after the world that played it stops, so load each sound once and share
it.

## From files

[`SoundAssetCache`](/Forge/docs/api/classes/SoundAssetCache) is an
[asset cache](../asset-loading/index.md): `getOrLoad` fetches and decodes a
file the first time and returns the cached sound afterwards. Requests for
a file that's still loading share that load.

```ts
import { SoundAssetCache } from '@forge-game-engine/forge/audio';

const sounds = new SoundAssetCache(mixer);

const [music, laser, explosion] = await Promise.all([
  sounds.getOrLoad('audio/theme.mp3'),
  sounds.getOrLoad('audio/laser.mp3'),
  sounds.getOrLoad('audio/explosion.mp3'),
]);
```

Load sounds before gameplay starts. Decoding a long file takes noticeable
time, and a sound effect loaded when it's first needed plays late.

### Formats

There is one file per sound, so use a format every browser decodes: MP3,
AAC (`.m4a`) or WAV. Older Safari versions can't decode Ogg Vorbis or
Opus. `getOrLoad` rejects for a file that can't be fetched or decoded,
naming its URL.

### Memory

A decoded sound holds every sample in memory: a three-minute stereo track
takes around 60 MB. Keep music tracks to what the game plays, and drop
references to sounds a level no longer needs (`sounds.assets.delete(url)`
removes one from the cache).

## From samples

[`createSoundAsset`](/Forge/docs/api/functions/createSoundAsset) makes a
sound from samples, for audio synthesized at runtime. Each channel is a
`Float32Array` of samples between -1 and 1:

```ts
import { createSoundAsset } from '@forge-game-engine/forge/audio';

const sampleRate = 44100;
const samples = new Float32Array(sampleRate * 0.5);

// A half-second rising "whoosh" of filtered noise, fading out.
let filtered = 0;

for (let i = 0; i < samples.length; i++) {
  const progress = i / samples.length;
  const smoothing = 0.02 + progress * 0.2;

  filtered += (Math.random() * 2 - 1 - filtered) * smoothing;
  samples[i] = filtered * (1 - progress);
}

const whoosh = createSoundAsset({ sampleRate, channels: [samples] });
```

Create it once, like a loaded sound, and play it as often as needed.
