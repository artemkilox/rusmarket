import '@fontsource-variable/manrope';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = { title: 'График смен · CRM' };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
