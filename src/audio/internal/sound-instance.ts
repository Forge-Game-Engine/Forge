import type { SoundAsset } from '../sound-asset.js';
import {
  assertMixerNotStopped,
  assertValidRate,
  assertValidVolume,
  BusInternals,
  smoothParamTo,
  StoppableInstance,
} from './audio-internals.js';

/**
 * How a {@link SoundInstance} starts playing.
 */
export interface SoundInstanceOptions {
  volume: number;
  rate: number;
  loop: boolean;
  /** Where in the sound to start, in seconds. */
  offsetSeconds: number;
}

/**
 * How long a stopped sound takes to fade out, in seconds. Cutting a waveform
 * off mid-cycle clicks; a fade this short isn't heard as one.
 */
const stopFadeSeconds = 0.02;

/**
 * One playback of a sound: a one-use `AudioBufferSourceNode` feeding its own
 * `GainNode`, connected to a bus. Changes to volume and rate apply while it
 * plays, and it can move to another bus of the same mixer without
 * restarting.
 */
export class SoundInstance implements StoppableInstance {
  private _bus: BusInternals;
  private readonly _sound: SoundAsset;
  private readonly _source: AudioBufferSourceNode;
  private readonly _gain: GainNode;
  private _rate: number;
  private _loop: boolean;
  // Position tracking: where in the sound the current stretch of playback
  // (since the start or the last rate or loop change) began, and when.
  private _segmentStartPositionSeconds: number;
  private _segmentStartTime: number;
  private _hasEnded = false;
  private _isStopping = false;

  /**
   * Starts playing `sound` on `bus`.
   * @param bus - The bus to play through.
   * @param sound - The sound to play.
   * @param options - How to play it.
   * @throws If the bus's mixer has been stopped, or the volume or rate is invalid.
   */
  constructor(
    bus: BusInternals,
    sound: SoundAsset,
    options: SoundInstanceOptions,
  ) {
    const { volume, rate, loop, offsetSeconds } = options;

    assertMixerNotStopped(bus.mixer);

    assertValidVolume(volume, 'a sound');
    assertValidRate(rate);

    const { context } = bus.mixer;

    this._bus = bus;
    this._sound = sound;
    this._rate = rate;
    this._loop = loop;
    this._segmentStartPositionSeconds = offsetSeconds;
    this._segmentStartTime = context.currentTime;

    this._source = context.createBufferSource();
    this._source.buffer = sound.buffer;
    this._source.loop = loop;
    this._source.playbackRate.value = rate;

    this._gain = context.createGain();
    this._gain.gain.value = volume;

    this._source.connect(this._gain);
    this._gain.connect(bus.gain);

    this._source.addEventListener('ended', this._handleEnded);
    bus.mixer.instances.add(this);

    this._source.start(0, offsetSeconds);
  }

  /**
   * Whether the sound is still playing: it hasn't ended or been stopped.
   */
  get isPlaying(): boolean {
    return !this._hasEnded && !this._isStopping;
  }

  /**
   * Whether the sound has ended, either by playing to its end, by being
   * stopped, or because its mixer was stopped.
   */
  get hasEnded(): boolean {
    return this._hasEnded;
  }

  /**
   * How far into the sound playback is, in seconds of the sound itself
   * (so at a rate of 2, it advances two seconds per second).
   */
  get positionSeconds(): number {
    const elapsed =
      this._bus.mixer.context.currentTime - this._segmentStartTime;
    const position = this._segmentStartPositionSeconds + elapsed * this._rate;
    const duration = this._sound.durationSeconds;

    if (this._loop && duration > 0) {
      return position % duration;
    }

    return position;
  }

  /**
   * Changes the volume smoothly.
   * @param volume - The new volume.
   * @throws If `volume` is negative or not finite.
   */
  public setVolume(volume: number): void {
    assertValidVolume(volume, 'a sound');

    if (!this.isPlaying) {
      return;
    }

    smoothParamTo(this._gain.gain, volume, this._bus.mixer.context.currentTime);
  }

  /**
   * Changes the playback rate (and so the pitch) from now on.
   * @param rate - The new rate.
   * @throws If `rate` is 0 or less, or not finite.
   */
  public setRate(rate: number): void {
    assertValidRate(rate);

    if (!this.isPlaying) {
      return;
    }

    this._startNewSegment();
    this._rate = rate;

    // Set exactly rather than ramped, so the playback position stays known.
    const { currentTime } = this._bus.mixer.context;

    this._source.playbackRate.cancelScheduledValues(currentTime);
    this._source.playbackRate.setValueAtTime(rate, currentTime);
  }

  /**
   * Turns looping on or off without restarting.
   * @param loop - Whether to loop.
   */
  public setLoop(loop: boolean): void {
    if (!this.isPlaying) {
      return;
    }

    this._startNewSegment();
    this._loop = loop;
    this._source.loop = loop;
  }

  /**
   * Moves the sound to another bus of the same mixer, without restarting.
   * @param bus - The bus to move to.
   * @throws If `bus` belongs to a different mixer.
   */
  public setBus(bus: BusInternals): void {
    if (bus.mixer !== this._bus.mixer) {
      throw new Error(
        'Unable to move a sound to a bus of a different sound mixer. A sound can only move between buses of the mixer it started on.',
      );
    }

    if (!this.isPlaying) {
      this._bus = bus;

      return;
    }

    this._gain.disconnect();
    this._gain.connect(bus.gain);
    this._bus = bus;
  }

  /**
   * Fades the sound out over a few milliseconds and stops it. Does nothing
   * if it's already stopping or has ended.
   */
  public stop(): void {
    if (!this.isPlaying) {
      return;
    }

    this._isStopping = true;

    const { currentTime } = this._bus.mixer.context;
    const gain = this._gain.gain;

    // A linear ramp, since `setTargetAtTime` only approaches 0.
    gain.cancelScheduledValues(currentTime);
    gain.setValueAtTime(gain.value, currentTime);
    gain.linearRampToValueAtTime(0, currentTime + stopFadeSeconds);
    this._source.stop(currentTime + stopFadeSeconds);
  }

  /**
   * Stops the sound at once, without waiting for the context to report it
   * ended, which a closing context never does.
   */
  public stopImmediately(): void {
    if (this._hasEnded) {
      return;
    }

    this._source.removeEventListener('ended', this._handleEnded);

    try {
      this._source.stop();
    } catch {
      // Already stopped: nothing left to do but disconnect.
    }

    this._end();
  }

  private _startNewSegment(): void {
    this._segmentStartPositionSeconds = this.positionSeconds;
    this._segmentStartTime = this._bus.mixer.context.currentTime;
  }

  private _end(): void {
    this._hasEnded = true;
    this._source.disconnect();
    this._gain.disconnect();
    this._bus.mixer.instances.delete(this);
  }

  private readonly _handleEnded = (): void => {
    this._source.removeEventListener('ended', this._handleEnded);
    this._end();
  };
}
