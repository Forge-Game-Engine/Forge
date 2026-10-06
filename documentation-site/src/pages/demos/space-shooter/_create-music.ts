import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSoundComponent,
  MixerBus,
  SoundAsset,
} from '@forge-game-engine/forge/audio';

export function createMusic(
  world: EcsWorld,
  music: SoundAsset,
  musicBus: MixerBus,
): void {
  const musicEntity = world.createEntity();

  // Looping, so it starts even before the player has pressed a key, and is
  // heard as soon as the browser lets the page play audio.
  addSoundComponent(world, musicEntity, {
    sound: music,
    bus: musicBus,
    loop: true,
    volume: 0.3,
  });
}
