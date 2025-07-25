import {
  Entity,
  FlipComponent,
  ImageAnimationComponent,
  InputsComponent,
  System,
  TriggerAction,
} from '../../src';
import { ADVENTURER_ANIMATIONS } from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export class ControlAdventurerSystem extends System {
  constructor() {
    super('control adventurer', [
      ControlAdventurerComponent.symbol,
      ImageAnimationComponent.symbol,
      FlipComponent.symbol,
      InputsComponent.symbol,
    ]);
  }

  public run(entity: Entity): void {
    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );

    const flipComponent = entity.getComponentRequired<FlipComponent>(
      FlipComponent.symbol,
    );

    const inputs = entity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    const attackAction = inputs.inputManager.getAction<TriggerAction>('attack');
    const runRAction = inputs.inputManager.getAction<TriggerAction>('runR');
    const runLAction = inputs.inputManager.getAction<TriggerAction>('runL');
    const jumpAction = inputs.inputManager.getAction<TriggerAction>('jump');

    if (
      jumpAction?.isTriggered &&
      imageAnimationComponent.currentAnimation !== ADVENTURER_ANIMATIONS.jump
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
