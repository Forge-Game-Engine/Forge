#version 300 es

#property name: text.vert

// Per-vertex: unit quad texture coordinates [0,1]x[0,1]
in vec2 a_texCoord;

// Per-instance: element world matrix (column-major mat3 decomposed into 3 vec3)
in vec3 a_worldMat0;
in vec3 a_worldMat1;
in vec3 a_worldMat2;

// Per-instance: glyph position and size as normalised fractions of the element rect
// glyphOffset = (glyphPixelX / elemW, glyphPixelY / elemH)
// glyphSize   = (glyphPixelW / elemW, glyphPixelH / elemH)
in vec2 a_glyphOffset;
in vec2 a_glyphSize;

// Per-instance: atlas UV rectangle (min corner + extent, normalised 0-1)
in vec2 a_uvMin;
in vec2 a_uvSize;

// Per-instance: text colour (RGBA 0-1)
in vec4 a_color;

// Per-instance: clip rect (x, y, w, h in screen-space pixels; w=0 means no clip)
in vec4 a_clipRect;

// Per-instance: global opacity multiplier
in float a_opacity;

uniform mat3 u_projection;

out vec2 v_atlasUV;
out vec4 v_color;
out vec4 v_clipRect;
out vec2 v_screenPos;
out float v_opacity;

void main() {
    mat3 worldMatrix = mat3(a_worldMat0, a_worldMat1, a_worldMat2);

    // Map the unit quad through the glyph's normalised rect, then through
    // the element's world matrix (which maps [0,1]x[0,1] -> screen pixels).
    vec2 normalizedPos = a_glyphOffset + a_texCoord * a_glyphSize;
    vec3 screenPos = vec3(normalizedPos, 1.0) * worldMatrix;
    vec3 clipPos = screenPos * u_projection;

    gl_Position = vec4(clipPos.xy, 0.0, 1.0);

    // Atlas UV for SDF sampling
    v_atlasUV = a_uvMin + a_texCoord * a_uvSize;

    v_color    = a_color;
    v_clipRect = a_clipRect;
    v_screenPos = screenPos.xy;
    v_opacity  = a_opacity;
}
