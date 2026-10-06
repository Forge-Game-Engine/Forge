import {
  createSoundMixer,
  MixerBus,
  SoundAsset,
  SoundAssetCache,
  SoundMixer,
} from '@forge-game-engine/forge/audio';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export interface SpaceShooterAudio {
  mixer: SoundMixer;
  musicBus: MixerBus;
  sfxBus: MixerBus;
  sounds: SoundAssetCache;
}

export interface SpaceShooterSounds {
  music: SoundAsset;
  laser: SoundAsset;
  explosion: SoundAsset;
}

export const createAudio = (): SpaceShooterAudio => {
  const mixer = createSoundMixer();

  return {
    mixer,
    musicBus: mixer.createBus('music'),
    sfxBus: mixer.createBus('sfx'),
    sounds: new SoundAssetCache(mixer),
  };
};

export const loadSounds = async (
  sounds: SoundAssetCache,
): Promise<SpaceShooterSounds> => {
  const [music, laser, explosion] = await Promise.all([
    sounds.getOrLoad(getAssetUrl('audio/background-space-music.mp3')),
    sounds.getOrLoad(getAssetUrl('audio/laser.mp3')),
    sounds.getOrLoad(getAssetUrl('audio/explosion.mp3')),
  ]);

  return { music, laser, explosion };
};
