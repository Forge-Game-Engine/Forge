export function setupInstanceAttribute(
  attributeLocation: number,
  gl: WebGL2RenderingContext,
  numComponents: number,
  stride: number,
  offset: number,
): void {
  if (attributeLocation === -1) {
    return;
  }

  gl.enableVertexAttribArray(attributeLocation);
  gl.vertexAttribPointer(
    attributeLocation,
    numComponents,
    gl.FLOAT,
    false,
    stride,
    offset,
  );
  gl.vertexAttribDivisor(attributeLocation, 1);
}
