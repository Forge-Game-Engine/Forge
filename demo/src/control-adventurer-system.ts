import {
  Entity,
  ImageAnimationComponent,
  InputsComponent,
  keyCodes,
  System,
} from '../../src';
import { ADVENTURER_ANIMATIONS } from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export class ControlAdventurerSystem extends System {
  private readonly _inputComponent: InputsComponent;

  constructor(inputsEntity: Entity) {
    super('control adventurer', [
      ControlAdventurerComponent.symbol,
      ImageAnimationComponent.symbol,
    ]);

    const inputComponent = inputsEntity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    this._inputComponent = inputComponent;
  }

  public run(entity: Entity): void {
    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );

    if (this._inputComponent.keyPressed(keyCodes.w)) {
      // jump always happens immediately
      imageAnimationComponent.setCurrentAnimation(ADVENTURER_ANIMATIONS.jump);
    } else if (
      this._inputComponent.keyPressed(keyCodes.a) ||
      this._inputComponent.keyPressed(keyCodes.d)
    ) {
      // run and attack happen at the end of the current animation
      imageAnimationComponent.nextAnimationState = ADVENTURER_ANIMATIONS.run;
    } else if (this._inputComponent.keyPressed(keyCodes.space)) {
      imageAnimationComponent.nextAnimationState =
        ADVENTURER_ANIMATIONS.attack1;
    }
  }
}
