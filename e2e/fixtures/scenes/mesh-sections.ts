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

// Every wall entity sits here. The baked vertices are offset by the
// opposite amount, so the walls only land where the spec expects if the
// render system draws each section through its entity's transform.
const wallsOrigin = { x: 1, y: 0 };

const coloredMeshVertexShader = `#version 300 es
#pragma forge name(mesh-sections-colored.vert)
#pragma forge include(meshVertex)

in vec2 a_position;
in vec3 a_color;

out vec3 v_color;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
  v_color = a_color;
}
`;

const coloredMeshFragmentShader = `#version 300 es
#pragma forge name(mesh-sections-colored.frag)

precision mediump float;

in vec3 v_color;

out vec4 fragColor;

#pragma forge include(mask)

void main() {
  fragColor = vec4(v_color, maskCoverage());
}
`;

/**
 * The colors of the four walls, in draw order, and of the character drawn
 * between the second and third.
 */
const palette = {
  wall0: [1, 0, 0],
  wall1: [0, 1, 0],
  wall2: [0, 0, 1],
  wall3: [0, 0, 0],
  character: [1, 0, 1],
  background: [1, 1, 1],
} as const;

type SampledShape = keyof typeof palette;

/**
 * Each wall's world x range. Each overlaps the next by one unit, and all
 * span y in [-1.5, 1.5].
 */
const wallRanges: readonly (readonly [number, number])[] = [
  [-4, -1],
  [-2, 1],
  [0, 3],
  [2, 5],
];

/** A horizontal run of pixels, in canvas pixels from the left, inclusive. */
export interface PixelExtent {
  left: number;
  right: number;
}

/** What `mesh-sections.spec.ts` asserts against, from one frame. */
export interface MeshSectionsMeasurement {
  /** Each shape's visible pixels along the sampled row, or `null` for none. */
  extents: Record<Exclude<SampledShape, 'background'>, PixelExtent | null>;

  /** The number of non-instanced indexed draw calls (mesh draws) in the frame. */
  meshDrawCalls: number;
}

/** The handle `mesh-sections.spec.ts` drives and asserts against. */
export interface MeshSectionsSceneHandle extends SceneHandle {
  /** Shows or hides the character sprite. */
  setCharacterVisible(visible: boolean): void;

  /**
   * Finds each shape along the canvas's middle row, and reports the last
   * step's mesh draw calls. Must be called in the same `page.evaluate` task
   * as the preceding `step()`.
   */
  measure(): MeshSectionsMeasurement;
}

const classify = (r: number, g: number, b: number): SampledShape => {
  let nearest: SampledShape = 'background';
  let nearestDistance = Infinity;

  for (const [shape, [pr, pg, pb]] of Object.entries(palette)) {
    const distance =
      (r - pr * 255) ** 2 + (g - pg * 255) ** 2 + (b - pb * 255) ** 2;

    if (distance < nearestDistance) {
      nearest = shape as SampledShape;
      nearestDistance = distance;
    }
  }

  return nearest;
};

/**
 * Builds the vertex data of four overlapping wall rectangles baked into one
 * geometry, in the walls' local space (relative to `wallsOrigin`), one
 * section per wall.
 */
const bakeWalls = (): {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint16Array;
} => {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  wallRanges.forEach(([left, right], wall) => {
    const color = palette[`wall${wall}` as SampledShape];
    const first = wall * 4;
    const localLeft = left - wallsOrigin.x;
    const localRight = right - wallsOrigin.x;

    positions.push(
      localLeft,
      -1.5,
      localRight,
      -1.5,
      localRight,
      1.5,
      localLeft,
      1.5,
    );

    for (let corner = 0; corner < 4; corner++) {
      colors.push(...color);
    }

    indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  });

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint16Array(indices),
  };
};

/**
 * Builds a scene for geometry sections: four root wall entities at the same
 * position, each drawing one section of a single baked geometry with one
 * material, with draw orders 0, 1, 3 and 4, and a magenta character sprite
 * at order 2 overlapping walls 1 and 2. With nothing sorted between them,
 * the four walls draw in one call; the character splits that call in two.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): MeshSectionsSceneHandle => {
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
    .addShader(new ForgeShaderSource(coloredMeshVertexShader))
    .addShader(new ForgeShaderSource(coloredMeshFragmentShader));

  // Count the frame's mesh draws: meshes draw with `drawElements`, sprites
  // with instanced draws.
  const { gl } = renderContext;
  const drawElements = gl.drawElements.bind(gl);
  let meshDrawCalls = 0;

  gl.drawElements = (mode, count, type, offset): void => {
    meshDrawCalls++;
    drawElements(mode, count, type, offset);
  };

  const cameraEntity = world.createEntity();

  addPositionComponent(world, cameraEntity);
  addCameraComponent(world, cameraEntity, {
    isStatic: true,
    clearColor: Color.white,
    verticalWorldUnits,
  });

  const { positions, colors, indices } = bakeWalls();
  const geometry = new Geometry(renderContext, {
    attributes: [
      { name: 'a_position', data: positions, size: 2 },
      { name: 'a_color', data: colors, size: 3 },
    ],
    indices,
    sections: wallRanges.map((_, wall) => ({ start: wall * 6, count: 6 })),
  });
  const material = createMeshMaterial(
    renderContext,
    'mesh-sections-colored.vert',
    'mesh-sections-colored.frag',
  );

  const wallOrders = [0, 1, 3, 4];

  wallOrders.forEach((order, section) => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { ...wallsOrigin } });
    addMeshComponent(world, entity, { geometry, material, section });
    addDrawOrderComponent(world, entity, { order });
  });

  // The character spans x in [-1, 1]: the right end of wall 1 and the left
  // end of wall 2.
  const characterEntity = world.createEntity();

  addPositionComponent(world, characterEntity);
  addSpriteComponent(world, characterEntity, {
    ...createImageSprite(renderContext.whiteTexture),
    width: 2,
    height: 2,
    tintColor: new Color(...palette.character, 1),
  });
  addDrawOrderComponent(world, characterEntity, { order: 2 });

  const characterVisibility = addVisibilityComponent(world, characterEntity);

  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  let clockInMilliseconds = 0;

  return {
    step(deltaMilliseconds: number = defaultStepDeltaMilliseconds): void {
      clockInMilliseconds += deltaMilliseconds;
      meshDrawCalls = 0;
      time.update(clockInMilliseconds);
      world.update();
    },

    setCharacterVisible(visible: boolean): void {
      characterVisibility.visible = visible;
    },

    measure(): MeshSectionsMeasurement {
      const sampleCanvas = document.createElement('canvas');

      sampleCanvas.width = canvas.width;
      sampleCanvas.height = canvas.height;

      const context2d = sampleCanvas.getContext('2d');

      if (!context2d) {
        throw new Error('2D canvas context not available');
      }

      context2d.drawImage(canvas, 0, 0);

      const row = Math.round(canvas.height / 2);
      const { data } = context2d.getImageData(0, row, canvas.width, 1);
      const extents: MeshSectionsMeasurement['extents'] = {
        wall0: null,
        wall1: null,
        wall2: null,
        wall3: null,
        character: null,
      };

      for (let x = 0; x < canvas.width; x++) {
        const offset = x * 4;
        const shape = classify(
          data[offset],
          data[offset + 1],
          data[offset + 2],
        );

        if (shape === 'background') {
          continue;
        }

        const extent = extents[shape];

        if (extent) {
          extent.right = x;
        } else {
          extents[shape] = { left: x, right: x };
        }
      }

      return { extents, meshDrawCalls };
    },
  };
};
