import { Game } from '@forge-game-engine/forge/ecs';
import { useEffect } from 'react';

type UseGameHook = (createGame: () => Promise<Game>) => Game;

export const useGame: UseGameHook = (createGame) => {
  let game: Game;

  useEffect(() => {
    const startGame = async () => {
      game = await createGame();
      game.run();
    };

    void startGame();

    return () => {
      if (game) {
        game.stop();
      }
    };
  }, [createGame]);

  return game;
};
