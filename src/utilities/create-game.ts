import { createWorld, Game, World } from '../ecs';
import { createCanvas, createRenderContext, RenderContext } from '../rendering';

export function createGame(containerId: string): {
  game: Game;
  world: World;
  renderContext: RenderContext;
} {
  const game = new Game(document.getElementById(containerId)!);
  const world = createWorld(game);

  const canvas = createCanvas(game.container);

  const renderContext = createRenderContext(canvas);

  return { game, world, renderContext };
}
