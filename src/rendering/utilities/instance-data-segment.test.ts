import { describe, expect, it, vi } from 'vitest';
import { EcsWorld } from '../../ecs/index.js';
import { Renderable } from '../renderable.js';
import {
  combineInstanceDataSegments,
  InstanceDataSegment,
} from './instance-data-segment.js';

describe('combineInstanceDataSegments', () => {
  const mockWorld = {} as EcsWorld;
  const mockGl = {} as WebGL2RenderingContext;
  const mockRenderable = {} as Renderable;

  const createSegment = (floatsPerInstance: number): InstanceDataSegment => ({
    floatsPerInstance,
    bindInstanceData: vi.fn(),
    setupInstanceAttributes: vi.fn(),
  });

  it('should throw when no segments are provided', () => {
    expect(() => combineInstanceDataSegments()).toThrow();
  });

  it('should sum floatsPerInstance across all segments', () => {
    const layout = combineInstanceDataSegments(
      createSegment(17),
      createSegment(3),
    );

    expect(layout.floatsPerInstance).toBe(20);
  });

  it('should bind each segment at its offset within the instance', () => {
    const first = createSegment(17);
    const second = createSegment(3);

    const layout = combineInstanceDataSegments(first, second);
    const buffer = new Float32Array(20);

    layout.bindInstanceData(1, mockWorld, buffer, 0);

    expect(first.bindInstanceData).toHaveBeenCalledWith(
      1,
      mockWorld,
      buffer,
      0,
    );
    expect(second.bindInstanceData).toHaveBeenCalledWith(
      1,
      mockWorld,
      buffer,
      17,
    );
  });

  it('should offset bindInstanceData calls by the buffer offset for the instance', () => {
    const first = createSegment(17);
    const second = createSegment(3);

    const layout = combineInstanceDataSegments(first, second);
    const buffer = new Float32Array(40);

    layout.bindInstanceData(1, mockWorld, buffer, 20);

    expect(first.bindInstanceData).toHaveBeenCalledWith(
      1,
      mockWorld,
      buffer,
      20,
    );
    expect(second.bindInstanceData).toHaveBeenCalledWith(
      1,
      mockWorld,
      buffer,
      37,
    );
  });

  it('should set up attributes for each segment at its offset within the instance', () => {
    const first = createSegment(17);
    const second = createSegment(3);

    const layout = combineInstanceDataSegments(first, second);

    layout.setupInstanceAttributes(mockGl, mockRenderable);

    expect(first.setupInstanceAttributes).toHaveBeenCalledWith(
      mockGl,
      mockRenderable,
      0,
    );
    expect(second.setupInstanceAttributes).toHaveBeenCalledWith(
      mockGl,
      mockRenderable,
      17,
    );
  });
});
