import { describe, expect, it } from 'vitest';
import { AnimationClip } from './AnimationClip';
import { AnimationFrame } from './AnimationFrame';
import { ForgeEvent, ParameterizedForgeEvent } from '../../events';

describe('Animation Clip', () => {
  const mockFrame1 = {} as AnimationFrame;
  const mockFrame2 = {} as AnimationFrame;
  const mockFrames = [mockFrame1, mockFrame2];

  describe('constructor', () => {
    it('should create an Animation clip with the given frames', () => {
      const animation = new AnimationClip(mockFrames);

      expect(animation.frames).toEqual(mockFrames);
      expect(animation.onAnimationStartEvent).toBeInstanceOf(ForgeEvent);
      expect(animation.onAnimationEndEvent).toBeInstanceOf(ForgeEvent);
      expect(animation.onAnimationFrameChangeEvent).toBeInstanceOf(
        ParameterizedForgeEvent,
      );
    });

    it('should throw an error if no frames are provided', () => {
      expect(() => new AnimationClip([])).toThrow(
        'Animation must contain at least one frame.',
      );
    });
  });

  describe('getFrame', () => {
    it('should return the correct frame for a valid index', () => {
      const animation = new AnimationClip(mockFrames);

      expect(animation.getFrame(0)).toBe(mockFrame1);
      expect(animation.getFrame(1)).toBe(mockFrame2);
    });

    it('should throw an error if the index is out of bounds', () => {
      const animation = new AnimationClip(mockFrames);

      expect(() => animation.getFrame(-1)).toThrow(
        'Frame index is out of bounds.',
      );
      expect(() => animation.getFrame(2)).toThrow(
        'Frame index is out of bounds.',
      );
    });
  });
});
