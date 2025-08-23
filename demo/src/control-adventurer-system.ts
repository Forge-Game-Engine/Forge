import {
  Entity,
  FlipComponent,
  immediatelySetCurrentAnimation,
  InputManager,
  PositionComponent,
  SpriteAnimationComponent,
  System,
  TriggerAction,
} from '../../src';
import { ADVENTURER_ANIMATIONS } from './animationEnums';
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

    const attackAction = this._inputsManager.getAction<TriggerAction>('attack');
    const runRAction = this._inputsManager.getAction<TriggerAction>('runR');
    const runLAction = this._inputsManager.getAction<TriggerAction>('runL');
    const jumpAction = this._inputsManager.getAction<TriggerAction>('jump');

    if (
      jumpAction?.isTriggered &&
      spriteAnimationComponent.animationName !== ADVENTURER_ANIMATIONS.jump
    ) {
      // jump always happens immediately
      immediatelySetCurrentAnimation(
        spriteAnimationComponent,
        ADVENTURER_ANIMATIONS.jump,
      );
    } else if (runLAction?.isTriggered) {
      // run and attack happen at the end of the current animation
      spriteAnimationComponent.nextAnimationName = ADVENTURER_ANIMATIONS.run;
      flipComponent.flipX = true;
    } else if (runRAction?.isTriggered) {
      spriteAnimationComponent.nextAnimationName = ADVENTURER_ANIMATIONS.run;
      flipComponent.flipX = false;
    } else if (attackAction?.isTriggered) {
      spriteAnimationComponent.nextAnimationName =
        ADVENTURER_ANIMATIONS.attack1;
    }
  }
}
