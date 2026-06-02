import { Game } from '@forge-game-engine/forge/utilities';
import { useEffect, useRef } from 'react';

type UseGameHook = (createGame: () => Promise<Game>) => Game | undefined;

export const useGame: UseGameHook = (createGame) => {
  const gameRef = useRef<Game | undefined>(undefined);

  useEffect(() => {
    const startGame = async () => {
      gameRef.current = await createGame();
      gameRef.current.run();
    };

    void startGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.stop();
      }
    };
  }, [createGame]);

  return gameRef.current;
};
