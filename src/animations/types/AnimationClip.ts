import { ForgeEvent, ParameterizedForgeEvent } from '../../events/index.js';
import type { Texture } from '../../rendering/texture.js';
import type { TextureRegion } from '../../rendering/texture-region.js';

/**
 * Event type that is raised when the animation frame changes.
 */
export type OnAnimationFrameChangeEvent =
  ParameterizedForgeEvent<TextureRegion>;

/**
 * A sequence of frames, all regions of one texture, that a sprite animation
 * plays in order, looping back to the first frame after the last. A sprite
 * playing the clip draws its `texture`: the sprite animation system writes
 * it to the sprite's `texture` with each frame's `region`. Frames can differ
 * in trim: each is drawn inside the sprite's untrimmed `width`/`height`.
 *
 * Build a clip from an atlas with `createAtlasAnimationClip`, which also
 * checks that its frames share one untrimmed size and pivot. The
 * constructor takes the regions as given.
 */
export class AnimationClip {
  /**
   * The texture every frame is a region of.
   */
  public readonly texture: Texture;

  /**
   * The frames of the animation, in play order.
   */
  public readonly frames: readonly TextureRegion[];

  /**
   * The total number of frames in the animation.
   */
  public readonly frameCount: number;

  /**
   * Event that is raised when the animation starts.
   */
  public readonly onAnimationStartEvent: ForgeEvent;

  /**
   * Event that is raised when the animation ends.
   */
  public readonly onAnimationEndEvent: ForgeEvent;

  /**
   * Event that is raised every frame change. This includes the first and last frame change of an animation
   */
  public readonly onAnimationFrameChangeEvent: OnAnimationFrameChangeEvent;

  /**
   * Creates an animation clip.
   * @param texture - The texture the frames are regions of.
   * @param frames - The frames of the animation, in play order. The array
   * is copied.
   * @throws An error if `frames` is empty.
   */
  constructor(texture: Texture, frames: readonly TextureRegion[]) {
    if (frames.length === 0) {
      throw new Error('Animation must contain at least one frame.');
    }

    this.texture = texture;
    this.frames = Object.freeze([...frames]);
    this.frameCount = frames.length;

    this.onAnimationStartEvent = new ForgeEvent('AnimationStartEvent');
    this.onAnimationEndEvent = new ForgeEvent('AnimationEndEvent');
    this.onAnimationFrameChangeEvent =
      new ParameterizedForgeEvent<TextureRegion>('AnimationFrameChangeEvent');
  }

  /**
   * Gets a specific frame of the animation.
   * @param index - The index of the frame to retrieve.
   * @returns The requested frame.
   * @throws An error if `index` is less than `0` or not less than `frameCount`.
   */
  public getFrame(index: number): TextureRegion {
    if (index < 0 || index >= this.frames.length) {
      throw new Error('Frame index is out of bounds.');
    }

    return this.frames[index];
  }
}
