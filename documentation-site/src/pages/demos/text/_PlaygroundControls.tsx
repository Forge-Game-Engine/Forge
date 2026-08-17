import React, { ChangeEvent, FC } from 'react';
import { PlaygroundHorizontalAlign } from './_create-playground';
import styles from './_PlaygroundControls.module.css';

interface PlaygroundControlsProps {
  text: string;
  size: number;
  minSize: number;
  maxSize: number;
  horizontalAlign: PlaygroundHorizontalAlign;
  wrapEnabled: boolean;
  outlineEnabled: boolean;
  glowEnabled: boolean;
  onTextChange: (value: string) => void;
  onSizeChange: (value: number) => void;
  onHorizontalAlignChange: (value: PlaygroundHorizontalAlign) => void;
  onWrapEnabledChange: (value: boolean) => void;
  onOutlineEnabledChange: (value: boolean) => void;
  onGlowEnabledChange: (value: boolean) => void;
}

/**
 * Live controls for the text demo's "Try it yourself" playground: a
 * text input, a size slider, an alignment select (only meaningful while
 * wrapping is on - `TextEcsComponent.horizontalAlign` is otherwise ignored,
 * see `text-component.ts`), and wrap/outline/glow toggles. Every change
 * writes straight into the running playground's `TextEcsComponent` (see
 * `index.tsx`'s handlers and `_create-playground.ts`), the same way the
 * space-shooter demo's bloom/blur controls retune their components live.
 */
export const PlaygroundControls: FC<PlaygroundControlsProps> = ({
  text,
  size,
  minSize,
  maxSize,
  horizontalAlign,
  wrapEnabled,
  outlineEnabled,
  glowEnabled,
  onTextChange,
  onSizeChange,
  onHorizontalAlignChange,
  onWrapEnabledChange,
  onOutlineEnabledChange,
  onGlowEnabledChange,
}) => {
  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    onTextChange(event.target.value);
  };

  const handleSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSizeChange(Number(event.target.value));
  };

  const handleHorizontalAlignChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    onHorizontalAlignChange(event.target.value as PlaygroundHorizontalAlign);
  };

  const handleWrapEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    onWrapEnabledChange(event.target.checked);
  };

  const handleOutlineEnabledChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    onOutlineEnabledChange(event.target.checked);
  };

  const handleGlowEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlowEnabledChange(event.target.checked);
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.control} ${styles.textControl}`}>
        <label htmlFor="playground-text">
          <span>Text</span>
        </label>
        <input
          id="playground-text"
          type="text"
          value={text}
          onChange={handleTextChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-size">
          <span>Size</span>
          <span>{size}</span>
        </label>
        <input
          id="playground-size"
          type="range"
          min={minSize}
          max={maxSize}
          step={1}
          value={size}
          onChange={handleSizeChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-align">
          <span>Align</span>
        </label>
        <select
          id="playground-align"
          value={horizontalAlign}
          disabled={!wrapEnabled}
          onChange={handleHorizontalAlignChange}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-wrap">
          <span>Wrap</span>
        </label>
        <input
          id="playground-wrap"
          type="checkbox"
          checked={wrapEnabled}
          onChange={handleWrapEnabledChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-outline">
          <span>Outline</span>
        </label>
        <input
          id="playground-outline"
          type="checkbox"
          checked={outlineEnabled}
          onChange={handleOutlineEnabledChange}
        />
      </div>
      <div className={styles.control}>
        <label htmlFor="playground-glow">
          <span>Glow</span>
        </label>
        <input
          id="playground-glow"
          type="checkbox"
          checked={glowEnabled}
          onChange={handleGlowEnabledChange}
        />
      </div>
    </div>
  );
};
