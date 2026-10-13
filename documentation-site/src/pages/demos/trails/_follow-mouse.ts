import { positionId } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  clearTrail,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';

/**
 * Moves `entity` to the mouse while the mouse is over the canvas. When the
 * mouse comes back onto the canvas, the entity jumps to it and its trail is
 * cleared, so the trail isn't drawn across the jump from where the mouse
 * left.
 * @param world - The ECS world the entity belongs to.
 * @param entity - The entity to move; it has a position and a trail.
 * @param camera - The camera whose view converts the mouse to world units.
 * @param renderContext - The render context whose canvas is listened to.
 */
export function followMouse(
  world: EcsWorld,
  entity: number,
  camera: number,
  renderContext: RenderContext,
): void {
  const { canvas } = renderContext;

  const moveToMouse = (event: MouseEvent): void => {
    const position = world.getComponent(entity, positionId);

    if (!position) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const mouse = getCameraView(world, camera, renderContext).viewportToWorld({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    position.local.x = mouse.x;
    position.local.y = mouse.y;
  };

  canvas.addEventListener('mousemove', moveToMouse);
  canvas.addEventListener('mouseenter', (event: MouseEvent) => {
    moveToMouse(event);
    clearTrail(world, entity);
  });
}
