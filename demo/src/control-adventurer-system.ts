import {
  FlipEcsComponent,
  flipId,
  PositionEcsComponent,
  positionId,
  SpriteAnimationEcsComponent,
  spriteAnimationId,
  TriggerAction,
} from '../../src';
import { EcsSystem } from '../../src/new-ecs';
import { controlAdventurerId } from './control-adventurer-component';

export const createControlAdventurerEcsSystem = (
  attackTriggerInput: TriggerAction,
  runRTriggerInput: TriggerAction,
  runLTriggerInput: TriggerAction,
  jumpTriggerInput: TriggerAction,
  takeDamageTriggerInput: TriggerAction,
): EcsSystem<
  [SpriteAnimationEcsComponent, FlipEcsComponent, PositionEcsComponent]
> => ({
  query: [controlAdventurerId, spriteAnimationId, flipId, positionId],
  run: (result) => {
    const [spriteAnimationComponent, flipComponent] = result.components;

    const animationInputs = spriteAnimationComponent.animationInputs;

    if (jumpTriggerInput.isTriggered) {
      console.log('Jumping!');

      animationInputs.setTrigger('jump');

      return;
    }

    if (runLTriggerInput.isTriggered) {
      animationInputs.setToggle('run', true);
      flipComponent.flipX = true;

      return;
    }

    if (runRTriggerInput.isTriggered) {
      animationInputs.setToggle('run', true);
      flipComponent.flipX = false;

      return;
    }

    animationInputs.setToggle('run', false);

    if (attackTriggerInput.isTriggered) {
      animationInputs.setText('attack', 'attack is being set');

      return;
    }

    if (takeDamageTriggerInput.isTriggered) {
      const health = animationInputs.getNumber('health');

      if (!health) {
        throw new Error('Health input not found');
      }

      health.value = Math.max(0, health.value - 50);
    }
  },
});
