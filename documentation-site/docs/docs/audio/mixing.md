---
sidebar_position: 2
---

# Mixing with Audio Buses

Most games let players set the music and sound effects volumes separately,
on top of a master volume and a mute switch. An
[`AudioBus`](/Forge/docs/api/interfaces/AudioBus) is one channel of that
mix: a `volume`, a `muted` flag, and the `parent` bus it mixes into. Each
[`AudioEcsComponent`](/Forge/docs/api/interfaces/AudioEcsComponent) names
the bus its sound plays through, and
[`createAudioEcsSystem`](/Forge/docs/api/functions/createAudioEcsSystem)
plays it at the component's `volume` times the volume of its bus and of
every bus above it, or silences it while any of them is muted. This is the
same model as Unity's audio mixer groups and Godot's audio buses.

## Building a mix

Create the buses once, when the game starts. A typical tree is a master bus
with one child per kind of sound:

```ts
import {
  addAudioComponent,
  createAudioBus,
  createAudioEcsSystem,
} from '@forge-game-engine/forge/audio';
import { Howl } from 'howler';

const master = createAudioBus();
const music = createAudioBus({ parent: master });
const effects = createAudioBus({ parent: master });

world.addSystem(createAudioEcsSystem());

addAudioComponent(world, world.createEntity(), {
  sound: new Howl({ src: ['theme.mp3'], loop: true }),
  volume: 0.3,
  bus: music,
  playSound: true,
});
```

`volume` on the component balances sounds against each other (the music
quieter than an explosion); a bus's `volume` is the player's setting for a
whole group. A component with no `bus` plays at its own `volume` alone,
untouched by any setting, so route every sound through a bus once a game has
volume settings.

## Changing volumes

Buses are plain data: bind a settings menu straight to their fields.

```ts
musicSlider.onValueChanged.registerListener((value) => {
  music.volume = value / 100;
});

muteToggle.onValueChanged.registerListener((isOn) => {
  master.muted = isOn;
});
```

The audio system applies the change on its next update to every sound
playing through the bus, including music that's already playing. Muting
keeps each bus's `volume`, so the mix comes back as it was once `muted` is cleared. Read a
bus's resulting volume with
[`getEffectiveBusVolume`](/Forge/docs/api/functions/getEffectiveBusVolume).

## Saving settings

The engine doesn't store volume settings. Save the fields you expose and
put them back when the game starts:

```ts
const saveSettings = (): void => {
  localStorage.setItem(
    'audio-settings',
    JSON.stringify({ music: music.volume, muted: master.muted }),
  );
};
```

Read them back with a fallback for anything missing or malformed, since
storage can be empty, blocked, or written by an older version of the game.
