import { Matrix3x3, Vec2 } from '../../math/index.js';
import type {
  SamplerUniformType,
  UniformArrayUpload,
  UniformType,
} from './uniform-types.js';
import { isVector2, UniformValue } from './uniform-value.js';

/**
 * A uniform's type and size: from its declaration in the shader source, or,
 * for a member of a struct uniform, as reported by `getActiveUniform`.
 */
export interface UniformDeclaration {
  /** The uniform's name, without the `[0]` suffix WebGL gives arrays. */
  readonly name: string;
  /** The GL type enum of the uniform's type. */
  readonly glType: GLenum;
  /** The uniform's declared type, or `null` if it isn't a known WebGL 2 type. */
  readonly uniformType: UniformType | null;
  /** The number of array elements, `1` for a uniform that isn't an array. */
  readonly size: number;
}

/**
 * Uploads a uniform's value to `location` on the currently bound program.
 * @returns The next free texture unit (`textureUnit` itself unless the
 * upload bound a texture).
 */
export type UniformUpload = (
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation,
  textureUnit: number,
) => number;

type ScalarUpload = (
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation,
  value: number,
) => void;

/** How a `number` is uploaded, by the kinds of uniform that accept one. */
const numberUploads: ReadonlyMap<UniformType['kind'], ScalarUpload> = new Map<
  UniformType['kind'],
  ScalarUpload
>([
  ['float', (gl, location, value) => gl.uniform1f(location, value)],
  ['int', (gl, location, value) => gl.uniform1i(location, value)],
  ['uint', (gl, location, value) => gl.uniform1ui(location, value)],
]);

const typedArrayNames: Record<
  Exclude<UniformType['kind'], 'sampler'>,
  string
> = {
  float: 'a Float32Array',
  int: 'an Int32Array',
  bool: 'an Int32Array',
  uint: 'a Uint32Array',
};

const booleanKinds: ReadonlySet<UniformType['kind']> = new Set(['bool', 'int']);

/**
 * Validates a value against a uniform's declaration and builds the upload
 * that sends it to the GPU when the material is bound.
 *
 * The GL call is chosen from the uniform's declared type, never from the
 * shape of the value, so a 16-float array goes to a `vec4[4]` as four
 * `vec4`s and to a `mat4` as a matrix. A typed array must hold a whole
 * number of elements of the declared type: exactly one for a uniform that
 * isn't an array, or between one and the declared array size for an array
 * (a shorter array updates the leading elements only).
 * @param declaration - The uniform to upload to.
 * @param value - The value to upload.
 * @returns The upload to run on bind.
 * @throws An error if the value can't be assigned to the uniform's declared
 * type.
 */
export const createUniformUpload = (
  declaration: UniformDeclaration,
  value: UniformValue,
): UniformUpload => {
  const { name, glType, uniformType } = declaration;

  if (uniformType === null) {
    throw new Error(
      `Uniform "${name}" has GL type 0x${glType.toString(16)}, which is not a WebGL 2 uniform type Material can upload.`,
    );
  }

  if (uniformType.kind === 'sampler') {
    return createSamplerUpload(declaration, uniformType, value);
  }

  if (typeof value === 'number') {
    const upload = numberUploads.get(uniformType.kind);

    if (upload === undefined || !isScalar(declaration, uniformType)) {
      throw createMismatchError(declaration, uniformType, value);
    }

    return (gl, location, textureUnit) => {
      upload(gl, location, value);

      return textureUnit;
    };
  }

  if (typeof value === 'boolean') {
    if (
      !booleanKinds.has(uniformType.kind) ||
      !isScalar(declaration, uniformType)
    ) {
      throw createMismatchError(declaration, uniformType, value);
    }

    return (gl, location, textureUnit) => {
      gl.uniform1i(location, value ? 1 : 0);

      return textureUnit;
    };
  }

  return createArrayUpload(declaration, uniformType, value);
};

const createSamplerUpload = (
  declaration: UniformDeclaration,
  uniformType: SamplerUniformType,
  value: UniformValue,
): UniformUpload => {
  if (declaration.size > 1) {
    throw new Error(
      `Uniform "${declaration.name}" is declared as ${describeDeclaration(declaration, uniformType)}, but Material does not support sampler arrays. Declare one sampler uniform per texture instead.`,
    );
  }

  if (!(value instanceof WebGLTexture)) {
    throw createMismatchError(declaration, uniformType, value);
  }

  return (gl, location, textureUnit) => {
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(uniformType.textureTarget(gl), value);
    gl.uniform1i(location, textureUnit);

    return textureUnit + 1;
  };
};

const createArrayUpload = (
  declaration: UniformDeclaration,
  uniformType: Exclude<UniformType, SamplerUniformType>,
  value: UniformValue,
): UniformUpload => {
  if (uniformType.kind === 'float') {
    if (value instanceof Float32Array) {
      assertArrayLength(declaration, uniformType, value, value.length);

      return createTypedArrayUpload(uniformType.upload, () => value);
    }

    if (value instanceof Matrix3x3) {
      assertArrayLength(declaration, uniformType, value, value.matrix.length);

      return createTypedArrayUpload(uniformType.upload, () => value.matrix);
    }

    if (isVector2(value)) {
      assertArrayLength(declaration, uniformType, value, 2);

      return createTypedArrayUpload(uniformType.upload, () =>
        Vec2.toFloat32Array(value),
      );
    }
  }

  if (uniformType.kind === 'uint' && value instanceof Uint32Array) {
    assertArrayLength(declaration, uniformType, value, value.length);

    return createTypedArrayUpload(uniformType.upload, () => value);
  }

  if (
    (uniformType.kind === 'int' || uniformType.kind === 'bool') &&
    value instanceof Int32Array
  ) {
    assertArrayLength(declaration, uniformType, value, value.length);

    return createTypedArrayUpload(uniformType.upload, () => value);
  }

  throw createMismatchError(declaration, uniformType, value);
};

/**
 * Builds an upload that reads its data at bind time, so a `Matrix3x3` or
 * `Vector2` mutated after `setUniform` uploads its current contents.
 */
const createTypedArrayUpload =
  <TArray>(
    upload: UniformArrayUpload<TArray>,
    read: () => TArray,
  ): UniformUpload =>
  (gl, location, textureUnit) => {
    upload(gl, location, read());

    return textureUnit;
  };

/** Whether a uniform holds a single component, so a bare scalar fits it. */
const isScalar = (
  declaration: UniformDeclaration,
  uniformType: Exclude<UniformType, SamplerUniformType>,
): boolean => uniformType.componentCount === 1 && declaration.size === 1;

const assertArrayLength = (
  declaration: UniformDeclaration,
  uniformType: Exclude<UniformType, SamplerUniformType>,
  value: UniformValue,
  length: number,
): void => {
  const { componentCount } = uniformType;
  const isWholeElements = length > 0 && length % componentCount === 0;

  if (!isWholeElements || length > componentCount * declaration.size) {
    throw createMismatchError(declaration, uniformType, value);
  }
};

const createMismatchError = (
  declaration: UniformDeclaration,
  uniformType: UniformType,
  value: UniformValue,
): Error =>
  new Error(
    `Uniform "${declaration.name}" is declared as ${describeDeclaration(declaration, uniformType)} and expects ${describeExpectedValue(declaration, uniformType)}, but received ${describeValue(value)}.`,
  );

const describeDeclaration = (
  declaration: UniformDeclaration,
  uniformType: UniformType,
): string =>
  declaration.size > 1
    ? `${uniformType.glslName}[${declaration.size}]`
    : uniformType.glslName;

const describeExpectedValue = (
  declaration: UniformDeclaration,
  uniformType: UniformType,
): string => {
  if (uniformType.kind === 'sampler') {
    return 'a WebGLTexture';
  }

  const { kind, componentCount } = uniformType;
  const { size } = declaration;
  const alternatives: string[] = [];

  if (componentCount === 1 && size === 1) {
    if (numberUploads.has(kind)) {
      alternatives.push('a number');
    }

    if (booleanKinds.has(kind)) {
      alternatives.push('a boolean');
    }
  }

  if (kind === 'float' && componentCount === 2) {
    alternatives.push('a Vector2');
  }

  if (kind === 'float' && componentCount === 9) {
    alternatives.push('a Matrix3x3');
  }

  alternatives.push(
    `${typedArrayNames[kind]} ${describeExpectedLength(componentCount, size)}`,
  );

  return alternatives.join(' or ');
};

const describeExpectedLength = (
  componentCount: number,
  size: number,
): string => {
  if (size === 1) {
    return `of length ${componentCount}`;
  }

  if (componentCount === 1) {
    return `of length 1 to ${size}`;
  }

  return `whose length is a multiple of ${componentCount}, up to ${componentCount * size}`;
};

const describeValue = (value: UniformValue): string => {
  if (typeof value === 'number') {
    return 'a number';
  }

  if (typeof value === 'boolean') {
    return 'a boolean';
  }

  if (value instanceof Float32Array) {
    return `a Float32Array of length ${value.length}`;
  }

  if (value instanceof Int32Array) {
    return `an Int32Array of length ${value.length}`;
  }

  if (value instanceof Uint32Array) {
    return `a Uint32Array of length ${value.length}`;
  }

  if (value instanceof Matrix3x3) {
    return 'a Matrix3x3';
  }

  if (isVector2(value)) {
    return 'a Vector2';
  }

  return 'a WebGLTexture';
};
