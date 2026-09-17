import { Time } from '../common/index.js';
import { EcsWorld } from '../ecs/ecs-world.js';
import {
  createCanvas,
  createRenderContext,
  RenderContext,
} from '../rendering/index.js';
import {
  ContainerResizeSync,
  createContainerResizeSync,
} from './create-container-resize-sync.js';
import { Game } from './game.js';

/**
 * Creates a new game instance with the specified container ID.
 * @param containerId - The ID of the container element where the game will be rendered.
 * @returns An object containing the game instance, ECS world, render context, time, and the resize sync keeping the render context's canvas sized to the container.
 */
export function createGame(containerId: string): {
  game: Game;
  world: EcsWorld;
  renderContext: RenderContext;
  time: Time;
  resizeSync: ContainerResizeSync;
} {
  const time = new Time();
  const world = new EcsWorld();
  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error(`No DOM element with ID "${containerId}" found.`);
  }

  const canvas = createCanvas(container);

  const renderContext = createRenderContext(canvas);

  const resizeSync = createContainerResizeSync(container, [renderContext]);

  const game = new Game(time, [world], container);

  return { game, world, time, renderContext, resizeSync };
}
