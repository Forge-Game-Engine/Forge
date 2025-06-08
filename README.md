# Forge

![logo](assets/forge-banner.png)

Forge is a browser-based, code only game engine. It has everything you'd expect from an engine, including rendering, audio, input, animations, ECS, etc.

## Prerequisites

- Install Docker: https://www.docker.com/products/docker-desktop/
- Install vscode: https://code.visualstudio.com/

## Installation

Clone the repository and open up the dev environment:

```sh
git clone https://github.com/forge-game-engine/Forge.git && \
cd Forge && \
code .
```

## Running the Demo

To run the demo application:

```sh
npm run dev
```

## Building the Project

To build the project:

```sh
npm run build
```

## Running Tests

To run the tests:

```sh
npm test
```

## What the engine is

The engine is where all the code is stored that is usable for most types of games. For example: the renderer, audio systems, animations, mouse pointer, etc.

## What the engine is not

The engine is not a place to store code that is hyper-specific to a game. For example: a system for collecting coins.

## What if my system is specific to a particular genre?

You can make a separate folder or package outside of the engine.

## Acknowledgements

- [Howler.js](https://howlerjs.com/)
- [Vite](https://vite.dev/)
- [Rive](https://rive.app/)
- [Kenny](https://www.kenney.nl/)
- [MatterJS](https://brm.io/matter-js/)
