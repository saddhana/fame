'use client';

import dynamic from 'next/dynamic';

export const LocationMap = dynamic(
  () => import('./LocationMap').then((m) => m.LocationMap),
  { ssr: false, loading: () => <div style={{ height: 220 }} className="rounded-xl bg-stone-100 animate-pulse" /> }
);
