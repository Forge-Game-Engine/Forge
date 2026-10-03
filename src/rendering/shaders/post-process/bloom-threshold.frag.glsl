#version 300 es

#pragma forge name(bloom-threshold.frag)

precision mediump float;

uniform sampler2D u_texture;
uniform float u_threshold;
uniform vec2 u_texelSize; // 1 / full-resolution source texture size

in vec2 v_texCoord;
out vec4 fragColor;

// How far above u_threshold brightness has to climb before contributing at
// full strength. Softens the cutoff into a fade instead of a hard edge.
const float knee = 0.1;

const float sampleCount = 16.0;

void main() {
    // Each destination texel here covers a 4x4 block of the full-resolution
    // source (see bloomDownsampleFactor in bloom-system.ts). A single point
    // sample at this resolution can miss a small or thin bright source
    // entirely if it doesn't land on a sample point - a bullet or spark only
    // a few source pixels wide would simply fall between texels and never
    // reach the bright-pass buffer. Thresholding every one of the 4x4 block's
    // texels individually, then averaging, is a proper box-filter downsample:
    // a small bright texel still clears the threshold on its own merits (so
    // it isn't missed), while its color is preserved and blended with its
    // neighbors' rather than one texel's color winning outright - keeping a
    // white-hot core distinct from a dimmer, differently-colored surrounding
    // glow (a bullet's yellow tail, say) instead of flattening the whole
    // block to whichever single texel happened to be brightest.
    vec3 accumulatedColor = vec3(0.0);
    float accumulatedContribution = 0.0;

    for (int y = -2; y < 2; y++) {
        for (int x = -2; x < 2; x++) {
            vec2 offset = (vec2(float(x), float(y)) + 0.5) * u_texelSize;
            vec4 sampleColor = texture(u_texture, v_texCoord + offset);
            float sampleBrightness = dot(sampleColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            float sampleContribution = smoothstep(u_threshold, u_threshold + knee, sampleBrightness);

            accumulatedColor += sampleColor.rgb * sampleContribution;
            accumulatedContribution += sampleContribution;
        }
    }

    // The composite pass only reads the glow's color, adding it to the scene
    // as light; the glow has no coverage of its own, so alpha stays 0.
    fragColor = vec4(accumulatedColor / sampleCount, 0.0);
}
