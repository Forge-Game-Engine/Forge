import { describe, expect, it, vi } from 'vitest';
import { Space } from './space';

describe('Space', () => {
  it('should create an instance of Space with the correct dimensions', () => {
    const space = new Space(800, 600);

    expect(space.width).toBe(800);
    expect(space.height).toBe(600);
    expect(space.center.x).toEqual(400);
    expect(space.center.y).toEqual(300);
  });

  it('should update the dimensions and center point of the space', () => {
    const space = new Space(800, 600);

    space.setValue(1024, 768);

    expect(space.width).toBe(1024);
    expect(space.height).toBe(768);
    expect(space.center.x).toEqual(512);
    expect(space.center.y).toEqual(384);
  });

  it('should raise the onSpaceChange event when dimensions are updated', () => {
    const space = new Space(800, 600);

    const mockRaise = vi.spyOn(space.onSpaceChange, 'raise');

    space.setValue(1024, 768);

    expect(mockRaise).toHaveBeenCalled();
  });
});
