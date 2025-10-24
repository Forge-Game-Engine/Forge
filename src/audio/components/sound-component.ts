import { Howl, type HowlOptions } from 'howler';
import type { Component } from '../../ecs/index.js';

/**
 * Component to manage sounds in the game.
 */
export class SoundComponent implements Component {
  public name: symbol;
  public sound: Howl;
  public playSound: boolean;

  public static readonly symbol = Symbol('Sound');

  /**
   * Creates an instance of SoundComponent.
   * @param options - The HowlOptions to configure the sound.
   * @param playSound - A boolean indicating whether to play the sound immediately.
   *
   * @see {@link https://github.com/goldfire/howler.js#documentation|Howler.js Documentation}
   *
   * @example
   * const soundComponent = new SoundComponent({
   *   src: ['sound.mp3'],
   *   volume: 0.5,
   * }, true);
   */
  constructor(options: HowlOptions, playSound = false) {
    this.name = SoundComponent.symbol;
    this.sound = new Howl(options);
    this.playSound = playSound;
  }
}
