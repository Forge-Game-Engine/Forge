#version 300 es

#property name: sprite.frag

precision mediump float;

uniform sampler2D u_texture;  // The sprite texture

in vec2 v_texCoord;           // Input from vertex shader
in vec4 v_tint;               // Tint color
out vec4 fragColor;           // Output color

void main() {
  vec4 tex = texture(u_texture, v_texCoord);
  fragColor = vec4(tex.rgb * v_tint.rgb, tex.a);  
}
