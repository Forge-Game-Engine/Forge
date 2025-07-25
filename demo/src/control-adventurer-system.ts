import {
  Entity,
  FlipComponent,
  ImageAnimationComponent,
  InputManager,
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
      ImageAnimationComponent.symbol,
      FlipComponent.symbol,
    ]);
    this._inputsManager = inputsManager;
  }

  public run(entity: Entity): void {
    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
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
      imageAnimationComponent.currentAnimationSetName !==
        ADVENTURER_ANIMATIONS.jump
    ) {
      // jump always happens immediately
      imageAnimationComponent.setCurrentAnimation(ADVENTURER_ANIMATIONS.jump);
    } else if (runLAction?.isTriggered) {
      // run and attack happen at the end of the current animation
      imageAnimationComponent.nextAnimationSetName = ADVENTURER_ANIMATIONS.run;
      flipComponent.flipX = true;
    } else if (runRAction?.isTriggered) {
      imageAnimationComponent.nextAnimationSetName = ADVENTURER_ANIMATIONS.run;
      flipComponent.flipX = false;
    } else if (attackAction?.isTriggered) {
      imageAnimationComponent.nextAnimationSetName =
        ADVENTURER_ANIMATIONS.attack1;
    }
  }
}
