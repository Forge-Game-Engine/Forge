import React, { JSX, useCallback, useRef, useState } from 'react';
import {
  BloomEcsComponent,
  GaussianBlurEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  bloomDefaults,
  blurDefaults,
  createSpaceShooterGame,
} from './_create-game';
import { BloomControls } from './_BloomControls';
import { GaussianBlurControls } from './_GaussianBlurControls';
import gameCode from '!!raw-loader!./_create-game';
import playerComponentCode from '!!raw-loader!./_player.component';
import movementSystemCode from '!!raw-loader!./_movement.system';
import createBackgroundMaterialCode from '!!raw-loader!./_create-background';
import createExplosionsCode from '!!raw-loader!./_create-explosions';
import cameraShakeComponentCode from '!!raw-loader!./_camera-shake.component';
import cameraShakeSystemCode from '!!raw-loader!./_camera-shake.system';
import backgroundSystemCode from '!!raw-loader!./_background.system';
import backgroundComponentCode from '!!raw-loader!./_background.component';
import backgroundShaderCode from '!!raw-loader!./_background.shader';
import createMusicCode from '!!raw-loader!./_create-music';
import createInputsCode from '!!raw-loader!./_create-inputs';
import createPlayerCode from '!!raw-loader!./_create-player';
import bulletComponentCode from '!!raw-loader!./_bullet.component';
import bulletSystemCode from '!!raw-loader!./_bullet.system';
import gunComponentCode from '!!raw-loader!./_gun.component';
import gunSystemCode from '!!raw-loader!./_gun.system';
import asteroidComponentCode from '!!raw-loader!./_asteroid.component';
import asteroidSystemCode from '!!raw-loader!./_asteroid.system';
import asteroidSpawnerComponentCode from '!!raw-loader!./_asteroid-spawner.component';
import asteroidSpawnerSystemCode from '!!raw-loader!./_asteroid-spawner.system';
import createAsteroidsCode from '!!raw-loader!./_create-asteroids';
import collisionSystemCode from '!!raw-loader!./_collision.system';
import gameOverComponentCode from '!!raw-loader!./_game-over.component';
import gameOverSystemCode from '!!raw-loader!./_game-over.system';

import { Demo } from '@site/src/components/Demo';
import { InteractionInstruction } from '@site/src/components/_InteractionInstruction';
import { KeyboardKey } from '@site/src/components/_KeyboardKey';

export default function Rendering(): JSX.Element {
  const bloomRef = useRef<BloomEcsComponent | null>(null);
  const [threshold, setThreshold] = useState(bloomDefaults.threshold);
  const [passes, setPasses] = useState(bloomDefaults.passes);
  const [intensity, setIntensity] = useState(bloomDefaults.intensity);
  const [bloomEnabled, setBloomEnabled] = useState(true);

  const blurRef = useRef<GaussianBlurEcsComponent | null>(null);
  const [blurPasses, setBlurPasses] = useState(blurDefaults.passes);
  const [blurIntensity, setBlurIntensity] = useState(blurDefaults.intensity);
  const [blurEnabled, setBlurEnabled] = useState(true);

  const createGame = useCallback(
    () =>
      createSpaceShooterGame(
        (bloom) => {
          bloomRef.current = bloom;
        },
        (blur) => {
          blurRef.current = blur;
        },
      ),
    [],
  );

  const handleThresholdChange = (value: number) => {
    setThreshold(value);

    if (bloomRef.current) {
      bloomRef.current.threshold = value;
    }
  };

  const handlePassesChange = (value: number) => {
    setPasses(value);

    if (bloomRef.current) {
      bloomRef.current.passes = value;
    }
  };

  const handleIntensityChange = (value: number) => {
    setIntensity(value);

    if (bloomRef.current) {
      bloomRef.current.intensity = value;
    }
  };

  const handleBloomEnabledChange = (enabled: boolean) => {
    setBloomEnabled(enabled);

    if (bloomRef.current) {
      // Zero intensity is bloom's own "off" switch (see
      // `BloomEcsComponent.intensity`), so toggling just drives it to/from
      // zero rather than needing an enabled flag on the component itself.
      bloomRef.current.intensity = enabled ? intensity : 0;
    }
  };

  const handleBlurPassesChange = (value: number) => {
    setBlurPasses(value);

    if (blurRef.current) {
      blurRef.current.passes = value;
    }
  };

  const handleBlurIntensityChange = (value: number) => {
    setBlurIntensity(value);

    if (blurRef.current) {
      blurRef.current.intensity = value;
    }
  };

  const handleBlurEnabledChange = (enabled: boolean) => {
    setBlurEnabled(enabled);

    if (blurRef.current) {
      // Zero intensity is the blur's own "off" switch (see
      // `GaussianBlurEcsComponent.intensity`), so toggling just drives it
      // to/from zero rather than needing an enabled flag on the component
      // itself.
      blurRef.current.intensity = enabled ? blurIntensity : 0;
    }
  };

  return (
    <Demo
      metaData={{
        title: 'Space Shooter Demo',
        description: 'A demo showcasing a full space shooter game.',
      }}
      header="Space Shooter"
      blurb="This demo showcases a complete space shooter game built using the Forge Game Engine. It features player-controlled movement, shooting mechanics, enemy spawning, and collision detection. The game demonstrates how to leverage the engine's capabilities to create an engaging and interactive experience. Players can navigate their spaceship, avoid obstacles, and shoot down enemies while enjoying smooth rendering and responsive controls."
      createGame={createGame}
      codeFiles={[
        {
          name: 'game.ts',
          content: gameCode,
        },
        {
          name: 'asteroid-spawner.component.ts',
          content: asteroidSpawnerComponentCode,
        },
        {
          name: 'asteroid-spawner.system.ts',
          content: asteroidSpawnerSystemCode,
        },
        {
          name: 'asteroid.component.ts',
          content: asteroidComponentCode,
        },
        {
          name: 'asteroid.system.ts',
          content: asteroidSystemCode,
        },
        {
          name: 'background.component.ts',
          content: backgroundComponentCode,
        },
        {
          name: 'background.shader.ts',
          content: backgroundShaderCode,
        },
        {
          name: 'background.system.ts',
          content: backgroundSystemCode,
        },
        {
          name: 'bullet.component.ts',
          content: bulletComponentCode,
        },
        {
          name: 'bullet.system.ts',
          content: bulletSystemCode,
        },
        {
          name: 'camera-shake.component.ts',
          content: cameraShakeComponentCode,
        },
        {
          name: 'camera-shake.system.ts',
          content: cameraShakeSystemCode,
        },
        {
          name: 'collision.system.ts',
          content: collisionSystemCode,
        },
        {
          name: 'create-asteroids.ts',
          content: createAsteroidsCode,
        },
        {
          name: 'create-background.ts',
          content: createBackgroundMaterialCode,
        },
        {
          name: 'create-explosions.ts',
          content: createExplosionsCode,
        },
        {
          name: 'create-inputs.ts',
          content: createInputsCode,
        },
        {
          name: 'create-music.ts',
          content: createMusicCode,
        },
        {
          name: 'create-player.ts',
          content: createPlayerCode,
        },
        {
          name: 'game-over.component.ts',
          content: gameOverComponentCode,
        },
        {
          name: 'game-over.system.ts',
          content: gameOverSystemCode,
        },
        {
          name: 'gun.component.ts',
          content: gunComponentCode,
        },
        {
          name: 'gun.system.ts',
          content: gunSystemCode,
        },
        {
          name: 'movement.system.ts',
          content: movementSystemCode,
        },
        {
          name: 'player.component.ts',
          content: playerComponentCode,
        },
      ]}
      interactions={
        <>
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="A" />}
            text="Left"
          />
          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="D" />}
            text="Right"
          />

          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="␣" />}
            text="Shoot"
          />

          <InteractionInstruction
            displayElement={<KeyboardKey keyCode="R" />}
            text="Restart (after death)"
          />

          <BloomControls
            enabled={bloomEnabled}
            threshold={threshold}
            passes={passes}
            intensity={intensity}
            onEnabledChange={handleBloomEnabledChange}
            onThresholdChange={handleThresholdChange}
            onPassesChange={handlePassesChange}
            onIntensityChange={handleIntensityChange}
          />

          <GaussianBlurControls
            enabled={blurEnabled}
            passes={blurPasses}
            intensity={blurIntensity}
            onEnabledChange={handleBlurEnabledChange}
            onPassesChange={handleBlurPassesChange}
            onIntensityChange={handleBlurIntensityChange}
          />
        </>
      }
    />
  );
}
