# Function: isNumber()

> **isNumber**\<`T`\>(`value`): `boolean`

Defined in: [utilities/is-number.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/utilities/is-number.ts#L10)

Checks if the provided value is a number.

## Type Parameters

### T

`T`

## Parameters

### value

`T`

The value to check.

## Returns

`boolean`

True if the value is a number, false otherwise.

## Example

```ts
isNumber(5); // returns true
isNumber('5'); // returns false
```
