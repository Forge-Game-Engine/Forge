import React, { ChangeEvent, FC } from 'react';
import {
  AnchorPlaygroundPresetName,
  anchorPlaygroundPresetNames,
} from './_create-anchor-playground';
import styles from './_PlaygroundControls.module.css';

interface PlaygroundControlsProps {
  presetName: AnchorPlaygroundPresetName;
  anchoredPositionX: number;
  anchoredPositionY: number;
  minAnchoredPosition: number;
  maxAnchoredPosition: number;
  sizeOrMarginX: number;
  sizeOrMarginY: number;
  minSizeOrMargin: number;
  maxSizeOrMargin: number;
  isStretchX: boolean;
  isStretchY: boolean;

  onPresetNameChange: (value: AnchorPlaygroundPresetName) => void;
  onAnchoredPositionXChange: (value: number) => void;
  onAnchoredPositionYChange: (value: number) => void;
  onSizeOrMarginXChange: (value: number) => void;
  onSizeOrMarginYChange: (value: number) => void;
}

/**
 * Live controls for the anchors demo's playground panel (the orange one): an
 * anchor preset select, an anchored-position X/Y slider pair, and a
 * size/margin X/Y slider pair whose labels switch between "Size" and
 * "Margin" per axis depending on whether the selected preset stretches that
 * axis (see `getAnchorStretchAxes`). Every change writes straight into the
 * running playground's `RectTransformEcsComponent`/`TextEcsComponent` (see
 * `index.tsx`'s handlers and `_create-anchor-playground.ts`), the same way
 * the text demo's playground controls retune its `TextEcsComponent` live.
 */
export const PlaygroundControls: FC<PlaygroundControlsProps> = ({
  presetName,
  anchoredPositionX,
  anchoredPositionY,
  minAnchoredPosition,
  maxAnchoredPosition,
  sizeOrMarginX,
  sizeOrMarginY,
  minSizeOrMargin,
  maxSizeOrMargin,
  isStretchX,
  isStretchY,
  onPresetNameChange,
  onAnchoredPositionXChange,
  onAnchoredPositionYChange,
  onSizeOrMarginXChange,
  onSizeOrMarginYChange,
}) => {
  const handlePresetNameChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onPresetNameChange(event.target.value as AnchorPlaygroundPresetName);
  };

  const handleAnchoredPositionXChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    onAnchoredPositionXChange(Number(event.target.value));
  };

  const handleAnchoredPositionYChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    onAnchoredPositionYChange(Number(event.target.value));
  };

  const handleSizeOrMarginXChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSizeOrMarginXChange(Number(event.target.value));
  };

  const handleSizeOrMarginYChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSizeOrMarginYChange(Number(event.target.value));
  };

  return (
    <div className={styles.container}>
      <div className={styles.control}>
        <label htmlFor="playground-anchor">
          <span>Anchor</span>
        </label>
        <select
          id="playground-anchor"
          value={presetName}
          onChange={handlePresetNameChange}
        >
          {anchorPlaygroundPresetNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-position-x">
          <span>Position X</span>
          <span>{Math.round(anchoredPositionX)}</span>
        </label>
        <input
          id="playground-position-x"
          type="range"
          min={minAnchoredPosition}
          max={maxAnchoredPosition}
          step={1}
          value={anchoredPositionX}
          onChange={handleAnchoredPositionXChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-position-y">
          <span>Position Y</span>
          <span>{Math.round(anchoredPositionY)}</span>
        </label>
        <input
          id="playground-position-y"
          type="range"
          min={minAnchoredPosition}
          max={maxAnchoredPosition}
          step={1}
          value={anchoredPositionY}
          onChange={handleAnchoredPositionYChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-size-x">
          <span>{isStretchX ? 'Margin X' : 'Width'}</span>
          <span>{Math.round(sizeOrMarginX)}</span>
        </label>
        <input
          id="playground-size-x"
          type="range"
          min={minSizeOrMargin}
          max={maxSizeOrMargin}
          step={1}
          value={sizeOrMarginX}
          onChange={handleSizeOrMarginXChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-size-y">
          <span>{isStretchY ? 'Margin Y' : 'Height'}</span>
          <span>{Math.round(sizeOrMarginY)}</span>
        </label>
        <input
          id="playground-size-y"
          type="range"
          min={minSizeOrMargin}
          max={maxSizeOrMargin}
          step={1}
          value={sizeOrMarginY}
          onChange={handleSizeOrMarginYChange}
        />
      </div>
    </div>
  );
};
