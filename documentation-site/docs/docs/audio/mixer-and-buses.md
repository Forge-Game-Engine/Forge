---
sidebar_position: 1
---

# Mixer and Buses

A game has one [`SoundMixer`](/Forge/docs/api/interfaces/SoundMixer).
Every sound plays through one of its
[buses](/Forge/docs/api/interfaces/MixerBus), and every bus feeds into
another bus, up to `master`. A sound's loudness is its own volume times
the volume of each bus on the way to `master`.

## Buses for a settings screen

Create a bus for each group of sounds the player can adjust separately.
Most games need two:

```ts
import { createSoundMixer } from '@forge-game-engine/forge/audio';

const mixer = createSoundMixer();
const music = mixer.createBus('music');
const sfx = mixer.createBus('sfx');
```

A volume slider or mute toggle writes the bus directly. The change applies
to sounds that are already playing:

```ts
musicSlider.onValueChanged.registerListener((value) => {
  music.volume = value;
});

muteToggle.onValueChanged.registerListener((isOn) => {
  mixer.master.muted = isOn;
});
```

Muting keeps the bus's `volume`, so unmuting restores it.

Buses can nest: `mixer.createBus('footsteps', sfx)` creates a bus whose
sounds also follow the `sfx` volume. Bus names are unique within a mixer,
and [`getBus`](/Forge/docs/api/interfaces/SoundMixer#getbus) looks one up by
name.

### Volume is linear

`volume` is a linear gain from 0 (silent) to 1 (unchanged). Ears hear
loudness roughly logarithmically, so a slider assigned straight to
`volume` changes little over its top half and a lot near the bottom. For a
slider that sounds even, map its position before assigning it, for example
`bus.volume = position * position`.

### Saving settings

The mixer doesn't save anything. Store the volumes and mute flag with the
rest of your game's settings and assign them to the buses when the game
starts.

## The first click

Browsers don't play audio until the player has interacted with the page.
The mixer listens for the first click, tap or key press (other than
Escape) and starts audio then. Until that happens:

- A looping sound (music, ambience) starts, and is heard as soon as audio
  runs.
- A non-looping sound is dropped. A sound effect from before the player
  touched anything, such as an explosion in an attract loop, would
  otherwise play late, together with every other one, on the first click.
- A sound played by the first click itself (a menu button, the first shot)
  plays.

If the browser already lets the page play audio (for example after the
player navigated to it from another page of the same site), nothing is
dropped.

The mixer also starts audio again after it stops without the game asking,
for example when Safari pauses it for a phone call.
[`state`](/Forge/docs/api/interfaces/SoundMixer#state) reports
`'suspended'`, `'running'`, `'interrupted'` (Safari) or `'closed'`.

## Pausing audio

[`suspend`](/Forge/docs/api/interfaces/SoundMixer#suspend) pauses all
audio and [`resume`](/Forge/docs/api/interfaces/SoundMixer#resume)
continues it from the same place. Browsers slow down a hidden tab's game
loop but keep its audio playing, so music keeps going over a paused game.
To silence a game whose tab is hidden, suspend on `visibilitychange`:

```ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    void mixer.suspend();
  } else {
    void mixer.resume();
  }
});
```

## Tearing down

Call [`stop`](/Forge/docs/api/interfaces/SoundMixer#stop) when the game is
torn down, for example when a single-page app navigates away from it. It
stops every sound and releases the browser's audio resources; a mixer that
isn't stopped keeps playing its sounds. Stop the game's worlds before the
mixer, since `createSoundEcsSystem` stops its sounds when its world stops.
A stopped mixer can't play sounds again; create a new one.

## iOS silent switch

On iPhones and iPads, the hardware silent switch mutes the page's audio.
