import React, { FC, Fragment } from 'react';
import styles from './DemoPage.module.css';
import { DemoControl } from './types';

interface DemoControlsProps {
  controls: DemoControl[];
}

export const DemoControls: FC<DemoControlsProps> = ({ controls }) => {
  return (
    <dl className={styles.controls}>
      {controls.map((control) => (
        <div key={control.action} className={styles.control}>
          <dt className={styles.controlKeys}>
            {control.keys.map((key, index) => (
              <Fragment key={key}>
                {index > 0 && <span className={styles.controlOr}>or</span>}
                <kbd className={styles.key}>{key}</kbd>
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
