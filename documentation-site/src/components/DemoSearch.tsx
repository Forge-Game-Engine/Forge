import React, { ChangeEvent, FC } from 'react';
import styles from './_DemoSearch.module.css';

interface DemoSearchProps {
  onChange: (value: string) => void;
  value: string;
}

export const DemoSearch: FC<DemoSearchProps> = ({ value, onChange }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value);
  };

  return (
    <input
      type="search"
      className={styles.input}
      placeholder="Search demos by title..."
      aria-label="Search demos by title"
      value={value}
      onChange={handleChange}
    />
  );
};
