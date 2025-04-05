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

  it('should throw an error if an #include directive has invalid syntax (missing include name)', () => {
    const source = `
      void main() {
        #include <>
        gl_FragColor = vec4(1.0);
      }
    `;
    const includeMap = {};

    expect(() => resolveIncludes(source, includeMap)).toThrow(
      'Invalid syntax for at line 3:9. Expected #include <name> but got "#include <>"',
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
      'Invalid syntax for at line 3:9. Expected #include <name> but got "#include"',
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
      'Missing include: "missing" at line 3:9',
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

    expect(result).toBe(`
      vec3 color = vec3(1.0, 0.0, 0.0);
      float intensity = 0.5;
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);
  });
});
