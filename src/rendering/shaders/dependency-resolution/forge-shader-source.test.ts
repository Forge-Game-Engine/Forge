import { describe, expect, it } from 'vitest';
import { ForgeShaderSource } from './forge-shader-source';

describe('ForgeShaderSource', () => {
  describe('constructor', () => {
    it('should parse shader with valid name property', () => {
      const rawSource = `
        #property name: testShader

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('testShader');
    });

    it('should throw error when shader has no name property', () => {
      const rawSource = `
        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      expect(() => new ForgeShaderSource(rawSource)).toThrow(
        'Unable to find shader name. Please ensure the shader source contains a #property name: value directive.',
      );
    });

    it('should parse shader with includes', () => {
      const rawSource = `
        #property name: testShader
        #include <common>

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.includes.has('common')).toBe(true);
    });

    it('should parse shader with multiple includes', () => {
      const rawSource = `
        #property name: testShader
        #include <common>
        #include <lighting>
        #include <utils>

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.includes.size).toBe(3);
      expect(shader.includes.has('common')).toBe(true);
      expect(shader.includes.has('lighting')).toBe(true);
      expect(shader.includes.has('utils')).toBe(true);
    });

    it('should parse shader with multiple properties', () => {
      const rawSource = `
        #property name: testShader
        #property version: 1.0
        #property author: forge

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('testShader');
      expect(shader.getPropertyValue('version')).toBe('1.0');
      expect(shader.getPropertyValue('author')).toBe('forge');
    });

    it('should throw error for invalid include syntax (missing name)', () => {
      const rawSource = `
        #property name: testShader
        #include <>

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      expect(() => new ForgeShaderSource(rawSource)).toThrow(
        'Invalid shader syntax at line 3:9. Expected "#include <name>" but got "#include <>"',
      );
    });

    it('should throw error for invalid include syntax (incomplete)', () => {
      const rawSource = `
        #property name: testShader
        #include

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      expect(() => new ForgeShaderSource(rawSource)).toThrow(
        'Invalid shader syntax at line 3:9. Expected "#include <name>" but got "#include"',
      );
    });

    it('should throw error for invalid property syntax (missing value)', () => {
      const rawSource = `
        #property name:

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      expect(() => new ForgeShaderSource(rawSource)).toThrow(
        'Invalid shader syntax at line 2:9. Expected "#property name: value" but got "#property name:"',
      );
    });

    it('should throw error for invalid property syntax (missing colon)', () => {
      const rawSource = `
        #property name testShader

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      expect(() => new ForgeShaderSource(rawSource)).toThrow(
        'Invalid shader syntax at line 2:9. Expected "#property name: value" but got "#property name testShader"',
      );
    });
  });

  describe('rawSource getter', () => {
    it('should return the original raw source', () => {
      const rawSource = `
        #property name: testShader

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.rawSource).toBe(rawSource);
    });
  });

  describe('includes getter', () => {
    it('should return empty set when no includes', () => {
      const rawSource = `
        #property name: testShader

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.includes.size).toBe(0);
    });

    it('should return set with single include', () => {
      const rawSource = `
        #property name: testShader
        #include <common>

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.includes.size).toBe(1);
      expect(shader.includes.has('common')).toBe(true);
    });

    it('should handle includes with underscores and numbers', () => {
      const rawSource = `
        #property name: testShader
        #include <common_utils_v2>

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.includes.has('common_utils_v2')).toBe(true);
    });

    it('should not add duplicate includes', () => {
      const rawSource = `
        #property name: testShader
        #include <common>
        #include <common>

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.includes.size).toBe(1);
      expect(shader.includes.has('common')).toBe(true);
    });
  });

  describe('name getter', () => {
    it('should return the shader name', () => {
      const rawSource = `
        #property name: myCustomShader

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('myCustomShader');
    });

    it('should handle names with dots', () => {
      const rawSource = `
        #property name: shader.v1.0

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('shader.v1.0');
    });

    it('should handle names with underscores', () => {
      const rawSource = `
        #property name: my_shader_name

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('my_shader_name');
    });
  });

  describe('getPropertyValue', () => {
    it('should return property value when it exists', () => {
      const rawSource = `
        #property name: testShader
        #property version: 2.0

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.getPropertyValue('version')).toBe('2.0');
    });

    it('should return null when property does not exist', () => {
      const rawSource = `
        #property name: testShader

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.getPropertyValue('nonexistent')).toBeNull();
    });

    it('should be case-insensitive', () => {
      const rawSource = `
        #property name: testShader
        #property version: 3.0

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.getPropertyValue('version')).toBe('3.0');
      expect(shader.getPropertyValue('VERSION')).toBe('3.0');
      expect(shader.getPropertyValue('Version')).toBe('3.0');
    });

    it('should handle properties with dots in values', () => {
      const rawSource = `
        #property name: testShader
        #property version: 1.2.3

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.getPropertyValue('version')).toBe('1.2.3');
    });

    it('should handle multiple custom properties', () => {
      const rawSource = `
        #property name: testShader
        #property version: 1.0
        #property author: forge
        #property type: fragment

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.getPropertyValue('version')).toBe('1.0');
      expect(shader.getPropertyValue('author')).toBe('forge');
      expect(shader.getPropertyValue('type')).toBe('fragment');
    });
  });

  describe('edge cases', () => {
    it('should handle shader with only name property and no code', () => {
      const rawSource = `
        #property name: minimalShader
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('minimalShader');
      expect(shader.includes.size).toBe(0);
    });

    it('should handle shader with whitespace before directives', () => {
      const rawSource = `
          #property name: testShader
          #include <common>

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('testShader');
      expect(shader.includes.has('common')).toBe(true);
    });

    it('should handle shader with inline directives', () => {
      const rawSource = `#property name: testShader
#include <common>
void main() { gl_FragColor = vec4(1.0); }`;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('testShader');
      expect(shader.includes.has('common')).toBe(true);
    });

    it('should handle properties with spaces around colon', () => {
      const rawSource = `
        #property name  :  testShader
        #property version  :  1.0

        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const shader = new ForgeShaderSource(rawSource);

      expect(shader.name).toBe('testShader');
      expect(shader.getPropertyValue('version')).toBe('1.0');
    });
  });
});
