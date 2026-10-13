import { Matrix3x3 } from '../../math/index.js';
import type { RenderContext } from '../render-context.js';
import {
  AXES_XX_OFFSET,
  CLIP_MIN_X_OFFSET,
  MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  ORIGIN_X_OFFSET,
  SHAPE_MODE_OFFSET,
  writeMaskData,
} from '../utilities/mask-instance-data-segment.js';
import type { InstanceMask } from '../utilities/resolve-instance-mask.js';
import { Material } from './material.js';
import { includesShader, maskShaderIncludeName } from './shader-includes.js';
import { UniformValue } from './uniform-value.js';

/**
 * The shader include every mesh vertex shader positions its vertices and
 * forwards its masks with.
 */
const meshVertexShaderIncludeName = 'meshVertex';

const modelUniformName = 'u_model';
const viewProjectionUniformName = 'u_viewProjection';
const maskClipUniformName = 'u_maskClip';
const maskAxesUniformName = 'u_maskAxes';
const maskOriginUniformName = 'u_maskOrigin';
const maskShapeUniformName = 'u_maskShape';

/** The uniforms the render system sets for each mesh it draws. */
const renderSystemUniformNames: ReadonlySet<string> = new Set([
  modelUniformName,
  viewProjectionUniformName,
  maskClipUniformName,
  maskAxesUniformName,
  maskOriginUniformName,
  maskShapeUniformName,
]);

/**
 * A material that draws meshes (see `MeshEcsComponent`): a vertex shader
 * that includes `meshVertex` and a fragment shader that includes `mask`.
 *
 * The render system sets the `meshVertex` uniforms for each mesh it draws:
 * `u_model` (the entity's world transform), `u_viewProjection` (the
 * camera's) and the mask uniforms. They can't be set on the material. A
 * mesh's textures, colors and any other values are the material's own
 * uniforms, set with {@link Material.setUniform}.
 *
 * The vertex shader maps each vertex with `meshWorldPosition`, projects it
 * with `meshClipPosition` and passes the world position to
 * `forwardMeshMask`. The fragment shader outputs straight (not
 * premultiplied) alpha, multiplied by `maskCoverage()`, so the mesh is
 * clipped by the masks above it (see `MaskEcsComponent`).
 */
export class MeshMaterial extends Material {
  private readonly _model: Matrix3x3 = Matrix3x3.identity;
  private readonly _viewProjection: Matrix3x3 = Matrix3x3.identity;
  private readonly _maskData: Float32Array = new Float32Array(
    MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE,
  );

  /**
   * Constructs a new instance of the `MeshMaterial` class.
   * @param renderContext - The render context to draw with.
   * @param vertexShaderName - The name of the vertex shader in
   * `renderContext.shaderCache`, from its `#pragma forge name(...)`.
   * @param fragmentShaderName - The name of the fragment shader in
   * `renderContext.shaderCache`.
   * @throws An error under the same conditions as `Material`'s constructor,
   * if the shader cache has no shader with either name, if the vertex shader
   * doesn't include `meshVertex`, or if the fragment shader doesn't include
   * `mask`.
   */
  constructor(
    renderContext: RenderContext,
    vertexShaderName: string,
    fragmentShaderName: string,
  ) {
    const { shaderCache } = renderContext;
    const vertexShader = shaderCache.getShader(vertexShaderName);
    const fragmentShader = shaderCache.getShader(fragmentShaderName);

    if (
      !includesShader(vertexShader.preparedSource, meshVertexShaderIncludeName)
    ) {
      throw new Error(
        `Mesh vertex shader "${vertexShaderName}" must include "${meshVertexShaderIncludeName}" (#pragma forge include(${meshVertexShaderIncludeName})) and position its vertices with meshWorldPosition() and meshClipPosition(), so the mesh is drawn where its entity is.`,
      );
    }

    if (!includesShader(fragmentShader.preparedSource, maskShaderIncludeName)) {
      throw new Error(
        `Mesh fragment shader "${fragmentShaderName}" must include "${maskShaderIncludeName}" (#pragma forge include(${maskShaderIncludeName})) and multiply its output alpha by maskCoverage(), so masks clip the meshes it draws.`,
      );
    }

    super(renderContext, vertexShader, fragmentShader);

    // Uploaded from these on every bind, so `bindMesh` only has to write
    // them.
    this.storeUniform(modelUniformName, this._model);
    this.storeUniform(viewProjectionUniformName, this._viewProjection);
    this.storeUniform(
      maskClipUniformName,
      this._maskData.subarray(CLIP_MIN_X_OFFSET, AXES_XX_OFFSET),
    );
    this.storeUniform(
      maskAxesUniformName,
      this._maskData.subarray(AXES_XX_OFFSET, ORIGIN_X_OFFSET),
    );
    this.storeUniform(
      maskOriginUniformName,
      this._maskData.subarray(ORIGIN_X_OFFSET, SHAPE_MODE_OFFSET),
    );
    this.storeUniform(
      maskShapeUniformName,
      this._maskData.subarray(
        SHAPE_MODE_OFFSET,
        MASK_INSTANCE_DATA_FLOATS_PER_INSTANCE,
      ),
    );
  }

  /**
   * Sets a uniform's value, as {@link Material.setUniform} does.
   * @param name - The uniform's name.
   * @param value - The value to upload.
   * @throws An error for the uniforms the render system sets for each mesh
   * (`u_model`, `u_viewProjection`, `u_maskClip`, `u_maskAxes`,
   * `u_maskOrigin` and `u_maskShape`), and under the same conditions as
   * {@link Material.setUniform}.
   */
  public override setUniform(name: string, value: UniformValue): void {
    if (renderSystemUniformNames.has(name)) {
      throw new Error(
        `Uniform "${name}" of a mesh material is set by the render system from each mesh's entity and camera; move the entity or change its masks instead.`,
      );
    }

    super.setUniform(name, value);
  }

  /**
   * Binds the material to draw one mesh. Called by the render system for
   * each mesh it draws.
   * @param gl - The WebGL2 rendering context.
   * @param model - The mesh's entity's world transform, uploaded to
   * `u_model`.
   * @param viewProjection - The camera's Y-up world to clip space transform,
   * uploaded to `u_viewProjection`.
   * @param mask - The masks the mesh is drawn through, or `null` for none.
   * @returns The first texture unit the material left free.
   */
  public bindMesh(
    gl: WebGL2RenderingContext,
    model: Matrix3x3,
    viewProjection: Matrix3x3,
    mask: InstanceMask | null,
  ): number {
    this._model.matrix.set(model.matrix);
    this._viewProjection.matrix.set(viewProjection.matrix);
    writeMaskData(mask, this._maskData, 0, 1);

    return this.bind(gl);
  }
}

/**
 * Creates a material that draws meshes with a pair of shaders from
 * `renderContext.shaderCache`. The vertex shader must include `meshVertex`
 * and the fragment shader `mask` (see {@link MeshMaterial}). Declare and set
 * any other uniforms they need, such as textures, on the returned material.
 * @param renderContext - The render context to draw with.
 * @param vertexShaderName - The name of the vertex shader, registered in
 * `renderContext.shaderCache`.
 * @param fragmentShaderName - The name of the fragment shader, registered
 * in `renderContext.shaderCache`.
 * @returns The material. Materials from the same shaders share one program.
 * @throws An error under the same conditions as `MeshMaterial`'s
 * constructor.
 */
export function createMeshMaterial(
  renderContext: RenderContext,
  vertexShaderName: string,
  fragmentShaderName: string,
): MeshMaterial {
  return new MeshMaterial(renderContext, vertexShaderName, fragmentShaderName);
}
