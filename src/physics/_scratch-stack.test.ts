import { describe, it } from 'vitest';
import { Vector2 } from '../math/index.js';
import { PhysicsWorld } from './physics-world.js';
import { RigidBody } from './rigid-body.js';
import { PolygonShape } from './shapes/index.js';

function runColumn(
  brickCount: number,
  steps: number,
  friction: number,
  label: string,
): void {
  const brickSize = 32;
  const floorTileSize = 64;

  const world = new PhysicsWorld({ gravity: new Vector2(0, -600) });

  const floorBody = new RigidBody({
    shape: PolygonShape.rectangle(floorTileSize * 3, floorTileSize),
    position: new Vector2(-100, -107),
    isStatic: true,
    friction,
  });
  world.addBody(floorBody);

  const towerBottomY = -107 + floorTileSize / 2;

  const bricks: RigidBody[] = [];

  for (let row = 0; row < brickCount; row++) {
    const y = towerBottomY + brickSize / 2 + row * brickSize;
    const position = new Vector2(-100, y);
    const brickBody = new RigidBody({
      shape: PolygonShape.rectangle(brickSize, brickSize),
      position,
      friction,
    });
    world.addBody(brickBody);
    bricks.push(brickBody);
  }

  const initialX = bricks.map((b) => b.position.x);

  const dt = 1 / 60;
  for (let step = 0; step < steps; step++) {
    world.step(dt);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[${label}] x drift, angle per row (bottom to top):\n` +
      bricks
        .map(
          (b, i) =>
            `row ${i}: dx=${(b.position.x - initialX[i]).toFixed(4)} angle=${b.angle.toFixed(4)}`,
        )
        .join('\n'),
  );
}

describe('scratch: friction bias check', () => {
  it('3 tall, 60 steps, friction=0', () => {
    runColumn(3, 60, 0, 'friction-0');
  });

  it('3 tall, 60 steps, friction=0.6', () => {
    runColumn(3, 60, 0.6, 'friction-0.6');
  });
});
