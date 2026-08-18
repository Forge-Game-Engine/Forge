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
  outlineWidth: number;
  minOutlineWidth: number;
  maxOutlineWidth: number;

  glowEnabled: boolean;
  glowOffsetX: number;
  glowOffsetY: number;
  minGlowOffset: number;
  maxGlowOffset: number;
  glowSoftness: number;
  minGlowSoftness: number;
  maxGlowSoftness: number;

  onTextChange: (value: string) => void;
  onSizeChange: (value: number) => void;
  onHorizontalAlignChange: (value: PlaygroundHorizontalAlign) => void;
  onWrapEnabledChange: (value: boolean) => void;

  onOutlineEnabledChange: (value: boolean) => void;
  onOutlineWidthChange: (value: number) => void;

  onGlowEnabledChange: (value: boolean) => void;
  onGlowOffsetXChange: (value: number) => void;
  onGlowOffsetYChange: (value: number) => void;
  onGlowSoftnessChange: (value: number) => void;
}

/**
 * Live controls for the text demo's "Try it yourself" playground: a text
 * input, a size slider, an alignment select (only meaningful while wrapping
 * is on - `TextEcsComponent.horizontalAlign` is otherwise ignored, see
 * `text-component.ts`), a wrap toggle, and outline/glow controls (enabled
 * toggle plus width/offset/softness - color is fixed, not user-controllable;
 * an `<input type="color">` control was tried here and dropped for being
 * noticeably slow to interact with). Every change writes straight into the
 * running playground's `TextEcsComponent` (see `index.tsx`'s handlers and
 * `_create-playground.ts`), the same way the space-shooter demo's bloom/blur
 * controls retune their components live.
 */
export const PlaygroundControls: FC<PlaygroundControlsProps> = ({
  text,
  size,
  minSize,
  maxSize,
  horizontalAlign,
  wrapEnabled,
  outlineEnabled,
  outlineWidth,
  minOutlineWidth,
  maxOutlineWidth,
  glowEnabled,
  glowOffsetX,
  glowOffsetY,
  minGlowOffset,
  maxGlowOffset,
  glowSoftness,
  minGlowSoftness,
  maxGlowSoftness,
  onTextChange,
  onSizeChange,
  onHorizontalAlignChange,
  onWrapEnabledChange,
  onOutlineEnabledChange,
  onOutlineWidthChange,
  onGlowEnabledChange,
  onGlowOffsetXChange,
  onGlowOffsetYChange,
  onGlowSoftnessChange,
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

  const handleOutlineWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOutlineWidthChange(Number(event.target.value));
  };

  const handleGlowEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlowEnabledChange(event.target.checked);
  };

  const handleGlowOffsetXChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlowOffsetXChange(Number(event.target.value));
  };

  const handleGlowOffsetYChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlowOffsetYChange(Number(event.target.value));
  };

  const handleGlowSoftnessChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlowSoftnessChange(Number(event.target.value));
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

      <div className={styles.effectGroup}>
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
          <label htmlFor="playground-outline-width">
            <span>Width</span>
            <span>{outlineWidth.toFixed(1)}</span>
          </label>
          <input
            id="playground-outline-width"
            type="range"
            min={minOutlineWidth}
            max={maxOutlineWidth}
            step={0.1}
            value={outlineWidth}
            disabled={!outlineEnabled}
            onChange={handleOutlineWidthChange}
          />
        </div>
      </div>

      <div className={styles.effectGroup}>
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
        <div className={styles.control}>
          <label htmlFor="playground-glow-offset-x">
            <span>Offset X</span>
            <span>{glowOffsetX.toFixed(1)}</span>
          </label>
          <input
            id="playground-glow-offset-x"
            type="range"
            min={minGlowOffset}
            max={maxGlowOffset}
            step={0.1}
            value={glowOffsetX}
            disabled={!glowEnabled}
            onChange={handleGlowOffsetXChange}
          />
        </div>
        <div className={styles.control}>
          <label htmlFor="playground-glow-offset-y">
            <span>Offset Y</span>
            <span>{glowOffsetY.toFixed(1)}</span>
          </label>
          <input
            id="playground-glow-offset-y"
            type="range"
            min={minGlowOffset}
            max={maxGlowOffset}
            step={0.1}
            value={glowOffsetY}
            disabled={!glowEnabled}
            onChange={handleGlowOffsetYChange}
          />
        </div>
        <div className={styles.control}>
          <label htmlFor="playground-glow-softness">
            <span>Softness</span>
            <span>{glowSoftness.toFixed(1)}</span>
          </label>
          <input
            id="playground-glow-softness"
            type="range"
            min={minGlowSoftness}
            max={maxGlowSoftness}
            step={0.1}
            value={glowSoftness}
            disabled={!glowEnabled}
            onChange={handleGlowSoftnessChange}
          />
        </div>
      </div>
    </div>
  );
};
