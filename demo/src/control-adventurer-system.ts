import {
  Entity,
  FlipComponent,
  PositionComponent,
  SpriteAnimationComponent,
  System,
  TriggerAction,
} from '../../src';
import { ControlAdventurerComponent } from './control-adventurer-component';

export class ControlAdventurerSystem extends System {
  private readonly _attackTriggerInput: TriggerAction;
  private readonly _runRTriggerInput: TriggerAction;
  private readonly _runLTriggerInput: TriggerAction;
  private readonly _jumpTriggerInput: TriggerAction;
  private readonly _takeDamageTriggerInput: TriggerAction;

  constructor(
    attackTriggerInput: TriggerAction,
    runRTriggerInput: TriggerAction,
    runLTriggerInput: TriggerAction,
    jumpTriggerInput: TriggerAction,
    takeDamageTriggerInput: TriggerAction,
  ) {
    super('control adventurer', [
      ControlAdventurerComponent.symbol,
      SpriteAnimationComponent.symbol,
      FlipComponent.symbol,
      PositionComponent.symbol,
    ]);

    this._attackTriggerInput = attackTriggerInput;
    this._runRTriggerInput = runRTriggerInput;
    this._runLTriggerInput = runLTriggerInput;
    this._jumpTriggerInput = jumpTriggerInput;
    this._takeDamageTriggerInput = takeDamageTriggerInput;
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

    if (this._jumpTriggerInput.isTriggered) {
      console.log('Jumping!');

      animationInputs.setTrigger('jump');

      return;
    }

    if (this._runLTriggerInput.isTriggered) {
      animationInputs.setToggle('run', true);
      flipComponent.flipX = true;

      return;
    }

    if (this._runRTriggerInput.isTriggered) {
      animationInputs.setToggle('run', true);
      flipComponent.flipX = false;

      return;
    }

    animationInputs.setToggle('run', false);

    if (this._attackTriggerInput.isTriggered) {
      animationInputs.setText('attack', 'attack is being set');

      return;
    }

    if (this._takeDamageTriggerInput.isTriggered) {
      const health = animationInputs.getNumber('health');

      if (!health) {
        throw new Error('Health input not found');
      }

      health.value = Math.max(0, health.value - 50);
    }
  }
}
