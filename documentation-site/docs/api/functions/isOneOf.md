# Function: isOneOf()

> **isOneOf**\<`T`\>(`item`, ...`items`): `boolean`

Defined in: [utilities/is-one-of.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/utilities/is-one-of.ts#L11)

Checks if the provided item is one of the specified items.

## Type Parameters

### T

`T`

## Parameters

### item

`T`

The item to check.

### items

...`T`[]

The list of items to check against.

## Returns

`boolean`

True if the item is one of the specified items, false otherwise.

## Example

```ts
isOneOf(5, 1, 2, 3, 4, 5); // returns true
isOneOf('a', 'b', 'c', 'd'); // returns false
```
