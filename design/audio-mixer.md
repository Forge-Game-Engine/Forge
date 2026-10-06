# Design: Audio Mixer, Clips and Sound Playback

|                                       |                                                                                                                                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                                       |
| **Kind**                              | Missing feature                                                                                                                                                                                                                         |
| **Found in**                          | Galactic Journey demo: `src/audio/audio-mixer.ts`, `src/speed/create-speed-sounds.ts`, `src/explosions/create-explosions.ts`, `src/gun/gun.system.ts`, `src/enemy/enemy.system.ts`, `src/music/create-music.ts`, `src/main-menu/create-settings-panel.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                |
| **Related**                           | [`demo-findings.md`](./demo-findings.md), [`persistent-preferences.md`](./persistent-preferences.md), [`generational-entity-ids.md`](./generational-entity-ids.md)                                                                      |

## 0. Targeted modules

| Path                                                | Change      | Notes                                                                                                       |
| --------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `src/audio/audio-mixer.ts`                          | **New**     | `createAudioMixer`: owns the browser `AudioContext`, the bus tree, and unlocking playback on first input    |
| `src/audio/audio-bus.ts`                            | **New**     | `AudioBus`: a named, nestable volume/mute stage                                                             |
| `src/audio/audio-clip.ts`                           | **New**     | `AudioClip`, `createAudioClip` (from PCM samples)                                                           |
| `src/asset-loading/asset-caches/audio-clip-cache.ts` | **New**     | `AudioClipCache`: loads and decodes clips once, like `ImageCache`                                           |
| `src/audio/play-sound.ts`                           | **New**     | `playSound`: one-shot or controllable playback, no entity required                                          |
| `src/audio/components/audio-source-component.ts`    | **New**     | `AudioSourceEcsComponent`: a sound that lives as long as its entity                                         |
| `src/audio/systems/audio-system.ts`                 | Modified    | Rewritten to reconcile `AudioSourceEcsComponent`s, including stopping sources whose entity was removed      |
| `src/audio/components/audio-component.ts`           | **Removed** | `AudioEcsComponent` (`sound: Howl`, `playSound`) is replaced by `AudioSourceEcsComponent` and `playSound`   |
| `package.json`                                      | Modified    | `howler` peer dependency and `@types/howler` dev dependency removed                                         |
| `documentation-site/docs/docs/audio/`               | Modified    | Rewritten around clips, buses, `playSound` and audio sources                                                |
| `documentation-site/src/pages/demos/space-shooter/` | Modified    | The only docs-site demo that uses audio                                                                     |
| `AGENTS.md`                                         | Modified    | Project overview and peer-dependency notes stop mentioning Howler                                          |

---

## 1. Summary

Forge's audio module is a thin wrapper around Howler.js: an
`AudioEcsComponent` holds a `Howl` and a `playSound` flag, and
`createAudioEcsSystem` calls `play()` when the flag is set. There's no way
to group sounds, set a volume for a group, mute, or play a sound without
building an entity for it.

The demo built all of that itself:

- **A mixer** (`src/audio/audio-mixer.ts`, 139 lines): music and sound
  effect categories under a master volume, a mute switch that keeps the
  volumes, every `Howl` created through it so its volume can be rescaled
  whenever a setting changes, and a set of all live `Howl`s pruned as they
  unload.
- **One-shot sounds as entities**: every explosion creates a second entity
  carrying only an `AudioEcsComponent`, a 6-second `LifetimeEcsComponent`
  and a removal tag (`explosions/create-explosions.ts`), because the clip
  is longer than the explosion's sprite. The speed-change "whoosh" does the
  same with a 0.55-second lifetime (`speed/create-speed-sounds.ts`). The
  gun puts its laser sound on the bullet entity.
- **Procedural sound through a data URL**: the whoosh is synthesized as
  PCM samples, encoded into a 16-bit WAV file by hand, base64-encoded into
  a `data:` URL, and handed to Howler, which decodes it straight back into
  samples (`speed/create-speed-sounds.ts`, 90 of its 138 lines).
- **A sound per system instance**: the gun and enemy systems create their
  own `Howl` "so each game restart gets its own Howl, since the audio
  system unloads any sound still playing when the world stops"
  (`gun/gun.system.ts`, `enemy/enemy.system.ts`).

This design gives Forge a mixer of its own, built on the Web Audio API
that Howler itself uses underneath:

- **Buses**: named stages with a volume and a mute flag, nested under a
  master bus. Every sound plays through one.
- **Clips**: decoded audio, loaded once through a cache like images, or
  created directly from PCM samples.
- **`playSound`**: plays a clip on a bus, overlapping freely, and returns
  a handle to stop it or change its volume. No entity needed.
- **`AudioSourceEcsComponent`**: a sound that belongs to an entity, and
  stops when the entity (or the component) is removed.

Howler is removed as a dependency.

---

## 2. Scope

### In scope

- A mixer object owning the browser's `AudioContext` and the master bus,
  and resuming the context on the first user gesture (browsers start audio
  suspended until then).
- Nestable buses with `volume` and `muted`.
- `AudioClip` loading and caching, and creating a clip from PCM samples.
- `playSound` with per-play volume, playback rate and looping, returning a
  handle.
- `AudioSourceEcsComponent` and a rewritten `createAudioEcsSystem` that
  stops a source when its entity or component is removed.
- Removing Howler, `AudioEcsComponent` and the old system behavior, and
  migrating the space-shooter docs demo, the audio guides and AGENTS.md.

### Out of scope

- **Saving the player's volume settings.** The mixer exposes the values; a
  game stores them where it stores other settings. See
  [`persistent-preferences.md`](./persistent-preferences.md).
- **Positional (panned or attenuated) audio.** A natural follow-up once
  sources are entity-bound (see Phase 2), not needed by the demo.
- **Effects on buses** (filters, reverb, compression, ducking). A bus is
  built so an effect chain can be inserted later, but none ships here.
- **Voice limiting** (a cap on simultaneous instances of a clip). See open
  question 3.
- **Pausing audio while the page is hidden.** That's a game decision; the
  mixer exposes `suspend()`/`resume()` for it (see open question 4).

---

## 3. Background

### 3.1 What Forge has

```ts
export interface AudioEcsComponent {
  sound: Howl; // a Howler sound
  playSound: boolean; // set true to play on the next tick
}
```

`createAudioEcsSystem` (`src/audio/systems/audio-system.ts`) plays a sound
when `playSound` is set and resets the flag. Its `cleanup` stops and
_unloads_ every sound still playing when the world stops. The guide
(`audio/playing-sounds.md`) warns that removing an entity does nothing to
its sound, and that callers must stop and unload it themselves.

So the engine has:

- no grouping, and so no volume or mute per group. Howler has a global
  volume and mute and a per-`Howl` volume, nothing in between;
- no notion of a clip separate from its playback: a `Howl` is both the
  decoded audio and the player, and unloading it on world stop breaks any
  other entity sharing it, which is why the demo creates `Howl`s per
  system instance;
- no way to play a sound except through an entity and a flag;
- no way to play audio that wasn't loaded from a URL.

### 3.2 What the demo built, and why each part is general

| Demo code                                                                     | What it really needs                                          | General?                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| `createAudioMixer`: master, music, sfx, mute; rescales every `Howl` on change | Buses with volume and mute                                    | Every game with a settings screen                          |
| `createSound(category, options)` tracks each `Howl`                            | Sounds routed to a bus, so changes apply to all of them       | Same                                                       |
| Explosion and whoosh sounds on throwaway entities with lifetimes             | Fire-and-forget playback                                      | Every game with sound effects                              |
| WAV encoder + base64 data URL for the synthesized whoosh                     | A clip made from samples                                      | Procedural audio, audio generated at runtime               |
| `Howl` per system "since the audio system unloads any sound still playing"   | Clips that outlive one playback and one world                 | Any shared sound                                           |
| Laser sound on the bullet entity                                             | (Accidental) Today removing the bullet leaves its sound alone | Sounds that should stop with their entity are also general |

Only the choice of buses (music and sfx), the default volumes, and saving
them in `localStorage` are specific to the game.

---

## 4. How established engines handle this

| Engine        | Grouping                                                             | Asset vs. playback                                                   | One-shots                                              |
| ------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| **Unity**     | `AudioMixer` asset with nested groups, volume in dB, snapshots       | `AudioClip` asset; `AudioSource` plays it                            | `AudioSource.PlayOneShot`, overlapping                 |
| **Godot**     | `AudioServer` buses (Master plus named buses), volume in dB, mute   | `AudioStream` resource; `AudioStreamPlayer` plays it, `bus` property | Instance a player, or `max_polyphony` on one           |
| **Bevy**      | `GlobalVolume` built in; buses ("tracks") via the Kira-based plugin | `AudioSource` asset; an entity with `AudioPlayer` plays it           | Spawn an entity whose playback mode despawns it        |
| **Web Audio** | `GainNode`s connected into a tree ending at the destination         | `AudioBuffer`; one-use `AudioBufferSourceNode` per playback          | Create and start a source node; they're cheap          |

The shared model: a **clip** is decoded once and shared; each playback is
a cheap **instance**; instances feed **buses** arranged in a tree under a
**master**; bus volume and mute apply to everything routed through them,
including sounds already playing.

Web Audio is that model natively. A bus is a `GainNode`, and connecting
nodes builds the tree. That's why this design builds on Web Audio directly
rather than on Howler, which hides the graph behind a per-sound API with
one global volume.

---

## 5. Design

### 5.1 The audio graph

```mermaid
flowchart LR
  clip[(AudioClip<br/>decoded AudioBuffer)]
  subgraph instance["one playSound() call"]
    src[AudioBufferSourceNode<br/>rate, loop] --> ig[GainNode<br/>instance volume]
  end
  clip --> src
  ig --> sfx[Bus: sfx<br/>GainNode]
  ig2[...more instances] --> music[Bus: music<br/>GainNode]
  sfx --> master[Bus: master<br/>GainNode]
  music --> master
  master --> dest[AudioContext.destination]
```

A bus's gain is `muted ? 0 : volume`. Effective loudness is the product of
the instance's volume and every bus gain up to the master, which Web Audio
computes for free.

### 5.2 API

```ts
import {
  addAudioSourceComponent,
  createAudioClip,
  createAudioEcsSystem,
  createAudioMixer,
  playSound,
} from '@forge-game-engine/forge/audio';
import { AudioClipCache } from '@forge-game-engine/forge/asset-loading';

// Once per game, like the render context.
const mixer = createAudioMixer();

const music = mixer.createBus('music'); // a child of mixer.master
const sfx = mixer.createBus('sfx');

music.volume = 0.8;
mixer.master.muted = true; // keeps every volume as it was

// Clips are assets: loaded and decoded once, then shared.
const clips = new AudioClipCache(mixer);
const laser = await clips.getOrLoad(laserUrl);

// Fire and forget: overlapping instances are fine.
playSound(mixer, laser, { bus: sfx, volume: 0.1 });

// The same clip, pitched down and quieter, for enemies.
playSound(mixer, laser, { bus: sfx, volume: 0.06, rate: 0.6 });

// A handle, for sounds the game wants to stop or fade itself.
const theme = playSound(mixer, themeClip, { bus: music, loop: true });
theme.volume = 0.3;
theme.stop();

// A clip made from samples, no file involved.
const whoosh = createAudioClip(mixer, {
  sampleRate: 44100,
  channels: [samples], // Float32Array per channel, in [-1, 1]
});
```

#### `AudioMixer`

```ts
interface AudioMixer {
  /** The root bus; everything ends up here. */
  readonly master: AudioBus;
  /** Creates a bus under `parent` (default: `master`). Names are unique. */
  createBus(name: string, parent?: AudioBus): AudioBus;
  getBus(name: string): AudioBus;
  /** `'suspended'` until the first user gesture, then `'running'`. */
  readonly state: 'suspended' | 'running' | 'closed';
  suspend(): Promise<void>;
  resume(): Promise<void>;
}
```

`createAudioMixer()` creates the browser `AudioContext` and listens,
once, for the first `pointerdown`, `keydown` or `touchend` on the window
to resume it. Browsers refuse to start audio before a user gesture, and
Howler did this unlocking automatically today, so it has to be kept.

#### `AudioBus`

```ts
interface AudioBus {
  readonly name: string;
  readonly parent: AudioBus | null;
  /** Linear gain, 0 (silent) to 1 (unchanged). */
  volume: number;
  /** Silences the bus without changing `volume`. */
  muted: boolean;
}
```

Setting `volume` or `muted` ramps the bus's gain over a few milliseconds
(`setTargetAtTime`) instead of jumping, which avoids an audible click on
sounds already playing. Volume is linear gain, matching how games store a
slider's value; converting a slider to a perceptual curve is the game's
choice (see open question 2).

#### `AudioClip`

```ts
interface AudioClip {
  readonly buffer: AudioBuffer;
  readonly durationSeconds: number;
}
```

`AudioClipCache` implements the existing `AssetCache<T>` interface used by
`ImageCache` and `FontAtlasCache` (`get`, `load`, `getOrLoad`), fetching
and decoding with `decodeAudioData`.

`createAudioClip(mixer, { sampleRate, channels })` builds an `AudioBuffer`
directly from `Float32Array`s. The demo's whoosh becomes its synthesis
loop plus one call; the WAV encoder and data URL go away.

#### `playSound`

```ts
interface PlaySoundOptions {
  bus: AudioBus;
  /** Instance gain, multiplied with the bus chain. Default 1. */
  volume?: number;
  /** Playback rate; also shifts pitch. Default 1. */
  rate?: number;
  /** Default false. */
  loop?: boolean;
}

interface SoundInstance {
  volume: number;
  readonly isPlaying: boolean;
  stop(): void;
}

function playSound(
  mixer: AudioMixer,
  clip: AudioClip,
  options: PlaySoundOptions,
): SoundInstance;
```

`bus` is required. Every sound has to land somewhere the player's settings
can reach, and a default bus would make "forgot to pick the sfx bus" a
silent bug where the sound ignores the sfx slider.

#### `AudioSourceEcsComponent`

For a sound that belongs to an entity: an engine's hum, a looping alarm on
a pickup, music owned by a scene's root.

```ts
interface AudioSourceEcsComponent {
  clip: AudioClip;
  bus: AudioBus;
  volume: number; // default 1
  rate: number; // default 1
  loop: boolean; // default false
  /** Whether it should be audible. The game writes this; the system follows it. */
  paused: boolean; // default false
}
```

`createAudioEcsSystem(mixer)` reconciles each source with its playing
instance every tick:

- a source with no instance, not `paused`, that hasn't finished: start
  one;
- `paused` changed: stop or restart its instance;
- `volume`/`rate` changed: apply to the instance;
- a non-looping instance that finished: leave the component in place and
  start nothing (the system records that it finished; it never writes
  back to the component, so the game stays the only writer of its
  fields);
- a component or entity that's gone since last tick (the system keeps a
  map of the instances it started, keyed by component): stop the
  instance. This is the behavior the old guide told callers to implement
  by hand.

`cleanup` stops every instance the system started. Clips aren't touched:
they belong to the cache, not to a world, so a restarted world can play
them again. That removes the reason the demo creates a `Howl` per system.

### 5.3 What the demo looks like afterwards

```ts
// create-game.ts
const mixer = createAudioMixer();
const music = mixer.createBus('music');
const sfx = mixer.createBus('sfx');

// settings panel: sliders and the mute toggle write the buses directly
onValueChanged.registerListener((value) => {
  music.volume = value;
});

// explosion: no second entity, no lifetime guess
playSound(mixer, explosionClip, { bus: sfx, volume: 0.12 });
```

`audio-mixer.ts` shrinks to loading and saving the three volumes and the
mute flag. The explosion and speed-sound entities, their lifetimes and
removal tags, the WAV encoder and the per-system clip creation all go.

### 5.4 Suspended context and late sounds

Until the first gesture, the context is suspended and nothing is audible.
`playSound` while suspended:

- for a looping sound (music, ambience): starts it, so it's audible as soon
  as the context resumes, from the beginning;
- for a non-looping sound: returns a handle whose `isPlaying` is `false`,
  and plays nothing. A sound effect that fires before the player has
  touched anything (an explosion during an attract loop) must not be
  replayed late, all at once, on the first click.

### 5.5 Performance

- An `AudioBufferSourceNode` plus a `GainNode` per playback is the
  standard Web Audio pattern: both are lightweight, one-use objects that
  the browser collects once they finish.
- Decoding happens once per clip. The demo decodes its music today as
  well (Howler's default is to decode fully), so memory use is unchanged.
  Streaming long tracks is open question 1.
- Bus volume changes cost one parameter ramp, however many sounds are
  playing. The demo's mixer loops over every live `Howl`.

---

## 6. Phases

### Phase 1: The mixer replaces the Howler wrapper

One phase, because shipping the mixer next to the Howler-based component
would leave a release where some sounds ignore the buses. The work splits
into reviewable PRs (1.1-1.4, then 1.5-1.7, then 1.8-1.10), merged
together before a release.

| #    | Task                                                                                                            | Size |
| ---- | --------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1  | `createAudioMixer`: `AudioContext`, master bus, first-gesture resume, `suspend`/`resume`                        | M    |
| 1.2  | `AudioBus` with ramped `volume`/`muted`, nesting, unique names, `getBus`                                         | S    |
| 1.3  | `AudioClip`, `AudioClipCache` (fetch + `decodeAudioData`), `createAudioClip` from samples                        | M    |
| 1.4  | `playSound` and `SoundInstance`, including the suspended-context rule (§5.4)                                    | M    |
| 1.5  | `AudioSourceEcsComponent`, `addAudioSourceComponent`                                                           | S    |
| 1.6  | Rewrite `createAudioEcsSystem(mixer)`: reconcile, stop on removal, `cleanup` stops instances only                | M    |
| 1.7  | Unit tests against a small fake `AudioContext` (graph wiring, gains, suspended behavior, stop on removal)       | M    |
| 1.8  | e2e: `OfflineAudioContext` render of two buses, asserting relative levels                                       | M    |
| 1.9  | Remove `AudioEcsComponent`, the Howler peer dependency and `@types/howler`                                       | S    |
| 1.10 | Migrate the space-shooter docs demo; rewrite `audio/index.md` and `audio/playing-sounds.md`; update AGENTS.md    | M    |
| 1.11 | Changelog under `#### Changed`/`#### Removed`, saying what replaces `AudioEcsComponent` and that Howler is gone  | S    |

**Definition of done:** a game can create buses, load or synthesize
clips, play overlapping sounds through them, and change bus volume and
mute while they play; removing an entity stops its source; a world can be
stopped and restarted without reloading clips; Forge has no Howler
dependency; the docs demo and guides use the new API; `npm run build` and
the docs-site build pass.

### Phase 2 (future, not designed here): positional audio

Pan and attenuate entity-bound sources by their position relative to a
listener entity (usually the camera), using `StereoPannerNode`. Listed so
the bus and source shapes above leave room for it: the instance chain
gains one node between the instance gain and the bus.

---

## 7. Decision log

### DL-1: Build on Web Audio directly instead of Howler

**Options.** (a) Keep Howler and build buses on top by tracking every
`Howl` (the demo's approach). (b) Keep Howler and reach into its internal
Web Audio nodes to insert bus gains. (c) Use the Web Audio API directly.

**Decision: (c).**

**Rationale.** Buses are what the Web Audio graph is: (a) re-implements
mixing in JavaScript and loops over every sound on each change; (b)
depends on Howler internals. Howler's remaining value is its HTML5 Audio
fallback for browsers without Web Audio, and every browser that runs
WebGL 2 (which Forge requires) has Web Audio. Removing it also removes a
peer dependency every Forge game currently has to install.

**Trade-off.** Forge takes on the unlock-on-gesture handling and decoding
that Howler did. Both are a few dozen lines against standard APIs.

### DL-2: Fire-and-forget playback without entities

**Options.** (a) One-shots are entities that remove themselves when the
sound ends (Bevy's model). (b) A `playSound` function returning a handle,
plus entity-bound sources for sounds that belong to an entity.

**Decision: (b).**

**Rationale.** The demo's one-shots don't need any other component: the
entity exists only to carry the sound and a guessed lifetime. A function
call says what's happening and allocates nothing in the world. Sounds that
_do_ belong to an entity get the component, and stop with it, which is the
case (a) handles well and (b) still covers.

### DL-3: A bus is required for every sound

**Options.** (a) Default to `master`. (b) Require `bus`.

**Decision: (b).**

**Rationale.** A sound played without a bus by mistake would ignore the
player's music or sfx setting with no error. Requiring it costs one field
per call and makes the routing visible where the sound is played.

### DL-4: Linear volume, not decibels

**Options.** (a) Linear gain 0-1. (b) Decibels, as Unity and Godot use.

**Decision: (a).**

**Rationale.** A settings slider's value is naturally 0-1, and that's what
the demo stores. Decibels suit mixing engineers and a mixer UI, which
Forge doesn't have. A game that wants a perceptual slider can map the
slider value before assigning it (see open question 2).

### DL-5: Non-looping sounds requested before audio is unlocked are dropped

**Options.** (a) Queue them and play on resume. (b) Drop them; start loops.

**Decision: (b).**

**Rationale.** (a) plays a burst of stale effects on the player's first
click. Loops are state (music should be playing), so starting them is
right; one-shots are events, and an event the player couldn't hear is
over.

### DL-6: The audio system never writes back to `AudioSourceEcsComponent`

**Options.** (a) The system sets `paused = true` (or a `playing` flag)
when a non-looping clip ends. (b) The system tracks finished instances
privately.

**Decision: (b).**

**Rationale.** One writer per value: the game owns `paused`. If the
system also wrote it, a game setting `paused = false` on the same tick
that a sound ended would race with it.

---

## 8. Open questions

1. **Streaming long tracks.** Decoding a three-minute stereo track holds
   tens of megabytes of samples. A streamed clip would play an `<audio>`
   element through a `MediaElementAudioSourceNode` into the same bus.
   - (a) Add a streamed clip kind in Phase 1. (b) Defer until a game needs
     it (proposed: the demo's music decodes fine today, as it already
     does under Howler).
2. **Perceptual volume helpers.** Should Forge ship
   `decibelsToGain`/`gainToDecibels` (or a slider curve helper)?
   - (a) Add to `math`. (b) Leave to games (proposed until a second game
     asks).
3. **Voice limiting.** A rapid-fire gun can stack dozens of instances of
   one clip.
   - (a) `maxInstances` per clip, stealing the oldest. (b) Leave it to the
     game (proposed: the demo's fire rate stays well below where this
     matters).
4. **Page visibility.** Browsers throttle the game loop in a hidden tab but
   keep Web Audio running, so music keeps playing over a paused game.
   - (a) The mixer suspends on `visibilitychange` automatically. (b)
     Games call `suspend`/`resume` themselves (proposed: muting a tab in
     the background is a product decision, and some games want music to
     continue).

---

## 9. Testing considerations

- jsdom has no Web Audio, so unit tests inject a minimal fake
  `AudioContext` (gain nodes record their connections and values, source
  nodes record `start`/`stop`). `createAudioMixer` takes the context as an
  argument for this, defaulting to a new `AudioContext`. That's ordinary
  dependency injection, not a test-only mode.
- An e2e test can render a scene's audio through an `OfflineAudioContext`
  and compare levels relative to each other (a muted bus is silent, a bus
  at half volume is half the amplitude of one at full volume), following
  the same "relative, same-run measurement" rule as the rendering e2e
  tests.
- System tests: removing an entity stops its source on the next tick;
  `world.stop()` stops instances but a clip still plays afterwards.

## 10. Documentation and migration

- Rewrite `audio/index.md` and `audio/playing-sounds.md` around buses,
  clips, `playSound` and sources. Remove the cleanup caution, since the
  system now handles it.
- Changelog: `AudioEcsComponent` and `addAudioComponent` are replaced by
  `playSound` (for one-shots) and `AudioSourceEcsComponent` (for sounds
  that belong to an entity); `createAudioEcsSystem` now takes the mixer;
  `howler` is no longer a dependency, so games can uninstall it.
- The demo's own `audio-mixer.ts` keeps only its saved-settings code;
  `create-speed-sounds.ts` drops its WAV encoder.
