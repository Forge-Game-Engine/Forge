import { InstanceComponents, Renderable } from './renderable';

export interface RenderCommand {
  renderable: Renderable;
  components: InstanceComponents;
}
