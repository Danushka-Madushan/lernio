// app/provider.tsx
"use client";

import {I18nProvider} from '@heroui/react';

export function ClientProviders({lang, children}: {lang: string; children: React.ReactNode}) {
  return (
    <I18nProvider locale={lang}>
      {children}
    </I18nProvider>
  );
}
