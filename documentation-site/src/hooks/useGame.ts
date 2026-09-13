import { Game } from '@forge-game-engine/forge/utilities';
import { useEffect, useRef } from 'react';

type UseGameHook = (createGame: () => Promise<Game>) => Game | undefined;

export const useGame: UseGameHook = (createGame) => {
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
  }, [createGame]);

  return gameRef.current;
};
