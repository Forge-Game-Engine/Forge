import React, { FC, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { CreateDemoGame, useGame } from '@site/src/hooks/useGame';
import { useFullscreen } from '@site/src/hooks/useFullscreen';
import { usePreventPageScrollKeys } from '@site/src/hooks/usePreventPageScrollKeys';
import { FullscreenButton } from './FullscreenButton';
import styles from './DemoGame.module.css';

interface DemoGameProps {
  title: string;
  createGame: CreateDemoGame;
}

/**
 * Runs a demo's game in a focusable, fullscreen-able box. Every demo's
 * `createGame` renders into the `demo-game` element this creates.
 */
export const DemoGame: FC<DemoGameProps> = ({ title, createGame }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(gameRef);
  const [hasFocus, setHasFocus] = useState(false);

  useGame(createGame);
  usePreventPageScrollKeys(gameRef);

  // Focus the game straight away, so the controls work without a click and
  // the arrow keys drive the game instead of scrolling the page.
  useEffect(() => {
    gameRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      id="demo-game"
      ref={gameRef}
      className={styles.game}
      tabIndex={0}
      aria-label={`${title} game`}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
    >
      <FullscreenButton
        isFullscreen={isFullscreen}
        onToggle={toggleFullscreen}
      />
      <div
        className={clsx(styles.focusHint, hasFocus && styles.focusHintHidden)}
        aria-hidden="true"
      >
        <i className="fa-solid fa-hand-pointer"></i> Click to play
      </div>
    </div>
  );
};
