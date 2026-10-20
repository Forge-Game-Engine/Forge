import { describe, expect, it } from 'vitest';
import { AnimationClip } from './AnimationClip';
import { ForgeEvent, ParameterizedForgeEvent } from '../../events';
import type { Texture } from '../../rendering/texture';
import { createTextureRegion } from '../../rendering/texture-region';

describe('Animation Clip', () => {
  const mockTexture = { width: 64, height: 32 } as Texture;
  const mockFrame1 = createTextureRegion({ x: 0, y: 0 }, { x: 0.5, y: 1 });
  const mockFrame2 = createTextureRegion({ x: 0.5, y: 0 }, { x: 0.5, y: 1 });
  const mockFrames = [mockFrame1, mockFrame2];

  describe('constructor', () => {
    it('should create an Animation clip with the given texture and frames', () => {
      const animation = new AnimationClip(mockTexture, mockFrames);

      expect(animation.texture).toBe(mockTexture);
      expect(animation.frames).toEqual(mockFrames);
      expect(animation.frameCount).toBe(2);
      expect(animation.onAnimationStartEvent).toBeInstanceOf(ForgeEvent);
      expect(animation.onAnimationEndEvent).toBeInstanceOf(ForgeEvent);
      expect(animation.onAnimationFrameChangeEvent).toBeInstanceOf(
        ParameterizedForgeEvent,
      );
    });

    it('should copy and freeze the frames', () => {
      const frames = [...mockFrames];
      const animation = new AnimationClip(mockTexture, frames);

      frames.push(mockFrame1);

      expect(animation.frames).toEqual(mockFrames);
      expect(Object.isFrozen(animation.frames)).toBe(true);
    });

    it('should throw an error if no frames are provided', () => {
      expect(() => new AnimationClip(mockTexture, [])).toThrow(
        'Animation must contain at least one frame.',
      );
    });
  });

  describe('getFrame', () => {
    it('should return the correct frame for a valid index', () => {
      const animation = new AnimationClip(mockTexture, mockFrames);

      expect(animation.getFrame(0)).toBe(mockFrame1);
      expect(animation.getFrame(1)).toBe(mockFrame2);
    });

    it('should throw an error if the index is out of bounds', () => {
      const animation = new AnimationClip(mockTexture, mockFrames);

      expect(() => animation.getFrame(-1)).toThrow(
        'Frame index is out of bounds.',
      );
      expect(() => animation.getFrame(2)).toThrow(
        'Frame index is out of bounds.',
      );
    });
  });
});
