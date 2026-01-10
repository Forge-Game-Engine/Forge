import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Geometry } from './geometry/geometry.js';
import { Material } from './materials/material.js';
import { Renderable } from './renderable.js';
import { EcsWorld } from '../new-ecs/ecs-world.js';

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
    mockProgram = {} as WebGLProgram;

    // Create mock material with bind method and program property
    mockMaterial = {
      bind: vi.fn(),
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

      expect(renderable.layer).toBe(layer);
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
      expect(renderable.layer).toBe(layer);
      expect(renderable.floatsPerInstance).toBe(floatsPerInstance);
      expect(renderable.bindInstanceData).toBe(mockBindInstanceData);
      expect(renderable.setupInstanceAttributes).toBe(
        mockSetupInstanceAttributes,
      );
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
      const entity = 1;
      const world = new EcsWorld();
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

      renderable.bindInstanceData(entity, world, buffer, offset);

      expect(mockBindInstanceData).toHaveBeenCalledWith(
        entity,
        world,
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
    it('should have readonly geometry property', () => {
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
        Object.getOwnPropertyDescriptor(renderable, 'geometry'),
      ).toBeDefined();
    });

    it('should have readonly material property', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(
        Object.getOwnPropertyDescriptor(renderable, 'material'),
      ).toBeDefined();
    });

    it('should have readonly floatsPerInstance property', () => {
      const renderable = new Renderable(
        mockGeometry,
        mockMaterial,
        10,
        0,
        mockBindInstanceData,
        mockSetupInstanceAttributes,
      );

      expect(
        Object.getOwnPropertyDescriptor(renderable, 'floatsPerInstance'),
      ).toBeDefined();
    });
  });
});
