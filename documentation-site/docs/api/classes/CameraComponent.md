# Class: CameraComponent

Defined in: [rendering/components/camera-component.ts:52](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L52)

The `CameraComponent` class implements the `Component` interface and represents
a camera in the rendering system. It provides properties for zooming and panning
sensitivity, as well as options to restrict zoom levels and enable/disable panning
and zooming.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new CameraComponent**(`options`): `CameraComponent`

Defined in: [rendering/components/camera-component.ts:87](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L87)

Constructs a new instance of the `CameraComponent` class with the given options.

#### Parameters

##### options

`Partial`\<[`CameraComponentOptions`](../type-aliases/CameraComponentOptions.md)\> = `defaultOptions`

Partial options to configure the camera component.

#### Returns

`CameraComponent`

## Properties

### allowPanning

> **allowPanning**: `boolean`

Defined in: [rendering/components/camera-component.ts:75](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L75)

Indicates if panning is allowed.

***

### allowZooming

> **allowZooming**: `boolean`

Defined in: [rendering/components/camera-component.ts:78](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L78)

Indicates if zooming is allowed.

***

### isStatic

> **isStatic**: `boolean`

Defined in: [rendering/components/camera-component.ts:72](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L72)

Indicates if the camera is static (non-movable).

***

### maxZoom

> **maxZoom**: `number`

Defined in: [rendering/components/camera-component.ts:69](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L69)

The maximum zoom level allowed.

***

### minZoom

> **minZoom**: `number`

Defined in: [rendering/components/camera-component.ts:66](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L66)

The minimum zoom level allowed.

***

### name

> **name**: `symbol`

Defined in: [rendering/components/camera-component.ts:54](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L54)

The name property holds the unique symbol for this component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### panSensitivity

> **panSensitivity**: `number`

Defined in: [rendering/components/camera-component.ts:63](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L63)

The sensitivity of the panning controls.

***

### zoom

> **zoom**: `number`

Defined in: [rendering/components/camera-component.ts:57](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L57)

The current zoom level of the camera.

***

### zoomSensitivity

> **zoomSensitivity**: `number`

Defined in: [rendering/components/camera-component.ts:60](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L60)

The sensitivity of the zoom controls.

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [rendering/components/camera-component.ts:81](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L81)

A static symbol property that uniquely identifies the `CameraComponent`.

## Methods

### createDefaultCamera()

> `static` **createDefaultCamera**(`isStatic`): `CameraComponent`

Defined in: [rendering/components/camera-component.ts:109](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/components/camera-component.ts#L109)

Creates a default camera component with the option to set it as static.

#### Parameters

##### isStatic

`boolean` = `false`

Indicates if the camera should be static (default: false).

#### Returns

`CameraComponent`

A new `CameraComponent` instance with default settings.
