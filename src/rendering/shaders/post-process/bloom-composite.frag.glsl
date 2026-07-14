#version 300 es

#pragma forge name(bloom-composite.frag)

precision mediump float;

uniform sampler2D u_sceneTexture;
uniform sampler2D u_bloomTexture;
uniform float u_intensity;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
    vec4 scene = texture(u_sceneTexture, v_texCoord);
    vec4 bloom = texture(u_bloomTexture, v_texCoord);

    // The blurred glow's own alpha (see bloom-threshold.frag) is folded
    // into the result's alpha via max(), not scene.a alone: otherwise the
    // halo would only ever appear on top of already-opaque scene pixels,
    // and vanish the moment it blurs past the source sprite's silhouette
    // into what was fully transparent.
    vec3 color = scene.rgb + bloom.rgb * u_intensity;
    float alpha = clamp(max(scene.a, bloom.a * u_intensity), 0.0, 1.0);

    fragColor = vec4(color, alpha);
}
