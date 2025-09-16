import {
  Entity,
  FlipComponent,
  InputManager,
  PositionComponent,
  SpriteAnimationComponent,
  System,
  TriggerAction,
} from '../../src';
import { ControlAdventurerComponent } from './control-adventurer-component';

export class ControlAdventurerSystem extends System {
  private readonly _inputsManager: InputManager;
  constructor(inputsManager: InputManager) {
    super('control adventurer', [
      ControlAdventurerComponent.symbol,
      SpriteAnimationComponent.symbol,
      FlipComponent.symbol,
      PositionComponent.symbol,
    ]);
    this._inputsManager = inputsManager;
  }

  public run(entity: Entity): void {
    const spriteAnimationComponent =
      entity.getComponentRequired<SpriteAnimationComponent>(
        SpriteAnimationComponent.symbol,
      );

    const flipComponent = entity.getComponentRequired<FlipComponent>(
      FlipComponent.symbol,
    );

    const animationInputs = spriteAnimationComponent.animationInputs;

    const attackAction = this._inputsManager.getAction<TriggerAction>('attack');
    const runRAction = this._inputsManager.getAction<TriggerAction>('runR');
    const runLAction = this._inputsManager.getAction<TriggerAction>('runL');
    const jumpAction = this._inputsManager.getAction<TriggerAction>('jump');
    const takeDamage =
      this._inputsManager.getAction<TriggerAction>('takeDamage');

    if (jumpAction?.isTriggered) {
      animationInputs.setToggle('jump', true);

      return;
    }

    if (runLAction?.isTriggered) {
      animationInputs.setToggle('run', true);
      flipComponent.flipX = true;

      return;
    }

    if (runRAction?.isTriggered) {
      animationInputs.setToggle('run', true);
      flipComponent.flipX = false;

      return;
    }

    animationInputs.setToggle('run', false);

    if (attackAction?.isTriggered) {
      animationInputs.setText('attack', 'attack is being set');

      return;
    }

    if (takeDamage?.isTriggered) {
      const health = animationInputs.getNumber('health');
      health.value = Math.max(0, health.value - 50);
    }
  }
}
