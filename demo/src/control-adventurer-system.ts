import {
  Entity,
  FlipComponent,
  ImageAnimationComponent,
  InputsComponent,
  keyCodes,
  ParticleEmitterComponent,
  PositionComponent,
  System,
} from '../../src';
import { ADVENTURER_ANIMATIONS } from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export class ControlAdventurerSystem extends System {
  private readonly _inputComponent: InputsComponent;
  private readonly _particleEmitterAttack: ParticleEmitterComponent;
  private readonly _particleEmitterJump: ParticleEmitterComponent;

  constructor(
    inputsEntity: Entity,
    particleEmitterComponent1: ParticleEmitterComponent,
    particleEmitterComponent2: ParticleEmitterComponent,
  ) {
    super('control adventurer', [
      ControlAdventurerComponent.symbol,
      ImageAnimationComponent.symbol,
      FlipComponent.symbol,
      PositionComponent.symbol,
    ]);

    const inputComponent = inputsEntity.getComponentRequired<InputsComponent>(
      InputsComponent.symbol,
    );

    this._inputComponent = inputComponent;
    this._particleEmitterAttack = particleEmitterComponent1;
    this._particleEmitterJump = particleEmitterComponent2;
  }

  public run(entity: Entity): void {
    const imageAnimationComponent =
      entity.getComponentRequired<ImageAnimationComponent>(
        ImageAnimationComponent.symbol,
      );

    const flipComponent = entity.getComponentRequired<FlipComponent>(
      FlipComponent.symbol,
    );

    const positionComponent = entity.getComponentRequired<PositionComponent>(
      PositionComponent.symbol,
    );

    if (this._inputComponent.keyPressed(keyCodes.w)) {
      // jump always happens immediately
      if (
        imageAnimationComponent.getCurrentAnimation() !==
        ADVENTURER_ANIMATIONS.jump
      ) {
        imageAnimationComponent.setCurrentAnimation(ADVENTURER_ANIMATIONS.jump);
        this._particleEmitterJump.emit(
          positionComponent.x,
          positionComponent.y + 50,
        );
      }
    } else if (this._inputComponent.keyPressed(keyCodes.a)) {
      // run and attack happen at the end of the current animation
      imageAnimationComponent.nextAnimationState = ADVENTURER_ANIMATIONS.run;
      flipComponent.flipX = true;
    } else if (this._inputComponent.keyPressed(keyCodes.d)) {
      imageAnimationComponent.nextAnimationState = ADVENTURER_ANIMATIONS.run;
      flipComponent.flipX = false;
    } else if (this._inputComponent.keyPressed(keyCodes.space)) {
      imageAnimationComponent.nextAnimationState =
        ADVENTURER_ANIMATIONS.attack1;
      this._particleEmitterAttack.setOptions({
        minRotation: flipComponent.flipX ? (-3 * Math.PI) / 4 : Math.PI / 4,
        maxRotation: flipComponent.flipX ? -Math.PI / 4 : (3 * Math.PI) / 4,
      });
      this._particleEmitterAttack.emit(
        positionComponent.x + 30 * (flipComponent.flipX ? -1 : 1),
        positionComponent.y + 20,
      );
    }
  }
}
