#version 300 es

#pragma forge name(box-downsample.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_texelSize; // 1 / source texture size
uniform int u_blockSize;  // source texels per destination texel, along each axis

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    // Averages the u_blockSize x u_blockSize block of source texels this
    // destination texel covers. A single (even bilinear) sample would read
    // at most a 2x2 corner of a larger block and skip the rest, so a detail
    // narrower than the block could vanish or flicker as it moves.
    vec4 accumulatedColor = vec4(0.0);
    float blockSize = float(u_blockSize);
    vec2 firstOffset = vec2(0.5 - blockSize * 0.5);

    for (int y = 0; y < u_blockSize; y++) {
        for (int x = 0; x < u_blockSize; x++) {
            vec2 offset = (firstOffset + vec2(float(x), float(y))) * u_texelSize;

            accumulatedColor += texture(u_texture, v_texCoord + offset);
        }
    }

    fragColor = accumulatedColor / (blockSize * blockSize);
}
