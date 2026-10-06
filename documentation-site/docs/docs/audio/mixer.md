---
sidebar_position: 1
---

# The Sound Mixer

A [`SoundMixer`](/Forge/docs/api/interfaces/SoundMixer) owns a game's
`AudioContext` and the buses every sound plays through. A sound's loudness
is its own volume multiplied by the gain of every bus between it and the
`master` bus.

## Creating a mixer

Create one mixer per game with
[`createSoundMixer`](/Forge/docs/api/functions/createSoundMixer):

```ts
import { createSoundMixer } from '@forge-game-engine/forge/audio';

const mixer = createSoundMixer();
```

The mixer starts with one bus, `mixer.master`, connected to the speakers.

## Creating buses

[`createBus`](/Forge/docs/api/interfaces/SoundMixer#createbus) creates a
bus that feeds `master`, or the parent bus given as its second argument:

```ts
const music = mixer.createBus('music');
const sfx = mixer.createBus('sfx');
const footsteps = mixer.createBus('footsteps', sfx);
```

Bus names are unique within a mixer.
[`getBus`](/Forge/docs/api/interfaces/SoundMixer#getbus) returns a bus by
name, and throws if there's none.

## Setting a bus's volume

A bus's [`volume`](/Forge/docs/api/interfaces/MixerBus#volume) is a linear
gain: `0` is silent and `1` leaves the sound unchanged.

```ts
music.volume = 0.8;
```

The change applies to every sound playing through the bus and through the
buses that feed it. The gain moves to the new value over a few
milliseconds, so the change doesn't click.

A settings slider's value can be assigned to `volume` directly. To make a
slider sound evenly spaced to the ear, map its value through a curve (for
example `value * value`) before assigning it.

## Muting a bus

[`muted`](/Forge/docs/api/interfaces/MixerBus#muted) silences a bus and
leaves its `volume` as it is:

```ts
mixer.master.muted = true;
```

Setting `muted` back to `false` restores the bus's gain to `volume`.

## Unlocking audio

Browsers keep a page's audio suspended until the player has interacted
with it. The mixer listens on `window` for `pointerup`, `touchend`, `click`
and `keydown` (except Escape), and resumes the context on each one until
it's running.
[`state`](/Forge/docs/api/interfaces/SoundMixer#state) reports the
context's state.

The mixer also listens again whenever the context is suspended or
interrupted by anything other than
[`suspend`](/Forge/docs/api/interfaces/SoundMixer#suspend), for example
Safari during a phone call.

Before the player's first input,
[`playSound`](./playing-sounds.md#playing-a-sound) starts looping sounds
and drops non-looping ones. The sound played by the input that unlocks
audio plays.

:::note
On iOS, the device's silent switch also silences Web Audio.
:::

## Suspending and resuming

[`suspend`](/Forge/docs/api/interfaces/SoundMixer#suspend) suspends the
context: every sound keeps its position and is silent. While the game has
suspended the mixer, player input doesn't resume it.
[`resume`](/Forge/docs/api/interfaces/SoundMixer#resume) resumes it.

```ts
await mixer.suspend();
await mixer.resume();
```

The mixer doesn't suspend itself when the page is hidden. To silence a
game in a background tab, call `suspend` and `resume` from a
`visibilitychange` listener.

## Stopping the mixer

[`stop`](/Forge/docs/api/interfaces/SoundMixer#stop) stops every sound,
removes the mixer's input listeners and closes the context:

```ts
await mixer.stop();
```

The mixer and its buses can't be used after `stop`. Stopping a
[`Game`](/Forge/docs/api/classes/Game) doesn't stop the mixer.
