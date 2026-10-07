---
sidebar_position: 1
---

# Mixer and Buses

A game has one [`SoundMixer`](/Forge/docs/api/interfaces/SoundMixer). Every
sound plays through one of its [buses](/Forge/docs/api/interfaces/MixerBus),
and every bus feeds into another bus, up to the mixer's `master` bus. A
sound's volume is its own volume multiplied by the volume of each bus on
the way to `master`.

## Creating the mixer and buses

[`createSoundMixer`](/Forge/docs/api/functions/createSoundMixer) creates the
mixer with its `master` bus.
[`createBus`](/Forge/docs/api/interfaces/SoundMixer#createbus) adds a bus
for each group of sounds whose volume is set separately, for example music
and sound effects:

```ts
import { createSoundMixer } from '@forge-game-engine/forge/audio';

const mixer = createSoundMixer();
const music = mixer.createBus('music');
const sfx = mixer.createBus('sfx');
```

A bus feeds into `master` unless another bus is passed as its parent:
`mixer.createBus('footsteps', sfx)` creates a bus whose sounds also follow
the `sfx` volume. Bus names are unique within a mixer, and
[`getBus`](/Forge/docs/api/interfaces/SoundMixer#getbus) returns a bus by
its name.

## Setting volume and muting

Set a bus's `volume` or `muted` directly. The change applies to every sound
that plays through the bus, including sounds that are already playing:

```ts
music.volume = 0.5;
mixer.master.muted = true;
```

Muting a bus keeps its `volume`, so unmuting restores it.

`volume` is a linear gain from `0` (silent) to `1` (unchanged). Perceived
loudness isn't linear in gain, so a slider assigned straight to `volume`
changes little over its top half and a lot near the bottom. Map the
slider's position before assigning it, for example
`bus.volume = position * position`.

The mixer doesn't store settings. To keep volumes between sessions, store
them with the game's other settings (see
[Persistent State](../storage/persistent-state.md)) and assign them to the
buses when the game starts.

## Starting audio on the first click

Browsers don't play audio until the player has interacted with the page.
The mixer listens for the first click, tap or key press (other than
Escape) and starts audio then. Until that happens:

- A looping sound (music, ambience) starts, and is heard once audio runs.
- A non-looping sound is dropped, so sound effects requested before the
  first click don't all play at once when it happens.
- A sound played by the first click itself (a menu button, the first shot)
  plays.

If the browser already lets the page play audio, nothing is dropped.

When audio stops without the game suspending it, for example when Safari
interrupts it for a phone call, the mixer starts it again on the player's
next click, tap or key press.
[`state`](/Forge/docs/api/interfaces/SoundMixer#state) is `'suspended'`,
`'running'`, `'interrupted'` (Safari) or `'closed'`.

:::note
On iPhones and iPads, the hardware silent switch mutes the page's audio.
:::

## Pausing audio

[`suspend`](/Forge/docs/api/interfaces/SoundMixer#suspend) pauses all
audio and [`resume`](/Forge/docs/api/interfaces/SoundMixer#resume)
continues it from the same place. While the game has suspended audio, the
mixer doesn't start it again on a click.

Browsers stop the game loop of a hidden tab but keep its audio playing. To
silence the game while its tab is hidden, suspend on `visibilitychange`:

```ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    void mixer.suspend();
  } else {
    void mixer.resume();
  }
});
```

## Stopping the mixer

Call [`stop`](/Forge/docs/api/interfaces/SoundMixer#stop) when the game is
torn down, for example when a single-page app navigates away from it. It
stops every sound and closes the browser's audio context. A mixer that
isn't stopped keeps playing its sounds. A stopped mixer can't create buses
or play sounds; create a new one.
