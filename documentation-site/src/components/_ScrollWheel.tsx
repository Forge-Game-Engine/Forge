import React, { FC } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export const ScrollWheel: FC = () => {
  const { siteConfig } = useDocusaurusContext();

  return (
    <img
      src={`${siteConfig.baseUrl}/img/scroll.png`}
      alt="scroll icon"
      style={{
        width: 35,
        height: 35,
      }}
    />
  );
};
