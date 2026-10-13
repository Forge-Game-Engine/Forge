/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ImageCache } from '../../asset-loading/index.js';
import type { Material } from '../materials/index.js';
import { RenderContext } from '../render-context.js';
import { ShaderCache } from '../shaders/index.js';
import { Geometry, GeometryOptions } from './geometry.js';

describe('Geometry', () => {
  let isLost: boolean;
  let gl: WebGL2RenderingContext;
  let canvas: HTMLCanvasElement;
  let renderContext: RenderContext;
  let material: Material;

  const newHandle = (): object => ({});

  const loseContext = (): void => {
    isLost = true;
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  };

  const restoreContext = (): void => {
    isLost = false;
    canvas.dispatchEvent(new Event('webglcontextrestored'));
  };

  const bufferDataCalls = (target: string): unknown[][] =>
    (gl.bufferData as Mock).mock.calls.filter(([t]) => t === target);

  const createGeometry = (options: Partial<GeometryOptions> = {}): Geometry =>
    new Geometry(renderContext, {
      attributes: [
        { name: 'a_position', data: new Float32Array(6), size: 2 },
        { name: 'a_alpha', data: new Float32Array(3), size: 1 },
      ],
      ...options,
    });

  beforeEach(() => {
    isLost = false;
    gl = {
      createBuffer: vi.fn(newHandle),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      bufferSubData: vi.fn(),
      deleteBuffer: vi.fn(),
      createVertexArray: vi.fn(newHandle),
      bindVertexArray: vi.fn(),
      deleteVertexArray: vi.fn(),
      getAttribLocation: vi.fn(() => 0),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
      drawArraysInstanced: vi.fn(),
      drawElementsInstanced: vi.fn(),
      viewport: vi.fn(),
      getParameter: vi.fn(() => null),
      getExtension: vi.fn(() => (isLost ? null : {})),
      isContextLost: vi.fn(() => isLost),
      ARRAY_BUFFER: 'ARRAY_BUFFER',
      ELEMENT_ARRAY_BUFFER: 'ELEMENT_ARRAY_BUFFER',
      STATIC_DRAW: 'STATIC_DRAW',
      DYNAMIC_DRAW: 'DYNAMIC_DRAW',
      FLOAT: 'FLOAT',
      UNSIGNED_SHORT: 'UNSIGNED_SHORT',
      UNSIGNED_INT: 'UNSIGNED_INT',
      TRIANGLES: 'TRIANGLES',
      TRIANGLE_STRIP: 'TRIANGLE_STRIP',
      LINES: 'LINES',
      LINE_STRIP: 'LINE_STRIP',
      POINTS: 'POINTS',
    } as unknown as WebGL2RenderingContext;

    canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);

    renderContext = new RenderContext(
      new ShaderCache([]),
      new ImageCache(),
      canvas,
    );
    material = { program: {} } as unknown as Material;
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('uploads each attribute to a static buffer of its own', () => {
      const data = new Float32Array([1, 2, 3, 4]);

      const geometry = new Geometry(renderContext, {
        attributes: [{ name: 'a_position', data, size: 2 }],
      });

      expect(geometry.vertexCount).toBe(2);
      expect(gl.createBuffer).toHaveBeenCalledTimes(1);
      expect(gl.bufferData).toHaveBeenCalledWith(
        'ARRAY_BUFFER',
        data,
        'STATIC_DRAW',
      );
    });

    it('takes its vertex count from the attributes', () => {
      expect(createGeometry().vertexCount).toBe(3);
    });

    it('draws triangles by default', () => {
      expect(createGeometry().topology).toBe('triangles');
    });

    it('throws for an attribute that is not a whole number of vertices', () => {
      expect(() =>
        createGeometry({
          attributes: [
            { name: 'a_position', data: new Float32Array(5), size: 2 },
          ],
        }),
      ).toThrow('a_position');
    });

    it('throws for attributes holding different numbers of vertices', () => {
      expect(() =>
        createGeometry({
          attributes: [
            { name: 'a_position', data: new Float32Array(6), size: 2 },
            { name: 'a_alpha', data: new Float32Array(4), size: 1 },
          ],
        }),
      ).toThrow('a_alpha');
    });

    it('uploads indices to a static element array buffer, with no vertex array bound', () => {
      const indices = new Uint16Array([0, 1, 2]);

      createGeometry({ indices });

      expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
      expect(gl.bufferData).toHaveBeenCalledWith(
        'ELEMENT_ARRAY_BUFFER',
        indices,
        'STATIC_DRAW',
      );
    });
  });

  describe('bounds', () => {
    const createTriangle = (positions: number[], size = 2): Geometry =>
      new Geometry(renderContext, {
        attributes: [
          { name: 'a_position', data: new Float32Array(positions), size },
        ],
      });

    it("surrounds the x and y of every vertex's a_position", () => {
      const geometry = createTriangle([-1, 2, 3, -4, 0.5, 1]);

      expect(geometry.bounds).toEqual({
        min: { x: -1, y: -4 },
        max: { x: 3, y: 2 },
      });
    });

    it('ignores z when a_position has three components', () => {
      const geometry = createTriangle([1, 1, 99, 2, 3, -99], 3);

      expect(geometry.bounds).toEqual({
        min: { x: 1, y: 1 },
        max: { x: 2, y: 3 },
      });
    });

    it('surrounds every vertex of an indexed geometry', () => {
      const geometry = new Geometry(renderContext, {
        attributes: [
          {
            name: 'a_position',
            data: new Float32Array([0, 0, 4, 0, 4, 2, 0, 2]),
            size: 2,
          },
        ],
        indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
      });

      expect(geometry.bounds).toEqual({
        min: { x: 0, y: 0 },
        max: { x: 4, y: 2 },
      });
    });

    it('is a zero-size rect at the origin for no vertices', () => {
      expect(createTriangle([]).bounds).toEqual({
        min: { x: 0, y: 0 },
        max: { x: 0, y: 0 },
      });
    });

    it('is computed again after update changes a_position', () => {
      const geometry = createTriangle([0, 0, 1, 1, 2, 0]);

      expect(geometry.bounds.max.x).toBe(2);

      geometry.update({
        vertexCount: 3,
        attributes: { a_position: new Float32Array([0, 0, 5, 5, 10, 0]) },
      });

      expect(geometry.bounds).toEqual({
        min: { x: 0, y: 0 },
        max: { x: 10, y: 5 },
      });
    });

    it('only counts the vertices drawn after update lowers vertexCount', () => {
      const geometry = createTriangle([0, 0, 1, 1, 9, 9]);

      geometry.update({ vertexCount: 2 });

      expect(geometry.bounds).toEqual({
        min: { x: 0, y: 0 },
        max: { x: 1, y: 1 },
      });
    });

    it('keeps its bounds when update only changes other attributes', () => {
      const geometry = createGeometry({
        attributes: [
          {
            name: 'a_position',
            data: new Float32Array([0, 0, 1, 1, 2, 0]),
            size: 2,
          },
          { name: 'a_alpha', data: new Float32Array(3), size: 1 },
        ],
      });
      const { bounds } = geometry;

      geometry.update({
        vertexCount: 3,
        attributes: { a_alpha: new Float32Array(3) },
      });

      expect(geometry.bounds).toBe(bounds);
    });

    it('throws without an a_position attribute', () => {
      const geometry = new Geometry(renderContext, {
        attributes: [{ name: 'a_alpha', data: new Float32Array(3), size: 1 }],
      });

      expect(() => geometry.bounds).toThrow('"a_position" attribute');
    });

    it('throws when a_position has one component', () => {
      expect(() => createTriangle([0, 1, 2], 1).bounds).toThrow('but it has 1');
    });
  });

  describe('getAttributeSize', () => {
    it("reads an attribute's size, or null for an attribute it doesn't have", () => {
      const geometry = createGeometry();

      expect(geometry.getAttributeSize('a_position')).toBe(2);
      expect(geometry.getAttributeSize('a_alpha')).toBe(1);
      expect(geometry.getAttributeSize('a_missing')).toBeNull();
    });
  });

  describe('bind', () => {
    it('binds the index buffer into the vertex array', () => {
      const geometry = createGeometry({ indices: new Uint16Array(3) });
      const indexBuffer = (gl.createBuffer as Mock).mock.results[2]
        .value as WebGLBuffer;

      vi.clearAllMocks();
      geometry.bind(material);

      expect(gl.bindBuffer).toHaveBeenCalledWith(
        'ELEMENT_ARRAY_BUFFER',
        indexBuffer,
      );
    });
  });

  describe('update', () => {
    it('reallocates a buffer once, as dynamic and a power of two bytes, the first time it is updated', () => {
      const geometry = createGeometry();
      const positions = new Float32Array([1, 2, 3, 4, 5, 6]);

      vi.clearAllMocks();
      geometry.update({
        vertexCount: 3,
        attributes: { a_position: positions },
      });

      expect(bufferDataCalls('ARRAY_BUFFER')).toEqual([
        ['ARRAY_BUFFER', 32, 'DYNAMIC_DRAW'],
      ]);
      expect(gl.bufferSubData).toHaveBeenCalledWith(
        'ARRAY_BUFFER',
        0,
        positions,
        0,
        6,
      );
    });

    it('writes data that fits the buffer with bufferSubData, without reallocating', () => {
      const geometry = createGeometry({
        attributes: [
          { name: 'a_position', data: new Float32Array(6), size: 2 },
        ],
      });

      geometry.update({
        vertexCount: 3,
        attributes: { a_position: new Float32Array(6) },
      });
      vi.clearAllMocks();

      // Holds five vertices, one more than are drawn.
      const positions = new Float32Array(10);

      geometry.update({
        vertexCount: 4,
        attributes: { a_position: positions },
      });

      expect(gl.bufferData).not.toHaveBeenCalled();
      expect(gl.bufferSubData).toHaveBeenCalledWith(
        'ARRAY_BUFFER',
        0,
        positions,
        0,
        8,
      );
    });

    it('grows a buffer that the data does not fit to the next power of two, once', () => {
      const geometry = createGeometry({
        attributes: [
          { name: 'a_position', data: new Float32Array(2), size: 2 },
        ],
      });

      geometry.update({
        vertexCount: 1,
        attributes: { a_position: new Float32Array(2) },
      });
      vi.clearAllMocks();

      const positions = new Float32Array(200);

      for (let vertexCount = 2; vertexCount <= 100; vertexCount++) {
        geometry.update({ vertexCount, attributes: { a_position: positions } });
      }

      // From 8 bytes to 16, 32, 64, 128, 256, 512 and then 1024, which holds
      // 100 vertices.
      expect(bufferDataCalls('ARRAY_BUFFER')).toEqual(
        [16, 32, 64, 128, 256, 512, 1024].map((bytes) => [
          'ARRAY_BUFFER',
          bytes,
          'DYNAMIC_DRAW',
        ]),
      );
      expect(gl.bufferSubData).toHaveBeenCalledTimes(99);
    });

    it('creates no buffers or vertex arrays, even when a buffer grows', () => {
      const geometry = createGeometry();

      geometry.bind(material);
      vi.clearAllMocks();

      geometry.update({
        vertexCount: 1000,
        attributes: {
          a_position: new Float32Array(2000),
          a_alpha: new Float32Array(1000),
        },
      });
      geometry.bind(material);

      expect(gl.createBuffer).not.toHaveBeenCalled();
      expect(gl.createVertexArray).not.toHaveBeenCalled();
      expect(gl.deleteBuffer).not.toHaveBeenCalled();
    });

    it('sets the vertex count to draw', () => {
      const geometry = createGeometry();

      geometry.update({ vertexCount: 2 });
      geometry.draw();

      expect(geometry.vertexCount).toBe(2);
      expect(gl.drawArrays).toHaveBeenCalledWith('TRIANGLES', 0, 2);
    });

    it('leaves an attribute it is not given alone', () => {
      const geometry = createGeometry();

      vi.clearAllMocks();
      geometry.update({
        vertexCount: 3,
        attributes: { a_position: new Float32Array(6) },
      });

      expect(gl.bufferSubData).toHaveBeenCalledTimes(1);
    });

    it('uploads nothing for zero vertices', () => {
      const geometry = createGeometry();

      vi.clearAllMocks();
      geometry.update({
        vertexCount: 0,
        attributes: { a_position: new Float32Array(0) },
      });
      geometry.draw();

      expect(gl.bufferSubData).not.toHaveBeenCalled();
      expect(gl.drawArrays).toHaveBeenCalledWith('TRIANGLES', 0, 0);
    });

    it('replaces the indices, with no vertex array bound', () => {
      const geometry = createGeometry({ indices: new Uint16Array(3) });
      const indices = new Uint32Array([0, 1, 2, 2, 1, 0]);

      vi.clearAllMocks();
      geometry.update({ vertexCount: 3, indices });

      expect(gl.bindVertexArray).toHaveBeenCalledWith(null);
      expect(bufferDataCalls('ELEMENT_ARRAY_BUFFER')).toEqual([
        ['ELEMENT_ARRAY_BUFFER', 32, 'DYNAMIC_DRAW'],
      ]);
      expect(gl.bufferSubData).toHaveBeenCalledWith(
        'ELEMENT_ARRAY_BUFFER',
        0,
        indices,
        0,
        6,
      );
    });

    it('throws for an attribute the geometry does not have', () => {
      const geometry = createGeometry();

      expect(() =>
        geometry.update({
          vertexCount: 3,
          attributes: { a_color: new Float32Array(12) },
        }),
      ).toThrow('a_color');
    });

    it('throws, and changes nothing, when an attribute holds fewer vertices than vertexCount', () => {
      const geometry = createGeometry();

      vi.clearAllMocks();

      expect(() =>
        geometry.update({
          vertexCount: 4,
          attributes: { a_position: new Float32Array(8) },
        }),
      ).toThrow('a_alpha');
      expect(geometry.vertexCount).toBe(3);
      expect(gl.bufferData).not.toHaveBeenCalled();
    });

    it.each([-1, 1.5, Number.NaN])(
      'throws for a vertexCount of %d',
      (vertexCount) => {
        expect(() => createGeometry().update({ vertexCount })).toThrow(
          'vertexCount',
        );
      },
    );

    it('throws for indices given to a geometry created without them', () => {
      expect(() =>
        createGeometry().update({
          vertexCount: 3,
          indices: new Uint16Array(3),
        }),
      ).toThrow('without indices');
    });
  });

  describe('draw', () => {
    it.each([
      ['triangles', 'TRIANGLES'],
      ['triangleStrip', 'TRIANGLE_STRIP'],
      ['lines', 'LINES'],
      ['lineStrip', 'LINE_STRIP'],
      ['points', 'POINTS'],
    ] as const)('draws %s as %s', (topology, mode) => {
      createGeometry({ topology }).draw();

      expect(gl.drawArrays).toHaveBeenCalledWith(mode, 0, 3);
    });

    it('draws 16-bit indices', () => {
      createGeometry({ indices: new Uint16Array(6) }).draw();

      expect(gl.drawElements).toHaveBeenCalledWith(
        'TRIANGLES',
        6,
        'UNSIGNED_SHORT',
        0,
      );
    });

    it('draws 32-bit indices', () => {
      createGeometry({ indices: new Uint32Array(6) }).draw();

      expect(gl.drawElements).toHaveBeenCalledWith(
        'TRIANGLES',
        6,
        'UNSIGNED_INT',
        0,
      );
    });

    it('draws instances', () => {
      createGeometry().drawInstanced(5);

      expect(gl.drawArraysInstanced).toHaveBeenCalledWith('TRIANGLES', 0, 3, 5);
    });

    it('draws instances of indexed geometry', () => {
      createGeometry({ indices: new Uint16Array(6) }).drawInstanced(5);

      expect(gl.drawElementsInstanced).toHaveBeenCalledWith(
        'TRIANGLES',
        6,
        'UNSIGNED_SHORT',
        0,
        5,
      );
    });

    it('draws nothing while the context is lost', () => {
      const geometry = createGeometry();

      loseContext();
      geometry.draw();
      geometry.drawInstanced(2);

      expect(gl.drawArrays).not.toHaveBeenCalled();
      expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
    });
  });

  describe('context loss', () => {
    it('only records an update while the context is lost', () => {
      const geometry = createGeometry({ indices: new Uint16Array(3) });

      loseContext();
      vi.clearAllMocks();
      geometry.update({
        vertexCount: 4,
        attributes: {
          a_position: new Float32Array(8),
          a_alpha: new Float32Array(4),
        },
        indices: new Uint16Array(6),
      });

      expect(geometry.vertexCount).toBe(4);
      expect(gl.bindBuffer).not.toHaveBeenCalled();
      expect(gl.bindVertexArray).not.toHaveBeenCalled();
      expect(gl.bufferData).not.toHaveBeenCalled();
      expect(gl.bufferSubData).not.toHaveBeenCalled();
    });

    it('uploads the latest data when the context is restored', () => {
      const geometry = createGeometry({ indices: new Uint16Array(3) });
      const positions = new Float32Array(20);
      const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

      loseContext();
      geometry.update({
        vertexCount: 4,
        attributes: { a_position: positions, a_alpha: new Float32Array(4) },
        indices,
      });
      vi.clearAllMocks();
      restoreContext();

      expect(bufferDataCalls('ARRAY_BUFFER')).toContainEqual([
        'ARRAY_BUFFER',
        32,
        'DYNAMIC_DRAW',
      ]);
      expect(gl.bufferSubData).toHaveBeenCalledWith(
        'ARRAY_BUFFER',
        0,
        positions,
        0,
        8,
      );
      expect(gl.bufferSubData).toHaveBeenCalledWith(
        'ELEMENT_ARRAY_BUFFER',
        0,
        indices,
        0,
        6,
      );

      geometry.draw();

      expect(gl.drawElements).toHaveBeenCalledWith(
        'TRIANGLES',
        6,
        'UNSIGNED_SHORT',
        0,
      );
    });

    it('restores an attribute that was never updated as static', () => {
      const geometry = createGeometry();

      geometry.update({
        vertexCount: 3,
        attributes: { a_position: new Float32Array(6) },
      });
      loseContext();
      vi.clearAllMocks();
      restoreContext();

      expect(bufferDataCalls('ARRAY_BUFFER')).toEqual([
        ['ARRAY_BUFFER', 32, 'DYNAMIC_DRAW'],
        ['ARRAY_BUFFER', expect.any(Float32Array), 'STATIC_DRAW'],
      ]);
    });
  });

  describe('dispose', () => {
    it('deletes the index buffer too', () => {
      const geometry = createGeometry({ indices: new Uint16Array(3) });

      geometry.dispose();

      expect(gl.deleteBuffer).toHaveBeenCalledTimes(3);
    });
  });
});
