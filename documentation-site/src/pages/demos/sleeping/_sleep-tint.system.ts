import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';

/** An awake body is drawn in its sprite's own colors. */
export const awakeTint = Color.white;

/** A sleeping body is drawn dimmed. */
export const asleepTint = new Color(0.35, 0.38, 0.5);

/**
 * Creates the system that tints every body's sprite by whether it's asleep.
 * It only reads `isSleeping`, which the sleep system alone writes during
 * the fixed steps, so register it in the default group, after them.
 * @returns The ECS system.
 */
export const createSleepTintEcsSystem = (): EcsSystem<
  [RigidBodyEcsComponent, SpriteEcsComponent]
> => ({
  query: [rigidBodyId, spriteId],
  update: (_world, { components: [bodies, sprites] }) => {
    for (let i = 0; i < bodies.length; i++) {
      sprites[i].tintColor = bodies[i].isSleeping ? asleepTint : awakeTint;
    }
  },
});
