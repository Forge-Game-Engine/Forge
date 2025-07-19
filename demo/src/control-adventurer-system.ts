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

    const keyAnimation = {
      [keyCodes.w]: ADVENTURER_ANIMATIONS.jump,
      [keyCodes.a]: ADVENTURER_ANIMATIONS.run,
      [keyCodes.d]: ADVENTURER_ANIMATIONS.run,
      [keyCodes.space]: ADVENTURER_ANIMATIONS.attack1,
    };
    if (this._inputComponent.keyPressed(keyCodes.w)) {
      // jump always happens immediately
      imageAnimationComponent.setCurrentAnimation(keyAnimation[keyCodes.w]);
    } else if (this._inputComponent.keyPressed(keyCodes.a)) {
      // run and attack happen at the end of the current animation
      imageAnimationComponent.nextAnimationState = keyAnimation[keyCodes.a];
    } else if (this._inputComponent.keyPressed(keyCodes.d)) {
      imageAnimationComponent.nextAnimationState = keyAnimation[keyCodes.d];
    } else if (this._inputComponent.keyPressed(keyCodes.space)) {
      imageAnimationComponent.nextAnimationState = keyAnimation[keyCodes.space];
    }
  }
}
