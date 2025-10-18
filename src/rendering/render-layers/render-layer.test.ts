import { beforeEach, describe, expect, it } from 'vitest';
import { RenderLayer } from './render-layer';
import { Vector2 } from '../../math';

class TestRenderLayer extends RenderLayer {
  constructor(name: string, canvas: HTMLCanvasElement) {
    super(name, canvas);
  }
}

describe('RenderLayer', () => {
  let canvas: HTMLCanvasElement;
  let renderLayer: RenderLayer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    renderLayer = new TestRenderLayer('test-layer', canvas);
  });

  it('should create a new RenderLayer with the specified name and canvas', () => {
    expect(renderLayer.name).toBe('test-layer');
    expect(renderLayer.canvas).toBe(canvas);
    expect(renderLayer.center.equals(new Vector2(400, 300))).toBe(true);
  });

  it('should resize the canvas and update the center', () => {
    renderLayer.resize(1024, 768);

    expect(renderLayer.canvas.width).toBe(1024);
    expect(renderLayer.canvas.height).toBe(768);
    expect(renderLayer.center.equals(new Vector2(512, 384))).toBe(true);
  });
});
