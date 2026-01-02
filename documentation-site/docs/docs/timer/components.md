---
sidebar_position: 2
---

# Components

## TimerComponent

The `TimerComponent` stores a list of timer tasks for an entity. Each task defines when and how a callback should be executed.

### Constructor

```typescript
new TimerComponent(tasks?: TimerTask[])
```

**Parameters:**

- `tasks` (optional): Initial array of timer tasks

### Properties

- `tasks: TimerTask[]` - Array of timer tasks to be processed by the TimerSystem

### Methods

#### addTask

Adds a new timer task to the component.

```typescript
addTask(task: TimerTask): void
```

**Parameters:**

- `task: TimerTask` - The timer task to add

The method automatically initializes:

- `elapsed` to `0`
- `runsSoFar` to `0` (if not already set)

### TimerTask Interface

```typescript
interface TimerTask {
  callback: () => void; // Function to execute when timer fires
  delay: number; // Milliseconds until first execution
  elapsed: number; // Elapsed time tracked by the system
  repeat?: boolean; // If true, task repeats periodically
  interval?: number; // Time between repeated calls (if repeat is true)
  maxRuns?: number; // Optional limit for periodic tasks
  runsSoFar?: number; // Counter for executed runs
}
```

### Usage Examples

#### One-shot Timer

```typescript
const timerComponent = new TimerComponent();

// Execute once after 2 seconds
timerComponent.addTask({
  callback: () => {
    console.log('2 seconds have passed!');
  },
  delay: 2000,
  elapsed: 0,
});
```

#### Repeating Timer

```typescript
const timerComponent = new TimerComponent();

// Execute every second, indefinitely
timerComponent.addTask({
  callback: () => {
    console.log('Tick');
  },
  delay: 1000, // Initial delay before first run
  elapsed: 0,
  repeat: true,
  interval: 1000, // Time between subsequent runs
  runsSoFar: 0,
});
```

#### Limited Repeating Timer

```typescript
const timerComponent = new TimerComponent();
let count = 0;

// Execute 5 times, once per second
timerComponent.addTask({
  callback: () => {
    count++;
    console.log(`Countdown: ${6 - count}`);
  },
  delay: 1000,
  elapsed: 0,
  repeat: true,
  interval: 1000,
  maxRuns: 5, // Stop after 5 executions
  runsSoFar: 0,
});
```

#### Multiple Tasks

```typescript
const timerComponent = new TimerComponent();

// Task 1: Show message after 1 second
timerComponent.addTask({
  callback: () => console.log('Ready...'),
  delay: 1000,
  elapsed: 0,
});

// Task 2: Show message after 2 seconds
timerComponent.addTask({
  callback: () => console.log('Set...'),
  delay: 2000,
  elapsed: 0,
});

// Task 3: Show message after 3 seconds
timerComponent.addTask({
  callback: () => console.log('Go!'),
  delay: 3000,
  elapsed: 0,
});
```

#### Different Initial Delay and Interval

```typescript
const timerComponent = new TimerComponent();

// Wait 5 seconds before first execution, then execute every 1 second
timerComponent.addTask({
  callback: () => console.log('Periodic task'),
  delay: 5000, // Wait 5 seconds before first run
  elapsed: 0,
  repeat: true,
  interval: 1000, // Then repeat every 1 second
  runsSoFar: 0,
});
```

## Notes

- All time values are in milliseconds
- The `elapsed` field is managed by the `TimerSystem` and should be initialized to `0`
- For repeating timers, the `delay` is used for the initial execution, and `interval` is used for subsequent executions
- Tasks are automatically removed when they complete (one-shot timers or repeating timers that reach `maxRuns`)
- Tasks are processed in reverse order to allow safe removal during iteration
