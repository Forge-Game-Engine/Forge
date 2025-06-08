# Function: isNil()

> **isNil**\<`T`\>(`item`): `boolean`

Defined in: [common/utils/is-nil.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/utils/is-nil.ts#L12)

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
