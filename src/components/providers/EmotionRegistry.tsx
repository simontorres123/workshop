'use client';

import React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const cache = createCache({ key: 'mui-style', prepend: true });

interface EmotionRegistryProps {
  children: React.ReactNode;
}

export default function EmotionRegistry({ children }: EmotionRegistryProps) {
  return <CacheProvider value={cache}>{children}</CacheProvider>;
}