import React, { ChangeEvent, FC } from 'react';
import styles from './_GaussianBlurControls.module.css';

interface GaussianBlurControlsProps {
  enabled: boolean;
  passes: number;
  intensity: number;
  onEnabledChange: (value: boolean) => void;
  onPassesChange: (value: number) => void;
  onIntensityChange: (value: number) => void;
}

/**
 * Toggle and sliders that retune the space-shooter demo's background blur
 * effect live, by writing straight into the running
 * `GaussianBlurEcsComponent` (see `_create-game.ts`'s `onBlurReady`) the
 * same way the demo's bloom controls retune `BloomEcsComponent`.
 */
export const GaussianBlurControls: FC<GaussianBlurControlsProps> = ({
  enabled,
  passes,
  intensity,
  onEnabledChange,
  onPassesChange,
  onIntensityChange,
}) => {
  const handleEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    onEnabledChange(event.target.checked);
  };

  const handlePassesChange = (event: ChangeEvent<HTMLInputElement>) => {
    onPassesChange(Number(event.target.value));
  };

  const handleIntensityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onIntensityChange(Number(event.target.value));
  };

  return (
    <div className={styles.container}>
      <div className={styles.control}>
        <label htmlFor="blur-enabled">
          <span>Background blur</span>
        </label>
        <input
          id="blur-enabled"
          type="checkbox"
          checked={enabled}
          onChange={handleEnabledChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="blur-passes">
          <span>Blur passes</span>
          <span>{passes}</span>
        </label>
        <input
          id="blur-passes"
          type="range"
          min={0}
          max={10}
          step={1}
          value={passes}
          disabled={!enabled}
          onChange={handlePassesChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="blur-intensity">
          <span>Blur intensity</span>
          <span>{intensity.toFixed(2)}</span>
        </label>
        <input
          id="blur-intensity"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={intensity}
          disabled={!enabled}
          onChange={handleIntensityChange}
        />
      </div>
    </div>
  );
};
