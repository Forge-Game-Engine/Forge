import React, { JSX, useCallback, useRef, useState } from 'react';
import {
  BloomEcsComponent,
  GaussianBlurEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  bloomDefaults,
  blurDefaults,
  createSpaceShooterGame,
  SpaceShooterAudio,
} from './_create-game';
import { AudioControls } from './_AudioControls';
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
import collisionCategoriesCode from '!!raw-loader!./_collision-categories';
import gameOverComponentCode from '!!raw-loader!./_game-over.component';
import gameOverSystemCode from '!!raw-loader!./_game-over.system';

import { DemoPage, DemoPanel } from '@site/src/components/demo-page';
import type { CreateDemoGame } from '@site/src/hooks/useGame';

export default function SpaceShooter(): JSX.Element {
  const bloomRef = useRef<BloomEcsComponent | null>(null);
  const [threshold, setThreshold] = useState(bloomDefaults.threshold);
  const [passes, setPasses] = useState(bloomDefaults.passes);
  const [intensity, setIntensity] = useState(bloomDefaults.intensity);
  const [bloomEnabled, setBloomEnabled] = useState(true);

  const blurRef = useRef<GaussianBlurEcsComponent | null>(null);
  const [blurPasses, setBlurPasses] = useState(blurDefaults.passes);
  const [blurIntensity, setBlurIntensity] = useState(blurDefaults.intensity);
  const [blurEnabled, setBlurEnabled] = useState(true);

  const audioRef = useRef<SpaceShooterAudio | null>(null);
  const [musicVolume, setMusicVolume] = useState(1);
  const [sfxVolume, setSfxVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const createGame = useCallback<CreateDemoGame>(
    (stopWithGame) =>
      createSpaceShooterGame(
        stopWithGame,
        (bloom) => {
          bloomRef.current = bloom;
        },
        (blur) => {
          blurRef.current = blur;
        },
        (audio) => {
          audioRef.current = audio;
        },
      ),
    [],
  );

  const handleMusicVolumeChange = (value: number) => {
    setMusicVolume(value);

    if (audioRef.current) {
      audioRef.current.musicBus.volume = value;
    }
  };

  const handleSfxVolumeChange = (value: number) => {
    setSfxVolume(value);

    if (audioRef.current) {
      audioRef.current.sfxBus.volume = value;
    }
  };

  const handleMutedChange = (value: boolean) => {
    setMuted(value);

    if (audioRef.current) {
      audioRef.current.mixer.master.muted = value;
    }
  };

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
    <DemoPage
      slug="space-shooter"
      createGame={createGame}
      controls={[
        { inputs: ['WASD', '↑↓←→'], action: 'Move' },
        {
          inputs: ['Space', { device: 'mouse', label: 'Left button' }],
          action: 'Shoot',
          detail: 'Hold to keep firing',
        },
        {
          inputs: ['R'],
          action: 'Restart',
          detail: 'After the ship is destroyed',
        },
      ]}
      panels={
        <>
          <DemoPanel title="Bloom" icon="fa-sliders">
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
          </DemoPanel>
          <DemoPanel title="Background blur" icon="fa-sliders">
            <GaussianBlurControls
              enabled={blurEnabled}
              passes={blurPasses}
              intensity={blurIntensity}
              onEnabledChange={handleBlurEnabledChange}
              onPassesChange={handleBlurPassesChange}
              onIntensityChange={handleBlurIntensityChange}
            />
          </DemoPanel>
          <DemoPanel title="Audio" icon="fa-volume-high">
            <AudioControls
              musicVolume={musicVolume}
              sfxVolume={sfxVolume}
              muted={muted}
              onMusicVolumeChange={handleMusicVolumeChange}
              onSfxVolumeChange={handleSfxVolumeChange}
              onMutedChange={handleMutedChange}
            />
          </DemoPanel>
        </>
      }
      highlights={[
        {
          text: 'Bullets carry an emissive map and the foreground renders in HDR, so bloom makes only the bullets glow.',
          file: 'create-player.ts',
        },
        {
          text: 'The background and foreground render to separate targets, so the blur softens the nebula while the ship stays sharp.',
          file: 'create-game.ts',
        },
        {
          text: 'Collision categories make asteroids test only against bullets and the ship, and their contacts decide what explodes.',
          file: 'collision.system.ts',
        },
        {
          text: 'Explosions are sprite-sheet animations that remove themselves when their lifetime ends, and they shake the camera.',
          file: 'create-explosions.ts',
        },
        {
          text: 'Music and sound effects play on separate mixer buses, which is what the audio sliders control.',
          file: 'create-music.ts',
        },
      ]}
      docLinks={[
        { label: 'Bloom', to: '/docs/docs/rendering/bloom' },
        { label: 'Gaussian blur', to: '/docs/docs/rendering/gaussian-blur' },
        { label: 'Collisions', to: '/docs/docs/physics/collisions' },
        { label: 'Mixer and buses', to: '/docs/docs/audio/mixer-and-buses' },
      ]}
      fileGroups={[
        {
          title: 'Start here',
          files: [
            {
              name: 'create-game.ts',
              summary:
                'Sets up audio, render targets, cameras and post-processing, and registers every system.',
              content: gameCode,
            },
          ],
        },
        {
          title: 'Player',
          files: [
            {
              name: 'create-inputs.ts',
              summary:
                'Binds WASD, the arrow keys, Space, the mouse and R to game actions.',
              content: createInputsCode,
            },
            {
              name: 'create-player.ts',
              summary:
                'Loads the ship and glowing bullet sprites and spawns the ship.',
              content: createPlayerCode,
            },
            {
              name: 'player.component.ts',
              summary: "The ship's speed and the bounds it can move within.",
              content: playerComponentCode,
            },
            {
              name: 'movement.system.ts',
              summary: 'Moves the ship with the input, clamped to the screen.',
              content: movementSystemCode,
            },
          ],
        },
        {
          title: 'Shooting',
          files: [
            {
              name: 'gun.component.ts',
              summary: 'The fire rate and bullet sprite for a gun.',
              content: gunComponentCode,
            },
            {
              name: 'gun.system.ts',
              summary:
                'Fires a pair of bullets and a laser sound while shoot is held.',
              content: gunSystemCode,
            },
            {
              name: 'bullet.component.ts',
              summary: "A bullet's speed.",
              content: bulletComponentCode,
            },
            {
              name: 'bullet.system.ts',
              summary: 'Moves bullets up the screen.',
              content: bulletSystemCode,
            },
          ],
        },
        {
          title: 'Asteroids',
          files: [
            {
              name: 'create-asteroids.ts',
              summary:
                'Loads the asteroid sprites and creates the spawner above the screen.',
              content: createAsteroidsCode,
            },
            {
              name: 'asteroid-spawner.component.ts',
              summary:
                'Spawn rate, area, speeds and sprites for new asteroids.',
              content: asteroidSpawnerComponentCode,
            },
            {
              name: 'asteroid-spawner.system.ts',
              summary:
                'Spawns asteroids with a random sprite, position and speed.',
              content: asteroidSpawnerSystemCode,
            },
            {
              name: 'asteroid.component.ts',
              summary: "An asteroid's fall and spin speed.",
              content: asteroidComponentCode,
            },
            {
              name: 'asteroid.system.ts',
              summary:
                'Moves and spins asteroids, and removes them once off screen.',
              content: asteroidSystemCode,
            },
          ],
        },
        {
          title: 'Collisions and game over',
          files: [
            {
              name: 'collision-categories.ts',
              summary:
                'Collision category bits for asteroids, bullets and the ship.',
              content: collisionCategoriesCode,
            },
            {
              name: 'collision.system.ts',
              summary:
                'Explodes asteroids hit by bullets, and destroys the ship on contact.',
              content: collisionSystemCode,
            },
            {
              name: 'game-over.component.ts',
              summary: 'Whether the game is over, and the restart message.',
              content: gameOverComponentCode,
            },
            {
              name: 'game-over.system.ts',
              summary:
                'Shows the restart message and resets the round when R is pressed.',
              content: gameOverSystemCode,
            },
          ],
        },
        {
          title: 'Effects and audio',
          files: [
            {
              name: 'create-explosions.ts',
              summary:
                'Builds the explosion animation and spawns explosions with sound and shake.',
              content: createExplosionsCode,
            },
            {
              name: 'camera-shake.component.ts',
              summary:
                'The strength, duration and current offset of a camera shake.',
              content: cameraShakeComponentCode,
            },
            {
              name: 'camera-shake.system.ts',
              summary: 'Jolts the camera with fading random offsets.',
              content: cameraShakeSystemCode,
            },
            {
              name: 'create-music.ts',
              summary: 'Plays the looping background music on the music bus.',
              content: createMusicCode,
            },
          ],
        },
        {
          title: 'Background',
          files: [
            {
              name: 'create-background.ts',
              summary:
                'Creates a full-screen sprite drawn with the nebula shader.',
              content: createBackgroundMaterialCode,
            },
            {
              name: 'background.component.ts',
              summary: 'A tag that marks the background entity.',
              content: backgroundComponentCode,
            },
            {
              name: 'background.system.ts',
              summary:
                'Updates the shader time and resizes the background with the canvas.',
              content: backgroundSystemCode,
            },
            {
              name: 'background.shader.ts',
              summary:
                'Draws twinkling, scrolling star layers over a scrolling nebula texture.',
              content: backgroundShaderCode,
            },
          ],
        },
      ]}
    />
  );
}
