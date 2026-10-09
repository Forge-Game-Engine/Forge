/**
 * The WebGL2 enum values the device uses, as plain numbers. The device reads
 * these instead of `gl.TEXTURE_2D` and friends, so its tables can be built
 * once at module scope and a test's recording context needs no constants of
 * its own. Each value is the one the WebGL2 and extension specifications
 * define.
 */

// Buffers
export const GL_ARRAY_BUFFER = 0x8892;
export const GL_ELEMENT_ARRAY_BUFFER = 0x8893;
export const GL_UNIFORM_BUFFER = 0x8a11;
export const GL_STATIC_DRAW = 0x88e4;
export const GL_DYNAMIC_DRAW = 0x88e8;

// Data types
export const GL_BYTE = 0x1400;
export const GL_UNSIGNED_BYTE = 0x1401;
export const GL_SHORT = 0x1402;
export const GL_UNSIGNED_SHORT = 0x1403;
export const GL_INT = 0x1404;
export const GL_UNSIGNED_INT = 0x1405;
export const GL_FLOAT = 0x1406;
export const GL_HALF_FLOAT = 0x140b;
export const GL_UNSIGNED_INT_2_10_10_10_REV = 0x8368;
export const GL_INT_2_10_10_10_REV = 0x8d9f;
export const GL_UNSIGNED_INT_10F_11F_11F_REV = 0x8c3b;
export const GL_UNSIGNED_INT_24_8 = 0x84fa;

// Texture targets
export const GL_TEXTURE_2D = 0x0de1;
export const GL_TEXTURE_3D = 0x806f;
export const GL_TEXTURE_2D_ARRAY = 0x8c1a;
export const GL_TEXTURE_CUBE_MAP = 0x8513;
export const GL_TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
export const GL_RENDERBUFFER = 0x8d41;
export const GL_TEXTURE0 = 0x84c0;

// Pixel formats
export const GL_DEPTH_COMPONENT = 0x1902;
export const GL_RED = 0x1903;
export const GL_RGB = 0x1907;
export const GL_RGBA = 0x1908;
export const GL_RG = 0x8227;
export const GL_RED_INTEGER = 0x8d94;
export const GL_RG_INTEGER = 0x8228;
export const GL_RGBA_INTEGER = 0x8d99;
export const GL_DEPTH_STENCIL = 0x84f9;

// Sized internal formats
export const GL_R8 = 0x8229;
export const GL_RG8 = 0x822b;
export const GL_RGBA8 = 0x8058;
export const GL_SRGB8_ALPHA8 = 0x8c43;
export const GL_R16F = 0x822d;
export const GL_RG16F = 0x822f;
export const GL_RGBA16F = 0x881a;
export const GL_R32F = 0x822e;
export const GL_RG32F = 0x8230;
export const GL_RGBA32F = 0x8814;
export const GL_R11F_G11F_B10F = 0x8c3a;
export const GL_RGB10_A2 = 0x8059;
export const GL_R32UI = 0x8236;
export const GL_RG32UI = 0x823c;
export const GL_RGBA32UI = 0x8d70;
export const GL_DEPTH_COMPONENT16 = 0x81a5;
export const GL_DEPTH_COMPONENT24 = 0x81a6;
export const GL_DEPTH24_STENCIL8 = 0x88f0;
export const GL_DEPTH_COMPONENT32F = 0x8cac;

// Compressed formats (each from its extension)
export const GL_COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83f1;
export const GL_COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83f2;
export const GL_COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83f3;
export const GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT = 0x8c4d;
export const GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT = 0x8c4e;
export const GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT = 0x8c4f;
export const GL_COMPRESSED_RED_RGTC1_EXT = 0x8dbb;
export const GL_COMPRESSED_SIGNED_RED_RGTC1_EXT = 0x8dbc;
export const GL_COMPRESSED_RED_GREEN_RGTC2_EXT = 0x8dbd;
export const GL_COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT = 0x8dbe;
export const GL_COMPRESSED_RGBA_BPTC_UNORM_EXT = 0x8e8c;
export const GL_COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT = 0x8e8d;
export const GL_COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT = 0x8e8e;
export const GL_COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT = 0x8e8f;
export const GL_COMPRESSED_R11_EAC = 0x9270;
export const GL_COMPRESSED_SIGNED_R11_EAC = 0x9271;
export const GL_COMPRESSED_RG11_EAC = 0x9272;
export const GL_COMPRESSED_SIGNED_RG11_EAC = 0x9273;
export const GL_COMPRESSED_RGB8_ETC2 = 0x9274;
export const GL_COMPRESSED_SRGB8_ETC2 = 0x9275;
export const GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9276;
export const GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9277;
export const GL_COMPRESSED_RGBA8_ETC2_EAC = 0x9278;
export const GL_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC = 0x9279;
export const GL_COMPRESSED_RGBA_ASTC_4X4_KHR = 0x93b0;
export const GL_COMPRESSED_SRGB8_ALPHA8_ASTC_4X4_KHR = 0x93d0;

// Texture and sampler parameters
export const GL_TEXTURE_MAG_FILTER = 0x2800;
export const GL_TEXTURE_MIN_FILTER = 0x2801;
export const GL_TEXTURE_WRAP_S = 0x2802;
export const GL_TEXTURE_WRAP_T = 0x2803;
export const GL_TEXTURE_WRAP_R = 0x8072;
export const GL_TEXTURE_MIN_LOD = 0x813a;
export const GL_TEXTURE_MAX_LOD = 0x813b;
export const GL_TEXTURE_COMPARE_MODE = 0x884c;
export const GL_TEXTURE_COMPARE_FUNC = 0x884d;
export const GL_COMPARE_REF_TO_TEXTURE = 0x884e;
export const GL_NONE = 0;
export const GL_TEXTURE_MAX_ANISOTROPY_EXT = 0x84fe;
export const GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84ff;
export const GL_NEAREST = 0x2600;
export const GL_LINEAR = 0x2601;
export const GL_NEAREST_MIPMAP_NEAREST = 0x2700;
export const GL_LINEAR_MIPMAP_NEAREST = 0x2701;
export const GL_NEAREST_MIPMAP_LINEAR = 0x2702;
export const GL_LINEAR_MIPMAP_LINEAR = 0x2703;
export const GL_REPEAT = 0x2901;
export const GL_CLAMP_TO_EDGE = 0x812f;
export const GL_MIRRORED_REPEAT = 0x8370;

// Comparison functions
export const GL_NEVER = 0x0200;
export const GL_LESS = 0x0201;
export const GL_EQUAL = 0x0202;
export const GL_LEQUAL = 0x0203;
export const GL_GREATER = 0x0204;
export const GL_NOTEQUAL = 0x0205;
export const GL_GEQUAL = 0x0206;
export const GL_ALWAYS = 0x0207;

// Stencil operations
export const GL_ZERO = 0;
export const GL_KEEP = 0x1e00;
export const GL_REPLACE = 0x1e01;
export const GL_INCR = 0x1e02;
export const GL_DECR = 0x1e03;
export const GL_INVERT = 0x150a;
export const GL_INCR_WRAP = 0x8507;
export const GL_DECR_WRAP = 0x8508;

// Blending
export const GL_ONE = 1;
export const GL_SRC_COLOR = 0x0300;
export const GL_ONE_MINUS_SRC_COLOR = 0x0301;
export const GL_SRC_ALPHA = 0x0302;
export const GL_ONE_MINUS_SRC_ALPHA = 0x0303;
export const GL_DST_ALPHA = 0x0304;
export const GL_ONE_MINUS_DST_ALPHA = 0x0305;
export const GL_DST_COLOR = 0x0306;
export const GL_ONE_MINUS_DST_COLOR = 0x0307;
export const GL_SRC_ALPHA_SATURATE = 0x0308;
export const GL_CONSTANT_COLOR = 0x8001;
export const GL_ONE_MINUS_CONSTANT_COLOR = 0x8002;
export const GL_FUNC_ADD = 0x8006;
export const GL_MIN = 0x8007;
export const GL_MAX = 0x8008;
export const GL_FUNC_SUBTRACT = 0x800a;
export const GL_FUNC_REVERSE_SUBTRACT = 0x800b;

// Capabilities
export const GL_CULL_FACE = 0x0b44;
export const GL_DEPTH_TEST = 0x0b71;
export const GL_STENCIL_TEST = 0x0b90;
export const GL_BLEND = 0x0be2;
export const GL_SCISSOR_TEST = 0x0c11;
export const GL_POLYGON_OFFSET_FILL = 0x8037;
export const GL_SAMPLE_ALPHA_TO_COVERAGE = 0x809e;

// Faces and winding
export const GL_FRONT = 0x0404;
export const GL_BACK = 0x0405;
export const GL_FRONT_AND_BACK = 0x0408;
export const GL_CW = 0x0900;
export const GL_CCW = 0x0901;

// Primitives
export const GL_POINTS = 0x0000;
export const GL_LINES = 0x0001;
export const GL_LINE_STRIP = 0x0003;
export const GL_TRIANGLES = 0x0004;
export const GL_TRIANGLE_STRIP = 0x0005;

// Framebuffers
export const GL_FRAMEBUFFER = 0x8d40;
export const GL_READ_FRAMEBUFFER = 0x8ca8;
export const GL_DRAW_FRAMEBUFFER = 0x8ca9;
export const GL_FRAMEBUFFER_COMPLETE = 0x8cd5;
export const GL_COLOR_ATTACHMENT0 = 0x8ce0;
export const GL_DEPTH_ATTACHMENT = 0x8d00;
export const GL_DEPTH_STENCIL_ATTACHMENT = 0x821a;
export const GL_COLOR = 0x1800;
export const GL_DEPTH = 0x1801;
export const GL_STENCIL = 0x1802;
export const GL_COLOR_BUFFER_BIT = 0x4000;

// Shaders and programs
export const GL_FRAGMENT_SHADER = 0x8b30;
export const GL_VERTEX_SHADER = 0x8b31;
export const GL_COMPILE_STATUS = 0x8b81;
export const GL_LINK_STATUS = 0x8b82;
export const GL_ACTIVE_UNIFORMS = 0x8b86;
export const GL_ACTIVE_UNIFORM_BLOCKS = 0x8a36;
export const GL_UNIFORM_BLOCK_INDEX = 0x8a3a;
export const GL_INVALID_INDEX = 0xffffffff;

// Sampler uniform types
export const GL_SAMPLER_2D = 0x8b5e;
export const GL_SAMPLER_3D = 0x8b5f;
export const GL_SAMPLER_CUBE = 0x8b60;
export const GL_SAMPLER_2D_SHADOW = 0x8b62;
export const GL_SAMPLER_2D_ARRAY = 0x8dc1;
export const GL_SAMPLER_2D_ARRAY_SHADOW = 0x8dc4;
export const GL_SAMPLER_CUBE_SHADOW = 0x8dc5;
export const GL_INT_SAMPLER_2D = 0x8dca;
export const GL_INT_SAMPLER_3D = 0x8dcb;
export const GL_INT_SAMPLER_CUBE = 0x8dcc;
export const GL_INT_SAMPLER_2D_ARRAY = 0x8dcf;
export const GL_UNSIGNED_INT_SAMPLER_2D = 0x8dd2;
export const GL_UNSIGNED_INT_SAMPLER_3D = 0x8dd3;
export const GL_UNSIGNED_INT_SAMPLER_CUBE = 0x8dd4;
export const GL_UNSIGNED_INT_SAMPLER_2D_ARRAY = 0x8dd7;

// Pixel storage
export const GL_UNPACK_ALIGNMENT = 0x0cf5;
export const GL_UNPACK_FLIP_Y_WEBGL = 0x9240;
export const GL_UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
export const GL_UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;

// Limits and queries
export const GL_SAMPLES = 0x80a9;
export const GL_MAX_TEXTURE_SIZE = 0x0d33;
export const GL_MAX_3D_TEXTURE_SIZE = 0x8073;
export const GL_MAX_ARRAY_TEXTURE_LAYERS = 0x88ff;
export const GL_MAX_CUBE_MAP_TEXTURE_SIZE = 0x851c;
export const GL_MAX_SAMPLES = 0x8d57;
export const GL_MAX_UNIFORM_BLOCK_SIZE = 0x8a30;
export const GL_MAX_UNIFORM_BUFFER_BINDINGS = 0x8a2f;
export const GL_MAX_TEXTURE_IMAGE_UNITS = 0x8872;
export const GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8b4c;
export const GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8b4d;
export const GL_UNIFORM_BUFFER_OFFSET_ALIGNMENT = 0x8a34;
export const GL_MAX_DRAW_BUFFERS = 0x8824;
export const GL_MAX_COLOR_ATTACHMENTS = 0x8cdf;
export const GL_MAX_VERTEX_ATTRIBS = 0x8869;
