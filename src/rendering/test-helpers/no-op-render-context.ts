import { ImageCache } from '../../asset-loading/index.js';
import { RenderContext } from '../render-context.js';
import { ShaderCache } from '../shaders/index.js';

/**
 * Creates a stand-in for a WebGL2 context that accepts every call and does
 * nothing: `create*` calls return a fresh object to stand for the GL
 * object, `getAttribLocation` returns `0`, `getExtension` returns `null`,
 * `isContextLost` returns `false`, constants read as numbers, and every
 * other method returns `undefined`. It's for measuring the CPU side of
 * systems that draw (microbenchmarks under Node, which has no WebGL), not
 * for asserting on GL calls.
 * @returns The no-op context.
 */
export function createNoOpWebGl2Context(): WebGL2RenderingContext {
  const overrides: Record<string, unknown> = {
    getAttribLocation: () => 0,
    getExtension: () => null,
    isContextLost: () => false,
  };
  const noOp = (): undefined => undefined;
  const createObject = (): object => ({});
  let nextConstant = 1;

  const createMember = (property: string): unknown => {
    // Constants (`ARRAY_BUFFER`, `BLEND`) are upper case; give each a
    // distinct number, as WebGL does.
    if (/^[A-Z0-9_]+$/.test(property)) {
      return nextConstant++;
    }

    return property.startsWith('create') ? createObject : noOp;
  };

  const context = new Proxy(overrides, {
    get(target, property): unknown {
      if (typeof property !== 'string') {
        return undefined;
      }

      if (!Object.hasOwn(target, property)) {
        target[property] = createMember(property);
      }

      return target[property];
    },
  });

  return context as unknown as WebGL2RenderingContext;
}

/**
 * Creates a real {@link RenderContext} over {@link createNoOpWebGl2Context},
 * on a stand-in canvas, so code that draws through it runs everything but
 * the GPU work. Works under Node: it gives the global scope a `window` with
 * a `devicePixelRatio` of `1` when there's none.
 * @param width - The canvas's width, in CSS pixels.
 * @param height - The canvas's height, in CSS pixels.
 * @returns The render context.
 */
export function createNoOpRenderContext(
  width: number,
  height: number,
): RenderContext {
  const gl = createNoOpWebGl2Context();

  if (typeof globalThis.window === 'undefined') {
    Object.assign(globalThis, { window: { devicePixelRatio: 1 } });
  }

  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    getContext: () => gl,
    addEventListener: () => undefined,
  };

  return new RenderContext(
    new ShaderCache([]),
    new ImageCache(),
    canvas as unknown as HTMLCanvasElement,
  );
}
