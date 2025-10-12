---
sidebar_position: 1
---

# Audio

Forge uses [Howler.js](https://howlerjs.com/) for audio management, providing a powerful and easy-to-use audio system with support for multiple audio formats, spatial audio, and more.

## Overview

Audio in Forge is managed through the [`SoundComponent`](../../api/classes/SoundComponent.md) and [`AudioSystem`](../../api/classes/AudioSystem.md). Each entity with a `SoundComponent` can play sounds independently.

## Basic Usage

### Playing a Sound

```ts
import { SoundComponent, AudioSystem } from '@forge-game-engine/forge';

// Create an entity with a sound
const soundEntity = world.buildAndAddEntity('background-music', [
  new SoundComponent({
    src: ['audio/music.mp3'],
    loop: true,
    volume: 0.5
  }, true) // true = play immediately
]);

// Add the audio system to process sounds
world.addSystem(new AudioSystem());
```

### Playing Sound Effects

```ts
// Create a sound effect that plays once
const jumpSound = new SoundComponent({
  src: ['audio/jump.mp3'],
  volume: 0.8
});

// Add to entity
entity.addComponent(jumpSound);

// Trigger the sound in your game logic
const soundComponent = entity.getComponent(SoundComponent);
soundComponent.playSound = true;
```

## Sound Configuration

The `SoundComponent` accepts all [Howler.js options](https://github.com/goldfire/howler.js#documentation):

```ts
const soundComponent = new SoundComponent({
  // Source files (fallback chain for browser compatibility)
  src: ['audio/sound.mp3', 'audio/sound.ogg'],
  
  // Volume (0.0 to 1.0)
  volume: 0.7,
  
  // Playback rate (1.0 is normal speed)
  rate: 1.0,
  
  // Loop the sound
  loop: false,
  
  // Enable spatial/3D audio
  spatial: false,
  
  // Preload the audio file
  preload: true,
  
  // Audio sprite definitions (see below)
  sprite: {
    jump: [0, 500],
    shoot: [1000, 300]
  }
});
```

## Controlling Playback

### Play and Pause

```ts
const soundComp = entity.getComponent(SoundComponent);

// Play the sound
soundComp.playSound = true;

// Or control directly via Howl
soundComp.sound.play();
soundComp.sound.pause();
soundComp.sound.stop();

// Check if playing
if (soundComp.sound.playing()) {
  console.log('Sound is playing');
}
```

### Volume Control

```ts
const soundComp = entity.getComponent(SoundComponent);

// Set volume (0.0 to 1.0)
soundComp.sound.volume(0.5);

// Get current volume
const currentVolume = soundComp.sound.volume();

// Fade volume
soundComp.sound.fade(1.0, 0.0, 2000); // Fade from 1.0 to 0.0 over 2 seconds
```

### Playback Rate

```ts
// Change playback speed
soundComp.sound.rate(1.5); // 1.5x speed
soundComp.sound.rate(0.5); // Half speed
```

### Seeking

```ts
// Seek to position in seconds
soundComp.sound.seek(10);

// Get current position
const position = soundComp.sound.seek();
```

## Audio Sprites

Audio sprites allow you to play specific segments from a single audio file, useful for multiple short sound effects:

```ts
const soundComponent = new SoundComponent({
  src: ['audio/sfx-sprite.mp3'],
  sprite: {
    jump: [0, 500],      // Starts at 0ms, duration 500ms
    shoot: [600, 300],   // Starts at 600ms, duration 300ms
    explosion: [1000, 800]
  }
});

// Play specific sprite
soundComponent.sound.play('jump');
soundComponent.sound.play('shoot');
```

## Spatial Audio (3D Sound)

Create immersive 3D audio that responds to entity position:

```ts
import { SoundComponent, PositionComponent } from '@forge-game-engine/forge';

const spatial3DSound = new SoundComponent({
  src: ['audio/ambient.mp3'],
  volume: 1.0,
  loop: true,
  spatial: true,
  
  // Spatial audio settings
  pannerAttr: {
    panningModel: 'HRTF',
    refDistance: 1,
    rolloffFactor: 1,
    distanceModel: 'linear',
    maxDistance: 10000
  }
});

// The AudioSystem will automatically update 3D position 
// based on the entity's PositionComponent
entity.addComponent(new PositionComponent(100, 200));
entity.addComponent(spatial3DSound);
```

## Event Listeners

Howler provides events you can listen to:

```ts
const soundComp = new SoundComponent({
  src: ['audio/music.mp3']
});

// Listen for events
soundComp.sound.on('play', () => {
  console.log('Sound started playing');
});

soundComp.sound.on('end', () => {
  console.log('Sound finished');
});

soundComp.sound.on('pause', () => {
  console.log('Sound paused');
});

soundComp.sound.on('stop', () => {
  console.log('Sound stopped');
});

soundComp.sound.on('load', () => {
  console.log('Sound loaded');
});

soundComp.sound.on('loaderror', (id, error) => {
  console.error('Failed to load sound:', error);
});
```

## Complete Examples

### Background Music System

```ts
import { System, Entity, SoundComponent } from '@forge-game-engine/forge';

class MusicSystem extends System {
  private currentMusic: Entity | null = null;
  
  constructor() {
    super('music', []);
  }
  
  playMusic(musicPath: string, fadeInMs: number = 1000) {
    // Stop current music with fade
    if (this.currentMusic) {
      const oldMusic = this.currentMusic.getComponent(SoundComponent);
      oldMusic.sound.fade(oldMusic.sound.volume(), 0, fadeInMs);
      
      setTimeout(() => {
        this.world.removeEntity(this.currentMusic!);
      }, fadeInMs);
    }
    
    // Start new music
    this.currentMusic = this.world.buildAndAddEntity('music', [
      new SoundComponent({
        src: [musicPath],
        loop: true,
        volume: 0
      })
    ]);
    
    const musicComp = this.currentMusic.getComponent(SoundComponent);
    musicComp.sound.play();
    musicComp.sound.fade(0, 0.7, fadeInMs);
  }
  
  stop(fadeOutMs: number = 1000) {
    if (this.currentMusic) {
      const musicComp = this.currentMusic.getComponent(SoundComponent);
      musicComp.sound.fade(musicComp.sound.volume(), 0, fadeOutMs);
      
      setTimeout(() => {
        this.world.removeEntity(this.currentMusic!);
        this.currentMusic = null;
      }, fadeOutMs);
    }
  }
}

// Usage
const musicSystem = new MusicSystem();
world.addSystem(musicSystem);
world.addSystem(new AudioSystem());

musicSystem.playMusic('audio/level1-theme.mp3');
```

### Sound Effect System

```ts
import { System, SoundComponent, PositionComponent } from '@forge-game-engine/forge';

class SoundEffectSystem extends System {
  private sounds = new Map<string, HowlOptions>();
  
  constructor() {
    super('sound-effects', []);
  }
  
  registerSound(name: string, options: any) {
    this.sounds.set(name, options);
  }
  
  playSound(name: string) {
    const options = this.sounds.get(name);
    if (options) {
      const soundEntity = this.world.buildAndAddEntity(`sfx-${name}`, [
        new SoundComponent(options, true) // true = play immediately
      ]);
      
      // Remove entity when sound finishes
      const sound = soundEntity.getComponent(SoundComponent);
      sound.sound.once('end', () => {
        this.world.removeEntity(soundEntity);
      });
    }
  }
  
  playSoundAt(name: string, x: number, y: number) {
    const options = this.sounds.get(name);
    if (options) {
      const soundEntity = this.world.buildAndAddEntity(`sfx-${name}`, [
        new PositionComponent(x, y),
        new SoundComponent(options, true)
      ]);
      
      const sound = soundEntity.getComponent(SoundComponent);
      sound.sound.once('end', () => {
        this.world.removeEntity(soundEntity);
      });
    }
  }
}

// Usage
const sfxSystem = new SoundEffectSystem();
world.addSystem(sfxSystem);
world.addSystem(new AudioSystem());

sfxSystem.registerSound('jump', { src: ['audio/jump.mp3'] });
sfxSystem.registerSound('shoot', { src: ['audio/shoot.mp3'] });

// Play sounds from within other systems
sfxSystem.playSound('jump');
sfxSystem.playSoundAt('shoot', 100, 200);
```

### Dynamic Audio Based on Game State

```ts
import { System, Entity } from '@forge-game-engine/forge';

class DynamicMusicSystem extends System {
  constructor() {
    super('dynamic-music', [SoundComponent.symbol, HealthComponent.symbol]);
  }
  
  run(entity: Entity) {
    const sound = entity.getComponent(SoundComponent);
    const health = entity.getComponent(HealthComponent);
    
    // Adjust music based on health
    if (health.current < 20) {
      // Low health - play faster and louder
      sound.sound.rate(1.2);
      sound.sound.volume(0.9);
    } else {
      // Normal playback
      sound.sound.rate(1.0);
      sound.sound.volume(0.7);
    }
  }
}
```

## Audio Formats

For best browser compatibility, provide multiple audio formats:

```ts
const sound = new SoundComponent({
  src: [
    'audio/sound.mp3',  // Primary format
    'audio/sound.ogg',  // Fallback for Firefox
    'audio/sound.webm'  // Fallback for Chrome
  ]
});
```

Supported formats: MP3, OGG, WAV, AAC, M4A, WebM, FLAC

## Best Practices

- **Use audio sprites** for multiple short sound effects to reduce HTTP requests
- **Preload critical sounds** during loading screens
- **Provide fallback formats** for cross-browser compatibility
- **Manage volume levels** appropriately (music lower than SFX)
- **Clean up sound entities** when no longer needed
- **Use spatial audio** for immersive 3D experiences
- **Fade music transitions** for smooth audio changes
- **Pool sound effects** that play frequently
- **Optimize file sizes** - compress audio files appropriately
- **Consider mobile** - audio autoplay policies vary by platform

## Performance Tips

- Keep audio files small (compress appropriately)
- Use audio sprites instead of many small files
- Unload unused audio to free memory
- Limit the number of simultaneous sounds
- Use lower sample rates for non-critical sounds (22kHz for SFX, 44kHz for music)

## See Also

- [SoundComponent API](../../api/classes/SoundComponent.md)
- [AudioSystem API](../../api/classes/AudioSystem.md)
- [Howler.js Documentation](https://github.com/goldfire/howler.js#documentation)
