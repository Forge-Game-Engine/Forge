#version 300 es

#pragma forge name(msdf.vert)

in vec2 a_position;      // Vertex position (e.g., quad corners)
in vec2 a_texCoord;      // Texture coordinate

// Per-instance attributes (base sprite segment, see `sprite.vert.glsl`):
in vec4 a_instancePosScale;   // Glyph position (xy) and scale (zw)
in float a_instanceRot;       // Glyph rotation (radians)
in vec4 a_instanceSizePivot;  // Glyph width/height (xy) and pivot (zw)
in vec4 a_instanceTexRect;    // Texture region offset (xy) and size (zw), in UV
in vec4 a_instanceTint;       // tint color

// Per-instance attribute (text embolden segment, see
// `textEmboldenInstanceDataSegment`): the faux-bold edge shift, in
// distance-field units.
in float a_instanceEmbolden;

// Per-instance attributes (text effects segment, see
// `textEffectsInstanceDataSegment`):
in vec4 a_instanceOutlineColor;
in vec4 a_instanceShadowColor;
in vec4 a_instanceEffectParams;  // Outline width (x), shadow offset (yz), shadow softness (w)

// Per-instance mask attributes (see `maskInstanceDataSegment`).
//
// Attribute budget: WebGL2 only guarantees 16 vertex attributes, and this
// shader uses 15 (the quad's 2, the sprite segment's 5, embolden, the 3
// effect attributes and the mask's 4). Pack any new per-glyph data into an
// existing attribute's spare components rather than adding one.
#pragma forge include(spriteMaskVertex)

// Uniforms for projection/camera:
uniform mat3 u_projection; // 2D projection/camera matrix

out vec2 v_texCoord;
out vec4 v_tint;
out float v_embolden;
out vec4 v_outlineColor;
out float v_outlineWidth;
out vec4 v_shadowColor;
out vec2 v_shadowOffset;
out float v_shadowSoftness;

void main() {
    // Identical to `sprite.vert` - glyph quads are positioned, pivoted,
    // rotated, and projected exactly like a sprite region already is (see
    // `sprite.vert.glsl` for the derivation of each step below).
    vec2 normalizedPivot = vec2(
        (a_instanceSizePivot.z - 0.5) * 2.0,
        -(a_instanceSizePivot.w - 0.5) * 2.0
    );

    vec2 pivoted = a_position - normalizedPivot;
    vec2 scaled = pivoted * a_instanceSizePivot.xy * a_instancePosScale.zw * 0.5;

    float c = cos(a_instanceRot);
    float s = sin(a_instanceRot);
    vec2 rotated = vec2(
        c * scaled.x - s * scaled.y,
        s * scaled.x + c * scaled.y
    );

    vec2 world = rotated + a_instancePosScale.xy;

    vec3 projected = u_projection * vec3(world, 1.0);

    gl_Position = vec4(projected.xy, 0.0, 1.0);
    v_texCoord = a_instanceTexRect.xy + a_texCoord * a_instanceTexRect.zw;
    v_tint = a_instanceTint;
    v_embolden = a_instanceEmbolden;

    // Passed through unchanged - every vertex of a glyph's quad shares the
    // same per-instance effect parameters, so no per-vertex computation is
    // needed here; `msdf-effects.frag` does all the actual effect work.
    v_outlineColor = a_instanceOutlineColor;
    v_outlineWidth = a_instanceEffectParams.x;
    v_shadowColor = a_instanceShadowColor;
    v_shadowOffset = a_instanceEffectParams.yz;
    v_shadowSoftness = a_instanceEffectParams.w;

    forwardSpriteMask(world);
}
