import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '../../../src/common/index.js';
import { EcsWorld } from '../../../src/ecs/index.js';
import {
  addCameraComponent,
  addDrawOrderComponent,
  addMeshComponent,
  addSpriteComponent,
  addVisibilityComponent,
  Color,
  createCanvas,
  createImageSprite,
  createMeshMaterial,
  createRenderContext,
  createRenderEcsSystem,
  ForgeShaderSource,
  Geometry,
} from '../../../src/rendering/index.js';
import { CreateScene, SceneHandle } from './scene.js';

const defaultStepDeltaMilliseconds = 16.6666;
const verticalWorldUnits = 10;

// The world Y the canvas is sampled along: inside both sprites (y in
// [-1, 1]) and the mesh (y in [0, 2]), but not inside a mesh flipped
// upside down, which would span y in [-2, 0].
const sampleWorldY = 0.5;

const flatMeshVertexShader = `#version 300 es
#pragma forge name(mesh-draw-order-flat.vert)
#pragma forge include(meshVertex)

in vec2 a_position;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
}
`;

const flatMeshFragmentShader = `#version 300 es
#pragma forge name(mesh-draw-order-flat.frag)

precision mediump float;

uniform vec4 u_color;

out vec4 fragColor;

#pragma forge include(mask)

void main() {
  fragColor = vec4(u_color.rgb, u_color.a * maskCoverage());
}
`;

/** Which of the scene's shapes a sampled pixel shows, by its dominant channel. */
type SampledShape = 'red' | 'green' | 'blue' | 'background';

/** A horizontal run of pixels, in canvas pixels from the left, inclusive. */
export interface PixelExtent {
  left: number;
  right: number;
}

/** What `mesh-draw-order.spec.ts` asserts against, from one frame. */
export interface MeshDrawOrderMeasurement {
  /** Sprite A's visible pixels along the sampled row, or `null` for none. */
  red: PixelExtent | null;

  /** The mesh's visible pixels along the sampled row, or `null` for none. */
  green: PixelExtent | null;

  /** Sprite B's visible pixels along the sampled row, or `null` for none. */
  blue: PixelExtent | null;

  /** The mesh's `DrawOrderEcsComponent.order`, read back from the ECS. */
  meshOrder: number;
}

/** The handle `mesh-draw-order.spec.ts` drives and asserts against. */
export interface MeshDrawOrderSceneHandle extends SceneHandle {
  /** Shows or hides the mesh's entity. */
  setMeshVisible(visible: boolean): void;

  /** Sets the mesh entity's `DrawOrderEcsComponent.order`. */
  setMeshOrder(order: number): void;

  /**
   * Finds each shape along one row of the canvas's displayed bitmap. Must
   * be called in the same `page.evaluate` task as the preceding `step()`.
   */
  measure(): MeshDrawOrderMeasurement;
}

const classify = (r: number, g: number, b: number): SampledShape => {
  if (r > 200 && g > 200 && b > 200) {
    return 'background';
  }

  if (r >= g && r >= b) {
    return 'red';
  }

  return g >= b ? 'green' : 'blue';
};

/**
 * Builds a minimal scene for meshes in the draw order: a red sprite A, a
 * green mesh and a blue sprite B, each 2 world units wide, overlapping their
 * neighbors by half a unit, with world orders 0, 1 and 2. A and B share a
 * texture and material, so without the mesh between them they'd draw in one
 * batch. The mesh's vertices are in its entity's local space, offset from
 * the entity, so it only lands between the sprites if the render system
 * draws it through the entity's transform.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): MeshDrawOrderSceneHandle => {
  const time = new Time();
  const world = new EcsWorld();
  const canvas = createCanvas(container);

  canvas.width = 800;
  canvas.height = 600;

  // See `measureGreenSquareBounds` in `camera-pan-zoom.ts` for why this is
  // required for a reliable same-run pixel readback.
  const renderContext = createRenderContext(canvas, {
    preserveDrawingBuffer: true,
  });

  renderContext.shaderCache
    .addShader(new ForgeShaderSource(flatMeshVertexShader))
    .addShader(new ForgeShaderSource(flatMeshFragmentShader));

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: Color.white,
    verticalWorldUnits,
  });

  const addSquare = (x: number, color: Color, order: number): void => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x, y: 0 } });
    addSpriteComponent(world, entity, {
      ...createImageSprite(renderContext.whiteTexture),
      width: 2,
      height: 2,
      tintColor: color,
    });
    addDrawOrderComponent(world, entity, { order });
  };

  // Sprite A spans x in [-2.5, -0.5], the mesh [-1, 1] and sprite B
  // [0.5, 2.5].
  addSquare(-1.5, new Color(1, 0, 0, 1), 0);

  const meshEntity = world.createEntity();

  // The mesh's local x in [-2, 0] and y in [0, 2], placed by its entity at
  // (1, 0): world x in [-1, 1] and y in [0, 2].
  addPositionComponent(world, meshEntity, { local: { x: 1, y: 0 } });

  const geometry = new Geometry(renderContext, {
    attributes: [
      {
        name: 'a_position',
        data: new Float32Array([-2, 0, 0, 0, 0, 2, -2, 0, 0, 2, -2, 2]),
        size: 2,
      },
    ],
  });
  const material = createMeshMaterial(
    renderContext,
    'mesh-draw-order-flat.vert',
    'mesh-draw-order-flat.frag',
  );

  material.setColorUniform('u_color', new Color(0, 1, 0, 1));
  addMeshComponent(world, meshEntity, { geometry, material });

  const meshVisibility = addVisibilityComponent(world, meshEntity);
  const meshOrder = addDrawOrderComponent(world, meshEntity, { order: 1 });

  addSquare(1.5, new Color(0, 0, 1, 1), 2);

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      time.update(clockInMilliseconds);
      world.update();
    },

    setMeshVisible(visible: boolean): void {
      meshVisibility.visible = visible;
    },

    setMeshOrder(order: number): void {
      meshOrder.order = order;
    },

    measure(): MeshDrawOrderMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const pixelsPerUnit = canvas.height / verticalWorldUnits;
      const row = Math.round(canvas.height / 2 - sampleWorldY * pixelsPerUnit);
      const { data } = context2d.getImageData(0, row, canvas.width, 1);
      const extents: Record<SampledShape, PixelExtent | null> = {
        red: null,
        green: null,
        blue: null,
        background: null,
      };

      for (let x = 0; x < canvas.width; x++) {
        const offset = x * 4;
        const shape = classify(
          data[offset],
          data[offset + 1],
          data[offset + 2],
        );
        const extent = extents[shape];

        if (extent) {
          extent.right = x;
        } else {
          extents[shape] = { left: x, right: x };
        }
      }

      return {
        red: extents.red,
        green: extents.green,
        blue: extents.blue,
        meshOrder: meshOrder.order,
      };
    },
  };
};
