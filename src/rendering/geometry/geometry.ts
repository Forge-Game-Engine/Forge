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
  private _indexBuffer?: WebGLBuffer;
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
   * Optionally sets the index buffer for indexed drawing.
   */
  public setIndexBuffer(buffer: WebGLBuffer): void {
    this._indexBuffer = buffer;
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

  /**
   * Creates a new VAO
   */
  private _createVertexArrayObject(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
  ) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    if (this._indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    }

    for (const [name, attr] of this._attributes) {
      const loc = gl.getAttribLocation(program, name);

      if (loc === -1) {
        console.warn(`Attribute ${name} not found in shader`);

        continue; // Attribute not used in shader
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(
        loc,
        attr.size,
        attr.type,
        attr.normalized,
        attr.stride,
        attr.offset,
      );

      if (attr.divisor && attr.divisor > 0) {
        gl.vertexAttribDivisor(loc, attr.divisor);
      }
    }

    gl.bindVertexArray(null);

    return vao;
  }
}
