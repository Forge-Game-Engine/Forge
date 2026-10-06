import type { MixerBus } from '../mixer-bus.js';
import {
  assertValidVolume,
  MixerInternals,
  registerBusInternals,
  smoothParamTo,
} from './audio-internals.js';

/**
 * Creates a bus whose gain node feeds `destination`.
 * @param mixer - The mixer the bus belongs to.
 * @param name - The bus's name.
 * @param parent - The bus it feeds into, or `null` for the master bus.
 * @param destination - The node its gain connects to.
 * @returns The bus.
 */
export const createMixerBus = (
  mixer: MixerInternals,
  name: string,
  parent: MixerBus | null,
  destination: AudioNode,
): MixerBus => {
  const gain = mixer.context.createGain();
  let volume = 1;
  let muted = false;

  gain.connect(destination);

  const applyGain = (): void => {
    smoothParamTo(gain.gain, muted ? 0 : volume, mixer.context.currentTime);
  };

  const bus: MixerBus = {
    name,
    parent,
    get volume(): number {
      return volume;
    },
    set volume(value: number) {
      assertValidVolume(value, `the bus "${name}"`);
      volume = value;
      applyGain();
    },
    get muted(): boolean {
      return muted;
    },
    set muted(value: boolean) {
      muted = value;
      applyGain();
    },
  };

  registerBusInternals(bus, { mixer, gain });

  return bus;
};
