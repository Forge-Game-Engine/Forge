import { Time } from '../common/index.js';
import { createWorld, Game } from '../ecs/index.js';
import { EcsWorld } from '../new-ecs/ecs-world.js';
import {
  createCanvas,
  createRenderContext,
  RenderContext,
} from '../rendering/index.js';

export function createGame(containerId: string): {
  game: Game;
  world: EcsWorld;
  renderContext: RenderContext;
  time: Time;
} {
  const time = new Time();
  const game = new Game(time, document.getElementById(containerId)!);
  const world = createWorld(game);

  const canvas = createCanvas(game.container);

  const renderContext = createRenderContext(canvas);

  return { game, world, time, renderContext };
}
