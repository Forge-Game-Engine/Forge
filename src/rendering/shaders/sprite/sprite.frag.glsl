#version 300 es

#property name: sprite.frag

precision mediump float;

uniform sampler2D u_texture;  // The sprite texture

in vec2 v_texCoord;           // Input from vertex shader
out vec4 fragColor;           // Output color

void main() {
  fragColor = texture(u_texture, v_texCoord);
}
