'use client';

import dynamic from 'next/dynamic';

export const LocationPicker = dynamic(
  () => import('./LocationPicker').then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div style={{ height: 220 }} className="rounded-xl bg-stone-100 animate-pulse" /> }
);
