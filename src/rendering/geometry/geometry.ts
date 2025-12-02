type AttributeSpec = {
  buffer: WebGLBuffer;
  size: number;
  type?: number;
  normalized?: boolean;
  stride?: number;
  offset?: number;
  divisor?: number;
};

export class Geometry {
  private readonly _attributes: Map<string, Required<AttributeSpec>> =
    new Map();
  private readonly _vaoCache: Map<WebGLProgram, WebGLVertexArrayObject> =
    new Map();

  /**
   * Adds a vertex attribute to the geometry.
   */
  public addAttribute(
    gl: WebGL2RenderingContext,
    name: string,
    spec: AttributeSpec,
  ): void {
    this._attributes.set(name, {
      type: gl.FLOAT,
      normalized: false,
      stride: 0,
      offset: 0,
      divisor: 0,
      ...spec,
    });
  }

  /**
   * Binds the VAO for the given shader program. Will create it on first use.
   */
  public bind(gl: WebGL2RenderingContext, program: WebGLProgram): void {
    const vao = this._vaoCache.get(program);

    if (!vao) {
      const newVao = this._createVertexArrayObject(gl, program);
      this._vaoCache.set(program, newVao);

      return gl.bindVertexArray(newVao);
    }

    gl.bindVertexArray(vao);
  }

  public dispose(gl: WebGL2RenderingContext): void {
    for (const vao of this._vaoCache.values()) {
      gl.deleteVertexArray(vao);
    }
  }

  /**
   * Creates a new VAO
   */
  private _createVertexArrayObject(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
  ) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    this._bindVertexAttributes(gl, program);

    gl.bindVertexArray(null);

    return vao;
  }

  private _bindVertexAttributes(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
  ) {
    for (const [name, attributeSpec] of this._attributes) {
      this._bindVertexAttribute(gl, program, name, attributeSpec);
    }
  }

  private _bindVertexAttribute(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
    attributeSpec: Required<AttributeSpec>,
  ): void {
    const loc = gl.getAttribLocation(program, name);

    if (loc === -1) {
      console.warn(`Attribute ${name} not found in shader`);

      return; // Attribute not used in shader
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, attributeSpec.buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(
      loc,
      attributeSpec.size,
      attributeSpec.type,
      attributeSpec.normalized,
      attributeSpec.stride,
      attributeSpec.offset,
    );

    if (attributeSpec.divisor && attributeSpec.divisor > 0) {
      gl.vertexAttribDivisor(loc, attributeSpec.divisor);
    }
  }
}
