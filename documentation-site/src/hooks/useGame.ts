import { Game } from '@forge-game-engine/forge/utilities';
import { useEffect, useRef } from 'react';

/**
 * Creates a demo's game. `signal` is aborted when the demo unmounts, after
 * the game has been stopped, so a demo can release anything `Game.stop()`
 * doesn't own (for example its sound mixer). Register the abort listener
 * before the first `await`: an unmount during loading aborts the signal
 * before the returned promise settles.
 */
export type CreateDemoGame = (signal: AbortSignal) => Promise<Game>;

type UseGameHook = (createGame: CreateDemoGame) => Game | undefined;

export const useGame: UseGameHook = (createGame) => {
  const gameRef = useRef<Game | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    // Created per effect run, so React StrictMode's double mount gives the
    // second run a signal the first run's cleanup didn't abort.
    const abortController = new AbortController();

    const startGame = async () => {
      const game = await createGame(abortController.signal);

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

      abortController.abort();
    };
  }, [createGame]);

  return gameRef.current;
};
