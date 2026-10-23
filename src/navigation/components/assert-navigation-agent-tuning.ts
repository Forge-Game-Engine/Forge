/**
 * Checks a navigation agent's `speed` and `arrivalRadius`.
 * @param speed - The agent's top speed.
 * @param arrivalRadius - The agent's arrival radius.
 * @param subject - What the agent is, for the error message.
 * @throws An error if either is negative or not finite.
 */
export const assertNavigationAgentTuning = (
  speed: number,
  arrivalRadius: number,
  subject: string,
): void => {
  if (!Number.isFinite(speed) || speed < 0) {
    throw new Error(
      `${subject} has a speed of ${speed}, it must be a finite number of at least 0.`,
    );
  }

  if (!Number.isFinite(arrivalRadius) || arrivalRadius < 0) {
    throw new Error(
      `${subject} has an arrivalRadius of ${arrivalRadius}, it must be a finite number of at least 0.`,
    );
  }
};
