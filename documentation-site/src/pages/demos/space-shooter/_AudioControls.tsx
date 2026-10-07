import React, { ChangeEvent, FC } from 'react';
import styles from './_GaussianBlurControls.module.css';

interface AudioControlsProps {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  onMusicVolumeChange: (value: number) => void;
  onSfxVolumeChange: (value: number) => void;
  onMutedChange: (value: boolean) => void;
}

/**
 * Sliders and a mute toggle for the space-shooter demo's sound, writing
 * straight into the mixer's buses (see `_create-game.ts`): the music and
 * sound effect buses' `volume`, and the master bus's `muted`.
 */
export const AudioControls: FC<AudioControlsProps> = ({
  musicVolume,
  sfxVolume,
  muted,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onMutedChange,
}) => {
  const handleMutedChange = (event: ChangeEvent<HTMLInputElement>) => {
    onMutedChange(event.target.checked);
  };

  const handleMusicVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onMusicVolumeChange(Number(event.target.value));
  };

  const handleSfxVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSfxVolumeChange(Number(event.target.value));
  };

  return (
    <div className={styles.container}>
      <div className={styles.control}>
        <label htmlFor="audio-muted">
          <span>Mute</span>
        </label>
        <input
          id="audio-muted"
          type="checkbox"
          checked={muted}
          onChange={handleMutedChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="audio-music-volume">
          <span>Music volume</span>
          <span>{musicVolume.toFixed(2)}</span>
        </label>
        <input
          id="audio-music-volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={musicVolume}
          disabled={muted}
          onChange={handleMusicVolumeChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="audio-sfx-volume">
          <span>Effects volume</span>
          <span>{sfxVolume.toFixed(2)}</span>
        </label>
        <input
          id="audio-sfx-volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sfxVolume}
          disabled={muted}
          onChange={handleSfxVolumeChange}
        />
      </div>
    </div>
  );
};
