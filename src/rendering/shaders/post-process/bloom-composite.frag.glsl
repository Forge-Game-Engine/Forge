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

    // Render targets hold premultiplied alpha and are presented with
    // ONE, ONE_MINUS_SRC_ALPHA, so the glow is just light added to the
    // color: it reaches the screen past the source sprite's silhouette,
    // over fully transparent pixels, without needing any coverage of its
    // own. Keeping the scene's alpha means the halo only ever adds to
    // whatever is presented beneath this target, instead of partly
    // covering it and replacing it with glow color.
    vec3 color = scene.rgb + bloom.rgb * u_intensity;

    fragColor = vec4(color, scene.a);
}
