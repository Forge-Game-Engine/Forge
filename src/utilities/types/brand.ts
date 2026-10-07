/* eslint-disable @typescript-eslint/naming-convention */
/**
 * `T` tagged with a compile-time `Tag`, so values of the same underlying type
 * with different tags aren't interchangeable in type checks. The tag has no
 * runtime value.
 */
export type Brand<T, Tag> = T & { readonly __brandTag?: Tag };
