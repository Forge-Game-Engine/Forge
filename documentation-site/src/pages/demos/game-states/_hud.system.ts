import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TextEcsComponent, textId } from '@forge-game-engine/forge/text';
import { maxMisses, Round } from './_demo-state';
import { hudId } from './_screens';

/**
 * Writes the round's score into the score text.
 */
export const createHudEcsSystem = (
  round: Round,
): EcsSystem<[TextEcsComponent]> => ({
  name: 'hud',
  query: [textId],
  tags: [hudId],
  update: (_world, { components: [texts] }) => {
    for (const text of texts) {
      text.text = `Caught ${round.score}   Missed ${round.misses}/${maxMisses}`;
    }
  },
});
