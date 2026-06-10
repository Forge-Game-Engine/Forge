import {
  Color,
  createQuadGeometry,
  createTextureFromImage,
  Material,
  Renderable,
  RenderContext,
  setupInstanceAttribute,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { Vector2 } from '@forge-game-engine/forge/math';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  FlipEcsComponent,
  flipId,
  PositionEcsComponent,
  positionId,
  RotationEcsComponent,
  rotationId,
  ScaleEcsComponent,
  scaleId,
} from '@forge-game-engine/forge/common';
import { backgroundShader } from './_background.shader';
import { backgroundId } from './_background.component';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

// Instance layout matching sprite.vert:
// pos(2) + rot(1) + scale(2) + size(2) + pivot(2) + texOffset(2) + texScale(2) + tint(4) = 17
const floatsPerInstance = 17;
const POSITION_X = 0;
const POSITION_Y = 1;
const ROTATION = 2;
const SCALE_X = 3;
const SCALE_Y = 4;
const WIDTH = 5;
const HEIGHT = 6;
const PIVOT_X = 7;
const PIVOT_Y = 8;
const TEX_OFFSET_X = 9;
const TEX_OFFSET_Y = 10;
const TEX_SCALE_X = 11;
const TEX_SCALE_Y = 12;
const TINT_R = 13;
const TINT_G = 14;
const TINT_B = 15;
const TINT_A = 16;

function bindInstanceData(
  entity: number,
  world: EcsWorld,
  buffer: Float32Array,
  offset: number,
): void {
  const position = world.getComponent<PositionEcsComponent>(entity, positionId)!;
  const rotation = world.getComponent<RotationEcsComponent>(entity, rotationId);
  const scale = world.getComponent<ScaleEcsComponent>(entity, scaleId);
  const sprite = world.getComponent<SpriteEcsComponent>(entity, spriteId)!;
  const flip = world.getComponent<FlipEcsComponent>(entity, flipId);

  buffer[offset + POSITION_X] = position.world.x;
  buffer[offset + POSITION_Y] = -position.world.y;
  buffer[offset + ROTATION] = rotation?.world ?? 0;
  buffer[offset + SCALE_X] = (scale?.world.x ?? 1) * (flip?.flipX ? -1 : 1);
  buffer[offset + SCALE_Y] = (scale?.world.y ?? 1) * (flip?.flipY ? -1 : 1);
  buffer[offset + WIDTH] = sprite.width;
  buffer[offset + HEIGHT] = sprite.height;
  buffer[offset + PIVOT_X] = sprite.pivot.x;
  buffer[offset + PIVOT_Y] = sprite.pivot.y;
  buffer[offset + TEX_OFFSET_X] = sprite.uvOffset.x;
  buffer[offset + TEX_OFFSET_Y] = sprite.uvOffset.y;
  buffer[offset + TEX_SCALE_X] = sprite.uvScale.x;
  buffer[offset + TEX_SCALE_Y] = sprite.uvScale.y;
  buffer[offset + TINT_R] = sprite.tintColor.r;
  buffer[offset + TINT_G] = sprite.tintColor.g;
  buffer[offset + TINT_B] = sprite.tintColor.b;
  buffer[offset + TINT_A] = sprite.tintColor.a;
}

function setupInstanceAttributes(gl: WebGL2RenderingContext, renderable: Renderable): void {
  const { program } = renderable.material;
  const stride = floatsPerInstance * 4;

  setupInstanceAttribute(gl.getAttribLocation(program, 'a_instancePos'), gl, 2, stride, POSITION_X * 4);
  setupInstanceAttribute(gl.getAttribLocation(program, 'a_instanceRot'), gl, 1, stride, ROTATION * 4);
  setupInstanceAttribute(gl.getAttribLocation(program, 'a_instanceScale'), gl, 2, stride, SCALE_X * 4);
  setupInstanceAttribute(gl.getAttribLocation(program, 'a_instanceSize'), gl, 2, stride, WIDTH * 4);
  setupInstanceAttribute(gl.getAttribLocation(program, 'a_instancePivot'), gl, 2, stride, PIVOT_X * 4);
  setupInstanceAttribute(gl.getAttribLocation(program, 'a_instanceTexOffset'), gl, 2, stride, TEX_OFFSET_X * 4);
  setupInstanceAttribute(gl.getAttribLocation(program, 'a_instanceTexSize'), gl, 2, stride, TEX_SCALE_X * 4);
}

export async function createBackground(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  renderContext.shaderCache.addShader(backgroundShader);

  const vertexShader = renderContext.shaderCache.getShader('sprite.vert');
  const fragmentShader = renderContext.shaderCache.getShader('background.frag');

  const backgroundMaterial = new Material(vertexShader, fragmentShader, renderContext.gl);

  backgroundMaterial.setUniform(
    'u_resolution',
    new Float32Array([renderContext.canvas.width, renderContext.canvas.height]),
  );

  backgroundMaterial.setUniform('u_color', new Color(0.2, 0.2, 1, 0.9).toFloat32Array());

  backgroundMaterial.setUniform(
    'u_bgTexture',
    createTextureFromImage(
      renderContext.gl,
      await renderContext.imageCache.getOrLoad(getAssetUrl('img/space-shooter/nebula.png')),
    ),
  );

  const renderable = new Renderable(
    createQuadGeometry(renderContext.gl),
    backgroundMaterial,
    floatsPerInstance,
    renderLayer,
    bindInstanceData,
    setupInstanceAttributes,
  );

  const backgroundSprite: SpriteEcsComponent = {
    enabled: true,
    width: renderContext.canvas.width,
    height: renderContext.canvas.height,
    pivot: new Vector2(0.5, 0.5),
    tintColor: Color.white,
    renderable,
    uvOffset: new Vector2(0, 0),
    uvScale: new Vector2(1, 1),
  };

  const backgroundEntity = world.createEntity();

  world.addComponent(backgroundEntity, spriteId, backgroundSprite);

  world.addComponent(backgroundEntity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });

  world.addTag(backgroundEntity, backgroundId);
}
