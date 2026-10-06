import { addPositionComponent } from '@forge-game-engine/forge/common';
import { createTagId, EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  addSpriteComponent,
  Color,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { addStateScopedComponent } from '@forge-game-engine/forge/states';
import { FontAtlas } from '@forge-game-engine/forge/text';
import { createLabel } from './_create-label';
import { DemoState, maxMisses, Round } from './_demo-state';
import { playerId } from './_player.component';

const accent = new Color(1, 0.8, 0.3, 1);
const muted = new Color(0.7, 0.75, 0.85, 1);

/**
 * Tags the text that shows the round's score while it's played.
 */
export const hudId = createTagId('hud');

/**
 * Shows the title screen when the menu is entered. Its labels are scoped
 * to the menu, so leaving it removes them.
 */
export const createShowMenuEcsSystem = (
  state: DemoState,
  fontAtlas: FontAtlas,
): EcsSystem<[]> => ({
  name: 'show-menu',
  query: [],
  update: (world) => {
    const labels = [
      createLabel(world, fontAtlas, 'STAR CATCHER', 60, 64, accent),
      createLabel(world, fontAtlas, 'Press Space to play', -20, 24),
      createLabel(world, fontAtlas, 'Arrow keys or A/D move', -60, 18, muted),
    ];

    for (const label of labels) {
      addStateScopedComponent(world, label, {
        state,
        removeOnExit: ['menu'],
      });
    }
  },
});

/**
 * Sets up a round when `playing` is entered: resets the score, and creates
 * the player's basket and the score text. Both stay on screen behind the
 * game-over screen, so they're removed when the next round or the menu is
 * entered, not when `playing` is left.
 */
export const createStartRoundEcsSystem = (
  state: DemoState,
  round: Round,
  fontAtlas: FontAtlas,
  basketSprite: SpriteEcsComponent,
  playArea: { halfWidth: number; halfHeight: number },
): EcsSystem<[]> => ({
  name: 'start-round',
  query: [],
  update: (world) => {
    round.score = 0;
    round.misses = 0;
    round.secondsUntilNextStar = 0;

    const basketHalfWidth = basketSprite.width / 2;
    const basket = world.createEntity();

    addPositionComponent(world, basket, {
      local: { x: 0, y: -playArea.halfHeight + 50 },
    });
    addSpriteComponent(world, basket, basketSprite);
    world.addComponent(basket, playerId, {
      speed: 500,
      halfWidth: basketHalfWidth,
      minX: -playArea.halfWidth + basketHalfWidth,
      maxX: playArea.halfWidth - basketHalfWidth,
    });

    const hud = createLabel(world, fontAtlas, '', playArea.halfHeight - 30, 22);

    world.addTag(hud, hudId);

    for (const entity of [basket, hud]) {
      addStateScopedComponent(world, entity, {
        state,
        removeOnEnter: ['playing', 'menu'],
      });
    }
  },
});

/**
 * Shows the round's result when `gameOver` is entered, over whatever the
 * round left on screen.
 */
export const createShowGameOverEcsSystem = (
  state: DemoState,
  round: Round,
  fontAtlas: FontAtlas,
): EcsSystem<[]> => ({
  name: 'show-game-over',
  query: [],
  update: (world) => {
    const labels = [
      createLabel(world, fontAtlas, 'GAME OVER', 60, 56, accent),
      createLabel(
        world,
        fontAtlas,
        `You caught ${round.score} stars before missing ${maxMisses}`,
        0,
        22,
      ),
      createLabel(
        world,
        fontAtlas,
        'Space plays again, Escape goes to the menu',
        -40,
        18,
        muted,
      ),
    ];

    for (const label of labels) {
      addStateScopedComponent(world, label, {
        state,
        removeOnExit: ['gameOver'],
      });
    }
  },
});
