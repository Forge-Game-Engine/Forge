import React, { FC, Fragment } from 'react';
import clsx from 'clsx';
import styles from './DemoControls.module.css';
import { DemoControl, DemoInput } from './types';

const deviceIcons = {
  mouse: 'fa-computer-mouse',
  gamepad: 'fa-gamepad',
  touch: 'fa-hand-pointer',
};

const inputKey = (input: DemoInput): string =>
  typeof input === 'string' ? input : `${input.device}:${input.label}`;

// Keys shown as their symbol rather than their name, so every key cap stays
// one short character wide. The name is still read out by screen readers.
const keySymbols: Record<string, string> = {
  Enter: '⏎',
  Space: '␣',
};

const InputCap: FC<{ input: DemoInput }> = ({ input }) => {
  if (typeof input === 'string') {
    const symbol = keySymbols[input];

    if (symbol) {
      return (
        <kbd className={styles.key} title={input} aria-label={input}>
          {symbol}
        </kbd>
      );
    }

    return <kbd className={styles.key}>{input}</kbd>;
  }

  return (
    <kbd className={styles.key}>
      <i
        className={clsx(
          'fa-solid',
          deviceIcons[input.device],
          styles.inputIcon,
        )}
        aria-hidden="true"
      ></i>
      {input.label}
    </kbd>
  );
};

interface DemoControlsProps {
  controls: DemoControl[];
}

/**
 * Lists a demo's controls: the inputs on the left, what they do on the
 * right.
 */
export const DemoControls: FC<DemoControlsProps> = ({ controls }) => {
  return (
    <dl className={styles.controls}>
      {controls.map((control) => (
        <div key={control.action} className={styles.control}>
          <dt className={styles.controlKeys}>
            {control.inputs.map((input, index) => (
              <Fragment key={inputKey(input)}>
                {index > 0 && <span className={styles.controlOr}>or</span>}
                <InputCap input={input} />
              </Fragment>
            ))}
          </dt>
          <dd className={styles.controlAction}>
            {control.action}
            {control.detail && (
              <span className={styles.controlDetail}>{control.detail}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};
