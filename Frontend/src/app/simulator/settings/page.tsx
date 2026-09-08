'use client';

import { Suspense } from 'react';
import SettingsPanel from '@/components/simulator/SettingsPanel';
import PageSkeleton from '@/components/simulator/PageSkeleton';

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPanel />
    </Suspense>
  );
}
