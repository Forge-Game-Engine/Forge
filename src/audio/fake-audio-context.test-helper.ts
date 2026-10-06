import type { SoundMixerState } from './sound-mixer.js';

/**
 * A minimal stand-in for the Web Audio API, which jsdom doesn't have. Nodes
 * record their connections, parameters record their latest target value,
 * and source nodes record when they were started and stopped. Tests drive
 * the clock (`currentTime`) and the context's state themselves.
 *
 * Shared by the audio module's unit tests. `*.test-helper.ts` files are
 * excluded from the build and from coverage, like `*.test.ts` files.
 */

export class FakeAudioParam {
  public value: number;

  constructor(value: number) {
    this.value = value;
  }

  public setValueAtTime(value: number): this {
    this.value = value;

    return this;
  }

  public setTargetAtTime(value: number): this {
    return this.setValueAtTime(value);
  }
}

export class FakeAudioNode {
  public readonly connections = new Set<FakeAudioNode>();

  public connect(destination: FakeAudioNode): FakeAudioNode {
    this.connections.add(destination);

    return destination;
  }

  public disconnect(): void {
    this.connections.clear();
  }
}

export class FakeGainNode extends FakeAudioNode {
  public readonly gain = new FakeAudioParam(1);
}

export class FakeAudioBufferSourceNode extends FakeAudioNode {
  public buffer: FakeAudioBuffer | null = null;
  public loop = false;
  public readonly playbackRate = new FakeAudioParam(1);
  public onended: (() => void) | null = null;
  public startedAt: { when: number; offset: number } | null = null;
  public stoppedAt: number | null = null;

  public start(when = 0, offset = 0): void {
    this.startedAt = { when, offset };
  }

  public stop(when = 0): void {
    this.stoppedAt = when;
  }

  /** Simulates the browser firing `ended`. */
  public end(): void {
    this.onended?.();
  }
}

export class FakeAudioBuffer {
  public readonly duration: number;

  constructor(duration: number) {
    this.duration = duration;
  }
}

export class FakeAudioContext extends EventTarget {
  public currentTime = 0;
  public state: SoundMixerState = 'suspended';
  public readonly destination = new FakeAudioNode();
  public readonly sources: FakeAudioBufferSourceNode[] = [];
  public decodedBytes: ArrayBuffer[] = [];
  public decodeResult: () => Promise<FakeAudioBuffer> = () =>
    Promise.resolve(new FakeAudioBuffer(1));

  public createGain(): FakeGainNode {
    return new FakeGainNode();
  }

  public createBufferSource(): FakeAudioBufferSourceNode {
    const source = new FakeAudioBufferSourceNode();

    this.sources.push(source);

    return source;
  }

  public resume(): Promise<void> {
    this.setState('running');

    return Promise.resolve();
  }

  public suspend(): Promise<void> {
    this.setState('suspended');

    return Promise.resolve();
  }

  public close(): Promise<void> {
    this.setState('closed');

    return Promise.resolve();
  }

  public decodeAudioData(bytes: ArrayBuffer): Promise<FakeAudioBuffer> {
    this.decodedBytes.push(bytes);

    return this.decodeResult();
  }

  /** Changes `state` and fires `statechange`, as the browser does. */
  public setState(state: SoundMixerState): void {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }

  /** The fake typed as the real API, for code under test. */
  public asAudioContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}

/**
 * Sets `navigator.userActivation.hasBeenActive`, which jsdom doesn't have.
 * @param hasBeenActive - Whether the page has had user activation.
 */
export function setUserActivation(hasBeenActive: boolean): void {
  Object.defineProperty(navigator, 'userActivation', {
    configurable: true,
    value: { hasBeenActive, isActive: hasBeenActive },
  });
}

/**
 * Creates a sound asset backed by a fake buffer.
 * @param durationSeconds - The sound's length.
 * @returns The asset.
 */
export function createFakeSound(durationSeconds = 1): {
  buffer: AudioBuffer;
  durationSeconds: number;
} {
  return {
    buffer: new FakeAudioBuffer(durationSeconds) as unknown as AudioBuffer,
    durationSeconds,
  };
}
