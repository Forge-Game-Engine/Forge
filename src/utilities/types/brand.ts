/* eslint-disable @typescript-eslint/naming-convention */
export type Brand<T, Tag> = T & { readonly __brandTag?: Tag };
