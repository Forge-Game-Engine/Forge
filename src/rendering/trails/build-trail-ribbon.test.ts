import { beforeEach, describe, expect, it } from 'vitest';
import { easeInBack } from '../../animations/easing-functions/ease-in-back.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Color } from '../color.js';
import { buildTrailRibbon, TrailTransform } from './build-trail-ribbon.js';
import {
  addTrailComponent,
  TrailEcsComponent,
  TrailSettings,
} from './components/trail-component.js';
import { recordTrail } from './trail-recording.js';

interface Vertex {
  x: number;
  y: number;
  u: number;
  v: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

const at = (x: number, y: number = 0): TrailTransform => ({
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

const readVertices = (
  trail: TrailEcsComponent,
  vertexCount: number,
): Vertex[] => {
  const { positions, uvs, colors } = trail.state.buffers;

  return Array.from({ length: vertexCount }, (_, i) => ({
    x: positions[i * 2],
    y: positions[i * 2 + 1],
    u: uvs[i * 2],
    v: uvs[i * 2 + 1],
    r: colors[i * 4],
    g: colors[i * 4 + 1],
    b: colors[i * 4 + 2],
    a: colors[i * 4 + 3],
  }));
};

/** Records and builds one frame at `transform`. */
const step = (
  trail: TrailEcsComponent,
  transform: TrailTransform,
  deltaSeconds: number,
): Vertex[] => {
  recordTrail(trail, transform.x, transform.y, deltaSeconds);

  return readVertices(trail, buildTrailRibbon(trail, transform));
};

describe('buildTrailRibbon', () => {
  let world: EcsWorld;

  const createTrail = (
    options: Partial<TrailSettings> = {},
  ): TrailEcsComponent =>
    addTrailComponent(world, world.createEntity(), {
      lifetimeSeconds: 1,
      minVertexDistance: 0.1,
      startWidth: 1,
      endWidth: 1,
      ...options,
    });

  beforeEach(() => {
    world = new EcsWorld();
  });

  it('builds nothing until the entity has moved', () => {
    const trail = createTrail();

    expect(step(trail, at(0), 0.1)).toEqual([]);
    expect(step(trail, at(0), 0.1)).toEqual([]);
  });

  it('reaches the entity between recorded points', () => {
    const trail = createTrail({ minVertexDistance: 10 });

    step(trail, at(0), 0.1);

    const vertices = step(trail, at(3), 0.1);

    // Built around the entity, so the head is at x 0 and the tail at −3.
    expect(vertices.map((vertex) => vertex.x)).toEqual([-3, -3, 0, 0]);
  });

  it.each([30, 144])(
    'is speed × lifetime long at %i frames a second',
    (framesPerSecond) => {
      const trail = createTrail({ lifetimeSeconds: 0.5 });
      const speed = 5;
      const deltaSeconds = 1 / framesPerSecond;
      let vertices: Vertex[] = [];

      for (let frame = 0; frame <= 2 * framesPerSecond; frame++) {
        vertices = step(trail, at(frame * deltaSeconds * speed), deltaSeconds);
      }

      const xs = vertices.map((vertex) => vertex.x);

      expect(Math.max(...xs)).toBeCloseTo(0, 5);
      expect(Math.min(...xs)).toBeCloseTo(-speed * 0.5, 5);
    },
  );

  it('takes width and color from each point’s age, cut at the lifetime', () => {
    const trail = createTrail({
      startWidth: 2,
      endWidth: 0,
      startColor: new Color(4, 2, 0, 1),
      endColor: new Color(0, 0, 0, 0),
      minVertexDistance: 1,
    });

    for (let x = 0; x <= 10; x++) {
      step(trail, at(x), 0.25);
    }

    // Ages 0.25 apart: the tail (age 1) at x 6, then x 7 to 10, and the
    // head at the entity, which is the newest point.
    const vertices = readVertices(trail, buildTrailRibbon(trail, at(10)));
    const halfWidths = vertices
      .filter((_, i) => i % 2 === 0)
      .map((vertex) => Math.abs(vertex.y));

    expect(halfWidths).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(vertices[0]).toMatchObject({ x: -4, r: 0, a: 0 });
    expect(vertices[8]).toMatchObject({ x: 0, r: 4, g: 2, a: 1 });
  });

  it('clamps an eased width at 0 and alpha to [0, 1]', () => {
    const trail = createTrail({
      startWidth: 1,
      endWidth: 0,
      startColor: new Color(1, 1, 1, 1),
      endColor: new Color(1, 1, 1, 0),
      widthEasing: easeInBack,
      colorEasing: (t) => 2 - 3 * t,
      minVertexDistance: 1,
    });

    for (let x = 0; x <= 10; x++) {
      step(trail, at(x), 0.25);
    }

    const vertices = readVertices(trail, buildTrailRibbon(trail, at(10)));

    for (const vertex of vertices) {
      expect(Number.isNaN(vertex.y)).toBe(false);
      expect(vertex.a).toBeGreaterThanOrEqual(0);
      expect(vertex.a).toBeLessThanOrEqual(1);
    }
  });

  it('stretches U from 0 at the tail to 1 at the entity', () => {
    const trail = createTrail({ minVertexDistance: 1 });

    for (let x = 0; x <= 4; x++) {
      step(trail, at(x), 0.1);
    }

    const vertices = readVertices(trail, buildTrailRibbon(trail, at(4)));

    expect(vertices.map((vertex) => vertex.u)).toEqual([
      0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1,
    ]);
  });

  it('tiles U from recorded distances, unchanged for a point as the trail moves', () => {
    const trail = createTrail({
      minVertexDistance: 1,
      textureMode: 'tile',
      tileLength: 2,
      lifetimeSeconds: 100,
    });

    for (let x = 0; x <= 4; x++) {
      step(trail, at(x), 0.1);
    }

    const before = readVertices(trail, buildTrailRibbon(trail, at(4)));
    const after = step(trail, at(5), 0.1);

    expect(before.map((vertex) => vertex.u)).toEqual([
      0, 0, 0.5, 0.5, 1, 1, 1.5, 1.5, 2, 2,
    ]);
    expect(after.slice(0, 10).map((vertex) => vertex.u)).toEqual(
      before.map((vertex) => vertex.u),
    );
  });

  it('draws nothing across the gap where emission was off', () => {
    const trail = createTrail({ minVertexDistance: 1, lifetimeSeconds: 100 });

    step(trail, at(0), 0.1);
    step(trail, at(2), 0.1);
    trail.emitting = false;
    step(trail, at(2), 0.1);
    step(trail, at(10), 0.1);
    trail.emitting = true;
    step(trail, at(10), 0.1);

    const vertices = step(trail, at(12), 0.1);

    // Run one (4 vertices), two repeated vertices, run two (4 vertices).
    expect(vertices).toHaveLength(10);
    expect(vertices[4]).toEqual(vertices[3]);
    expect(vertices[5]).toEqual(vertices[6]);
    expect(vertices.slice(0, 4).map((vertex) => vertex.x)).toEqual([
      -12, -12, -10, -10,
    ]);
    expect(vertices.slice(6).map((vertex) => vertex.x)).toEqual([-2, -2, 0, 0]);

    // Every triangle that spans the gap has no area.
    for (let i = 2; i < vertices.length; i++) {
      const [a, b, c] = [vertices[i - 2], vertices[i - 1], vertices[i]];
      const spansGap =
        Math.min(a.x, b.x, c.x) < -5 && Math.max(a.x, b.x, c.x) > -5;
      const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);

      if (spansGap) {
        expect(area).toBe(0);
      }
    }
  });

  it('maps vertices into the entity’s local space, keeping widths in world units', () => {
    const trail = createTrail({
      minVertexDistance: 1,
      startWidth: 2,
      endWidth: 2,
    });
    const transform = (x: number): TrailTransform => ({
      x,
      y: 5,
      rotation: Math.PI / 2,
      scaleX: 2,
      scaleY: 0.5,
    });

    step(trail, transform(0), 0.1);

    const vertices = step(trail, transform(4), 0.1);

    // Map each local vertex back through the entity's world transform (as
    // the render system does): it lands on the world-space ribbon around
    // y 5, from x 0 to 4, 2 units wide.
    const world = vertices.map((vertex) => {
      const sx = vertex.x * 2;
      const sy = vertex.y * 0.5;

      return { x: 4 - sy, y: 5 + sx };
    });

    expect(world.map((vertex) => Math.round(vertex.x * 1e5) / 1e5)).toEqual([
      0, 0, 4, 4,
    ]);
    expect(
      world.map((vertex) => Math.round(Math.abs(vertex.y - 5) * 1e5) / 1e5),
    ).toEqual([1, 1, 1, 1]);
  });

  it('builds nothing while the entity’s world scale is 0', () => {
    const trail = createTrail();

    step(trail, at(0), 0.1);

    expect(step(trail, { ...at(4), scaleX: 0 }, 0.1)).toEqual([]);
  });
});
