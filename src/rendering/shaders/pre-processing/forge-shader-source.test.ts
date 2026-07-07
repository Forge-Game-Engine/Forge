import { describe, expect, it } from 'vitest';
import { ForgeShaderSource } from './forge-shader-source';

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
});
