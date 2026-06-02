import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventDispatcher } from './event-dispatcher';
import type { ParameterizedForgeEvent } from './parameterized-forge-event';

describe('EventDispatcher', () => {
  let eventDispatcher: EventDispatcher<string>;
  let mockEvent: ParameterizedForgeEvent<string>;

  beforeEach(() => {
    eventDispatcher = new EventDispatcher<string>();
    mockEvent = {
      raise: vi.fn(),
    } as unknown as ParameterizedForgeEvent<string>;
  });

  it('should add an event listener', () => {
    eventDispatcher.addEventListener('test-event', mockEvent);

    const listeners = eventDispatcher['_listeners'].get('test-event');
    expect(listeners).toBeDefined();
    expect(listeners?.has(mockEvent)).toBe(true);
  });

  it('should remove an event listener', () => {
    eventDispatcher.addEventListener('test-event', mockEvent);
    eventDispatcher.removeEventListener('test-event', mockEvent);

    const listeners = eventDispatcher['_listeners'].get('test-event');
    expect(listeners?.has(mockEvent)).toBe(false);
  });

  it('should dispatch an event to all listeners', () => {
    eventDispatcher.addEventListener('test-event', mockEvent);

    eventDispatcher.dispatchEvent('test-event', 'test-data');

    expect(mockEvent.raise).toHaveBeenCalledWith('test-data');
  });

  it('should not throw an error if dispatching an event with no listeners', () => {
    expect(() => {
      eventDispatcher.dispatchEvent('non-existent-event', 'test-data');
    }).not.toThrow();
  });

  it('should handle multiple listeners for the same event', () => {
    const mockEvent2 = {
      raise: vi.fn(),
    } as unknown as ParameterizedForgeEvent<string>;

    eventDispatcher.addEventListener('test-event', mockEvent);
    eventDispatcher.addEventListener('test-event', mockEvent2);

    eventDispatcher.dispatchEvent('test-event', 'test-data');

    expect(mockEvent.raise).toHaveBeenCalledWith('test-data');
    expect(mockEvent2.raise).toHaveBeenCalledWith('test-data');
  });
});
