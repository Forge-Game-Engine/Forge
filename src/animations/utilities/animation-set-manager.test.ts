import { beforeEach, describe, expect, it } from 'vitest';
import { AnimationSetManager } from './animation-set-manager';
import { Vector2 } from '../../math';
import { SpriteAnimationComponent } from '../components';
import { ParameterizedForgeEvent } from '../../events';
import { Entity } from '../../ecs';

describe('AnimationSetManager', () => {
  let animationSetManager: AnimationSetManager;

  beforeEach(() => {
    animationSetManager = new AnimationSetManager();
  });

  describe('createAnimationSet', () => {
    it('should create an animation set with the correct number of frames', () => {
      const entityType = 'player';
      const animationType = 'walk';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDuration = 0.5;

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );
      expect(animationSet).not.toBeNull();
      expect(animationSet?.animationFrames.length).toBe(
        spritesPerColumn * spritesPerRow,
      );
    });

    it('should throw an error if duration array length does not match number of frames', () => {
      const entityType = 'player';
      const animationType = 'run';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDurations = [0.5, 0.5]; // Incorrect length

      expect(() => {
        animationSetManager.createAnimationSet(
          entityType,
          animationType,
          spritesPerColumn,
          spritesPerRow,
          frameDurations,
        );
      }).toThrow(
        'Animation duration array length (2) must be equal to the number of frames (6).',
      );
    });

    it('should not throw an error if duration array length matches number of frames', () => {
      const entityType = 'player';
      const animationType = 'run';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDurations = [0.5, 0.7]; // Incorrect length
      const numFrames = 2;

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDurations,
        { numFrames },
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );

      expect(animationSet).not.toBeNull();
      expect(animationSet?.animationFrames.length).toBe(numFrames);
      expect(animationSet?.animationFrames[0].durationSeconds).toBe(0.5);
      expect(animationSet?.animationFrames[1].durationSeconds).toBe(0.7);
    });

    it('should throw an error if animation events contain invalid frames', () => {
      const entityType = 'player';
      const animationType1 = 'wrong 1';
      const animationType2 = 'wrong 2';
      const spritesPerColumn = 2;
      const spritesPerRow = 1;
      const frameDuration = 1;

      expect(() => {
        animationSetManager.createAnimationSet(
          entityType,
          animationType1,
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
        animationSetManager.createAnimationSet(
          entityType,
          animationType2,
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
      const entityType = 'enemy';
      const animationType = 'attack';
      const spritesPerColumn = 2;
      const spritesPerRow = 2;
      const frameDuration = 0.3;

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );
      expect(animationSet).not.toBeNull();
      expect(animationSet?.animationFrames[0].offset).toEqual(Vector2.zero);
      expect(animationSet?.animationFrames[0].scale).toEqual(
        new Vector2(0.5, 0.5),
      );
    });
  });

  describe('getAnimationSet', () => {
    it('should return null if no animation set exists for the given entity type and animation type', () => {
      const animationSet = animationSetManager.getAnimationSet(
        'nonexistent',
        'idle',
      );
      expect(animationSet).toBeNull();
    });

    it('should retrieve the correct animation set', () => {
      const entityType = 'player';
      const animationType = 'jump';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );
      expect(animationSet).not.toBeNull();
      expect(animationSet?.animationFrames.length).toBe(1);
    });
  });

  describe('getAnimationFrame', () => {
    it('should throw an error if no animation set exists for the given entity type and animation type', () => {
      const spriteAnimationComponent = new SpriteAnimationComponent(
        'nonexistent',
        'idle',
      );

      expect(() => {
        animationSetManager.getAnimationFrame(spriteAnimationComponent);
      }).toThrow(
        'No animation set found for entity type: nonexistent, animation: idle',
      );
    });

    it('should retrieve the correct animation frame', () => {
      const entityType = 'player';
      const animationType = 'walk';
      const spritesPerColumn = 2;
      const spritesPerRow = 2;
      const frameDuration = 0.5;

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );
      const spriteAnimationComponent = new SpriteAnimationComponent(
        entityType,
        animationType,
        { animationIndex: 1 },
      );
      const frame = animationSetManager.getAnimationFrame(
        spriteAnimationComponent,
      );
      expect(frame).not.toBeNull();
      expect(frame?.durationSeconds).toBe(frameDuration);
    });

    it('should correctly calculate frame offsets and scales', () => {
      const entityType = 'player';
      const animationType = 'walk';
      const spritesPerColumn = 2;
      const spritesPerRow = 3;
      const frameDuration = 0.5;

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );
      expect(animationSet).not.toBeNull();

      const expectedScale = new Vector2(
        1 / spritesPerRow,
        1 / spritesPerColumn,
      );
      expect(animationSet?.animationFrames[0].scale).toEqual(expectedScale);

      const expectedOffsets = [
        new Vector2(0, 0),
        new Vector2(1 / spritesPerRow, 0),
        new Vector2(2 / spritesPerRow, 0),
        new Vector2(0, 1 / spritesPerColumn),
        new Vector2(1 / spritesPerRow, 1 / spritesPerColumn),
        new Vector2(2 / spritesPerRow, 1 / spritesPerColumn),
      ];

      animationSet?.animationFrames.forEach((frame, index) => {
        expect(frame.offset).toEqual(expectedOffsets[index]);
      });
    });

    it('should allow overriding start and end position percentages', () => {
      const entityType = 'player';
      const animationType = 'custom';
      const spritesPerColumn = 2;
      const spritesPerRow = 2;
      const frameDuration = 0.5;
      const startPositionPercentage = new Vector2(0.25, 0.25);
      const endPositionPercentage = new Vector2(0.75, 0.75);

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
        { startPositionPercentage, endPositionPercentage },
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );
      expect(animationSet).not.toBeNull();

      const expectedScale = new Vector2(
        (endPositionPercentage.x - startPositionPercentage.x) / spritesPerRow,
        (endPositionPercentage.y - startPositionPercentage.y) /
          spritesPerColumn,
      );
      expect(animationSet?.animationFrames[0].scale).toEqual(expectedScale);

      const expectedOffsets = [
        new Vector2(0.25, 0.25),
        new Vector2(0.25 + expectedScale.x, 0.25),
        new Vector2(0.25, 0.25 + expectedScale.y),
        new Vector2(0.25 + expectedScale.x, 0.25 + expectedScale.y),
      ];

      animationSet?.animationFrames.forEach((frame, index) => {
        expect(frame.offset).toEqual(expectedOffsets[index]);
      });
    });

    it('should set nextAnimationSetName if provided', () => {
      const entityType = 'player';
      const animationType = 'attack';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;
      const nextAnimationSetName = 'idle';

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
        { nextAnimationSetName },
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );
      expect(animationSet).not.toBeNull();
      expect(animationSet?.nextAnimationSetName).toBe(nextAnimationSetName);
    });

    it('should handle single frame animations correctly', () => {
      const entityType = 'player';
      const animationType = 'idle';
      const spritesPerColumn = 1;
      const spritesPerRow = 1;
      const frameDuration = 1;

      animationSetManager.createAnimationSet(
        entityType,
        animationType,
        spritesPerColumn,
        spritesPerRow,
        frameDuration,
      );

      const animationSet = animationSetManager.getAnimationSet(
        entityType,
        animationType,
      );
      expect(animationSet).not.toBeNull();
      expect(animationSet?.animationFrames.length).toBe(1);
      expect(animationSet?.animationFrames[0].durationSeconds).toBe(
        frameDuration,
      );
    });
  });
});
