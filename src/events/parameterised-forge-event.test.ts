import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ParameterizedForgeEvent } from './parameterized-forge-event';

describe('When creating an event', () => {
  const event = new ParameterizedForgeEvent<string>('test-event');
  const logic = vi.fn();
  const listener = async (data: string) => {
    await Promise.resolve();
    logic(`processed ${data}`);
  };

  beforeEach(() => {
    event.clear();
  });

  describe('and doing nothing else', () => {
    test('it should have no listeners by default', () => {
      expect(event.listeners.length).toBe(0);
    });
  });

  describe('and registering a listener', () => {
    test('it should have one listener', () => {
      event.registerListener(listener);

      expect(event.listeners.length).toBe(1);
    });

    describe('and raising an event', () => {
      test('it should call the listener', () => {
        event.registerListener(listener);
        event.raise('foo');

        expect(logic).toHaveBeenCalledOnce();
        expect(logic).toHaveBeenCalledWith('processed foo');
      });
    });

    describe('and de-registering the listener', () => {
      test('it should have no listeners', () => {
        event.registerListener(listener);
        event.deregisterListener(listener);

        expect(event.listeners.length).toBe(0);
      });
    });
  });
});
