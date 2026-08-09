import { PositionEcsComponent } from '@forge-game-engine/forge/common';
import { createComponentId } from '@forge-game-engine/forge/ecs';
import { SpriteEcsComponent } from '@forge-game-engine/forge/rendering';
import { TextEcsComponent } from '@forge-game-engine/forge/text';

/**
 * Demo-only component driving the live `maxWidth` example: tracks the
 * oscillation's range/timing so `createLiveMaxWidthEcsSystem` can sweep the
 * entity's own `TextEcsComponent.maxWidth` back and forth every frame,
 * while keeping a guide box and a caption label in sync with the current
 * value.
 */
export interface LiveMaxWidthEcsComponent {
  minWidth: number;
  maxWidth: number;
  periodSeconds: number;
  elapsedSeconds: number;

  /** The guide box's fixed left edge; only its width/center-x change as `maxWidth` oscillates. */
  guideBoxLeftX: number;
  guideBoxSprite: SpriteEcsComponent;
  guideBoxPosition: PositionEcsComponent;

  /** A label rewritten each tick to show the current `maxWidth` value. */
  captionText: TextEcsComponent;
}

export const liveMaxWidthId =
  createComponentId<LiveMaxWidthEcsComponent>('liveMaxWidth');
