import { Howl } from 'howler';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { audioId } from '@forge-game-engine/forge/audio';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export function createMusic(world: EcsWorld): void {
  const musicEntity = world.createEntity();

  world.addComponent(musicEntity, audioId, {
    sound: new Howl({
      src: getAssetUrl('audio/background-space-music.mp3'),
      loop: true,
      volume: 0.3,
    }),
    playSound: true,
  });
}
