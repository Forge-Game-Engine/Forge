#version 300 es

#pragma forge name(gaussian-blur.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_direction;  // (1, 0) for a horizontal pass, (0, 1) for a vertical pass
uniform vec2 u_texelSize;  // 1.0 / source texture size, scaled by the blur strength

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    vec2 step = u_direction * u_texelSize;

    // 9-tap separable Gaussian kernel (sigma ~ 2), applied along a single
    // axis. Run once with a horizontal `u_direction` and once with a
    // vertical `u_direction` to approximate a full 2D Gaussian blur at a
    // fraction of the cost of a single-pass NxN kernel.
    vec4 color = texture(u_texture, v_texCoord) * 0.2270270270;

    color += texture(u_texture, v_texCoord + step * 1.0) * 0.1945945946;
    color += texture(u_texture, v_texCoord - step * 1.0) * 0.1945945946;
    color += texture(u_texture, v_texCoord + step * 2.0) * 0.1216216216;
    color += texture(u_texture, v_texCoord - step * 2.0) * 0.1216216216;
    color += texture(u_texture, v_texCoord + step * 3.0) * 0.0540540541;
    color += texture(u_texture, v_texCoord - step * 3.0) * 0.0540540541;
    color += texture(u_texture, v_texCoord + step * 4.0) * 0.0162162162;
    color += texture(u_texture, v_texCoord - step * 4.0) * 0.0162162162;

    fragColor = color;
}
