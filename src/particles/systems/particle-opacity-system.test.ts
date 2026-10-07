import { beforeEach, describe, expect, it } from 'vitest';
import { createParticleOpacityEcsSystem } from './particle-opacity-system.js';
import { EcsWorld } from '../../ecs/index.js';
import { addParticleComponent } from '../components/particle-component.js';
import { addLifetimeComponent } from '../../lifecycle/index.js';
import {
  addSpriteComponent,
  SpriteEcsComponent,
  Texture,
} from '../../rendering/index.js';

describe('createParticleOpacityEcsSystem', () => {
  let world: EcsWorld;

  beforeEach(() => {
    world = new EcsWorld();
    world.addSystem(createParticleOpacityEcsSystem());
  });

  const createParticle = (
    elapsedSeconds: number,
    durationSeconds: number,
  ): SpriteEcsComponent => {
    const entity = world.createEntity();

    addLifetimeComponent(world, entity, { elapsedSeconds, durationSeconds });
    addParticleComponent(world, entity, { startOpacity: 1, endOpacity: 0.2 });

    return addSpriteComponent(world, entity, {
      width: 1,
      height: 1,
      texture: {} as Texture,
    });
  };

  it.each([
    [0, 1],
    [1, 0.6],
    [2, 0.2],
  ])(
    'blends from the start to the end opacity (%s of 2 seconds elapsed)',
    (elapsedSeconds, expectedOpacity) => {
      const sprite = createParticle(elapsedSeconds, 2);

      world.update();

      expect(sprite.opacityMultiplier).toBeCloseTo(expectedOpacity);
    },
  );

  it('holds the end opacity once the lifetime has run out', () => {
    const sprite = createParticle(3, 2);

    world.update();

    expect(sprite.opacityMultiplier).toBeCloseTo(0.2);
  });

  it('uses the end opacity for a zero-length lifetime', () => {
    const sprite = createParticle(0, 0);

    world.update();

    expect(sprite.opacityMultiplier).toBeCloseTo(0.2);
  });
});
