// port of the raycast code from
// https://github.com/Technostalgic/MatterJS_Raycast.git
// found while going through this issue:
// https://github.com/liabru/matter-js/issues/181

import Matter from 'matter-js';
import { Vector2 } from '../math';

/**
 * Raycast function that returns an array of RaycastCollision objects
 * that represent the intersections between a ray and the bodies in the world.
 * @param bodies - The array of Matter.Body objects to check for intersections
 * @param start - The starting point of the ray
 * @param end - The ending point of the ray
 * @param sort - Whether to sort the results by distance from the start point
 * @returns An array of RaycastCollision objects
 */
export function raycast(
  bodies: Matter.Body[],
  start: Vector2,
  end: Vector2,
  sort = true,
) {
  const query = Matter.Query.ray(bodies, start, end);
  const raycastCollisions = new Array<RaycastCollision>();
  const ray = new Ray(start, end);

  for (let i = query.length - 1; i >= 0; i--) {
    const matterCollision = query[i];

    if (!matterCollision) {
      continue;
    }

    const bodyCollisions = Ray.bodyCollisions(ray, matterCollision.bodyA);

    for (let j = bodyCollisions.length - 1; j >= 0; j--) {
      const bodyCollision = bodyCollisions[j];

      if (!bodyCollision) {
        continue;
      }

      raycastCollisions.push(bodyCollision);
    }
  }

  if (sort) {
    raycastCollisions.sort((a, b) => {
      return a.point.distanceTo(start) - b.point.distanceTo(start);
    });
  }

  return raycastCollisions;
}

/**
 * RaycastCollision interface that represents a collision between a ray and a body.
 */
export interface RaycastCollision {
  /**
   * The body that was hit by the ray.
   */
  body: Matter.Body;
  /**
   * The point of intersection between the ray and the body.
   */
  point: Vector2;
  /**
   * The normal vector of the edge at the point of intersection.
   */
  normal: Vector2;
  /**
   * The vertices of the body that were hit by the ray.
   */
  vertices: Vector2[];
}

/**
 * Ray class that represents a ray in 2D space.
 */
export class Ray {
  public static intersect(rayA: Ray, rayB: Ray) {
    if (rayA.isVertical && rayB.isVertical) {
      return null;
    }

    if (rayA.isVertical) {
      return new Vector2(rayA.start.x, rayB.yValueAt(rayA.start.x));
    }

    if (rayB.isVertical) {
      return new Vector2(rayB.start.x, rayA.yValueAt(rayB.start.x));
    }

    if (compareNum(rayA.slope, rayB.slope)) {
      return null;
    }

    if (rayA.isHorizontal) {
      return new Vector2(rayB.xValueAt(rayA.start.y), rayA.start.y);
    }

    if (rayB.isHorizontal) {
      return new Vector2(rayA.xValueAt(rayB.start.y), rayB.start.y);
    }

    //slope intercept form:
    //y1 = m2 * x + b2; where y1 = m1 * x + b1:
    //m1 * x + b1 = m2 * x + b2:
    //x = (b2 - b1) / (m1 - m2)
    const x = (rayB.offsetY - rayA.offsetY) / (rayA.slope - rayB.slope);

    return new Vector2(x, rayA.yValueAt(x));
  }

  public static collisionPoint(rayA: Ray, rayB: Ray) {
    const intersection = Ray.intersect(rayA, rayB);

    if (!intersection) {
      return null;
    }

    if (!rayA.pointInBounds(intersection)) {
      return null;
    }

    if (!rayB.pointInBounds(intersection)) {
      return null;
    }

    return intersection;
  }

  public static bodyEdges(body: Matter.Body) {
    const edges = new Array<Ray>();

    for (let i = body.parts.length - 1; i >= 0; i--) {
      const bodyPart = body.parts[i];

      if (!bodyPart) {
        continue;
      }

      for (let k = bodyPart.vertices.length - 1; k >= 0; k--) {
        let k2 = k + 1;

        if (k2 >= bodyPart.vertices.length) {
          k2 = 0;
        }

        const vertex1 = bodyPart.vertices[k];
        const vertex2 = bodyPart.vertices[k2];

        if (!vertex1 || !vertex2) {
          continue;
        }

        const start = new Vector2(vertex1.x, vertex1.y);
        const end = new Vector2(vertex2.x, vertex2.y);
        const ray = new Ray(start, end);

        ray.vertices = [start, end];

        edges.push(ray);
      }
    }

    return edges;
  }

  public static bodyCollisions(rayA: Ray, body: Matter.Body) {
    const rayCollisions = new Array<RaycastCollision>();
    const edges = Ray.bodyEdges(body);

    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];

      if (!edge) {
        continue;
      }

      const point = Ray.collisionPoint(rayA, edge);

      //if there is no collision, then go to next edge
      if (!point) {
        continue;
      }

      const normal = edge.calculateNormal(rayA.start);

      const { vertices } = edge;

      rayCollisions.push({ body, point, normal, vertices });
    }

    return rayCollisions;
  }

  public start: Vector2;
  public end: Vector2;
  public vertices: Vector2[] = [];

  /**
   * Creates a new Ray object.
   * @param start - The starting point of the ray
   * @param end - The ending point of the ray
   */
  constructor(start: Vector2, end: Vector2) {
    this.start = start;
    this.end = end;
  }

  /**
   * Returns the y value on the ray at the specified x.
   * @param x - The x value to check
   * @returns The y value on the ray at the specified x
   */
  public yValueAt(x: number) {
    //returns the y value on the ray at the specified x
    //slope-intercept form:
    //y = m * x + b
    return this.offsetY + this.slope * x;
  }

  /**
   * Returns the x value on the ray at the specified y.
   * @param y - The y value to check
   * @returns The x value on the ray at the specified y
   */
  public xValueAt(y: number) {
    //returns the x value on the ray at the specified y
    //slope-intercept form:
    //x = (y - b) / m
    return (y - this.offsetY) / this.slope;
  }

  /**
   * Checks if a point is within the bounds of the ray.
   * @param point - The point to check
   * @returns True if the point is within the bounds of the ray, false otherwise
   */
  public pointInBounds(point: Vector2) {
    //checks to see if the specified point is within
    //the ray's bounding box (inclusive)
    const minX = Math.min(this.start.x, this.end.x);
    const maxX = Math.max(this.start.x, this.end.x);
    const minY = Math.min(this.start.y, this.end.y);
    const maxY = Math.max(this.start.y, this.end.y);

    return (
      point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
    );
  }

  /**
   * Calculates the normal vector of the ray at the specified reference point.
   * @param referencePoint - The reference point to calculate the normal vector from
   * @returns The normal vector of the ray at the specified reference point
   */
  public calculateNormal(referencePoint: Vector2) {
    //    edge v
    //     <---|--->
    //  *
    //  ^ reference point
    const normal1 = this.difference.normalize().rotate(Math.PI / 2);
    const normal2 = this.difference.normalize().rotate(Math.PI / -2);

    if (
      this.start.add(normal1).distanceTo(referencePoint) <
      this.start.add(normal2).distanceTo(referencePoint)
    ) {
      return normal1;
    }

    return normal2;
  }

  get difference() {
    return this.end.subtract(this.start);
  }

  get slope() {
    return this.difference.y / this.difference.x;
  }

  get offsetY() {
    //the y-offset at x = 0, in slope-intercept form:
    //b = y - m * x
    //offsetY = start.y - slope * start.x
    return this.start.y - this.slope * this.start.x;
  }

  get isHorizontal() {
    return compareNum(this.start.y, this.end.y);
  }

  get isVertical() {
    return compareNum(this.start.x, this.end.x);
  }
}

//in order to avoid miscalculations due to floating point
//errors
//example:
//	const m = 6; m -= 1; m -= 3; m += 4
//	now 'm' probably equals 6.0000000008361 or something stupid
function compareNum(a: number, b: number, leniency = 0.00001) {
  return Math.abs(b - a) <= leniency;
}
