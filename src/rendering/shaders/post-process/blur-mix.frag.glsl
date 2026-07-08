#version 300 es

#pragma forge name(blur-mix.frag)

precision mediump float;

uniform sampler2D u_sharpTexture;
uniform sampler2D u_blurredTexture;
uniform float u_intensity;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    vec4 sharp = texture(u_sharpTexture, v_texCoord);
    vec4 blurred = texture(u_blurredTexture, v_texCoord);

    fragColor = mix(sharp, blurred, u_intensity);
}
