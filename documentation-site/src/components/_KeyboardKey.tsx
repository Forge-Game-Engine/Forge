import React, { FC } from 'react';
import styles from './_KeyboardKey.module.css';

interface KeyboardKeyProps {
  keyCode: string;
}

export const KeyboardKey: FC<KeyboardKeyProps> = ({ keyCode }) => {
  return (
    <div className={styles.keyBox}>
      <div className={styles.keyTop}>{keyCode}</div>
    </div>
  );
};
