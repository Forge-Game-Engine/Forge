import React, { FC } from 'react';
import clsx from 'clsx';
import styles from './FullscreenButton.module.css';

interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export const FullscreenButton: FC<FullscreenButtonProps> = ({
  isFullscreen,
  onToggle,
}) => {
  return (
    <button
      type="button"
      className={styles.fullscreenButton}
      onClick={onToggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
    >
      <i
        className={clsx('fa-solid', isFullscreen ? 'fa-compress' : 'fa-expand')}
      ></i>
    </button>
  );
};
