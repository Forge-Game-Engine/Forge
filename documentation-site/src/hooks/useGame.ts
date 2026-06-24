import { Game } from '@forge-game-engine/forge/utilities';
import { useEffect, useRef } from 'react';

type UseGameHook = (
  createGame: () => Promise<Game>,
  // Changing this value tears down the current game and creates a new one,
  // e.g. so demos re-initialize against the container's current size when
  // toggling fullscreen.
  restartTrigger?: unknown,
) => Game | undefined;

export const useGame: UseGameHook = (createGame, restartTrigger) => {
  const gameRef = useRef<Game | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const startGame = async () => {
      const game = await createGame();

      if (cancelled) {
        game.stop();
        game.container.querySelector('canvas')?.remove();

        return;
      }

      gameRef.current = game;
      game.run();
    };

    void startGame();

    return () => {
      cancelled = true;

      if (gameRef.current) {
        gameRef.current.stop();
        gameRef.current.container.querySelector('canvas')?.remove();
        gameRef.current = undefined;
      }
    };
  }, [createGame, restartTrigger]);

  return gameRef.current;
};
