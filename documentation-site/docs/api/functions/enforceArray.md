# Function: enforceArray()

> **enforceArray**\<`T`\>(`value`): `T`[]

Defined in: [utilities/enforce-array.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/utilities/enforce-array.ts#L12)

Ensures that the provided value is returned as an array.

If the value is already an array, it is returned as-is. If the value is not an array, it is wrapped in an array.

## Type Parameters

### T

`T`

## Parameters

### value

The value to ensure as an array.

`T` | `T`[]

## Returns

`T`[]

The value as an array.

## Example

```ts
enforceArray(5); // returns [5]
enforceArray([5]); // returns [5]
```
