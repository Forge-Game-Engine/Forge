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
import {
  addSpriteAnimationComponent,
  type SpriteAnimationEcsComponent,
} from '../components/index.js';
import { AnimationClip } from '../types/index.js';

describe('createSpriteAnimationEcsSystem', () => {
  const spriteTexture = { name: 'sprite' } as unknown as Texture;
  const clipTexture = { name: 'clip' } as unknown as Texture;
  const otherClipTexture = { name: 'other clip' } as unknown as Texture;

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

  const otherFrames = [
    createTextureRegion({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }),
    createTextureRegion({ x: 0, y: 0 }, { x: 0.25, y: 0.25 }),
  ];

  const setUp = () => {
    const time = new Time();
    const world = new EcsWorld();
    const clips = new AssetRegistry<AnimationClip>();
    const clipHandle = clips.register(
      'clip',
      new AnimationClip(clipTexture, frames),
    );
    const otherClipHandle = clips.register(
      'other clip',
      new AnimationClip(otherClipTexture, otherFrames),
    );
    const entity = world.createEntity();
    const sprite = addSpriteComponent(world, entity, {
      width: 2,
      height: 2,
      texture: spriteTexture,
    });

    const animation: SpriteAnimationEcsComponent = addSpriteAnimationComponent(
      world,
      entity,
      {
        animationClipHandle: clipHandle,
        frameDurationMilliseconds: 100,
      },
    );

    world.addSystem(createSpriteAnimationEcsSystem(time, clips));

    let clock = 0;

    /**
     * Steps the clock by `milliseconds` and runs one world update. `Time`
     * clamps a long delta after the first update, so later steps stay short.
     */
    const step = (milliseconds: number): void => {
      clock += milliseconds;
      time.update(clock);
      world.update();
    };

    return { step, sprite, animation, otherClipHandle };
  };

  /** Steps 40 ms at a time and records every frame the sprite is given. */
  const playFrames = (scene: ReturnType<typeof setUp>, count: number) => {
    const assigned = [];

    while (assigned.length < count) {
      const previous = scene.sprite.region;

      scene.step(40);

      if (scene.sprite.region !== previous) {
        assigned.push({
          region: scene.sprite.region,
          texture: scene.sprite.texture,
        });
      }
    }

    return assigned;
  };

  it("assigns each frame's whole region to the sprite, in order, looping", () => {
    const assigned = playFrames(setUp(), 4).map(({ region }) => region);

    expect(assigned).toHaveLength(4);
    expect(assigned[0]).toBe(frames[0]);
    expect(assigned[1]).toBe(frames[1]);
    expect(assigned[2]).toBe(frames[2]);
    expect(assigned[3]).toBe(frames[0]);
  });

  it("assigns the clip's texture with every frame", () => {
    const assigned = playFrames(setUp(), 4);

    for (const { texture } of assigned) {
      expect(texture).toBe(clipTexture);
    }
  });

  it("leaves the sprite's size and pivot alone", () => {
    const scene = setUp();

    playFrames(scene, 3);

    expect(scene.sprite.region).toBe(frames[2]);
    expect(scene.sprite.width).toBe(2);
    expect(scene.sprite.height).toBe(2);
    expect(scene.sprite.pivot).toEqual({ x: 0.5, y: 0.5 });
  });

  it("doesn't change the texture or region before the frame's duration has passed", () => {
    const { step, sprite } = setUp();

    step(50);

    expect(sprite.texture).toBe(spriteTexture);
    expect(sprite.region).toBe(fullTextureRegion);
  });

  it("overwrites a texture game code assigns at the clip's next frame change", () => {
    const { step, sprite } = setUp();

    step(100);
    sprite.texture = otherClipTexture;
    step(50);
    step(50);

    expect(sprite.texture).toBe(clipTexture);
    expect(sprite.region).toBe(frames[1]);
  });

  it('switches texture and region together when the clip changes to one of another texture', () => {
    const { step, sprite, animation, otherClipHandle } = setUp();

    step(100);

    animation.animationClipHandle = otherClipHandle;
    animation.animationFrameIndex = 0;

    // The old clip's frame stays, on its own texture, until the frame's
    // duration has passed.
    step(50);

    expect(sprite.texture).toBe(clipTexture);
    expect(sprite.region).toBe(frames[0]);

    step(50);

    expect(sprite.texture).toBe(otherClipTexture);
    expect(sprite.region).toBe(otherFrames[0]);
  });

  it('shows the new clip on the next update when the frame timer is reset', () => {
    const { step, sprite, animation, otherClipHandle } = setUp();

    step(100);

    animation.animationClipHandle = otherClipHandle;
    animation.animationFrameIndex = 0;
    animation.lastFrameChangeTimeInSeconds = Number.NEGATIVE_INFINITY;

    step(10);

    expect(sprite.texture).toBe(otherClipTexture);
    expect(sprite.region).toBe(otherFrames[0]);
    expect(animation.lastFrameChangeTimeInSeconds).toBeCloseTo(0.11);
  });
});
