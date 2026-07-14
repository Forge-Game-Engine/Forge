import React, { ChangeEvent, FC } from 'react';
import styles from './_BloomControls.module.css';

interface BloomControlsProps {
  enabled: boolean;
  threshold: number;
  passes: number;
  intensity: number;
  onEnabledChange: (value: boolean) => void;
  onThresholdChange: (value: number) => void;
  onPassesChange: (value: number) => void;
  onIntensityChange: (value: number) => void;
}

/**
 * Toggle and sliders that retune the space-shooter demo's bloom effect
 * live, by writing straight into the running `BloomEcsComponent` (see
 * `_create-game.ts`'s `onBloomReady`) the same way the demo's own blur and
 * camera shake systems retune their components at runtime.
 */
export const BloomControls: FC<BloomControlsProps> = ({
  enabled,
  threshold,
  passes,
  intensity,
  onEnabledChange,
  onThresholdChange,
  onPassesChange,
  onIntensityChange,
}) => {
  const handleEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    onEnabledChange(event.target.checked);
  };

  const handleThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onThresholdChange(Number(event.target.value));
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
        <label htmlFor="bloom-enabled">
          <span>Bloom</span>
        </label>
        <input
          id="bloom-enabled"
          type="checkbox"
          checked={enabled}
          onChange={handleEnabledChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="bloom-threshold">
          <span>Bloom threshold</span>
          <span>{threshold.toFixed(2)}</span>
        </label>
        <input
          id="bloom-threshold"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={threshold}
          disabled={!enabled}
          onChange={handleThresholdChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="bloom-passes">
          <span>Bloom passes</span>
          <span>{passes}</span>
        </label>
        <input
          id="bloom-passes"
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
        <label htmlFor="bloom-intensity">
          <span>Bloom intensity</span>
          <span>{intensity.toFixed(2)}</span>
        </label>
        <input
          id="bloom-intensity"
          type="range"
          min={0}
          max={50}
          step={0.1}
          value={intensity}
          disabled={!enabled}
          onChange={handleIntensityChange}
        />
      </div>
    </div>
  );
};
