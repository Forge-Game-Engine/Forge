import { describe, expect, it, vi } from 'vitest';
import type { Material } from './materials/material.js';
import type { RenderCommand } from './render-command.js';
import { Renderable } from './renderable.js';

describe('Renderable', () => {
  it('holds its material, instance layout and batch binding', () => {
    const material = { program: {} } as Material;
    const bindInstanceData = vi.fn();
    const setupInstanceAttributes = vi.fn();
    const bindBatch = vi.fn();

    const renderable = new Renderable(
      material,
      20,
      bindInstanceData,
      setupInstanceAttributes,
      bindBatch,
    );

    expect(renderable.material).toBe(material);
    expect(renderable.floatsPerInstance).toBe(20);
    expect(renderable.bindInstanceData).toBe(bindInstanceData);
    expect(renderable.setupInstanceAttributes).toBe(setupInstanceAttributes);
    expect(renderable.bindBatch).toBe(bindBatch);
  });

  it('passes the gl context and the batch command to bindBatch', () => {
    const bindBatch = vi.fn();
    const renderable = new Renderable(
      { program: {} } as Material,
      20,
      vi.fn(),
      vi.fn(),
      bindBatch,
    );
    const gl = {} as WebGL2RenderingContext;
    const command = {} as RenderCommand;

    renderable.bindBatch(gl, command);

    expect(bindBatch).toHaveBeenCalledWith(gl, command);
  });
});
