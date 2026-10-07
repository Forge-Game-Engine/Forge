---
sidebar_position: 2
---

# Loading Sounds

A [`SoundAsset`](/Forge/docs/api/interfaces/SoundAsset) is decoded audio.
One sound asset can play any number of times at once, on any bus, and
stays usable after the world that played it stops, so load each sound once
and share it.

## Loading sound files

[`SoundAssetCache`](/Forge/docs/api/classes/SoundAssetCache) is an
[asset cache](../asset-loading/index.md):
[`getOrLoad(url)`](/Forge/docs/api/classes/SoundAssetCache#getorload)
fetches and decodes a file the first time and returns the cached sound
afterwards. Requests for a file that's still loading share that load.

```ts
import { SoundAssetCache } from '@forge-game-engine/forge/audio';

const sounds = new SoundAssetCache(mixer);

const [music, laser, explosion] = await Promise.all([
  sounds.getOrLoad('audio/theme.mp3'),
  sounds.getOrLoad('audio/laser.mp3'),
  sounds.getOrLoad('audio/explosion.mp3'),
]);
```

Decoding a long file takes time, and a sound loaded when it's first needed
plays after that delay, so load sounds before gameplay starts.
[`get(url)`](/Forge/docs/api/classes/SoundAssetCache#get) returns a sound
that has finished loading, and throws for one that hasn't.

## Supported formats

`getOrLoad` takes one URL per sound, so use a format every browser
decodes: MP3, AAC (`.m4a`) or WAV. `getOrLoad` rejects, naming the URL,
for a file that can't be fetched or decoded.

## Creating a sound from samples

[`createSoundAsset`](/Forge/docs/api/functions/createSoundAsset) makes a
sound from samples, for audio generated at runtime. Each channel is a
`Float32Array` of samples between -1 and 1:

```ts
import { createSoundAsset } from '@forge-game-engine/forge/audio';

const sampleRate = 44100;
const samples = new Float32Array(sampleRate * 0.2);

for (let i = 0; i < samples.length; i++) {
  samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
}

const beep = createSoundAsset({ sampleRate, channels: [samples] });
```

Create it once, like a loaded sound, and play it as often as needed.

## Releasing sounds

A decoded sound holds every sample in memory: a three-minute stereo track
at 44.1 kHz takes about 60 MB. The cache keeps each sound in its `assets`
map until it's deleted from it:

```ts
sounds.assets.delete('audio/theme.mp3');
```

The memory is freed once nothing else holds a reference to the
`SoundAsset`.
