import React, { FC, ReactNode } from 'react';
import styles from './_InteractionInstruction.module.css';

interface KeyboardKeyProps {
  displayElement: ReactNode;
  text: string;
}

export const InteractionInstruction: FC<KeyboardKeyProps> = ({
  displayElement,
  text,
}) => {
  return (
    <div className={styles.container}>
      {displayElement}
      <p>{text}</p>
    </div>
  );
};
