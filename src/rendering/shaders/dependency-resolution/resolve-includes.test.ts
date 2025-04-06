import { describe, expect, it } from 'vitest';
import { resolveIncludes } from './resolve-includes';

describe('resolveIncludes', () => {
  it('should replace #include directives with the corresponding content from the includeMap', () => {
    const source = `
      void main() {
        #include <common>
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      common: 'vec3 color = vec3(1.0, 0.0, 0.0);',
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toBe(`
      void main() {
        vec3 color = vec3(1.0, 0.0, 0.0);
        gl_FragColor = vec4(1.0);
      }
    `);
  });

  it('should replace #include directives with names containing alphanumeric and underscore characters', () => {
    const source = `
      void main() {
        #include <common_vec2>
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      common_vec2: 'vec3 color = vec3(1.0, 0.0, 0.0);',
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toBe(`
      void main() {
        vec3 color = vec3(1.0, 0.0, 0.0);
        gl_FragColor = vec4(1.0);
      }
    `);
  });

  it('should throw an error if an #include directive has invalid syntax (missing include name)', () => {
    const source = `
      void main() {
        #include <>
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {};

    expect(() => resolveIncludes(source, includeMap)).toThrow(
      'Invalid shader syntax at line 3:9. Expected #include <name> but got "#include <>"',
    );
  });

  it('should throw an error if an #include directive has invalid syntax (missing include completely)', () => {
    const source = `
      void main() {
        #include
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {};

    expect(() => resolveIncludes(source, includeMap)).toThrow(
      'Invalid shader syntax at line 3:9. Expected #include <name> but got "#include"',
    );
  });

  it('should throw an error if an #include directive references a missing include', () => {
    const source = `
      void main() {
        #include <missing>
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {};

    expect(() => resolveIncludes(source, includeMap)).toThrow(
      'Missing include for shader: "missing" at line 3:9',
    );
  });

  it('should leave lines without #include directives unchanged', () => {
    const source = `
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {};

    const result = resolveIncludes(source, includeMap);

    expect(result).toBe(source);
  });

  it('should handle multiple #include directives', () => {
    const source = `
      #include <common>
      #include <lighting>
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      common: 'vec3 color = vec3(1.0, 0.0, 0.0);',
      lighting: 'float intensity = 0.5;',
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            vec3 color = vec3(1.0, 0.0, 0.0);
            float intensity = 0.5;
            void main() {
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should not include the same snippet multiple times if already resolved', () => {
    const source = `
      #include <common>
      #include <common>
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      common: 'vec3 color = vec3(1.0, 0.0, 0.0);',
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            vec3 color = vec3(1.0, 0.0, 0.0);

            void main() {
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should resolve nested includes and avoid duplicate inclusion', () => {
    const source = `
      #include <common>
      #include <lighting>
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      common: `
        vec3 color = vec3(1.0, 0.0, 0.0);
        #include <lighting>
      `,
      lighting: 'float intensity = 0.5;',
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            
              vec3 color = vec3(1.0, 0.0, 0.0);
              float intensity = 0.5;
            

            void main() {
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should not include the same snippet again if explicitly included after being resolved', () => {
    const source = `
      #include <common>
      void main() {
        #include <common>
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      common: 'vec3 color = vec3(1.0, 0.0, 0.0);',
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            vec3 color = vec3(1.0, 0.0, 0.0);
            void main() {

              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should a basic circular reference', () => {
    const source = `
      #include <common>
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      common: `
        vec3 color = vec3(1.0, 0.0, 0.0);
        #include <common>
      `,
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            
              vec3 color = vec3(1.0, 0.0, 0.0);

            
            void main() {
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should handle a complex circular reference', () => {
    const source = `
      #include <common>
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {
      common: `
        vec3 color = vec3(1.0, 0.0, 0.0);
        #include <lighting>
      `,
      lighting: `
        float intensity = 0.5;
        #include <noise>
      `,
      noise: `
        float noise = 0.1;
        #include <common>
      `,
    };

    const result = resolveIncludes(source, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            
              vec3 color = vec3(1.0, 0.0, 0.0);
              
              float intensity = 0.5;
              
              float noise = 0.1;

            
            
            
            void main() {
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });
});
