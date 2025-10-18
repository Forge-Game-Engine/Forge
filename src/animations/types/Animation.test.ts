import { describe, expect, it } from 'vitest';
import { Animation } from './Animation';
import { AnimationFrame } from './AnimationFrame';
import { ParameterizedForgeEvent } from '../../events';

describe('Animation', () => {
  const mockFrame1 = {} as AnimationFrame;
  const mockFrame2 = {} as AnimationFrame;
  const mockFrames = [mockFrame1, mockFrame2];

  describe('constructor', () => {
    it('should create an Animation instance with the given name and frames', () => {
      const animation = new Animation('TestAnimation', mockFrames);

      expect(animation.name).toBe('TestAnimation');
      expect(animation.frames).toEqual(mockFrames);
      expect(animation.onAnimationStartEvent).toBeInstanceOf(
        ParameterizedForgeEvent,
      );
      expect(animation.onAnimationEndEvent).toBeInstanceOf(
        ParameterizedForgeEvent,
      );
      expect(animation.onAnimationFrameChangeEvent).toBeInstanceOf(
        ParameterizedForgeEvent,
      );
    });

    it('should throw an error if no frames are provided', () => {
      expect(() => new Animation('TestAnimation', [])).toThrowError(
        'Animation must contain at least one frame.',
      );
    });
  });

  describe('getFrame', () => {
    it('should return the correct frame for a valid index', () => {
      const animation = new Animation('TestAnimation', mockFrames);

      expect(animation.getFrame(0)).toBe(mockFrame1);
      expect(animation.getFrame(1)).toBe(mockFrame2);
    });

    it('should throw an error if the index is out of bounds', () => {
      const animation = new Animation('TestAnimation', mockFrames);

      expect(() => animation.getFrame(-1)).toThrowError(
        'Frame index is out of bounds.',
      );
      expect(() => animation.getFrame(2)).toThrowError(
        'Frame index is out of bounds.',
      );
    });
  });
});
