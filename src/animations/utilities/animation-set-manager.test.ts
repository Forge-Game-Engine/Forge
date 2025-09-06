import { beforeEach, describe, expect, it } from 'vitest';
import { AnimationSetManager } from './animation-set-manager';
import { Vector2 } from '../../math';
import { ParameterizedForgeEvent } from '../../events';
import { Entity } from '../../ecs';

describe('AnimationSetManager', () => {
  let animationSetManager: AnimationSetManager;

  beforeEach(() => {
    animationSetManager = new AnimationSetManager();
  });

  describe('createAnimation', () => {
    it('should create an animation with the correct number of frames', () => {
      const animationSetName = 'player';
      const animationName = 'walk';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDuration = 0.5;

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();
      expect(animation?.frames.length).toBe(spritesPerColumn * spritesPerRow);
    });

    it('should throw an error if duration array length does not match number of frames', () => {
      const animationSetName = 'player';
      const animationName = 'run';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDurations = [0.5, 0.5]; // Incorrect length

      expect(() => {
        animationSetManager.createAnimation(
          animationSetName,
          animationName,
          spritesPerColumn,
          spritesPerRow,
          frameDurations,
        );
      }).toThrow(
        'Animation duration array length (2) must be equal to the number of frames (6).',
      );
    });

    it('should not throw an error if duration array length matches number of frames', () => {
      const animationSetName = 'player';
      const animationName = 'run';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDurations = [0.5, 0.7]; // Incorrect length
      const numFrames = 2;

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDurations,
        { numFrames },
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );

      expect(animation).not.toBeNull();
      expect(animation?.frames.length).toBe(numFrames);
      expect(animation?.frames[0].durationSeconds).toBe(0.5);
      expect(animation?.frames[1].durationSeconds).toBe(0.7);
    });

    it('should throw an error if animation events contain invalid frames', () => {
      const animationSetName = 'player';
      const animationName1 = 'wrong 1';
      const animationName2 = 'wrong 2';
      const spritesPerColumn = 2;
      const spritesPerRow = 1;
      const frameDuration = 1;

      expect(() => {
        animationSetManager.createAnimation(
          animationSetName,
          animationName1,
          spritesPerColumn,
          spritesPerRow,
          frameDuration,
          {
            animationEvents: new Map([
              [0, new ParameterizedForgeEvent<Entity>('test')],
              [1.5, new ParameterizedForgeEvent<Entity>('test')],
            ]),
          },
        );
      }).toThrow('Animation event frame must be a whole number, frame: 1.5');

      expect(() => {
        animationSetManager.createAnimation(
          animationSetName,
          animationName2,
          spritesPerColumn,
          spritesPerRow,
          frameDuration,
          {
            animationEvents: new Map([
              [3, new ParameterizedForgeEvent<Entity>('test')],
            ]),
          },
        );
      }).toThrow('Invalid animation event frame: 3');
    });

    it('should use default values for optional parameters', () => {
      const animationSetName = 'enemy';
      const animationName = 'attack';
      const spritesPerColumn = 2;
      const spritesPerRow = 2;
      const frameDuration = 0.3;

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();
      expect(animation?.frames[0].offset).toEqual(Vector2.zero);
      expect(animation?.frames[0].scale).toEqual(new Vector2(0.5, 0.5));
    });
    it('should correctly calculate frame offsets and scales', () => {
      const animationSetName = 'player';
      const animationName = 'walk';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDuration = 0.5;

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();

      const expectedScale = new Vector2(
        1 / spritesPerRow,
        1 / spritesPerColumn,
      );
      expect(animation?.frames[0].scale).toEqual(expectedScale);

      const expectedOffsets = [
        new Vector2(0, 0),
        new Vector2(1 / spritesPerRow, 0),
        new Vector2(2 / spritesPerRow, 0),
        new Vector2(0, 1 / spritesPerColumn),
        new Vector2(1 / spritesPerRow, 1 / spritesPerColumn),
        new Vector2(2 / spritesPerRow, 1 / spritesPerColumn),
      ];

      animation?.frames.forEach((frame, index) => {
        expect(frame.offset).toEqual(expectedOffsets[index]);
      });
    });

    it('should allow overriding start and end position percentages', () => {
      const animationSetName = 'player';
      const animationName = 'custom';
      const spritesPerColumn = 2;
      const spritesPerRow = 2;
      const frameDuration = 0.5;
      const startPositionPercentage = new Vector2(0.25, 0.25);
      const endPositionPercentage = new Vector2(0.75, 0.75);

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
        { startPositionPercentage, endPositionPercentage },
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();

      const expectedScale = new Vector2(
        (endPositionPercentage.x - startPositionPercentage.x) / spritesPerRow,
        (endPositionPercentage.y - startPositionPercentage.y) /
          spritesPerColumn,
      );
      expect(animation?.frames[0].scale).toEqual(expectedScale);

      const expectedOffsets = [
        new Vector2(0.25, 0.25),
        new Vector2(0.25 + expectedScale.x, 0.25),
        new Vector2(0.25, 0.25 + expectedScale.y),
        new Vector2(0.25 + expectedScale.x, 0.25 + expectedScale.y),
      ];

      animation?.frames.forEach((frame, index) => {
        expect(frame.offset).toEqual(expectedOffsets[index]);
      });
    });

    it('should set nextAnimationName if provided', () => {
      const animationSetName = 'player';
      const animationName = 'attack';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;
      const nextAnimationName = 'idle';

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
        { nextAnimationName },
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();
      expect(animation?.defaultNextAnimationName).toBe(nextAnimationName);
    });

    it('should handle single frame animations correctly', () => {
      const animationSetName = 'player';
      const animationName = 'idle';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();
      expect(animation?.frames.length).toBe(1);
      expect(animation?.frames[0].durationSeconds).toBe(frameDuration);
    });
  });

  describe('getAnimation', () => {
    it('should throw an error if no animation exists for the given animation set and animation name', () => {
      expect(() =>
        animationSetManager.getAnimation('nonexistent', 'idle'),
      ).toThrowError();
    });

    it('should retrieve the correct animation', () => {
      const animationSetName = 'player';
      const animationName = 'jump';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();
      expect(animation?.frames.length).toBe(1);
    });
  });
  describe('getDefaultNextAnimation', () => {
    it('should throw an error if no default next animation name is found', () => {
      const animationSetName = 'player';
      const animationName = 'idle';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();

      expect(() =>
        animationSetManager.getDefaultNextAnimation(animation),
      ).toThrowError();
    });

    it('should retrieve the default next animation', () => {
      const animationSetName = 'player';
      const animationName = 'walk';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;
      const nextAnimationName = 'run';

      animationSetManager.createAnimation(
        animationSetName,
        animationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
        { nextAnimationName },
      );
      animationSetManager.createAnimation(
        animationSetName,
        nextAnimationName,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animation = animationSetManager.getAnimation(
        animationSetName,
        animationName,
      );
      expect(animation).not.toBeNull();

      const nextAnimation =
        animationSetManager.getDefaultNextAnimation(animation);
      expect(nextAnimation).not.toBeNull();
      expect(nextAnimation?.name).toBe(nextAnimationName);
    });
  });
});
