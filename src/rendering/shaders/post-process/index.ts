import bloomCompositeFragmentShaderSource from './bloom-composite.frag.glsl?raw';
import bloomThresholdFragmentShaderSource from './bloom-threshold.frag.glsl?raw';
import crossFadeFragmentShaderSource from './cross-fade.frag.glsl?raw';
import gaussianBlurFragmentShaderSource from './gaussian-blur.frag.glsl?raw';
import passthroughFragmentShaderSource from './passthrough.frag.glsl?raw';
import passthroughVertexShaderSource from './passthrough.vert.glsl?raw';
import toneMappingFragmentShaderSource from './tone-mapping.frag.glsl?raw';

export const passthroughFragmentShader = passthroughFragmentShaderSource;
export const passthroughVertexShader = passthroughVertexShaderSource;
export const gaussianBlurFragmentShader = gaussianBlurFragmentShaderSource;
export const crossFadeFragmentShader = crossFadeFragmentShaderSource;
export const bloomThresholdFragmentShader = bloomThresholdFragmentShaderSource;
export const bloomCompositeFragmentShader = bloomCompositeFragmentShaderSource;
export const toneMappingFragmentShader = toneMappingFragmentShaderSource;
