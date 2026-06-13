export type LoaderContext = {
  tenantId: number;
};

export type LoaderResult<T = unknown> = {
  data: T;
  cacheTags?: string[];
};

export type LoaderFn = (
  props: Record<string, unknown>,
  ctx: LoaderContext,
) => Promise<LoaderResult>;
