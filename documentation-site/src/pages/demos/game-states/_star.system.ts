import {
  addPositionComponent,
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Random } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { addStateScopedComponent } from '@forge-game-engine/forge/states';
import { DemoState, maxMisses, Round } from './_demo-state';
import { PlayerEcsComponent, playerId } from './_player.component';
import { StarEcsComponent, starId } from './_star.component';

const secondsBetweenStars = 0.6;
const catchHeight = 30;

/**
 * Drops a new star every `secondsBetweenStars`. Stars stay on screen behind
 * the game-over screen, so they're scoped to be removed when the next round
 * or the menu is entered.
 */
export const createStarSpawnerEcsSystem = (
  state: DemoState,
  round: Round,
  starSprite: SpriteEcsComponent,
  playArea: { halfWidth: number; halfHeight: number },
  random: Random,
  time: Time,
): EcsSystem<[]> => ({
  name: 'star-spawner',
  query: [],
  update: (world) => {
    round.secondsUntilNextStar -= time.deltaTimeInSeconds;

    if (round.secondsUntilNextStar > 0) {
      return;
    }

    round.secondsUntilNextStar += secondsBetweenStars;

    const star = world.createEntity();
    const margin = starSprite.width;

    addPositionComponent(world, star, {
      local: {
        x: random.randomFloat(
          -playArea.halfWidth + margin,
          playArea.halfWidth - margin,
        ),
        y: playArea.halfHeight + margin,
      },
    });
    addSpriteComponent(world, star, starSprite);
    world.addComponent(star, starId, {
      fallSpeed: random.randomFloat(150, 260),
    });
    addStateScopedComponent(world, star, {
      state,
      removeOnEnter: ['playing', 'menu'],
    });
  },
});

/**
 * Moves stars down, scores the ones that land in the basket and counts the
 * ones that fall past it. The third miss ends the round.
 */
export const createStarEcsSystem = (
  state: DemoState,
  round: Round,
  playArea: { halfWidth: number; halfHeight: number },
  time: Time,
): EcsSystem<[StarEcsComponent, PositionEcsComponent]> => ({
  name: 'star',
  query: [starId, positionId],
  update: (world, { entities, components: [stars, positions] }) => {
    const {
      components: [players, playerPositions],
    } = world.query<[PlayerEcsComponent, PositionEcsComponent]>([
      playerId,
      positionId,
    ]);

    for (let i = 0; i < entities.length; i++) {
      const position = positions[i];

      position.local.y -= stars[i].fallSpeed * time.deltaTimeInSeconds;

      const caught = players.some((player, p) => {
        const basket = playerPositions[p].local;

        return (
          Math.abs(position.local.y - basket.y) < catchHeight &&
          Math.abs(position.local.x - basket.x) < player.halfWidth
        );
      });

      if (caught) {
        round.score++;
        world.removeEntity(entities[i]);

        continue;
      }

      if (position.local.y < -playArea.halfHeight) {
        round.misses++;
        world.removeEntity(entities[i]);
      }
    }

    if (round.misses >= maxMisses) {
      state.set('gameOver');
    }
  },
});
