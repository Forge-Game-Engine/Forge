import React, { JSX, useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { createSnakeGame } from './_create-game';
import gameCode from '!!raw-loader!./_create-game';
import createSnakeCode from '!!raw-loader!./_create-snake';
import spawnSnakeCode from '!!raw-loader!./_spawn-snake';
import snakeComponentCode from '!!raw-loader!./_snake.component';
import snakeTurnSystemCode from '!!raw-loader!./_snake-turn.system';
import snakeMovementSystemCode from '!!raw-loader!./_snake-movement.system';
import snakeRenderSyncSystemCode from '!!raw-loader!./_snake-render-sync.system';
import snakeControllerCode from '!!raw-loader!./_snake-controller';
import gridCode from '!!raw-loader!./_grid';
import createSquareSpriteCode from '!!raw-loader!./_create-square-sprite';

import { Demo } from '@site/src/components/Demo';
import { INITIAL_SNAKE_LENGTH } from './_grid';
import { SnakeGameController } from './_snake-controller';
import styles from './_snake-overlay.module.css';

interface FloatingMessage {
  id: number;
  text: string;
  left: number;
  top: number;
  isGameOver: boolean;
}

export default function Snake(): JSX.Element {
  const { current: controller } = useRef(new SnakeGameController());
  const [length, setLength] = useState(INITIAL_SNAKE_LENGTH);
  const [message, setMessage] = useState<FloatingMessage | null>(null);
  const nextMessageId = useRef(0);

  useEffect(() => {
    const showMessage = (
      text: string,
      position: { x: number; y: number },
      isGameOver: boolean,
    ): void => {
      const id = nextMessageId.current++;

      setMessage({
        id,
        text,
        left: position.x,
        top: position.y,
        isGameOver,
      });

      setTimeout(() => {
        setMessage((current) => (current?.id === id ? null : current));
      }, 900);
    };

    const onLengthChanged = (newLength: number): void => setLength(newLength);
    const onNom = (position: { x: number; y: number }): void =>
      showMessage('NOM!', position, false);

    const onGameOver = (position: { x: number; y: number }): void => {
      showMessage('Game Over!', position, true);
      setLength(INITIAL_SNAKE_LENGTH);
    };

    controller.onLengthChanged.registerListener(onLengthChanged);
    controller.onNom.registerListener(onNom);
    controller.onGameOver.registerListener(onGameOver);

    return () => {
      controller.onLengthChanged.deregisterListener(onLengthChanged);
      controller.onNom.deregisterListener(onNom);
      controller.onGameOver.deregisterListener(onGameOver);
    };
  }, [controller]);

  // `useGame` (inside `Demo`) tears down and recreates the whole game
  // whenever this reference changes, so it must stay stable across the
  // re-renders `setLength`/`setMessage` above trigger on every move —
  // otherwise every pellet eaten (or collision) would restart the game
  // before the growth/reset was ever visible.
  const createGame = useCallback(
    () => createSnakeGame(controller),
    [controller],
  );

  return (
    <Demo
      metaData={{
        title: 'Snake Demo',
        description:
          'A demo showcasing a classic snake game with an HTML DOM UI overlaid on top of the WebGL canvas.',
      }}
      header="Snake"
      blurb="This demo shows how a normal HTML DOM UI can be overlaid directly on top of a Forge game's canvas: the length counter, the two turn buttons and the floating 'NOM!'/'Game Over!' text are all regular positioned HTML elements rendered alongside the canvas, not drawn by the engine. The snake moves on a fixed timer, wraps around the board's edges, and grows (and shows 'NOM!') each time it reaches the pellet. Colliding with its own body ends the run and respawns the snake."
      createGame={createGame}
      codeFiles={[
        {
          name: 'create-game.ts',
          content: gameCode,
        },
        {
          name: 'snake-turn.system.ts',
          content: snakeTurnSystemCode,
        },
        {
          name: 'snake-movement.system.ts',
          content: snakeMovementSystemCode,
        },
        {
          name: 'snake-render-sync.system.ts',
          content: snakeRenderSyncSystemCode,
        },
        {
          name: 'create-snake.ts',
          content: createSnakeCode,
        },
        {
          name: 'spawn-snake.ts',
          content: spawnSnakeCode,
        },
        {
          name: 'snake.component.ts',
          content: snakeComponentCode,
        },
        {
          name: 'snake-controller.ts',
          content: snakeControllerCode,
        },
        {
          name: 'grid.ts',
          content: gridCode,
        },
        {
          name: 'create-square-sprite.ts',
          content: createSquareSpriteCode,
        },
      ]}
      overlay={
        <>
          <div className={styles.lengthBadge}>Length: {length}</div>
          {message && (
            <div
              key={message.id}
              className={clsx(styles.floatingMessage, {
                [styles.gameOver]: message.isGameOver,
              })}
              style={{ left: message.left, top: message.top }}
            >
              {message.text}
            </div>
          )}
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.turnButton}
              onClick={() => controller.turnAntiClockwise()}
              aria-label="Turn anti-clockwise"
            >
              ↺
            </button>
            <button
              type="button"
              className={styles.turnButton}
              onClick={() => controller.turnClockwise()}
              aria-label="Turn clockwise"
            >
              ↻
            </button>
          </div>
        </>
      }
    />
  );
}
