import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TextEcsComponent, textId } from '@forge-game-engine/forge/text';
import {
  LiveMaxWidthEcsComponent,
  liveMaxWidthId,
} from './_live-max-width.component';

/**
 * Sweeps every `LiveMaxWidthEcsComponent` entity's own `TextEcsComponent.maxWidth`
 * back and forth (a sine wave between `minWidth` and `maxWidth`) every
 * frame, and keeps its guide box and caption label in sync - this is what
 * demonstrates `createTextShapingEcsSystem` reflowing text live: watch the
 * words jump between lines as the column narrows and widens.
 * @param time - The time instance used to derive elapsed seconds.
 * @returns The live `maxWidth` ECS system.
 */
export const createLiveMaxWidthEcsSystem = (
  time: Time,
): EcsSystem<[LiveMaxWidthEcsComponent, TextEcsComponent]> => ({
  query: [liveMaxWidthId, textId],
  update: (_world, { components: [liveMaxWidths, texts] }) => {
    for (let i = 0; i < liveMaxWidths.length; i++) {
      const live = liveMaxWidths[i];
      const textComponent = texts[i];

      live.elapsedSeconds += time.deltaTimeInSeconds;

      const angle = (live.elapsedSeconds / live.periodSeconds) * Math.PI * 2;
      const midpoint = (live.minWidth + live.maxWidth) / 2;
      const amplitude = (live.maxWidth - live.minWidth) / 2;
      const currentMaxWidth = midpoint + amplitude * Math.sin(angle);

      textComponent.maxWidth = currentMaxWidth;
      live.guideBoxSprite.width = currentMaxWidth;
      live.guideBoxPosition.world.x =
        live.guideBoxLeftX + currentMaxWidth / 2;
      live.captionText.text = `maxWidth: ${Math.round(currentMaxWidth)} world units (live)`;
    }
  },
});
