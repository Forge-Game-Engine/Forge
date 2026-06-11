import { Body, Composite, Engine, Events, type Pair } from 'matter-js';

/**
 * A pair of ECS entities whose physics bodies started or stopped touching.
 */
export interface EntityCollisionPair {
  /**
   * One of the two entities involved in the collision.
   */
  readonly entityA: number;

  /**
   * The other entity involved in the collision.
   */
  readonly entityB: number;
}

/**
 * Options for creating a {@link PhysicsWorld}.
 */
export interface PhysicsWorldOptions {
  /**
   * The Matter.js engine to use. If not provided, a new engine is created
   * with zero gravity.
   */
  engine?: Engine;
}

const defaultPhysicsWorldOptions: PhysicsWorldOptions = {};

/**
 * Creates a new {@link PhysicsWorld}.
 * @param options - Options for configuring the physics world.
 * @returns A new physics world.
 */
export function createPhysicsWorld(
  options: PhysicsWorldOptions = {},
): PhysicsWorld {
  const { engine } = { ...defaultPhysicsWorldOptions, ...options };

  return new PhysicsWorld(engine ?? Engine.create({ gravity: { x: 0, y: 0 } }));
}

/**
 * Owns a Matter.js engine, manages the lifecycle of physics bodies within
 * it, and resolves Matter's `collisionStart`/`collisionEnd` events into
 * pairs of ECS entities.
 */
export class PhysicsWorld {
  /**
   * The underlying Matter.js engine.
   */
  public readonly engine: Engine;

  private readonly _collisionStarts: EntityCollisionPair[];
  private readonly _collisionEnds: EntityCollisionPair[];
  private readonly _bodyToEntity: Map<number, number>;
  private readonly _entityToBody: Map<number, Body>;

  /**
   * Creates a new PhysicsWorld instance.
   * @param engine - The Matter.js engine to manage.
   */
  constructor(engine: Engine) {
    this.engine = engine;
    this._collisionStarts = [];
    this._collisionEnds = [];
    this._bodyToEntity = new Map();
    this._entityToBody = new Map();

    Events.on(this.engine, 'collisionStart', (event) => {
      this._resolvePairs(event.pairs, this._collisionStarts);
    });

    Events.on(this.engine, 'collisionEnd', (event) => {
      this._resolvePairs(event.pairs, this._collisionEnds);
    });
  }

  /**
   * Pairs of entities whose physics bodies started touching during the most
   * recent call to {@link step}.
   */
  get collisionStarts(): readonly EntityCollisionPair[] {
    return this._collisionStarts;
  }

  /**
   * Pairs of entities whose physics bodies stopped touching during the most
   * recent call to {@link step}.
   */
  get collisionEnds(): readonly EntityCollisionPair[] {
    return this._collisionEnds;
  }

  /**
   * Synchronizes the bodies registered with this physics world to match
   * `entityBodies`, adding newly seen bodies to (and removing bodies for
   * entities no longer present from) the underlying Matter world, and
   * refreshing the entity/body lookup tables used to resolve collision
   * pairs.
   * @param entityBodies - The current frame's entity/body pairs.
   */
  public syncBodies(
    entityBodies: readonly { entity: number; body: Body }[],
  ): void {
    const seenEntities = new Set<number>();

    for (const { entity, body } of entityBodies) {
      seenEntities.add(entity);

      const existingBody = this._entityToBody.get(entity);

      if (existingBody === body) {
        continue;
      }

      if (existingBody) {
        this._removeBody(entity, existingBody);
      }

      this._entityToBody.set(entity, body);
      this._bodyToEntity.set(body.id, entity);
      Composite.add(this.engine.world, body);
    }

    for (const [entity, body] of this._entityToBody) {
      if (seenEntities.has(entity)) {
        continue;
      }

      this._removeBody(entity, body);
    }
  }

  /**
   * Steps the Matter simulation forward, refreshing {@link collisionStarts}
   * and {@link collisionEnds} for the new frame.
   * @param deltaTimeInMilliseconds - The time to advance the simulation by.
   */
  public step(deltaTimeInMilliseconds: number): void {
    this._collisionStarts.length = 0;
    this._collisionEnds.length = 0;

    Engine.update(this.engine, deltaTimeInMilliseconds);
  }

  private _removeBody(entity: number, body: Body): void {
    Composite.remove(this.engine.world, body);
    this._entityToBody.delete(entity);
    this._bodyToEntity.delete(body.id);
  }

  private _resolvePairs(pairs: Pair[], out: EntityCollisionPair[]): void {
    for (const pair of pairs) {
      const entityA = this._bodyToEntity.get(pair.bodyA.id);
      const entityB = this._bodyToEntity.get(pair.bodyB.id);

      if (entityA === undefined || entityB === undefined) {
        continue;
      }

      out.push({ entityA, entityB });
    }
  }
}
