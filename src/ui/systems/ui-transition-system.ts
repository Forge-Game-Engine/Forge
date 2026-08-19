import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { clamp } from '../../math/index.js';
import { Color, SpriteEcsComponent, spriteId } from '../../rendering/index.js';
import {
  UiColorTransitionEcsComponent,
  uiColorTransitionId,
} from '../components/ui-color-transition-component.js';
import {
  UiInteractableEcsComponent,
  uiInteractableId,
} from '../components/ui-interactable-component.js';
import {
  deriveUiInteractionVisualState,
  UiInteractionVisualState,
} from '../types/ui-interaction-visual-state.js';

function colorForState(
  transition: UiColorTransitionEcsComponent,
  state: UiInteractionVisualState,
): Color {
  const colorsByState: Record<UiInteractionVisualState, Color> = {
    normal: transition.normalColor,
    hover: transition.hoverColor,
    pressed: transition.pressedColor,
    disabled: transition.disabledColor,
  };

  return colorsByState[state];
}

function lerpColor(from: Color, to: Color, t: number): Color {
  return new Color(
    from.r + (to.r - from.r) * t,
    from.g + (to.g - from.g) * t,
    from.b + (to.b - from.b) * t,
    from.a + (to.a - from.a) * t,
  );
}

/**
 * Creates a system that eases a `SpriteEcsComponent.tintColor` towards
 * whichever of a `UiColorTransitionEcsComponent`'s `normalColor`/
 * `hoverColor`/`pressedColor`/`disabledColor` matches the entity's
 * `UiInteractableEcsComponent`, per `deriveUiInteractionVisualState` -
 * giving buttons hover/press/disabled visual feedback via the engine's
 * existing easing functions (`animations/easing-functions`), with no
 * transition component having to know whether the state came from a
 * pointer or a gamepad.
 *
 * Should be registered after `createUiInteractionEcsSystem` and
 * `createUiNavigationEcsSystem` (it reads the interaction state they
 * write) and before `createRenderEcsSystem`.
 * @param time - The time instance driving the tween.
 * @returns The UI transition ECS system.
 */
export const createUiTransitionEcsSystem = (
  time: Time,
): EcsSystem<
  [
    UiColorTransitionEcsComponent,
    UiInteractableEcsComponent,
    SpriteEcsComponent,
  ]
> => ({
  name: 'uiTransition',
  query: [uiColorTransitionId, uiInteractableId, spriteId],
  update: (_world, { components: [transitions, interactables, sprites] }) => {
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i];
      const interactable = interactables[i];
      const sprite = sprites[i];

      const targetState = deriveUiInteractionVisualState(interactable);
      const targetColor = colorForState(transition, targetState);

      if (transition.targetState !== targetState) {
        transition.fromColor = sprite.tintColor;
        transition.targetState = targetState;
        transition.elapsedMilliseconds = 0;
      }

      transition.elapsedMilliseconds += time.deltaTimeInMilliseconds;

      const t =
        transition.duration > 0
          ? clamp(transition.elapsedMilliseconds / transition.duration, 0, 1)
          : 1;

      sprite.tintColor = lerpColor(
        transition.fromColor,
        targetColor,
        transition.easing(t),
      );
    }
  },
});
