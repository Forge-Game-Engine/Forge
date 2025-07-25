import {
  Entity,
  FlipComponent,
  ImageAnimationComponent,
  InputManager,
  ParticleEmitterComponent,
  PositionComponent,
  System,
  TriggerAction,
} from '../../src';
import { ADVENTURER_ANIMATIONS } from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export class ControlAdventurerSystem extends System {
  private readonly _inputsManager: InputManager;
  private readonly _particleEmitterAttack: ParticleEmitterComponent;
  private readonly _particleEmitterJump: ParticleEmitterComponent;
  constructor(
    inputsManager: InputManager,
    particleEmitterComponent1: ParticleEmitterComponent,
    particleEmitterComponent2: ParticleEmitterComponent,
  ) {
    super('control adventurer', [
      ControlAdventurerComponent.symbol,
      ImageAnimationComponent.symbol,
      FlipComponent.symbol,
      PositionComponent.symbol,
    ]);
    this._inputsManager = inputsManager;
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
      this._particleEmitterJump.emit(
        positionComponent.x,
        positionComponent.y + 50,
      );
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
