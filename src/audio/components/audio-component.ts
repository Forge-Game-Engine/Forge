import { Howl, type HowlOptions } from 'howler';
import { Component } from '../../ecs/index.js';

/**
 * Component to manage audio in the game.
 */
export class AudioComponent extends Component {
  public sound: Howl;
  public playSound: boolean;

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
    super();

    this.sound = new Howl(options);
    this.playSound = playSound;
  }
}
