'use client';

import { Suspense } from "react";
import InflationTool from "@/components/simulator/InflationTool";

export default function InflationPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <InflationTool />
    </Suspense>
  );
}
