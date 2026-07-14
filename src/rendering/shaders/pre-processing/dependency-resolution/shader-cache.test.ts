import { describe, expect, it } from 'vitest';
import { ShaderCache } from './shader-cache';
import { ForgeShaderSource } from '../forge-shader-source';
import { ResolveIncludesPreProcessor } from './resolve-includes-pre-processor';

describe('ShaderCache', () => {
  it('should add a shader to the store', () => {
    const store = new ShaderCache([]);
    const shader = new ForgeShaderSource(`
      #pragma forge name(testShader)

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    store.addShader(shader);

    expect(() => store.getShader('testShader')).not.toThrow();
  });

  it('should not add the same shader twice', () => {
    const store = new ShaderCache([]);
    const shader = new ForgeShaderSource(`
      #pragma forge name(testShader)

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    store.addShader(shader);
    store.addShader(shader);

    expect(() => store.getShader('testShader')).not.toThrow();
  });

  it('should resolve a shader with includes', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(testShader)

      void main() {
        #pragma forge include(common)
        gl_FragColor = vec4(1.0);
      }
    `);

    const include = new ForgeShaderSource(`
      #pragma forge name(common)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const store = new ShaderCache([new ResolveIncludesPreProcessor([include])]);

    store.addShader(shader);

    const resolvedShader = store.getShader('testShader');

    expect(resolvedShader.preparedSource).toContain(
      'vec3 color = vec3(1.0, 0.0, 0.0);',
    );
    expect(resolvedShader.preparedSource).toContain(
      'gl_FragColor = vec4(1.0);',
    );
  });

  it('should throw an error if a shader is not found', () => {
    const store = new ShaderCache([]);

    expect(() => store.getShader('nonExistentShader')).toThrow(
      'Shader with name nonExistentShader not found.',
    );
  });

  it('should cache resolved shaders', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(testShader)

      void main() {
        #pragma forge include(common)
        gl_FragColor = vec4(1.0);
      }
    `);

    const include = new ForgeShaderSource(`
      #pragma forge name(common)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const store = new ShaderCache([new ResolveIncludesPreProcessor([include])]);

    store.addShader(shader);

    const resolvedShader1 = store.getShader('testShader');
    const resolvedShader2 = store.getShader('testShader');

    expect(resolvedShader1).toBe(resolvedShader2); // Cached result
  });
});
