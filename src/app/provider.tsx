// app/provider.tsx
'use client';

import React from 'react';

export function ClientProviders({
  children,
}: {
  lang?: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
