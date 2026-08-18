import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  PointerEcsComponent,
  pointerId,
} from '../components/pointer-component.js';
import { PointerInputSource } from '../input-sources/pointer-input-source.js';

/**
 * Creates a system that copies a `PointerInputSource`'s canvas-space state
 * (e.g. `MouseInputSource`) into every `PointerEcsComponent`, once per tick.
 * @param pointerSource - The source of pointer state to publish.
 * @returns The pointer ECS system.
 */
export const createPointerEcsSystem = (
  pointerSource: PointerInputSource,
): EcsSystem<[PointerEcsComponent]> => ({
  query: [pointerId],
  update: (_world, { components: [pointerComponents] }) => {
    for (const pointerComponent of pointerComponents) {
      pointerComponent.position.x = pointerSource.position.x;
      pointerComponent.position.y = pointerSource.position.y;

      pointerComponent.delta.x = pointerSource.delta.x;
      pointerComponent.delta.y = pointerSource.delta.y;

      pointerComponent.scroll = pointerSource.scroll;
      pointerComponent.buttonsDown = pointerSource.buttonsDown;
      pointerComponent.buttonsHeld = pointerSource.buttonsHeld;
      pointerComponent.buttonsUp = pointerSource.buttonsUp;
    }
  },
});
