import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ContactsEcsComponent,
  contactsId,
} from '@forge-game-engine/forge/physics';
import {
  Color,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import {
  TriggerZoneEcsComponent,
  triggerZoneId,
} from './_trigger-zone.component';

const emptyZoneOpacity = 0.25;
const occupiedZoneOpacity = 0.45;

/**
 * Creates an ECS system that reads each trigger zone's contacts: a ball
 * that entered the zone this tick (`started`) takes the zone's color, and a
 * ball that left it (`ended`) goes back to white. The zone itself brightens
 * while anything is inside (`touching`). Must run after
 * `createNarrowPhaseEcsSystem`, which fills the contacts.
 */
export const createTriggerZoneEcsSystem = (): EcsSystem<
  [TriggerZoneEcsComponent, ContactsEcsComponent, SpriteEcsComponent]
> => ({
  query: [triggerZoneId, contactsId, spriteId],
  update: (world, { entities, components: [zones, contacts, sprites] }) => {
    for (let i = 0; i < entities.length; i++) {
      const { color } = zones[i];
      const { touching, started, ended } = contacts[i];

      for (const ball of started) {
        const sprite = world.getComponent(ball, spriteId);

        if (sprite) {
          sprite.tintColor = color;
        }
      }

      for (const ball of ended) {
        // A ball that fell into the drain was removed, which also ends its
        // contact with any zone it was still in.
        if (!world.isAlive(ball)) {
          continue;
        }

        const sprite = world.getComponent(ball, spriteId);

        if (sprite) {
          sprite.tintColor = Color.white;
        }
      }

      sprites[i].tintColor = new Color(
        color.r,
        color.g,
        color.b,
        touching.length > 0 ? occupiedZoneOpacity : emptyZoneOpacity,
      );
    }
  },
});
