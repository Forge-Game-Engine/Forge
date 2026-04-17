export type TransformCache = {
  computed: Set<number>;
  visiting: Set<number>;
};

export const createTransformCache = (): TransformCache => ({
  computed: new Set<number>(),
  visiting: new Set<number>(),
});

export const resetTransformCache = (cache: TransformCache): void => {
  cache.computed.clear();
  cache.visiting.clear();
};
