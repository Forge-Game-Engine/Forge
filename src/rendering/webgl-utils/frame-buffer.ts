export class Framebuffer {
  public id: WebGLFramebuffer;
  public texture: WebGLTexture;
  public width: number = 0;
  public height: number = 0;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    console.log(
      'Framebuffer constructor called with width:',
      width,
      'height:',
      height,
    );

    this.width = width;
    this.height = height;
    this.id = gl.createFramebuffer();
    this.texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public bind(gl: WebGL2RenderingContext): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);
    gl.viewport(0, 0, this.width, this.height);
  }

  public unbind(gl: WebGL2RenderingContext): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
