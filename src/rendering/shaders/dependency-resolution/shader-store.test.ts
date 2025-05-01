import { describe, expect, it } from 'vitest';
import { ShaderStore } from './shader-store';

describe('ShaderStore', () => {
  it('should add a shader to the store', () => {
    const store = new ShaderStore();
    const shader = `
      #property name: testShader;

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;

    store.addShader(shader);

    expect(() => store.getShader('testShader')).not.toThrow();
  });

  it('should not add the same shader twice', () => {
    const store = new ShaderStore();
    const shader = `
      #property name: testShader;

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;

    store.addShader(shader);
    store.addShader(shader);

    expect(() => store.getShader('testShader')).not.toThrow();
  });

  it('should resolve a shader with includes', () => {
    const store = new ShaderStore();

    const shader = `
      #property name: testShader;

      void main() {
        #include <common>
        gl_FragColor = vec4(1.0);
      }
    `;

    const include = `
      #property name: common;

      vec3 color = vec3(1.0, 0.0, 0.0);
    `;

    store.addShader(shader);
    store.addInclude(include);

    const resolvedShader = store.getShader('testShader');

    expect(resolvedShader).toContain('vec3 color = vec3(1.0, 0.0, 0.0);');
    expect(resolvedShader).toContain('gl_FragColor = vec4(1.0);');
  });

  it('should throw an error if a shader is not found', () => {
    const store = new ShaderStore();

    expect(() => store.getShader('nonExistentShader')).toThrow(
      'Shader with name nonExistentShader not found.',
    );
  });

  it('should cache resolved shaders', () => {
    const store = new ShaderStore();

    const shader = `
      #property name: testShader;

      void main() {
        #include <common>
        gl_FragColor = vec4(1.0);
      }
    `;

    const include = `
      #property name: common;

      vec3 color = vec3(1.0, 0.0, 0.0);
    `;

    store.addShader(shader);
    store.addInclude(include);

    const resolvedShader1 = store.getShader('testShader');
    const resolvedShader2 = store.getShader('testShader');

    expect(resolvedShader1).toBe(resolvedShader2); // Cached result
  });
});
