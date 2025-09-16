import {
  AnimationSetManager,
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
  private readonly _animationSetManager: AnimationSetManager;
  constructor(
    inputsManager: InputManager,
    animationSetManager: AnimationSetManager,
  ) {
    super('control adventurer', [
      ControlAdventurerComponent.symbol,
      SpriteAnimationComponent.symbol,
      FlipComponent.symbol,
      PositionComponent.symbol,
    ]);
    this._inputsManager = inputsManager;
    this._animationSetManager = animationSetManager;
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
      spriteAnimationComponent.animation.name !== ADVENTURER_ANIMATIONS.jump
    ) {
      const jumpAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.jump,
      );
      // jump always happens immediately
      immediatelySetCurrentAnimation(spriteAnimationComponent, jumpAnimation);
    } else if (runLAction?.isTriggered) {
      const runAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.run,
      );
      // run and attack happen at the end of the current animation
      spriteAnimationComponent.nextAnimation = runAnimation;
      flipComponent.flipX = true;
    } else if (runRAction?.isTriggered) {
      const runAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.run,
      );
      spriteAnimationComponent.nextAnimation = runAnimation;
      flipComponent.flipX = false;
    } else if (attackAction?.isTriggered) {
      const attackAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.attack1,
      );
      spriteAnimationComponent.nextAnimation = attackAnimation;
    }
  }
}
