import { Game } from '@forge-game-engine/forge/utilities';
import { useEffect, useRef } from 'react';

/**
 * Something a demo creates alongside its game that has to be stopped when
 * the demo unmounts, such as a sound mixer.
 */
export interface DemoResource {
  stop(): void | Promise<void>;
}

/**
 * Creates a demo's game. Anything passed to `stopWithGame` is stopped
 * after the game when the demo unmounts, including when it unmounts before
 * the game has finished being created.
 */
export type CreateDemoGame = (
  stopWithGame: (resource: DemoResource) => void,
) => Promise<Game>;

type UseGameHook = (createGame: CreateDemoGame) => Game | undefined;

const stopResources = (resources: readonly DemoResource[]): void => {
  for (const resource of resources) {
    Promise.resolve(resource.stop()).catch((error: unknown) => {
      console.error('Failed to stop a demo resource:', error);
    });
  }
};

export const useGame: UseGameHook = (createGame) => {
  const gameRef = useRef<Game | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const resources: DemoResource[] = [];

    const startGame = async () => {
      const game = await createGame((resource) => {
        resources.push(resource);
      });

      if (cancelled) {
        game.stop();
        game.container.querySelector('canvas')?.remove();
        stopResources(resources);

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
        stopResources(resources);
      }
    };
  }, [createGame]);

  return gameRef.current;
};
