import { InstanceComponents, Renderable } from './renderable';

export interface RenderCommand {
  layer: number;
  depth: number;
  renderable: Renderable;
  components: InstanceComponents;
}
