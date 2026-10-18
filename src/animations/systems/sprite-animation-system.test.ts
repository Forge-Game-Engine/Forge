import { describe, expect, it } from 'vitest';
import { createSpriteAnimationEcsSystem } from './sprite-animation-system.js';
import { AssetRegistry } from '../../asset-loading/asset-registry.js';
import { Time } from '../../common/index.js';
import { EcsWorld } from '../../ecs/index.js';
import {
  addSpriteComponent,
  createTextureRegion,
  fullTextureRegion,
  Texture,
} from '../../rendering/index.js';
import { addSpriteAnimationComponent } from '../components/index.js';
import { AnimationClip } from '../types/index.js';

describe('createSpriteAnimationEcsSystem', () => {
  // Frames of different sizes in the texture, and different trims.
  const frames = [
    createTextureRegion({ x: 0, y: 0 }, { x: 0.5, y: 0.5 }),
    createTextureRegion(
      { x: 0.5, y: 0 },
      { x: 0.25, y: 0.5 },
      { offset: { x: 0.5, y: 0 }, scale: { x: 0.5, y: 1 } },
    ),
    createTextureRegion(
      { x: 0, y: 0.5 },
      { x: 0.125, y: 0.25 },
      { offset: { x: 0.25, y: 0.25 }, scale: { x: 0.25, y: 0.5 } },
    ),
  ];

  const setUp = () => {
    const time = new Time();
    const world = new EcsWorld();
    const clips = new AssetRegistry<AnimationClip>();
    const clipHandle = clips.register('clip', new AnimationClip(frames));
    const entity = world.createEntity();
    const sprite = addSpriteComponent(world, entity, {
      width: 2,
      height: 2,
      texture: {} as Texture,
    });

    addSpriteAnimationComponent(world, entity, {
      animationClipHandle: clipHandle,
      frameDurationMilliseconds: 100,
    });
    world.addSystem(createSpriteAnimationEcsSystem(time, clips));

    return { time, world, sprite };
  };

  /** Steps 40 ms at a time and records every region the sprite is given. */
  const playRegions = (
    { time, world, sprite }: ReturnType<typeof setUp>,
    count: number,
  ) => {
    const assigned = [];
    let clock = 0;

    while (assigned.length < count) {
      const previous = sprite.region;

      clock += 40;
      time.update(clock);
      world.update();

      if (sprite.region !== previous) {
        assigned.push(sprite.region);
      }
    }

    return assigned;
  };

  it("assigns each frame's whole region to the sprite, in order, looping", () => {
    const assigned = playRegions(setUp(), 4);

    expect(assigned).toHaveLength(4);
    expect(assigned[0]).toBe(frames[0]);
    expect(assigned[1]).toBe(frames[1]);
    expect(assigned[2]).toBe(frames[2]);
    expect(assigned[3]).toBe(frames[0]);
  });

  it("leaves the sprite's size and pivot alone", () => {
    const scene = setUp();

    playRegions(scene, 3);

    expect(scene.sprite.region).toBe(frames[2]);
    expect(scene.sprite.width).toBe(2);
    expect(scene.sprite.height).toBe(2);
    expect(scene.sprite.pivot).toEqual({ x: 0.5, y: 0.5 });
  });

  it("doesn't change the region before the frame's duration has passed", () => {
    const { time, world, sprite } = setUp();

    time.update(50);
    world.update();

    expect(sprite.region).toBe(fullTextureRegion);
  });
});
