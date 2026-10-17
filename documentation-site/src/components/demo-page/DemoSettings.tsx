import React, { ReactNode, useId } from 'react';
import clsx from 'clsx';
import styles from './DemoSettings.module.css';

/**
 * Stacks a demo's live settings (sliders, toggles, choices) in a
 * `DemoPanel`, with even spacing.
 */
export const DemoSettings = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => <div className={styles.settings}>{children}</div>;

/**
 * A titled group of settings, separated from the ones above it.
 */
export const DemoSettingsSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactNode => (
  <section className={styles.section}>
    <h3 className={styles.sectionTitle}>{title}</h3>
    {children}
  </section>
);

interface DemoSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Formats the value shown beside the label. Shows it as is by default. */
  format?: (value: number) => string;
  onChange: (value: number) => void;
}

/**
 * A labeled range slider that shows its current value.
 */
export const DemoSlider = ({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
}: DemoSliderProps): ReactNode => {
  const id = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldHeader}>
        {label}
        <span className={styles.fieldValue}>{format(value)}</span>
      </label>
      <input
        id={id}
        className={styles.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
};

interface DemoTextFieldProps {
  label: string;
  value: string;
  /** More than one row makes it a multi-line text area. */
  rows?: number;
  onChange: (value: string) => void;
}

/**
 * A labeled text box, single- or multi-line.
 */
export const DemoTextField = ({
  label,
  value,
  rows = 1,
  onChange,
}: DemoTextFieldProps): ReactNode => {
  const id = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldHeader}>
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          id={id}
          className={styles.textInput}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className={styles.textInput}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
};

interface DemoChoiceProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/**
 * A row of buttons for picking one of a few options.
 */
export const DemoChoice = <T extends string>({
  label,
  value,
  options,
  onChange,
}: DemoChoiceProps<T>): ReactNode => {
  const id = useId();

  return (
    <div className={styles.field}>
      <span id={id} className={styles.fieldHeader}>
        {label}
      </span>
      <div className={styles.choice} role="radiogroup" aria-labelledby={id}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={clsx(
              styles.choiceButton,
              option.value === value && styles.choiceButtonSelected,
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

interface DemoToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Settings that only apply while the toggle is on, shown below it then. */
  children?: ReactNode;
}

/**
 * A labeled on/off switch. Its `children` only show while it's on.
 */
export const DemoToggle = ({
  label,
  checked,
  onChange,
  children,
}: DemoToggleProps): ReactNode => {
  const id = useId();

  return (
    <div className={styles.toggle}>
      <label htmlFor={id} className={styles.toggleRow}>
        {label}
        <input
          id={id}
          className={styles.toggleInput}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
      {checked && children && (
        <div className={styles.toggleChildren}>{children}</div>
      )}
    </div>
  );
};
