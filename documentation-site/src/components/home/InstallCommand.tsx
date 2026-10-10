import React, { FC, useEffect, useState } from 'react';
import clsx from 'clsx';
import styles from './Home.module.css';

const command = 'npm install @forge-game-engine/forge';
const copiedFeedbackMilliseconds = 2000;

/**
 * The npm install command, with a button that copies it.
 */
export const InstallCommand: FC = () => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = setTimeout(
      () => setCopied(false),
      copiedFeedbackMilliseconds,
    );

    return () => clearTimeout(timeout);
  }, [copied]);

  const copy = (): void => {
    navigator.clipboard.writeText(command).then(
      () => setCopied(true),
      (error: unknown) => console.error('Failed to copy the command:', error),
    );
  };

  return (
    <div className={styles.install}>
      <code className={styles.installCommand}>
        <span className={styles.installPrompt}>$</span> {command}
      </code>
      <button
        type="button"
        className={clsx(styles.copyButton, copied && styles.copyButtonCopied)}
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy the install command'}
        title={copied ? 'Copied' : 'Copy'}
      >
        <i
          className={clsx('fa-solid', copied ? 'fa-check' : 'fa-copy')}
          aria-hidden="true"
        ></i>
        <span className={styles.copyLabel}>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
};
