import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSoundComponent,
  MixerBus,
  SoundAsset,
} from '@forge-game-engine/forge/audio';

// The music belongs to its own entity, so it plays for as long as the
// entity has its sound component and stops when the world does.
export function createMusic(
  world: EcsWorld,
  musicBus: MixerBus,
  music: SoundAsset,
): void {
  const musicEntity = world.createEntity();

  addSoundComponent(world, musicEntity, {
    sound: music,
    bus: musicBus,
    loop: true,
    volume: 0.3,
  });
}
