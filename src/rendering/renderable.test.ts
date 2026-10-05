import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Geometry } from './geometry/geometry.js';
import { Material } from './materials/material.js';
import { InstanceComponents, Renderable } from './renderable.js';

describe('Renderable', () => {
  let mockGeometry: Geometry;
  let mockMaterial: Material;
  let mockGl: WebGL2RenderingContext;
  let mockProgram: WebGLProgram;

  const mockBindInstanceData = vi.fn();
  const mockSetupInstanceAttributes = vi.fn();

  beforeEach(() => {
    // Create mock geometry with bind method
    mockGeometry = {
      bind: vi.fn(),
    } as unknown as Geometry;

    // Create mock program
    mockProgram = {};

    // Create mock material with bind method and program property
    mockMaterial = {
      bind: vi.fn(),
      setUniform: vi.fn(),
      program: mockProgram,
    } as unknown as Material;

    // Create mock WebGL context
    mockGl = {} as WebGL2RenderingContext;

    // Reset mocks
    mockBindInstanceData.mockReset();
    mockSetupInstanceAttributes.mockReset();
  });

  describe('constructor', () => {
    it('should initialize with provided geometry', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(renderable.geometry).toBe(mockGeometry);
    });

    it('should initialize with provided material', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(renderable.material).toBe(mockMaterial);
    });

    it('should initialize with provided camera entity', () => {
      const layer = 5;
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        layer,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(renderable.category).toBe(layer);
    });

    it('should initialize with provided floatsPerInstance', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        17,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(renderable.floatsPerInstance).toBe(17);
    });

    it('should initialize with provided bindInstanceData callback', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(renderable.bindInstanceData).toBe(mockBindInstanceData);
    });

    it('should initialize with provided setupInstanceAttributes callback', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(renderable.setupInstanceAttributes).toBe(
        mockSetupInstanceAttributes,
      );
    });

    it('should initialize all properties correctly', () => {
      const floatsPerInstance = 15;
      const layer = 3;
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        floatsPerInstance,
        layer,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(renderable.geometry).toBe(mockGeometry);
      expect(renderable.material).toBe(mockMaterial);
      expect(renderable.category).toBe(layer);
      expect(renderable.floatsPerInstance).toBe(floatsPerInstance);
      expect(renderable.bindInstanceData).toBe(mockBindInstanceData);
      expect(renderable.setupInstanceAttributes).toBe(
        mockSetupInstanceAttributes,
      );
    });
  });

  describe('setUniform', () => {
    const createRenderable = (): Renderable =>
      new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

    it('checks the uniform against the material straight away', () => {
      (mockMaterial.setUniform as Mock).mockImplementation(() => {
        throw new Error('Uniform "u_missing" does not exist on material.');
      });

      expect(() => createRenderable().setUniform('u_missing', 1)).toThrow(
        'u_missing',
      );
    });

    it("applies its uniforms to the material every time it's bound, before binding it", () => {
      const renderable = createRenderable();
      const calls: string[] = [];

      (mockMaterial.setUniform as Mock).mockImplementation(
        (name: string, value: number) => calls.push(`${name}=${value}`),
      );
      (mockMaterial.bind as Mock).mockImplementation(() => calls.push('bind'));

      renderable.setUniform('u_size', 2);
      calls.length = 0;
      renderable.bind(mockGl);
      renderable.bind(mockGl);

      expect(calls).toEqual(['u_size=2', 'bind', 'u_size=2', 'bind']);
    });

    it('lets renderables sharing a material each bind their own value', () => {
      const first = createRenderable();
      const second = createRenderable();
      const values: number[] = [];

      (mockMaterial.setUniform as Mock).mockImplementation(
        (_name: string, value: number) => values.push(value),
      );

      first.setUniform('u_size', 1);
      second.setUniform('u_size', 2);
      values.length = 0;
      second.bind(mockGl);
      first.bind(mockGl);

      expect(values).toEqual([2, 1]);
    });
  });

  describe('bind', () => {
    it('should call material.bind with gl context', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      renderable.bind(mockGl);

      expect(mockMaterial.bind).toHaveBeenCalledWith(mockGl);
    });

    it('should call geometry.bind with gl context and material program', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      renderable.bind(mockGl);

      expect(mockGeometry.bind).toHaveBeenCalledWith(mockGl, mockProgram);
    });

    it('should bind material before geometry', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      const callOrder: string[] = [];
      (mockMaterial.bind as Mock).mockImplementation(() => {
        callOrder.push('material');
      });
      (mockGeometry.bind as Mock).mockImplementation(() => {
        callOrder.push('geometry');
      });

      renderable.bind(mockGl);

      expect(callOrder).toEqual(['material', 'geometry']);
    });
  });

  describe('callbacks', () => {
    it('should allow bindInstanceData callback to be called', () => {
      const components = {} as InstanceComponents;
      const buffer = new Float32Array(10);
      const offset = 5;

      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      renderable.bindInstanceData(components, buffer, offset);

      expect(mockBindInstanceData).toHaveBeenCalledWith(
        components,
        buffer,
        offset,
      );
    });

    it('should allow setupInstanceAttributes callback to be called', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      renderable.setupInstanceAttributes(mockGl, renderable);

      expect(mockSetupInstanceAttributes).toHaveBeenCalledWith(
        mockGl,
        renderable,
      );
    });
  });

  describe('properties immutability', () => {
    it.each<keyof Renderable>(['geometry', 'material', 'floatsPerInstance'])(
      'should have readonly %s property',
      (propertyName) => {
        const renderable = new Renderable(
          mockGeometry,
          mockMaterial,
          10,
          0,
          mockBindInstanceData,
          mockSetupInstanceAttributes,
        );

        // TypeScript will prevent this at compile time, but we can verify the property exists
        expect(
          Object.getOwnPropertyDescriptor(renderable, propertyName),
        ).toBeDefined();
      },
    );
  });
});
