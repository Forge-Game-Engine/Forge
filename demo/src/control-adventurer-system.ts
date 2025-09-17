import {
  AnimationSetManager,
  Entity,
  FlipComponent,
  immediatelySetCurrentAnimation,
  PositionComponent,
  SpriteAnimationComponent,
  System,
  TriggerAction,
} from '../../src';
import { ADVENTURER_ANIMATIONS } from './animationEnums';
import { ControlAdventurerComponent } from './control-adventurer-component';

export class ControlAdventurerSystem extends System {
  private readonly _animationSetManager: AnimationSetManager;
  private readonly _attackTriggerInput: TriggerAction;
  private readonly _runRTriggerInput: TriggerAction;
  private readonly _runLTriggerInput: TriggerAction;
  private readonly _jumpTriggerInput: TriggerAction;

  constructor(
    attackTriggerInput: TriggerAction,
    runRTriggerInput: TriggerAction,
    runLTriggerInput: TriggerAction,
    jumpTriggerInput: TriggerAction,
    animationSetManager: AnimationSetManager,
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

    if (
      this._jumpTriggerInput.isTriggered &&
      spriteAnimationComponent.animation.name !== ADVENTURER_ANIMATIONS.jump
    ) {
      const jumpAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.jump,
      );
      // jump always happens immediately
      immediatelySetCurrentAnimation(spriteAnimationComponent, jumpAnimation);

      return;
    }

    if (this._runLTriggerInput.isTriggered) {
      const runAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.run,
      );
      // run and attack happen at the end of the current animation
      spriteAnimationComponent.nextAnimation = runAnimation;
      flipComponent.flipX = true;

      return;
    }

    if (this._runRTriggerInput.isTriggered) {
      const runAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.run,
      );
      spriteAnimationComponent.nextAnimation = runAnimation;
      flipComponent.flipX = false;
    }

    if (this._attackTriggerInput.isTriggered) {
      const attackAnimation = this._animationSetManager.getAnimation(
        spriteAnimationComponent.animation.animationSetName,
        ADVENTURER_ANIMATIONS.attack1,
      );
      spriteAnimationComponent.nextAnimation = attackAnimation;
    }
  }
}
