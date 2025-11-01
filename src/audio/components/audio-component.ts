import { Howl, type HowlOptions } from 'howler';
import type { Component } from '../../ecs/index.js';

/**
 * Component to manage audio in the game.
 */
export class AudioComponent implements Component {
  public name: symbol;
  public sound: Howl;
  public playSound: boolean;

  public static readonly symbol = Symbol('Sound');

  /**
   * Creates an instance of AudioComponent.
   * @param options - The HowlOptions to configure the sound.
   * @param playSound - A boolean indicating whether to play the sound immediately. Default is false.
   *
   * @see {@link https://github.com/goldfire/howler.js#documentation|Howler.js Documentation}
   *
   * @example
   * const audioComponent = new AudioComponent({
   *   src: ['sound.mp3'],
   *   volume: 0.5,
   * }, true);
   */
  constructor(options: HowlOptions, playSound = false) {
    this.name = AudioComponent.symbol;
    this.sound = new Howl(options);
    this.playSound = playSound;
  }
}
