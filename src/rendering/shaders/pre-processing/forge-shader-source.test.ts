import { describe, expect, it } from 'vitest';
import { ForgeShaderSource } from './forge-shader-source';
import { ShaderPreProcessor } from './shader-pre-processor';

describe('ForgeShaderSource', () => {
  it('should parse shader with valid name property', () => {
    const rawSource = `
        #pragma forge name(testShader)

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('name')).toHaveLength(1);
    expect(shader.getPragmas('name')[0].values[0]).toBe('testShader');
  });

  it('should parse shader with includes', () => {
    const rawSource = `
        #pragma forge name(testShader)
        #pragma forge include(common)

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('include')).toHaveLength(1);
    expect(shader.getPragmas('include')[0].values[0]).toBe('common');
  });

  it('should parse shader with multiple includes', () => {
    const rawSource = `
        #pragma forge name(testShader)
        #pragma forge include(common)
        #pragma forge include(lighting)
        #pragma forge include(utils)

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('include')).toHaveLength(3);
    expect(shader.getPragmas('include')[0].values[0]).toBe('common');
    expect(shader.getPragmas('include')[1].values[0]).toBe('lighting');
    expect(shader.getPragmas('include')[2].values[0]).toBe('utils');
  });

  it('should not throw error when the value is not provided', () => {
    const rawSource = `
        #pragma forge name(testShader)
        #pragma forge include
        #pragma forge include()

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    expect(() => new ForgeShaderSource(rawSource)).not.toThrow();
  });

  it('should parse the shader even if the value is not provided', () => {
    const rawSource = `
        #pragma forge name(testShader)
        #pragma forge include
        #pragma forge include()

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('include')).toHaveLength(2);
    expect(shader.getPragmas('include')[0].values).toHaveLength(0);
    expect(shader.getPragmas('include')[1].values).toHaveLength(0);
  });

  it('should return the original raw source', () => {
    const rawSource = `
        #pragma forge name(testShader)

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.rawSource).toBe(rawSource);
  });

  it('should throw when there are no pragmas with the forge directive', () => {
    const rawSource = `
        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    expect(() => new ForgeShaderSource(rawSource)).toThrow(
      'Shader source must contain a valid "#pragma forge name(<name>)" directive.',
    );
  });

  it('should return empty when there are no pragmas that match the identifier', () => {
    const rawSource = `
        #pragma forge name(testShader)
        #pragma forge include(other)

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('version')).toHaveLength(0);
  });

  it('should handle shader with only name property and no code', () => {
    const rawSource = `
        #pragma forge name(minimalShader)
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('name')).toHaveLength(1);
    expect(shader.getPragmas('name')[0].values[0]).toBe('minimalShader');
  });

  it('should handle shader with whitespace before directives', () => {
    const rawSource = `
            #pragma forge name(testShader)
          #pragma forge include(common)

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('name')).toHaveLength(1);
    expect(shader.getPragmas('name')[0].values[0]).toBe('testShader');
    expect(shader.getPragmas('include')).toHaveLength(1);
    expect(shader.getPragmas('include')[0].values[0]).toBe('common');
  });

  it('should handle properties with spaces around the components', () => {
    const rawSource = `
        #pragma forge   name  ( testShader )
        #pragma   forge version( 1.0   )

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

    const shader = new ForgeShaderSource(rawSource);

    expect(shader.getPragmas('name')).toHaveLength(1);
    expect(shader.getPragmas('name')[0].values[0]).toBe('testShader');
    expect(shader.getPragmas('version')).toHaveLength(1);
    expect(shader.getPragmas('version')[0].values[0]).toBe('1.0');
  });

  describe('uniformDeclarations', () => {
    it('should read the uniforms the prepared source declares', () => {
      const shader = new ForgeShaderSource(
        '#pragma forge name(test)\nuniform float u_time;\nuniform vec4 u_waves[4];',
      );

      expect([...shader.uniformDeclarations.values()]).toEqual([
        { name: 'u_time', glslTypeName: 'float', isArray: false, size: 1 },
        { name: 'u_waves', glslTypeName: 'vec4', isArray: true, size: 4 },
      ]);
    });

    it('should cache the declarations until a pre-processor changes the source', () => {
      const shader = new ForgeShaderSource(
        '#pragma forge name(test)\nuniform float u_time;',
      );
      const declarations = shader.uniformDeclarations;

      expect(shader.uniformDeclarations).toBe(declarations);

      const addColor: ShaderPreProcessor = {
        process: (source) => `${source.rawSource}\nuniform vec4 u_color;`,
      };

      shader.applyPreProcessor(addColor);

      expect([...shader.uniformDeclarations.keys()]).toEqual([
        'u_time',
        'u_color',
      ]);
    });
  });
});
