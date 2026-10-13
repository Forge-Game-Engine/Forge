/* eslint-disable @typescript-eslint/naming-convention */
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import {
  addPositionComponent,
  PositionEcsComponent,
  positionId,
  Time,
} from '../../../common/index.js';
import { EcsWorld } from '../../../ecs/ecs-world.js';
import {
  addMeshComponent,
  MeshEcsComponent,
  meshId,
} from '../../components/mesh-component.js';
import { Geometry } from '../../geometry/geometry.js';
import { createRenderContext, RenderContext } from '../../render-context.js';
import { clearTrail } from '../clear-trail.js';
import {
  addTrailComponent,
  TrailEcsComponent,
  trailId,
} from '../components/trail-component.js';
import { createTrailEcsSystem } from './trail-system.js';

/**
 * A WebGL context whose every method is a mock returning an empty object,
 * apart from the queries the render context, shaders and textures check.
 */
const createMockGl = (isContextLost: () => boolean): WebGL2RenderingContext => {
  const overrides: Record<string, unknown> = {
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(
      (_program: unknown, parameter: unknown): unknown =>
        parameter === overrides.ACTIVE_UNIFORMS ? 0 : true,
    ),
    ACTIVE_UNIFORMS: 'ACTIVE_UNIFORMS',
    getActiveUniform: vi.fn(() => null),
    getExtension: vi.fn(() => null),
    isContextLost: vi.fn(isContextLost),
  };

  return new Proxy(overrides, {
    get: (target, property: string): unknown => {
      target[property] ??= vi.fn(() => ({}));

      return target[property];
    },
  }) as unknown as WebGL2RenderingContext;
};

describe('createTrailEcsSystem', () => {
  let gl: WebGL2RenderingContext;
  let contextLost: boolean;
  let renderContext: RenderContext;
  let time: Time;
  let world: EcsWorld;
  let clock: number;

  const step = (deltaMilliseconds: number = 100): void => {
    clock += deltaMilliseconds;
    time.update(clock);
    world.update();
  };

  const addTrailEntity = (
    x: number = 0,
  ): {
    entity: number;
    trail: TrailEcsComponent;
    position: PositionEcsComponent;
  } => {
    const entity = world.createEntity();
    const position = addPositionComponent(world, entity, {
      local: { x, y: 0 },
    });
    const trail = addTrailComponent(world, entity, {
      lifetimeSeconds: 1,
      minVertexDistance: 0.1,
    });

    return { entity, trail, position };
  };

  /** Moves the entity: there's no transform system in these tests. */
  const moveTo = (position: PositionEcsComponent, x: number): void => {
    position.local.x = x;
    position.world.x = x;
  };

  const requireGeometry = (trail: TrailEcsComponent): Geometry => {
    const { geometry } = trail.state;

    if (!geometry) {
      throw new Error('The trail has no geometry.');
    }

    return geometry;
  };

  beforeEach(() => {
    contextLost = false;
    gl = createMockGl(() => contextLost);

    const canvas = document.createElement('canvas');

    vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
    renderContext = createRenderContext(canvas);
    time = new Time();
    world = new EcsWorld();
    world.addSystem(createTrailEcsSystem(time, renderContext));
    clock = 0;
    time.update(clock);
  });

  it('adds a mesh that draws the trail’s geometry with its category and layer', () => {
    const { entity, trail } = addTrailEntity();

    trail.category = 4;
    trail.layer = 2;
    step();

    const mesh = world.getComponentRequired(entity, meshId);

    expect(mesh.geometry).toBe(trail.state.geometry);
    expect(mesh.material).toBe(trail.state.material);
    expect(mesh).toMatchObject({ category: 4, layer: 2 });
  });

  it('draws the ribbon once the entity moves, through the mesh', () => {
    const { trail, position } = addTrailEntity();

    step();

    expect(requireGeometry(trail).vertexCount).toBe(0);

    moveTo(position, 2);
    step();

    expect(requireGeometry(trail).vertexCount).toBe(4);
  });

  it('creates no GPU objects when the trail is added', () => {
    const createBuffer = gl.createBuffer as Mock;
    const before = createBuffer.mock.calls.length;

    addTrailEntity();

    expect(createBuffer.mock.calls).toHaveLength(before);
  });

  it('creates one geometry per trail, however many frames it draws', () => {
    const first = addTrailEntity();
    const second = addTrailEntity(5);

    step();

    const firstGeometry = first.trail.state.geometry;

    for (let frame = 0; frame < 100; frame++) {
      moveTo(first.position, frame * 0.2);
      // Half as fast, so its trail is half as long.
      moveTo(second.position, 5 + frame * 0.1);
      step();
    }

    expect(first.trail.state.geometry).toBe(firstGeometry);
    expect(second.trail.state.geometry).not.toBe(firstGeometry);
    expect(requireGeometry(first.trail).bounds).not.toEqual(
      requireGeometry(second.trail).bounds,
    );
  });

  it('adds the mesh again if game code removed it', () => {
    const { entity, trail } = addTrailEntity();

    step();
    world.removeComponent(entity, meshId);
    step();

    expect(world.getComponent(entity, meshId)?.geometry).toBe(
      trail.state.geometry,
    );
  });

  it('throws when another mesh replaced the trail’s', () => {
    const { entity, trail } = addTrailEntity();

    step();

    const mesh = world.getComponentRequired(entity, meshId);

    addMeshComponent(world, entity, {
      geometry: new Geometry(renderContext, {
        attributes: [
          { name: 'a_position', data: new Float32Array(6), size: 2 },
        ],
      }),
      material: mesh.material,
    });

    expect(trail.state.geometry).not.toBeNull();
    expect(() => step()).toThrow('it has another mesh');
  });

  it('throws from addTrailComponent for an entity with another mesh', () => {
    const entity = world.createEntity();

    addPositionComponent(world, entity);
    addMeshComponent(world, entity, {
      geometry: new Geometry(renderContext, {
        attributes: [
          { name: 'a_position', data: new Float32Array(6), size: 2 },
        ],
      }),
      material: {} as MeshEcsComponent['material'],
    });

    expect(() => addTrailComponent(world, entity)).toThrow(
      'it already has a mesh',
    );
  });

  it('removes the mesh and disposes the geometry when the trail is removed', () => {
    const { entity, trail } = addTrailEntity();

    step();

    const geometry = requireGeometry(trail);
    const dispose = vi.spyOn(geometry, 'dispose');

    world.removeComponent(entity, trailId);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(world.getComponent(entity, meshId)).toBeNull();
    expect(trail.state.geometry).toBeNull();
  });

  it('disposes the geometry when the entity or its parent is removed', () => {
    const parent = world.createEntity();
    const { entity, trail } = addTrailEntity();
    const other = addTrailEntity();

    world.setParent(entity, parent);
    step();

    const disposeChild = vi.spyOn(requireGeometry(trail), 'dispose');
    const disposeOther = vi.spyOn(requireGeometry(other.trail), 'dispose');

    world.removeEntity(parent);
    world.removeEntity(other.entity);

    expect(disposeChild).toHaveBeenCalledTimes(1);
    expect(disposeOther).toHaveBeenCalledTimes(1);
  });

  it('frees the old trail and draws the new one when the trail is replaced', () => {
    const { entity, trail } = addTrailEntity();

    step();

    const oldGeometry = requireGeometry(trail);
    const dispose = vi.spyOn(oldGeometry, 'dispose');
    const replacement = addTrailComponent(world, entity);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(world.getComponent(entity, meshId)).toBeNull();

    step();

    expect(replacement.state.geometry).not.toBe(oldGeometry);
    expect(world.getComponent(entity, meshId)?.geometry).toBe(
      replacement.state.geometry,
    );
  });

  it('gives a removed trail added again a new geometry', () => {
    const { entity, trail } = addTrailEntity();

    step();

    const oldGeometry = trail.state.geometry;

    world.removeComponent(entity, trailId);
    world.addComponent(entity, trailId, trail);
    step();

    expect(trail.state.geometry).not.toBeNull();
    expect(trail.state.geometry).not.toBe(oldGeometry);
  });

  it('leaves trails, meshes and geometries alone when the world stops or the system is removed', () => {
    const { entity, trail } = addTrailEntity();

    step();

    const geometry = requireGeometry(trail);
    const dispose = vi.spyOn(geometry, 'dispose');

    world.stop();

    const system = createTrailEcsSystem(time, renderContext);

    world.addSystem(system);
    world.removeSystem(system);

    expect(dispose).not.toHaveBeenCalled();
    expect(world.getComponent(entity, meshId)?.geometry).toBe(geometry);
    expect(trail.state.geometry).toBe(geometry);
  });

  it('carries on with the same geometry and points in a fresh system instance', () => {
    const { trail, position } = addTrailEntity();

    step();
    moveTo(position, 1);
    step();

    const geometry = trail.state.geometry;
    const pointCount = trail.state.points.count;
    const fresh = new EcsWorld();

    // The same components, driven by a new system instance in another
    // world: nothing the first instance did lives outside the trail.
    const entity = fresh.createEntity();

    fresh.addComponent(entity, trailId, trail);
    fresh.addComponent(entity, positionId, position);
    fresh.addSystem(createTrailEcsSystem(time, renderContext));
    clock += 100;
    time.update(clock);
    fresh.update();

    expect(trail.state.geometry).toBe(geometry);
    expect(trail.state.points.count).toBe(pointCount);
  });

  it('carries out clearTrail in the next update', () => {
    const { entity, trail, position } = addTrailEntity();

    step();
    moveTo(position, 2);
    step();
    moveTo(position, 50);
    clearTrail(world, entity);
    step();

    expect(trail.state.points.count).toBe(1);
    expect(requireGeometry(trail).vertexCount).toBe(0);
    expect(trail.clearRequests).toBe(1);
  });

  it('throws from clearTrail for an entity without a trail', () => {
    expect(() => clearTrail(world, world.createEntity())).toThrow(
      'it has no TrailEcsComponent',
    );
  });

  it.each([
    ['lifetimeSeconds', 0],
    ['minVertexDistance', -1],
    ['tileLength', Number.NaN],
    ['startWidth', -0.5],
    ['endWidth', Number.POSITIVE_INFINITY],
  ] as const)('throws for a %s of %s', (name, value) => {
    expect(() =>
      addTrailComponent(world, world.createEntity(), { [name]: value }),
    ).toThrow(`${name} is "${value}"`);

    const { trail } = addTrailEntity();

    trail[name] = value;

    expect(() => step()).toThrow(`${name} is "${value}"`);
  });

  it('creates no GL objects while the context is lost, but records the ribbon for the restore', () => {
    const { trail, position } = addTrailEntity();
    const createBuffer = gl.createBuffer as Mock;

    contextLost = true;

    const before = createBuffer.mock.calls.length;

    step();
    moveTo(position, 2);
    step();

    expect(createBuffer.mock.calls).toHaveLength(before);
    expect(requireGeometry(trail).vertexCount).toBe(4);
  });
});
