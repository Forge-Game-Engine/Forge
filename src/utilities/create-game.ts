import { Time } from '../common/index.js';
import { EcsWorld } from '../new-ecs/ecs-world.js';
import {
  createCanvas,
  createRenderContext,
  RenderContext,
} from '../rendering/index.js';

export function createGame(containerId: string): {
  world: EcsWorld;
  renderContext: RenderContext;
  time: Time;
  container: HTMLElement;
} {
  const time = new Time();
  const container = document.getElementById(containerId)!;
  const world = new EcsWorld();

  const canvas = createCanvas(container);

  const renderContext = createRenderContext(canvas);

  return { world, time, renderContext, container };
}
