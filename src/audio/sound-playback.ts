import type { SoundAsset } from './sound-asset.js';
import {
  AudioBus,
  gainRampSettleSeconds,
  gainRampTimeConstantSeconds,
} from './audio-bus.js';

/**
 * How a playback plays its sound.
 */
export interface SoundPlaybackSettings {
  volume: number;
  rate: number;
  loop: boolean;
}

/**
 * One playback of a sound asset: an `AudioBufferSourceNode` feeding a
 * `GainNode` that feeds a bus. A source node can only be started once, so
 * pausing stops it and resuming starts a new one at the paused position.
 * The playback tracks that position itself from the context's clock.
 *
 * `playSound` and `createSoundEcsSystem` both play sounds through this
 * class. It isn't exported from the audio module: games use those two.
 */
export class SoundPlayback {
  public readonly sound: SoundAsset;
  private _bus: AudioBus;
  private _volume: number;
  private _rate: number;
  private _loop: boolean;
  private _source: AudioBufferSourceNode | null = null;
  private _gain: GainNode | null = null;
  private _hasEnded = false;
  private _isStopped = false;
  private _hasStarted = false;

  /** The playback position, in seconds of the sound, at `_anchorTime`. */
  private _anchorPosition = 0;

  /** The context time `_anchorPosition` was taken at. */
  private _anchorTime = 0;

  /**
   * Creates a playback. It's silent until {@link SoundPlayback.play} is called.
   * @param bus - The bus to play through.
   * @param sound - The sound to play.
   * @param settings - The playback's volume, rate and looping.
   */
  constructor(
    bus: AudioBus,
    sound: SoundAsset,
    settings: SoundPlaybackSettings,
  ) {
    this._bus = bus;
    this.sound = sound;
    this._volume = settings.volume;
    this._rate = settings.rate;
    this._loop = settings.loop;
  }

  /** Whether the playback's sound is currently playing (not paused, stopped or ended). */
  get isPlaying(): boolean {
    return this._source !== null;
  }

  /** Whether a non-looping playback has played to the end of its sound. */
  get hasEnded(): boolean {
    return this._hasEnded;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = value;
    this._gain?.gain.setTargetAtTime(
      value,
      this._context.currentTime,
      gainRampTimeConstantSeconds,
    );
  }

  get rate(): number {
    return this._rate;
  }

  set rate(value: number) {
    this._rebasePosition();
    this._rate = value;
    this._source?.playbackRate.setValueAtTime(value, this._context.currentTime);
  }

  get loop(): boolean {
    return this._loop;
  }

  set loop(value: boolean) {
    this._rebasePosition();
    this._loop = value;

    if (this._source) {
      this._source.loop = value;
    }
  }

  get bus(): AudioBus {
    return this._bus;
  }

  set bus(value: AudioBus) {
    if (value.mixer !== this._bus.mixer) {
      throw new Error(
        `Unable to move a sound from bus "${this._bus.name}" to bus "${value.name}", the buses belong to different mixers.`,
      );
    }

    this._bus = value;

    if (this._gain) {
      this._gain.disconnect();
      this._gain.connect(value.node);
    }
  }

  /**
   * The playback position, in seconds of the sound (not of real time, when
   * `rate` isn't `1`).
   */
  get position(): number {
    const elapsed = this._source
      ? (this._context.currentTime - this._anchorTime) * this._rate
      : 0;
    const position = this._anchorPosition + elapsed;
    const duration = this.sound.durationSeconds;

    if (this._loop && duration > 0) {
      return position % duration;
    }

    return Math.min(position, duration);
  }

  private get _context(): AudioContext {
    return this._bus.mixer.context;
  }

  /**
   * Starts the sound from the beginning.
   *
   * A non-looping sound requested before the page has had user input is
   * dropped (it ends at once) instead: a sound effect nobody could hear
   * when it happened mustn't play late, all at once with every other one,
   * on the player's first click. A looping sound is state rather than an
   * event, so it starts, and is heard once the context runs.
   */
  public start(): void {
    this._hasStarted = true;

    if (!this._loop && !this._bus.mixer.isUnlocked()) {
      this._end();

      return;
    }

    this._startAt(0);
  }

  /**
   * Stops the sound and keeps its position for {@link SoundPlayback.resume}.
   */
  public pause(): void {
    if (!this._source) {
      return;
    }

    this._rebasePosition();
    this._release();
  }

  /**
   * Starts the sound again from where {@link SoundPlayback.pause} left it, fading
   * in so the cut into the middle of the waveform doesn't click. Starts a
   * playback that was never started, the same way {@link SoundPlayback.start} does.
   */
  public resume(): void {
    if (!this._hasStarted) {
      this.start();

      return;
    }

    if (this._source || this._isStopped || this._hasEnded) {
      return;
    }

    this._startAt(this.position);
  }

  /**
   * Fades the sound out over a few milliseconds and stops it. A stopped
   * playback can't be played again.
   */
  public stop(): void {
    this._isStopped = true;
    this._release();
  }

  private _startAt(position: number): void {
    const context = this._context;
    const duration = this.sound.durationSeconds;

    if (!this._loop && position >= duration) {
      this._end();

      return;
    }

    const gain = context.createGain();
    const source = context.createBufferSource();
    const now = context.currentTime;

    source.buffer = this.sound.buffer;
    source.loop = this._loop;
    source.playbackRate.setValueAtTime(this._rate, now);

    if (position > 0) {
      gain.gain.setValueAtTime(0, now);
      gain.gain.setTargetAtTime(this._volume, now, gainRampTimeConstantSeconds);
    } else {
      gain.gain.setValueAtTime(this._volume, now);
    }

    source.connect(gain);
    gain.connect(this._bus.node);

    source.onended = (): void => {
      if (this._source === source) {
        this._end();
      }
    };

    source.start(now, position);

    this._source = source;
    this._gain = gain;
    this._anchorPosition = position;
    this._anchorTime = now;
    this._bus.mixer.playbacks.add(this);
  }

  private _end(): void {
    this._disconnect();
    this._anchorPosition = this.sound.durationSeconds;
    this._hasEnded = true;
  }

  /** Moves the position anchor to now, before a change to how it advances. */
  private _rebasePosition(): void {
    this._anchorPosition = this.position;
    this._anchorTime = this._context.currentTime;
  }

  /** Fades the current nodes out and stops them, without a click. */
  private _release(): void {
    const source = this._source;
    const gain = this._gain;

    if (!source || !gain) {
      return;
    }

    const now = this._context.currentTime;

    gain.gain.setTargetAtTime(0, now, gainRampTimeConstantSeconds);

    source.onended = (): void => {
      source.disconnect();
      gain.disconnect();
    };

    source.stop(now + gainRampSettleSeconds);

    this._source = null;
    this._gain = null;
    this._bus.mixer.playbacks.delete(this);
  }

  private _disconnect(): void {
    this._source?.disconnect();
    this._gain?.disconnect();
    this._source = null;
    this._gain = null;
    this._bus.mixer.playbacks.delete(this);
  }
}
