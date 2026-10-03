/**
 * Uploads a typed array to a uniform's location using the GL call that
 * matches the uniform's declared type.
 */
export type UniformArrayUpload<TArray> = (
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation,
  data: TArray,
) => void;

/**
 * A `float`, `vecN` or `matN`/`matNxM` uniform, set from a `Float32Array`.
 */
export interface FloatUniformType {
  readonly kind: 'float';
  readonly glslName: string;
  readonly componentCount: number;
  readonly upload: UniformArrayUpload<Float32Array>;
}

/**
 * An `int`/`ivecN` or `bool`/`bvecN` uniform, set from an `Int32Array`.
 * WebGL uploads both through the `uniform*iv` family.
 */
export interface IntUniformType {
  readonly kind: 'int' | 'bool';
  readonly glslName: string;
  readonly componentCount: number;
  readonly upload: UniformArrayUpload<Int32Array>;
}

/**
 * A `uint`/`uvecN` uniform, set from a `Uint32Array`.
 */
export interface UintUniformType {
  readonly kind: 'uint';
  readonly glslName: string;
  readonly componentCount: number;
  readonly upload: UniformArrayUpload<Uint32Array>;
}

/**
 * A sampler uniform, set from a `WebGLTexture` bound to the texture target
 * the sampler reads from.
 */
export interface SamplerUniformType {
  readonly kind: 'sampler';
  readonly glslName: string;
  readonly textureTarget: (gl: WebGL2RenderingContext) => GLenum;
}

/**
 * The declared GLSL type of an active uniform, as reported by
 * `getActiveUniform`, with what it takes to upload a value to it.
 */
export type UniformType =
  FloatUniformType | IntUniformType | UintUniformType | SamplerUniformType;

// The GL type enums below are fixed by the WebGL 2 specification. They're
// spelled out here rather than read from a live context so the lookup table
// can be built once at module load, and each is typed against the matching
// `WebGL2RenderingContext` constant so a wrong value fails type-checking.
const glFloat: WebGL2RenderingContext['FLOAT'] = 0x1406;
const glFloatVec2: WebGL2RenderingContext['FLOAT_VEC2'] = 0x8b50;
const glFloatVec3: WebGL2RenderingContext['FLOAT_VEC3'] = 0x8b51;
const glFloatVec4: WebGL2RenderingContext['FLOAT_VEC4'] = 0x8b52;
const glFloatMat2: WebGL2RenderingContext['FLOAT_MAT2'] = 0x8b5a;
const glFloatMat3: WebGL2RenderingContext['FLOAT_MAT3'] = 0x8b5b;
const glFloatMat4: WebGL2RenderingContext['FLOAT_MAT4'] = 0x8b5c;
const glFloatMat2x3: WebGL2RenderingContext['FLOAT_MAT2x3'] = 0x8b65;
const glFloatMat2x4: WebGL2RenderingContext['FLOAT_MAT2x4'] = 0x8b66;
const glFloatMat3x2: WebGL2RenderingContext['FLOAT_MAT3x2'] = 0x8b67;
const glFloatMat3x4: WebGL2RenderingContext['FLOAT_MAT3x4'] = 0x8b68;
const glFloatMat4x2: WebGL2RenderingContext['FLOAT_MAT4x2'] = 0x8b69;
const glFloatMat4x3: WebGL2RenderingContext['FLOAT_MAT4x3'] = 0x8b6a;
const glInt: WebGL2RenderingContext['INT'] = 0x1404;
const glIntVec2: WebGL2RenderingContext['INT_VEC2'] = 0x8b53;
const glIntVec3: WebGL2RenderingContext['INT_VEC3'] = 0x8b54;
const glIntVec4: WebGL2RenderingContext['INT_VEC4'] = 0x8b55;
const glBool: WebGL2RenderingContext['BOOL'] = 0x8b56;
const glBoolVec2: WebGL2RenderingContext['BOOL_VEC2'] = 0x8b57;
const glBoolVec3: WebGL2RenderingContext['BOOL_VEC3'] = 0x8b58;
const glBoolVec4: WebGL2RenderingContext['BOOL_VEC4'] = 0x8b59;
const glUnsignedInt: WebGL2RenderingContext['UNSIGNED_INT'] = 0x1405;
const glUnsignedIntVec2: WebGL2RenderingContext['UNSIGNED_INT_VEC2'] = 0x8dc6;
const glUnsignedIntVec3: WebGL2RenderingContext['UNSIGNED_INT_VEC3'] = 0x8dc7;
const glUnsignedIntVec4: WebGL2RenderingContext['UNSIGNED_INT_VEC4'] = 0x8dc8;
const glSampler2d: WebGL2RenderingContext['SAMPLER_2D'] = 0x8b5e;
const glSampler3d: WebGL2RenderingContext['SAMPLER_3D'] = 0x8b5f;
const glSamplerCube: WebGL2RenderingContext['SAMPLER_CUBE'] = 0x8b60;
const glSampler2dShadow: WebGL2RenderingContext['SAMPLER_2D_SHADOW'] = 0x8b62;
const glSampler2dArray: WebGL2RenderingContext['SAMPLER_2D_ARRAY'] = 0x8dc1;
const glSampler2dArrayShadow: WebGL2RenderingContext['SAMPLER_2D_ARRAY_SHADOW'] = 0x8dc4;
const glSamplerCubeShadow: WebGL2RenderingContext['SAMPLER_CUBE_SHADOW'] = 0x8dc5;
const glIntSampler2d: WebGL2RenderingContext['INT_SAMPLER_2D'] = 0x8dca;
const glIntSampler3d: WebGL2RenderingContext['INT_SAMPLER_3D'] = 0x8dcb;
const glIntSamplerCube: WebGL2RenderingContext['INT_SAMPLER_CUBE'] = 0x8dcc;
const glIntSampler2dArray: WebGL2RenderingContext['INT_SAMPLER_2D_ARRAY'] = 0x8dcf;
const glUnsignedIntSampler2d: WebGL2RenderingContext['UNSIGNED_INT_SAMPLER_2D'] = 0x8dd2;
const glUnsignedIntSampler3d: WebGL2RenderingContext['UNSIGNED_INT_SAMPLER_3D'] = 0x8dd3;
const glUnsignedIntSamplerCube: WebGL2RenderingContext['UNSIGNED_INT_SAMPLER_CUBE'] = 0x8dd4;
const glUnsignedIntSampler2dArray: WebGL2RenderingContext['UNSIGNED_INT_SAMPLER_2D_ARRAY'] = 0x8dd7;

const floatType = (
  glslName: string,
  componentCount: number,
  upload: UniformArrayUpload<Float32Array>,
): FloatUniformType => ({ kind: 'float', glslName, componentCount, upload });

const intType = (
  kind: IntUniformType['kind'],
  glslName: string,
  componentCount: number,
  upload: UniformArrayUpload<Int32Array>,
): IntUniformType => ({ kind, glslName, componentCount, upload });

const uintType = (
  glslName: string,
  componentCount: number,
  upload: UniformArrayUpload<Uint32Array>,
): UintUniformType => ({ kind: 'uint', glslName, componentCount, upload });

const samplerType = (
  glslName: string,
  textureTarget: (gl: WebGL2RenderingContext) => GLenum,
): SamplerUniformType => ({ kind: 'sampler', glslName, textureTarget });

const texture2d = (gl: WebGL2RenderingContext): GLenum => gl.TEXTURE_2D;
const texture3d = (gl: WebGL2RenderingContext): GLenum => gl.TEXTURE_3D;
const textureCubeMap = (gl: WebGL2RenderingContext): GLenum =>
  gl.TEXTURE_CUBE_MAP;
const texture2dArray = (gl: WebGL2RenderingContext): GLenum =>
  gl.TEXTURE_2D_ARRAY;

const uniformTypes: ReadonlyMap<GLenum, UniformType> = new Map<
  GLenum,
  UniformType
>([
  [glFloat, floatType('float', 1, (gl, l, d) => gl.uniform1fv(l, d))],
  [glFloatVec2, floatType('vec2', 2, (gl, l, d) => gl.uniform2fv(l, d))],
  [glFloatVec3, floatType('vec3', 3, (gl, l, d) => gl.uniform3fv(l, d))],
  [glFloatVec4, floatType('vec4', 4, (gl, l, d) => gl.uniform4fv(l, d))],
  [
    glFloatMat2,
    floatType('mat2', 4, (gl, l, d) => gl.uniformMatrix2fv(l, false, d)),
  ],
  [
    glFloatMat3,
    floatType('mat3', 9, (gl, l, d) => gl.uniformMatrix3fv(l, false, d)),
  ],
  [
    glFloatMat4,
    floatType('mat4', 16, (gl, l, d) => gl.uniformMatrix4fv(l, false, d)),
  ],
  [
    glFloatMat2x3,
    floatType('mat2x3', 6, (gl, l, d) => gl.uniformMatrix2x3fv(l, false, d)),
  ],
  [
    glFloatMat2x4,
    floatType('mat2x4', 8, (gl, l, d) => gl.uniformMatrix2x4fv(l, false, d)),
  ],
  [
    glFloatMat3x2,
    floatType('mat3x2', 6, (gl, l, d) => gl.uniformMatrix3x2fv(l, false, d)),
  ],
  [
    glFloatMat3x4,
    floatType('mat3x4', 12, (gl, l, d) => gl.uniformMatrix3x4fv(l, false, d)),
  ],
  [
    glFloatMat4x2,
    floatType('mat4x2', 8, (gl, l, d) => gl.uniformMatrix4x2fv(l, false, d)),
  ],
  [
    glFloatMat4x3,
    floatType('mat4x3', 12, (gl, l, d) => gl.uniformMatrix4x3fv(l, false, d)),
  ],
  [glInt, intType('int', 'int', 1, (gl, l, d) => gl.uniform1iv(l, d))],
  [glIntVec2, intType('int', 'ivec2', 2, (gl, l, d) => gl.uniform2iv(l, d))],
  [glIntVec3, intType('int', 'ivec3', 3, (gl, l, d) => gl.uniform3iv(l, d))],
  [glIntVec4, intType('int', 'ivec4', 4, (gl, l, d) => gl.uniform4iv(l, d))],
  [glBool, intType('bool', 'bool', 1, (gl, l, d) => gl.uniform1iv(l, d))],
  [glBoolVec2, intType('bool', 'bvec2', 2, (gl, l, d) => gl.uniform2iv(l, d))],
  [glBoolVec3, intType('bool', 'bvec3', 3, (gl, l, d) => gl.uniform3iv(l, d))],
  [glBoolVec4, intType('bool', 'bvec4', 4, (gl, l, d) => gl.uniform4iv(l, d))],
  [glUnsignedInt, uintType('uint', 1, (gl, l, d) => gl.uniform1uiv(l, d))],
  [glUnsignedIntVec2, uintType('uvec2', 2, (gl, l, d) => gl.uniform2uiv(l, d))],
  [glUnsignedIntVec3, uintType('uvec3', 3, (gl, l, d) => gl.uniform3uiv(l, d))],
  [glUnsignedIntVec4, uintType('uvec4', 4, (gl, l, d) => gl.uniform4uiv(l, d))],
  [glSampler2d, samplerType('sampler2D', texture2d)],
  [glSampler3d, samplerType('sampler3D', texture3d)],
  [glSamplerCube, samplerType('samplerCube', textureCubeMap)],
  [glSampler2dShadow, samplerType('sampler2DShadow', texture2d)],
  [glSampler2dArray, samplerType('sampler2DArray', texture2dArray)],
  [glSampler2dArrayShadow, samplerType('sampler2DArrayShadow', texture2dArray)],
  [glSamplerCubeShadow, samplerType('samplerCubeShadow', textureCubeMap)],
  [glIntSampler2d, samplerType('isampler2D', texture2d)],
  [glIntSampler3d, samplerType('isampler3D', texture3d)],
  [glIntSamplerCube, samplerType('isamplerCube', textureCubeMap)],
  [glIntSampler2dArray, samplerType('isampler2DArray', texture2dArray)],
  [glUnsignedIntSampler2d, samplerType('usampler2D', texture2d)],
  [glUnsignedIntSampler3d, samplerType('usampler3D', texture3d)],
  [glUnsignedIntSamplerCube, samplerType('usamplerCube', textureCubeMap)],
  [glUnsignedIntSampler2dArray, samplerType('usampler2DArray', texture2dArray)],
]);

/**
 * Looks up the declared type of an active uniform from the GL type enum
 * `getActiveUniform` reports for it.
 * @param glType - The `WebGLActiveInfo.type` of the uniform.
 * @returns The uniform type, or `null` if WebGL 2 doesn't define it as a
 * uniform type.
 */
export const getUniformType = (glType: GLenum): UniformType | null =>
  uniformTypes.get(glType) ?? null;
