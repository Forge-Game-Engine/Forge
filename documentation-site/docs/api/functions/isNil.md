# Function: isNil()

> **isNil**\<`T`\>(`item`): `boolean`

Defined in: [common/utils/is-nil.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/common/utils/is-nil.ts#L12)

Checks if the provided item is `undefined` or `null`.

## Type Parameters

### T

`T`

## Parameters

### item

`T`

The item to check.

## Returns

`boolean`

True if the item is `undefined` or `null`, false otherwise.

## Example

```ts
isNil(undefined); // returns true
isNil(null); // returns true
isNil(0); // returns false
isNil(''); // returns false
```
