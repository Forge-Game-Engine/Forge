import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTextEntryService,
  TextEntryService,
} from './text-entry-service.js';

describe('createTextEntryService', () => {
  let container: HTMLDivElement;
  let service: TextEntryService;

  beforeEach(() => {
    container = document.createElement('div');
    service = createTextEntryService(container);
  });

  it('creates an entry in its container for an owner, unclaimed', () => {
    const entry = service.create(7);

    expect(entry.element.parentElement).toBe(container);
    expect(service.get(7)).toBe(entry);
    expect(service.get(8)).toBeNull();
    expect(service.unclaimedOwners).toEqual([7]);
  });

  it("disposes an owner's previous entry when it creates another", () => {
    const first = service.create(7);
    const second = service.create(7);

    expect(first.element.isConnected).toBe(false);
    expect(second.element.parentElement).toBe(container);
    expect(service.get(7)).toBe(second);
    expect(service.unclaimedOwners).toEqual([7]);
  });

  it('claims an owner, and puts it back when told to', () => {
    service.create(1);
    service.create(2);

    service.claim(1);
    expect(service.unclaimedOwners).toEqual([2]);

    service.unclaim(1);
    service.unclaim(1);
    service.unclaim(3);
    expect([...service.unclaimedOwners].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it("releases an owner's entry", () => {
    const entry = service.create(1);

    service.release(1);
    service.release(1);

    expect(entry.element.isConnected).toBe(false);
    expect(service.get(1)).toBeNull();
    expect(service.unclaimedOwners).toEqual([]);
  });

  it('removes every entry and listener in releaseAll, and stays usable', () => {
    const listener = vi.fn();
    const first = service.create(1);
    const second = service.create(2);

    service.claim(2);
    service.listen('pointerdown', listener);
    expect(service.isListening).toBe(true);

    service.releaseAll();
    container.dispatchEvent(new Event('pointerdown'));

    expect(listener).not.toHaveBeenCalled();
    expect(service.isListening).toBe(false);
    expect(first.element.isConnected).toBe(false);
    expect(second.element.isConnected).toBe(false);
    expect(service.unclaimedOwners).toEqual([]);
    expect(service.create(1).element.parentElement).toBe(container);
  });
});
