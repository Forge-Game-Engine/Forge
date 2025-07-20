#version 300 es

#property name: sprite.vert

in vec2 a_position;      // Vertex position (e.g., quad corners)
in vec2 a_texCoord;      // Texture coordinate

// Per-instance attributes:
in vec2 a_instancePos;        // Sprite position
in float a_instanceRot;       // Sprite rotation (radians)
in vec2 a_instanceScale;      // Sprite scale
in vec2 a_instanceSize;       // Sprite width/height
in vec2 a_instancePivot;      // Sprite pivot (origin offset)
in vec2 a_instanceFlip;       // Flip the image on the x and/or y axis
in vec2 a_instanceTexOffset;  // Texture region offset (UV)
in vec2 a_instanceTexSize;    // Texture region size (UV)

// Uniforms for projection/camera:
uniform mat3 u_projection; // 2D projection/camera matrix

out vec2 v_texCoord;

void main() {
    // 1. Scale quad to sprite size and scale
    vec2 scaled = a_position * a_instanceSize * a_instanceScale;

    // 2. Apply pivot (move origin)
    vec2 pivoted = scaled - a_instancePivot;

    // 3. Rotate
    float c = cos(a_instanceRot);
    float s = sin(a_instanceRot);
    vec2 rotated = vec2(
        c * pivoted.x - s * pivoted.y,
        s * pivoted.x + c * pivoted.y
    );

    // 4. Translate to world position
    vec2 world = rotated + a_instancePos;

    // 5. Project to screen
    vec3 projected = u_projection * vec3(world, 1.0);

    gl_Position = vec4(projected.xy, 0.0, 1.0);
    vec2 flippedTexCoord = mix(a_texCoord, vec2(1.0) - a_texCoord, a_instanceFlip);
    v_texCoord = a_instanceTexOffset + flippedTexCoord * a_instanceTexSize;
}