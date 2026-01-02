import { World } from '@forge-game-engine/forge/ecs';
import { AudioComponent } from '@forge-game-engine/forge/audio';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export function createMusic(world: World): void {
  world.buildAndAddEntity([
    new AudioComponent(
      {
        src: getAssetUrl('audio/background-space-music.mp3'),
        loop: true,
        volume: 0.5,
      },
      true,
    ),
  ]);
}
