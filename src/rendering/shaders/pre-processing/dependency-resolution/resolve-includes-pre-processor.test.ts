import { describe, expect, it } from 'vitest';
import { ForgeShaderSource } from '../forge-shader-source';
import { ResolveIncludesPreProcessor } from './resolve-includes-pre-processor';

describe('ResolveIncludesPreProcessor', () => {
  it('should replace a "#pragma forge include" directive with the corresponding content from the includeMap', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      void main() {
        #pragma forge include(common)
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common]);

    expect(preProcessor.process(shader)).toMatchInlineSnapshot(`
      "
            #pragma forge name(test)

            void main() {
      #line 1

            #pragma forge name(common)

            vec3 color = vec3(1.0, 0.0, 0.0);
          
      #line 6
              gl_FragColor = vec4(1.0);
            }
          "
    `);
  });

  it('should remove the "#pragma forge include" line from the output once resolved', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common]);
    const result = preProcessor.process(shader);

    expect(result).not.toContain('#pragma forge include');
  });

  it('should replace includes with names containing alphanumeric and underscore characters', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      void main() {
        #pragma forge include(common_vec2)
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common_vec2)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common]);

    expect(preProcessor.process(shader)).toContain(
      'vec3 color = vec3(1.0, 0.0, 0.0);',
    );
  });

  it('should wrap resolved include content with #line directives to retain debug info', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common]);
    const result = preProcessor.process(shader);

    expect(result).toContain('#line 1');
    // the include directive is on line 4 (1-indexed), so the line after it, line 5,
    // needs to resume counting once the included content has been inlined
    expect(result).toContain('#line 5');
  });

  it('should resolve multiple different includes', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      #pragma forge include(lighting)
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const lighting = new ForgeShaderSource(`
      #pragma forge name(lighting)

      float intensity = 0.5;
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common, lighting]);
    const result = preProcessor.process(shader);

    expect(result).toContain('vec3 color = vec3(1.0, 0.0, 0.0);');
    expect(result).toContain('float intensity = 0.5;');
  });

  it('should resolve nested includes', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      #pragma forge include(lighting)
      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const lighting = new ForgeShaderSource(`
      #pragma forge name(lighting)

      float intensity = 0.5;
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common, lighting]);
    const result = preProcessor.process(shader);

    expect(result).toContain('float intensity = 0.5;');
    expect(result).toContain('vec3 color = vec3(1.0, 0.0, 0.0);');
    expect(result).not.toContain('#pragma forge include');
  });

  it('should not resolve the same include twice when it is referenced directly more than once', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      #pragma forge include(common)
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common]);
    const result = preProcessor.process(shader);

    const occurrences =
      result.split('vec3 color = vec3(1.0, 0.0, 0.0);').length - 1;

    expect(occurrences).toBe(1);
  });

  it('should not resolve an include twice when it is referenced both directly and transitively', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      #pragma forge include(lighting)
      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      #pragma forge include(lighting)
      vec3 color = vec3(1.0, 0.0, 0.0);
    `);

    const lighting = new ForgeShaderSource(`
      #pragma forge name(lighting)

      float intensity = 0.5;
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common, lighting]);
    const result = preProcessor.process(shader);

    const occurrences = result.split('float intensity = 0.5;').length - 1;

    expect(occurrences).toBe(1);
  });

  it('should throw an error when a "#pragma forge include" directive is missing its parentheses entirely', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      void main() {
        #pragma forge include
        gl_FragColor = vec4(1.0);
      }
    `);

    const preProcessor = new ResolveIncludesPreProcessor([]);

    expect(() => preProcessor.process(shader)).toThrow(
      /Invalid shader syntax at line 5:9\. Expected "#pragma forge include\(name\)" but got "#pragma forge include" when resolving "test"/,
    );
  });

  it('should throw an error when a "#pragma forge include" directive has an empty name', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      void main() {
        #pragma forge include()
        gl_FragColor = vec4(1.0);
      }
    `);

    const preProcessor = new ResolveIncludesPreProcessor([]);

    expect(() => preProcessor.process(shader)).toThrow(
      /Invalid shader syntax at line 5:9\. Expected "#pragma forge include\(name\)" but got "#pragma forge include\(\)" when resolving "test"/,
    );
  });

  it('should throw an error when a "#pragma forge include" directive references a missing include', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      void main() {
        #pragma forge include(missing)
        gl_FragColor = vec4(1.0);
      }
    `);

    const preProcessor = new ResolveIncludesPreProcessor([]);

    expect(() => preProcessor.process(shader)).toThrow(
      'Missing include for shader: "missing" at line 5:9 when resolving "test"',
    );
  });

  it('should leave lines without a "#pragma forge include" directive unchanged', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const preProcessor = new ResolveIncludesPreProcessor([]);
    const result = preProcessor.process(shader);

    expect(result).toContain('void main() {');
    expect(result).toContain('gl_FragColor = vec4(1.0);');
    expect(result).not.toContain('#line');
  });

  it('should remove duplicate uniform variable declarations', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      uniform vec2 resolution;

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      uniform vec2 resolution;
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common]);
    const result = preProcessor.process(shader);

    const occurrences = result.split('uniform vec2 resolution;').length - 1;

    expect(occurrences).toBe(1);
  });

  it('should remove duplicate "in" variable declarations', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #pragma forge include(common)
      in vec2 uv;

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const common = new ForgeShaderSource(`
      #pragma forge name(common)

      in vec2 uv;
    `);

    const preProcessor = new ResolveIncludesPreProcessor([common]);
    const result = preProcessor.process(shader);

    const occurrences = result.split('in vec2 uv;').length - 1;

    expect(occurrences).toBe(1);
  });

  it('should not remove variable declarations that are unique', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      uniform vec2 resolution;
      uniform float time;

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const preProcessor = new ResolveIncludesPreProcessor([]);
    const result = preProcessor.process(shader);

    expect(result).toContain('uniform vec2 resolution;');
    expect(result).toContain('uniform float time;');
  });

  it('should strip #property lines from the output', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)

      #property legacy: value;

      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const preProcessor = new ResolveIncludesPreProcessor([]);
    const result = preProcessor.process(shader);

    expect(result).not.toContain('#property');
  });

  it('should collapse consecutive empty lines into a single empty line', () => {
    const shader = new ForgeShaderSource(`
      #pragma forge name(test)



      void main() {
        gl_FragColor = vec4(1.0);
      }
    `);

    const preProcessor = new ResolveIncludesPreProcessor([]);
    const result = preProcessor.process(shader);

    expect(result).not.toMatch(/\n\s*\n\s*\n/);
  });
});
