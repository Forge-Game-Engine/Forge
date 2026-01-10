import { Time } from '../common/index.js';
import { EcsWorld } from '../new-ecs/ecs-world.js';
import {
  createCanvas,
  createRenderContext,
  RenderContext,
} from '../rendering/index.js';
import { Game } from './game.js';

export function createGame(containerId: string): {
  game: Game;
  world: EcsWorld;
  renderContext: RenderContext;
  time: Time;
} {
  const time = new Time();
  const world = new EcsWorld();
  const container = document.getElementById(containerId)!;
  const game = new Game(time, world, container);

  const canvas = createCanvas(container);

  const renderContext = createRenderContext(canvas);

  return { game, world, time, renderContext };
}
