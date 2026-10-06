// A minimal stand-in for the Web Audio API, which jsdom doesn't have. It
// records the graph (connections, parameter values, start and stop calls)
// instead of producing sound, and lets a test move time and state along.

export class FakeAudioParam {
  public value: number;
  public readonly calls: string[] = [];

  constructor(value: number) {
    this.value = value;
  }

  public setTargetAtTime(value: number, startTime: number): this {
    this.calls.push(`setTargetAtTime(${value}, ${startTime})`);
    this.value = value;

    return this;
  }

  public setValueAtTime(value: number, startTime: number): this {
    this.calls.push(`setValueAtTime(${value}, ${startTime})`);
    this.value = value;

    return this;
  }

  public linearRampToValueAtTime(value: number, endTime: number): this {
    this.calls.push(`linearRampToValueAtTime(${value}, ${endTime})`);
    this.value = value;

    return this;
  }

  public cancelScheduledValues(): this {
    return this;
  }
}

export class FakeAudioNode extends EventTarget {
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

export class FakeBufferSourceNode extends FakeAudioNode {
  public buffer: unknown = null;
  public loop = false;
  public readonly playbackRate = new FakeAudioParam(1);
  public startCall: { when: number; offset: number } | null = null;
  public stopTime: number | null = null;

  public start(when = 0, offset = 0): void {
    this.startCall = { when, offset };
  }

  public stop(when = 0): void {
    this.stopTime = when;
  }

  /** Simulates the browser reporting that the source has ended. */
  public end(): void {
    this.dispatchEvent(new Event('ended'));
  }
}

export class FakeAudioContext extends EventTarget {
  public state: string;
  public currentTime = 0;
  public readonly destination = new FakeAudioNode();
  public readonly gains: FakeGainNode[] = [];
  public readonly sources: FakeBufferSourceNode[] = [];
  public resumeCalls = 0;
  public decodeAudioData: (bytes: ArrayBuffer) => Promise<unknown>;

  constructor(state = 'suspended') {
    super();
    this.state = state;
    this.decodeAudioData = () => Promise.resolve({ duration: 1 });
  }

  public createGain(): FakeGainNode {
    const gain = new FakeGainNode();

    this.gains.push(gain);

    return gain;
  }

  public createBufferSource(): FakeBufferSourceNode {
    const source = new FakeBufferSourceNode();

    this.sources.push(source);

    return source;
  }

  public resume(): Promise<void> {
    this.resumeCalls++;

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

  /** Changes the state and fires `statechange`, as the browser would. */
  public setState(state: string): void {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }

  /** The fake typed as the real thing, for the APIs that take one. */
  public asAudioContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}

/**
 * A stand-in for `AudioBuffer`, which jsdom doesn't have. Install it with
 * `vi.stubGlobal('AudioBuffer', FakeAudioBuffer)`.
 */
export class FakeAudioBuffer {
  public readonly length: number;
  public readonly numberOfChannels: number;
  public readonly sampleRate: number;
  public readonly channels: Float32Array[];

  constructor(options: {
    length: number;
    numberOfChannels: number;
    sampleRate: number;
  }) {
    this.length = options.length;
    this.numberOfChannels = options.numberOfChannels;
    this.sampleRate = options.sampleRate;
    this.channels = Array.from(
      { length: options.numberOfChannels },
      () => new Float32Array(options.length),
    );
  }

  get duration(): number {
    return this.length / this.sampleRate;
  }

  public copyToChannel(source: Float32Array, channel: number): void {
    this.channels[channel].set(source);
  }
}

/**
 * A sound asset backed by a fake buffer, for tests that only need
 * something to play.
 * @param durationSeconds - The sound's duration.
 * @returns The sound asset.
 */
export const createFakeSoundAsset = (
  durationSeconds = 2,
): { buffer: AudioBuffer; durationSeconds: number } => ({
  buffer: { duration: durationSeconds } as unknown as AudioBuffer,
  durationSeconds,
});
