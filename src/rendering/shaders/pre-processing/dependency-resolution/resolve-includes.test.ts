import { describe, expect, it } from 'vitest';
import { resolveIncludes } from './resolve-includes';
import { ForgeShaderSource } from './forge-shader-source';

describe('resolveIncludes', () => {
  it('should replace #include directives with the corresponding content from the includeMap', () => {
    const rawSource = `
      #property name: test;

      void main() {
        #include <common>
        gl_FragColor = vec4(1.0);
      }
    `;

    const shader = new ForgeShaderSource(rawSource);

    const rawInclude = `
      #property name: common;

      vec3 color = vec3(1.0, 0.0, 0.0);
    `;

    const includeMap = [new ForgeShaderSource(rawInclude)];

    const result = resolveIncludes(shader, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            void main() {
              
            vec3 color = vec3(1.0, 0.0, 0.0);
          
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should replace #include directives with names containing alphanumeric and underscore characters', () => {
    const rawSource = `
      #property name: test;

      void main() {
        #include <common_vec2>
        gl_FragColor = vec4(1.0);
      }
    `;

    const shader = new ForgeShaderSource(rawSource);

    const rawInclude = `
      #property name: common_vec2;

      vec3 color = vec3(1.0, 0.0, 0.0);
    `;

    const includeMap = [new ForgeShaderSource(rawInclude)];

    const result = resolveIncludes(shader, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            void main() {
              
            vec3 color = vec3(1.0, 0.0, 0.0);
          
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should throw an error if an #include directive has invalid syntax (missing include name)', () => {
    const rawSource = `
      #property name: test;

      void main() {
        #include <>
        gl_FragColor = vec4(1.0);
      }
    `;

    expect(() => new ForgeShaderSource(rawSource)).toThrow(
      'Invalid shader syntax at line 5:9. Expected "#include <name>" but got "#include <>"',
    );
  });

  it('should throw an error if an #include directive has invalid syntax (missing include completely)', () => {
    const rawSource = `
      #property name: test;

      void main() {
        #include
        gl_FragColor = vec4(1.0);
      }
    `;

    expect(() => new ForgeShaderSource(rawSource)).toThrow(
      'Invalid shader syntax at line 5:9. Expected "#include <name>" but got "#include"',
    );
  });

  it('should throw an error if an #include directive references a missing include', () => {
    const rawSource = `
      #property name: test;

      void main() {
        #include <missing>
        gl_FragColor = vec4(1.0);
      }
    `;

    const shader = new ForgeShaderSource(rawSource);

    const includeMap: ForgeShaderSource[] = [];

    expect(() => resolveIncludes(shader, includeMap)).toThrow(
      'Missing include for shader: "missing" at line 5:9',
    );
  });

  it('should leave lines without #include directives unchanged', () => {
    const rawSource = `
      #property name: test;

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;

    const shader = new ForgeShaderSource(rawSource);

    const includeMap: ForgeShaderSource[] = [];

    const result = resolveIncludes(shader, includeMap);

    expect(result).toMatchInlineSnapshot(`
      "
            void main() {
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should handle multiple #include directives', () => {
    const rawSource = `
      #property name: test;

      #include <common>
      #include <lighting>
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;

    const shader = new ForgeShaderSource(rawSource);

    const rawCommon = `
      #property name: common;

      vec3 color = vec3(1.0, 0.0, 0.0);
    `;

    const rawLighting = `
      #property name: lighting;

      float intensity = 0.5;
    `;

    const includeMap = [
      new ForgeShaderSource(rawCommon),
      new ForgeShaderSource(rawLighting),
    ];

    const result = resolveIncludes(shader, includeMap);

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

  it('should resolve nested includes and avoid duplicate inclusion', () => {
    const rawSource = `
      #property name: test;

      #include <common>
      #include <lighting>
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `;

    const shader = new ForgeShaderSource(rawSource);

    const rawCommon = `
      #property name: common;

      vec3 color = vec3(1.0, 0.0, 0.0);
      #include <lighting>
    `;

    const rawLighting = `
      #property name: lighting;

      float intensity = 0.5;
    `;

    const includeMap = [
      new ForgeShaderSource(rawCommon),
      new ForgeShaderSource(rawLighting),
    ];

    const result = resolveIncludes(shader, includeMap);

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
});
