import { describe, expect, it } from 'vitest';
import type { Howl } from 'howler';
import { createAudioEcsSystem } from './audio-system';
import { addAudioComponent, AudioEcsComponent } from '../components';
import { createAudioBus } from '../audio-bus';
import { EcsWorld } from '../../ecs';

type Listener = () => void;

/**
 * Stands in for a Howler `Howl`: tracks each play's volume and looping by
 * id, and raises `end`/`stop` for a play when the test finishes or stops it.
 */
class FakeHowl {
  public readonly volumes = new Map<number, number>();
  public readonly stopped: number[] = [];
  public loaded = true;
  public looping = false;

  private _nextId = 1;
  private readonly _listeners = new Map<string, Listener>();

  public play(): number {
    const id = this._nextId++;

    this.volumes.set(id, 1);

    return id;
  }

  public volume(volume: number, id: number): void {
    this.volumes.set(id, volume);
  }

  public loop(): boolean {
    return this.looping;
  }

  public state(): string {
    return this.loaded ? 'loaded' : 'unloaded';
  }

  public stop(id: number): void {
    this.stopped.push(id);
    this._listeners.get(`stop:${id}`)?.();
  }

  public on(event: string, listener: Listener, id: number): void {
    this._listeners.set(`${event}:${id}`, listener);
  }

  public off(event: string, _listener: Listener, id: number): void {
    this._listeners.delete(`${event}:${id}`);
  }

  public finish(id: number): void {
    this._listeners.get(`end:${id}`)?.();
  }

  public listenerCount(): number {
    return this._listeners.size;
  }

  public asHowl(): Howl {
    return this as unknown as Howl;
  }
}

const setUp = (): {
  world: EcsWorld;
  fakeSound: FakeHowl;
  addAudio: (options?: Partial<AudioEcsComponent>) => AudioEcsComponent;
} => {
  const world = new EcsWorld();
  const fakeSound = new FakeHowl();

  world.addSystem(createAudioEcsSystem());

  return {
    world,
    fakeSound,
    addAudio: (options = {}) =>
      addAudioComponent(world, world.createEntity(), {
        sound: fakeSound.asHowl(),
        ...options,
      }),
  };
};

describe('createAudioEcsSystem (Audio)', () => {
  it('plays the sound once when playSound is true, then resets it', () => {
    const { world, fakeSound, addAudio } = setUp();
    const audio = addAudio({ playSound: true });

    world.update();
    world.update();

    expect(fakeSound.volumes.size).toBe(1);
    expect(audio.playSound).toBe(false);
  });

  it('does not play the sound when playSound is false', () => {
    const { world, fakeSound, addAudio } = setUp();

    addAudio();
    world.update();

    expect(fakeSound.volumes.size).toBe(0);
  });

  it('plays again each time playSound is set, overlapping earlier plays', () => {
    const { world, fakeSound, addAudio } = setUp();
    const audio = addAudio({ playSound: true });

    world.update();
    audio.playSound = true;
    world.update();

    expect([...fakeSound.volumes.keys()]).toEqual([1, 2]);
  });

  it('plays at the component volume scaled by its bus and ancestors', () => {
    const { world, fakeSound, addAudio } = setUp();
    const master = createAudioBus({ volume: 0.5 });
    const effects = createAudioBus({ parent: master, volume: 0.5 });

    addAudio({ playSound: true, volume: 0.8, bus: effects });
    world.update();

    expect(fakeSound.volumes.get(1)).toBeCloseTo(0.2);
  });

  it('applies bus and component changes to sounds already playing', () => {
    const { world, fakeSound, addAudio } = setUp();
    const music = createAudioBus();
    const audio = addAudio({ playSound: true, bus: music });

    world.update();
    music.volume = 0.25;
    world.update();

    expect(fakeSound.volumes.get(1)).toBe(0.25);

    music.muted = true;
    world.update();

    expect(fakeSound.volumes.get(1)).toBe(0);

    music.muted = false;
    audio.volume = 0.5;
    world.update();

    expect(fakeSound.volumes.get(1)).toBe(0.125);
  });

  it('keeps following its component after the entity is removed', () => {
    const { world, fakeSound } = setUp();
    const bus = createAudioBus();
    const entity = world.createEntity();

    addAudioComponent(world, entity, {
      sound: fakeSound.asHowl(),
      playSound: true,
      bus,
    });
    world.update();
    world.removeEntity(entity);
    bus.volume = 0.5;
    world.update();

    expect(fakeSound.volumes.get(1)).toBe(0.5);
  });

  it('stops following a sound once it ends', () => {
    const { world, fakeSound, addAudio } = setUp();
    const bus = createAudioBus();

    addAudio({ playSound: true, bus });
    world.update();
    fakeSound.finish(1);
    bus.volume = 0.5;
    world.update();

    expect(fakeSound.volumes.get(1)).toBe(1);
    expect(fakeSound.listenerCount()).toBe(0);
  });

  it('keeps following a looping sound each time it comes round', () => {
    const { world, fakeSound, addAudio } = setUp();
    const bus = createAudioBus();

    fakeSound.looping = true;
    addAudio({ playSound: true, bus });
    world.update();
    fakeSound.finish(1);
    bus.volume = 0.5;
    world.update();

    expect(fakeSound.volumes.get(1)).toBe(0.5);
  });

  it('stops following a sound whose Howl was unloaded', () => {
    const { world, fakeSound, addAudio } = setUp();

    addAudio({ playSound: true });
    world.update();
    fakeSound.loaded = false;
    world.update();
    world.stop();

    expect(fakeSound.stopped).toEqual([]);
  });

  it('stops only the plays it started when the world stops, without unloading', () => {
    const { world, fakeSound, addAudio } = setUp();
    const removedEntity = world.createEntity();

    addAudio({ playSound: true });
    addAudioComponent(world, removedEntity, {
      sound: fakeSound.asHowl(),
      playSound: true,
    });
    world.update();
    world.removeEntity(removedEntity);
    fakeSound.finish(1);
    world.stop();

    expect(fakeSound.stopped).toEqual([2]);
    expect(fakeSound.listenerCount()).toBe(0);
  });
});
